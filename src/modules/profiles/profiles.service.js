// src/modules/profiles/profiles.service.js
const supabase = require('../../config/supabase');

/**
 * Retrieves all user profiles (excluding administrators)
 * @returns {Promise<Array>}
 */
const getAllUserProfiles = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, phone, created_at')
    .eq('role', 'user')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

/**
 * Deletes a profile by its unique ID
 * @param {string} id - Profile UUID
 * @returns {Promise<object|null>}
 */
const deleteProfile = async (id) => {
  const { data, error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', id)
    .select('id, full_name, email')
    .maybeSingle();

  if (error) throw error;
  return data;
};

module.exports = {
  getAllUserProfiles,
  deleteProfile
};
