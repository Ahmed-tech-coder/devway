// src/modules/exams/exams.service.js
const supabase = require('../../config/supabase');
const AppError = require('../../utils/AppError');

/**
 * Get all exams, filtered by role
 * @param {string} role - 'admin' or 'user'
 * @param {string} userId - Current user ID (optional)
 * @returns {Promise<Array>}
 */
const getAllExams = async (role, userId = null) => {
  if (role === 'admin') {
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } else {
    const { data, error } = await supabase
      .from('exams')
      .select(`
        id, title, duration, mark_per_question, start_time, end_time, status, created_at,
        exam_results (
          score, percentage, submitted_at, user_id
        )
      `)
      .eq('status', true)
      .eq('exam_results.user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((row) => {
      // Find the result corresponding to this specific user (filtered by PostgREST above)
      const userResult = row.exam_results && row.exam_results.length > 0 ? row.exam_results[0] : null;
      return {
        id: row.id,
        title: row.title,
        duration: row.duration,
        mark_per_question: row.mark_per_question,
        start_time: row.start_time,
        end_time: row.end_time,
        status: row.status,
        created_at: row.created_at,
        score: userResult ? userResult.score : null,
        percentage: userResult ? userResult.percentage : null,
        submitted_at: userResult ? userResult.submitted_at : null
      };
    });
  }
};

/**
 * Get exam by ID
 * @param {number} id
 * @returns {Promise<object|null>}
 */
const getExamById = async (id) => {
  const { data, error } = await supabase
    .from('exams')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
};

/**
 * Create a new exam
 * @param {object} examData
 * @returns {Promise<object>}
 */
