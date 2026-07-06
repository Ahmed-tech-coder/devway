// src/modules/attachments/attachments.service.js
const supabase = require('../../config/supabase');

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

  return (data || []).map((row) => ({
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

module.exports = {
  getAllAttachments,
  getAttachmentById,
  createAttachment,
  deleteAttachment
};
