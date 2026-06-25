// src/modules/auth/auth.service.js
const supabase = require('../../config/supabase');

/**
 * Creates a new user profile in the database
 * @param {string} fullName
 * @param {string} email
 * @param {string} passwordHash
 * @param {string} phone
 * @returns {Promise<object>}
 */
const createUser = async (fullName, email, passwordHash, phone) => {
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      full_name: fullName,
      email,
      password_hash: passwordHash,
      phone: phone || null,
      role: 'user',
    })
    .select('id, full_name, email, role, phone, created_at')
    .single();

  if (error) throw error;
  return data;
};

/**
 * Finds a user profile by email address
 * @param {string} email
 * @returns {Promise<object|null>}
 */
const findUserByEmail = async (email) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (error) throw error;
  return data;
};

/**
 * Finds a user profile by unique ID
 * @param {string} id
 * @returns {Promise<object|null>}
 */
const findUserById = async (id) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, phone, created_at')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
};

module.exports = {
  createUser,
  findUserByEmail,
  findUserById
};
