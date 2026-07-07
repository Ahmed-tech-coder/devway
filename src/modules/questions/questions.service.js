// src/modules/questions/questions.service.js
const supabase = require('../../config/supabase');
const AppError = require('../../utils/AppError');

/**
 * Fetch questions for an exam, masking correct answers for students to prevent cheating
 * @param {number} examId
 * @param {string} role - 'admin' or 'user'
 * @param {string} userId - User profile UUID (optional)
 * @returns {Promise<Array>}
 */
const getQuestionsByExamId = async (examId, role, userId = null) => {
  // Enforce exam closing deadline check server-side for students
  const { data: exam } = await supabase
    .from('exams')
    .select('end_time')
    .eq('id', examId)
    .maybeSingle();

  if (role !== 'admin' && exam && exam.end_time && new Date(exam.end_time) < new Date()) {
    throw new AppError('انتهى الوقت المسموح لتقديم هذا الاختبار.', 400);
  }

  // Also check if the student has already submitted this exam
  if (role !== 'admin' && userId) {
    const { data: result } = await supabase
      .from('exam_results')
      .select('submitted_at')
      .eq('exam_id', examId)
      .eq('user_id', userId)
      .maybeSingle();

    if (result && result.submitted_at) {
      throw new AppError('لقد قمت بتقديم هذا الاختبار بالفعل ولا يمكنك دخوله مرة أخرى.', 400);
    }
  }

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
