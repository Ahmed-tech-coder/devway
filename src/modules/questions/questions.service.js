// src/modules/questions/questions.service.js
const supabase = require('../../config/supabase');

/**
 * Fetch questions for an exam, masking correct answers for students to prevent cheating
 * @param {number} examId
 * @param {string} role - 'admin' or 'user'
 * @returns {Promise<Array>}
 */
const getQuestionsByExamId = async (examId, role) => {
  const { data, error } = await supabase
    .from('questions')
    .select('id, exam_id, content, option_a, option_b, option_c, option_d, correct_option')
    .eq('exam_id', examId)
    .order('id', { ascending: true });

  if (error) throw error;

  if (role !== 'admin') {
    // Mask correct options for student users, but keep a placeholder value 
    // so the frontend still detects it as multiple choice ('multiple')
    return (data || []).map((row) => ({
      ...row,
      correct_option: 'hidden'
    }));
  }

  return data || [];
};

/**
 * Create a new question for an exam
 * @param {object} questionData
 * @returns {Promise<object>}
 */
const createQuestion = async (questionData) => {
  const { exam_id, content, option_a, option_b, option_c, option_d, correct_option } = questionData;
  
  const { data, error } = await supabase
    .from('questions')
    .insert({
      exam_id,
      content,
      option_a,
      option_b,
      option_c,
      option_d,
      correct_option
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

/**
 * Update an existing question
 * @param {number} id
 * @param {object} questionData
 * @returns {Promise<object|null>}
 */
const updateQuestion = async (id, questionData) => {
  const { content, option_a, option_b, option_c, option_d, correct_option } = questionData;
  
  const { data, error } = await supabase
    .from('questions')
    .update({
      content,
      option_a,
      option_b,
      option_c,
      option_d,
      correct_option,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return data;
};

/**
 * Delete a question by ID
 * @param {number} id
 * @returns {Promise<object|null>}
 */
const deleteQuestion = async (id) => {
  const { data, error } = await supabase
    .from('questions')
    .delete()
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return data;
};

module.exports = {
  getQuestionsByExamId,
  createQuestion,
  updateQuestion,
  deleteQuestion
};
