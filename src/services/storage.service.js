// src/services/storage.service.js
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const supabase = require('../config/supabase');

/**
 * Uploads a file buffer to a Supabase storage bucket
 * @param {string} bucket - The Supabase storage bucket name
 * @param {object} file - Multer file object containing buffer, originalname, and mimetype
 * @returns {Promise<{path: string, publicUrl: string}>}
 */
const uploadFile = async (bucket, file) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const fileName = `${uuidv4()}-${Date.now()}${ext}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      upsert: true
    });

  if (error) {
    console.error('Supabase upload error:', error);
    throw error;
  }

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return {
    path: fileName,
    publicUrl: urlData.publicUrl
  };
};

/**
 * Extracts the file path (name) from a public Supabase URL
 * @param {string} fileUrl - The public URL of the file
 * @returns {string}
 */
const getFileNameFromUrl = (fileUrl) => {
  if (!fileUrl) return '';
  const parts = fileUrl.split('/');
  return parts[parts.length - 1];
};

/**
 * Deletes a file from Supabase storage bucket by its public URL
 * @param {string} bucket - The Supabase storage bucket name
 * @param {string} fileUrl - The public URL of the file to delete
 * @returns {Promise<any>}
 */
const deleteFile = async (bucket, fileUrl) => {
  const fileName = getFileNameFromUrl(fileUrl);
  if (!fileName) return null;

  const { data, error } = await supabase.storage
    .from(bucket)
    .remove([fileName]);

  if (error) {
    console.error('Supabase delete error:', error);
    throw error;
  }

  return data;
};

module.exports = {
  uploadFile,
  getFileNameFromUrl,
  deleteFile
};
