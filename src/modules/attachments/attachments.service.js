// src/modules/attachments/attachments.service.js
const supabase = require('../../config/supabase');

const getSessionSortValue = (sessionNumber) => {
  if (sessionNumber === null || sessionNumber === undefined) {
    return Number.MAX_SAFE_INTEGER;
  }

  const normalized = String(sessionNumber).trim();
  if (!normalized) {
    return Number.MAX_SAFE_INTEGER;
  }

  const match = normalized.match(/(\d+)/);
  if (!match) {
    return Number.MAX_SAFE_INTEGER - 1;
  }

  return Number.parseInt(match[1], 10);
};

const sortAttachmentsBySession = (attachments) =>
  [...attachments].sort((a, b) => {
    const aValue = getSessionSortValue(a.sessionNumber);
    const bValue = getSessionSortValue(b.sessionNumber);

    if (aValue !== bValue) {
      return aValue - bValue;
    }

    const titleComparison = (a.title || '').localeCompare(b.title || '', 'ar', {
      sensitivity: 'base'
    });

    if (titleComparison !== 0) {
      return titleComparison;
    }

    return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
  });

/**
 * Get all course attachments
 * @returns {Promise<Array>}
 */
const getAllAttachments = async () => {
  const { data, error } = await supabase
    .from('attachments')
    .select('id, title, description, category, session_number, file_url, links, created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const mappedAttachments = (data || []).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    sessionNumber: row.session_number,
    fileUrl: row.file_url,
    filePath: row.file_url, // Map filePath to fileUrl as the client-side expects it
    links: row.links || [],
    created_at: row.created_at
  }));

  return sortAttachmentsBySession(mappedAttachments);
};

/**
 * Get specific attachment details by ID
 * @param {number} id
 * @returns {Promise<object|null>}
 */
const getAttachmentById = async (id) => {
  const { data, error } = await supabase
    .from('attachments')
    .select('id, title, description, category, session_number, file_url, links, created_at')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    category: data.category,
    sessionNumber: data.session_number,
    fileUrl: data.file_url,
    filePath: data.file_url,
    links: data.links || [],
    created_at: data.created_at
  };
};

/**
 * Create a new attachment record
 * @param {object} data
 * @returns {Promise<object>}
 */
const createAttachment = async (data) => {
  const { title, description, category, sessionNumber, fileUrl, links } = data;
  
  const { data: row, error } = await supabase
    .from('attachments')
    .insert({
      title,
      description,
      category,
      session_number: sessionNumber,
      file_url: fileUrl,
      links: links
    })
    .select('id, title, description, category, session_number, file_url, links, created_at')
    .single();

  if (error) throw error;

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    sessionNumber: row.session_number,
    fileUrl: row.file_url,
    filePath: row.file_url,
    links: row.links || [],
    created_at: row.created_at
  };
};

/**
 * Delete an attachment record
 * @param {number} id
 * @returns {Promise<object|null>} - returns deleted record info for storage cleanup
 */
const deleteAttachment = async (id) => {
  const { data, error } = await supabase
    .from('attachments')
    .delete()
    .eq('id', id)
    .select('id, file_url, title')
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    filePath: data.file_url, // Provide file_url as filePath so the controller can clean it up from storage
    title: data.title
  };
};

/**
 * Update an attachment record
 * @param {number} id
 * @param {object} updateData
 * @returns {Promise<object>}
 */
const updateAttachment = async (id, updateData) => {
  const { title, description, category, sessionNumber, fileUrl, links } = updateData;
  
  const updatePayload = {};
  if (title !== undefined) updatePayload.title = title;
  if (description !== undefined) updatePayload.description = description;
  if (category !== undefined) updatePayload.category = category;
  if (sessionNumber !== undefined) updatePayload.session_number = sessionNumber;
  if (fileUrl !== undefined) updatePayload.file_url = fileUrl;
  if (links !== undefined) updatePayload.links = links;

  const { data: row, error } = await supabase
    .from('attachments')
    .update(updatePayload)
    .eq('id', id)
    .select('id, title, description, category, session_number, file_url, links, created_at')
    .single();

  if (error) throw error;

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    sessionNumber: row.session_number,
    fileUrl: row.file_url,
    filePath: row.file_url,
    links: row.links || [],
    created_at: row.created_at
  };
};

module.exports = {
  getAllAttachments,
  getAttachmentById,
  createAttachment,
  updateAttachment,
  deleteAttachment
};