const createExam = async (examData) => {
  const { title, mark_per_question, duration, start_time, end_time, status } = examData;
  
  const { data, error } = await supabase
    .from('exams')
    .insert({
      title,
      mark_per_question,
      duration,
      start_time,
      end_time,
      status
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

/**
 * Update an existing exam
 * @param {number} id
 * @param {object} examData
 * @returns {Promise<object|null>}
 */
const updateExam = async (id, examData) => {
  const { title, mark_per_question, duration, start_time, end_time, status } = examData;
  
  const { data, error } = await supabase
    .from('exams')
    .update({
      title,
      mark_per_question,
      duration,
      start_time,
      end_time,
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return data;
};

/**
 * Delete an exam
 * @param {number} id
 * @returns {Promise<object|null>}
 */
const deleteExam = async (id) => {
  const { data, error } = await supabase
    .from('exams')
    .delete()
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return data;
};

/**
 * Submits an exam, scores it, and records the results and answers sequentially
 * @param {number} examId
 * @param {string} userId - Profile UUID
 * @param {Array} userAnswers - Array of { question_id, selected_option }
 * @returns {Promise<object>} - Result summary
 */
const submitExamResult = async (examId, userId, userAnswers) => {
  // 1. Fetch exam configuration
  const { data: exam, error: examErr } = await supabase
    .from('exams')
    .select('*')
    .eq('id', examId)
    .maybeSingle();

  if (examErr) throw examErr;
  if (!exam) {
    throw new AppError('الاختبار غير موجود', 404);
  }

  // Enforce exam closing deadline check server-side
  if (exam.end_time && new Date(exam.end_time) < new Date()) {
    throw new AppError('انتهى الوقت المسموح لتقديم هذا الاختبار.', 400);
  }

  // Check if they already submitted
  const { data: existingResult } = await supabase
    .from('exam_results')
    .select('submitted_at')
    .eq('exam_id', examId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existingResult && existingResult.submitted_at) {
    throw new AppError('لقد قمت بتقديم هذا الاختبار بالفعل ولا يمكنك التعديل أو التقديم مرة أخرى.', 400);
  }

  // 2. Fetch all questions for this exam to calculate scores
  const { data: questions, error: questionsErr } = await supabase
    .from('questions')
    .select('id, correct_option')
    .eq('exam_id', examId);

  if (questionsErr) throw questionsErr;
  if (!questions || questions.length === 0) {
    throw new Error('لا توجد أسئلة في هذا الاختبار بعد');
  }

  const questionMap = new Map();
  questions.forEach((q) => {
    questionMap.set(q.id, q.correct_option.trim().toLowerCase());
  });

  // 3. Score the answers
  let correctCount = 0;
  const scoredAnswers = userAnswers.map((ua) => {
    const correctAnswer = questionMap.get(ua.question_id);
    const isCorrect = correctAnswer ? correctAnswer === ua.selected_option.trim().toLowerCase() : false;
    if (isCorrect) {
      correctCount++;
    }
    return {
      question_id: ua.question_id,
      selected_option: ua.selected_option,
      is_correct: isCorrect
    };
  });

  const totalQuestions = questions.length;
  const markPerQuestion = parseFloat(exam.mark_per_question);
  const score = correctCount * markPerQuestion;
  const totalMarks = totalQuestions * markPerQuestion;
  const percentage = (correctCount / totalQuestions) * 100;

  // 4. Save result (using upsert with onConflict)
  const { data: resultRes, error: resultErr } = await supabase
    .from('exam_results')
    .upsert({
      exam_id: examId,
      user_id: userId,
      score,
      total_marks: totalMarks,
      percentage,
      submitted_at: new Date().toISOString()
    }, { onConflict: 'exam_id,user_id' })
    .select('id')
    .single();

  if (resultErr) throw resultErr;
  const resultId = resultRes.id;

  // 5. Delete previous answers for this result if updating
  const { error: deleteErr } = await supabase
    .from('exam_answers')
    .delete()
    .eq('result_id', resultId);

  if (deleteErr) throw deleteErr;

  // 6. Insert new answers bulk
  if (scoredAnswers.length > 0) {
    const answersToInsert = scoredAnswers.map((sa) => ({
      result_id: resultId,
      question_id: sa.question_id,
      selected_option: sa.selected_option,
      is_correct: sa.is_correct
    }));

    const { error: insertErr } = await supabase
      .from('exam_answers')
      .insert(answersToInsert);

    if (insertErr) throw insertErr;
  }

  return {
    resultId,
    score,
    totalMarks,
    percentage,
    correctCount,
    totalQuestions
  };
};

/**
 * Get results of an exam (Admin only)
 * @param {number} examId
 * @returns {Promise<Array>}
 */
const getExamResults = async (examId) => {
  const { data, error } = await supabase
    .from('exam_results')
    .select(`
      id,
      exam_id,
      user_id,
      score,
      total_marks,
      percentage,
      submitted_at,
      profiles (
        full_name,
        email
      )
    `)
    .eq('exam_id', examId)
    .order('submitted_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((row) => ({
    id: row.id,
    exam_id: row.exam_id,
    user_id: row.user_id,
    score: row.score,
    total_marks: row.total_marks,
    percentage: row.percentage,
    submitted_at: row.submitted_at,
    profiles: {
      full_name: row.profiles?.full_name,
      email: row.profiles?.email
    }
  }));
};


/**
 * Retrieve user's exam results and mapped questions with their answers/correct options
 * @param {number} examId
 * @param {string} userId
 * @returns {Promise<object>}
 */
const getExamReviewForUser = async (examId, userId) => {
  // 1. Fetch exam result
  const { data: result, error: resultErr } = await supabase
    .from('exam_results')
    .select('*')
    .eq('exam_id', examId)
    .eq('user_id', userId)
    .maybeSingle();

  if (resultErr) throw resultErr;

  if (!result || !result.submitted_at) {
    throw new AppError('لم تقم بتقديم هذا الاختبار بعد لرؤية النتيجة والتفاصيل.', 400);
  }

  // 2. Fetch exam details
  const { data: exam, error: examErr } = await supabase
    .from('exams')
    .select('*')
    .eq('id', examId)
    .maybeSingle();

  if (examErr) throw examErr;
  if (!exam) throw new AppError('الاختبار غير موجود', 404);

  // 3. Fetch questions
  const { data: questions, error: questionsErr } = await supabase
    .from('questions')
    .select('id, content, option_a, option_b, option_c, option_d, correct_option')
    .eq('exam_id', examId)
    .order('id', { ascending: true });

  if (questionsErr) throw questionsErr;

  // 4. Fetch user's answers
  const { data: answers, error: answersErr } = await supabase
    .from('exam_answers')
    .select('*')
    .eq('result_id', result.id);

  if (answersErr) throw answersErr;

  // Create a map of user answers for quick access
  const answerMap = new Map();
  if (answers) {
    answers.forEach((ans) => {
      answerMap.set(ans.question_id, ans);
    });
  }

  // 5. Map questions with student answers
  const mappedQuestions = (questions || []).map((q) => {
    const userAns = answerMap.get(q.id);
    return {
      id: q.id,
      content: q.content,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_option: q.correct_option ? q.correct_option.trim().toLowerCase() : null,
      selected_option: userAns ? userAns.selected_option.trim().toLowerCase() : null,
      is_correct: userAns ? !!userAns.is_correct : false
    };
  });

  return {
    exam: {
      id: exam.id,
      title: exam.title,
      duration: exam.duration,
      mark_per_question: exam.mark_per_question
    },
    result: {
      score: result.score !== null ? Number(result.score) : 0,
      total_marks: result.total_marks !== null ? Number(result.total_marks) : 0,
      percentage: result.percentage !== null ? Number(result.percentage) : 0,
      submitted_at: result.submitted_at
    },
    questions: mappedQuestions
  };
};

module.exports = {
  getAllExams,
  getExamById,
  createExam,
  updateExam,
  deleteExam,
  submitExamResult,
  getExamResults,
  getExamReviewForUser
};
