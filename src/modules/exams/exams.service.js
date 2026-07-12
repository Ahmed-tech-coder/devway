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
 * Get exam details for a specific user, including remaining time
 * @param {number} examId
 * @param {string} userId
 * @param {string} role
 * @returns {Promise<object|null>}
 */
const getExamForUser = async (examId, userId, role) => {
  const exam = await getExamById(examId);
  if (!exam) return null;

  if (role !== 'admin' && userId) {
    const { data: result } = await supabase
      .from('exam_results')
      .select('submitted_at, started_at')
      .eq('exam_id', examId)
      .eq('user_id', userId)
      .maybeSingle();

    if (result) {
      if (result.submitted_at) {
        exam.remaining_seconds = 0;
      } else {
        const elapsed = Math.floor((Date.now() - new Date(result.started_at)) / 1000);
        const remaining = exam.duration * 60 - elapsed;
        exam.remaining_seconds = remaining > 0 ? remaining : 0;
      }
    }
  }
  return exam;
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
/**
 * Shared helper to check if the session is expired and trigger auto-submission.
 * @param {number} examId
 * @param {string} userId
 * @param {string} startedAt
 * @param {number} durationMinutes
 * @returns {Promise<object>}
 */
const checkAndHandleExpiration = async (examId, userId, startedAt, durationMinutes) => {
  const elapsed = Math.floor((Date.now() - new Date(startedAt)) / 1000);
  const remaining = durationMinutes * 60 - elapsed;

  if (remaining <= 0) {
    // Session is expired! Trigger auto-submit with empty/no answers (will grade whatever is in the DB)
    await submitExamResult(examId, userId, []);
    throw new AppError('انتهى الوقت المسموح لتقديم هذا الاختبار.', 400);
  }
  return { expired: false, remaining_seconds: remaining };
};

/**
 * Starts or resumes an exam session for a student
 * @param {number} examId
 * @param {string} userId
 * @returns {Promise<object>}
 */
const startExamSession = async (examId, userId) => {
  const [examRes, resultRes] = await Promise.all([
    supabase
      .from('exams')
      .select('*')
      .eq('id', examId)
      .maybeSingle(),
    supabase
      .from('exam_results')
      .select('*')
      .eq('exam_id', examId)
      .eq('user_id', userId)
      .maybeSingle()
  ]);

  if (examRes.error) throw examRes.error;
  if (resultRes.error) throw resultRes.error;

  const exam = examRes.data;
  if (!exam) {
    throw new AppError('الاختبار غير موجود', 404);
  }

  // Check if exam overall deadline has passed
  if (exam.end_time && new Date(exam.end_time) < new Date()) {
    throw new AppError('انتهى الوقت المسموح لتقديم هذا الاختبار.', 400);
  }

  const existingResult = resultRes.data;
  if (existingResult) {
    if (existingResult.submitted_at) {
      throw new AppError('لقد قمت بتقديم هذا الاختبار بالفعل ولا يمكنك دخوله مرة أخرى.', 400);
    }

    // Check expiration using centralized helper
    const { remaining_seconds } = await checkAndHandleExpiration(
      examId,
      userId,
      existingResult.started_at,
      exam.duration
    );

    // Fetch existing answers to restore to frontend
    const { data: answers, error: answersErr } = await supabase
      .from('exam_answers')
      .select('question_id, selected_option')
      .eq('result_id', existingResult.id);

    if (answersErr) throw answersErr;

    const answersMap = {};
    if (answers) {
      answers.forEach((ans) => {
        answersMap[ans.question_id] = ans.selected_option;
      });
    }

    return {
      remaining_seconds,
      answers: answersMap
    };
  }

  // Create new exam result session
  const { data: newResult, error: insertErr } = await supabase
    .from('exam_results')
    .insert({
      exam_id: Number(examId),
      user_id: userId,
      score: null,
      total_marks: null,
      percentage: null,
      submitted_at: null,
      started_at: new Date().toISOString()
    })
    .select('*')
    .single();

  if (insertErr) throw insertErr;

  return {
    remaining_seconds: exam.duration * 60,
    answers: {}
  };
};

/**
 * Saves a single question answer dynamically
 * @param {number} examId
 * @param {string} userId
 * @param {number} questionId
 * @param {string} selectedOption
 * @returns {Promise<object>}
 */
const saveUserAnswer = async (examId, userId, questionId, selectedOption) => {
  const [examRes, resultRes] = await Promise.all([
    supabase
      .from('exams')
      .select('duration')
      .eq('id', examId)
      .maybeSingle(),
    supabase
      .from('exam_results')
      .select('id, submitted_at, started_at')
      .eq('exam_id', examId)
      .eq('user_id', userId)
      .maybeSingle()
  ]);

  if (examRes.error) throw examRes.error;
  if (resultRes.error) throw resultRes.error;

  const exam = examRes.data;
  if (!exam) throw new AppError('الاختبار غير موجود', 404);

  const result = resultRes.data;
  if (!result) {
    throw new AppError('جلسة الاختبار غير موجودة. يرجى بدء الاختبار أولاً.', 404);
  }

  if (result.submitted_at) {
    throw new AppError('تم تقديم هذا الاختبار بالفعل ولا يمكن تعديل الإجابات.', 400);
  }

  // Check expiration using centralized helper
  const { remaining_seconds } = await checkAndHandleExpiration(
    examId,
    userId,
    result.started_at,
    exam.duration
  );

  // Fetch the correct option for this question to calculate correctness
  const { data: question, error: questionErr } = await supabase
    .from('questions')
    .select('correct_option')
    .eq('id', questionId)
    .eq('exam_id', examId)
    .maybeSingle();

  if (questionErr) throw questionErr;
  if (!question) {
    throw new AppError('السؤال غير موجود في هذا الاختبار', 404);
  }

  const isCorrect = question.correct_option.trim().toLowerCase() === selectedOption.trim().toLowerCase();

  // Upsert the answer
  const { error: upsertErr } = await supabase
    .from('exam_answers')
    .upsert({
      result_id: result.id,
      question_id: questionId,
      selected_option: selectedOption,
      is_correct: isCorrect
    }, { onConflict: 'result_id,question_id' });

  if (upsertErr) throw upsertErr;

  return {
    success: true,
    remaining_seconds
  };
};

/**
 * Submits an exam, scores it, and records the results and answers sequentially
 * @param {number} examId
 * @param {string} userId - Profile UUID
 * @param {Array} userAnswers - Array of { question_id, selected_option }
 * @returns {Promise<object>} - Result summary
 */
const submitExamResult = async (examId, userId, userAnswers) => {
  // 1. Fetch exam configuration, existing submission, and questions in parallel
  const [examRes, existingRes, questionsRes] = await Promise.all([
    supabase
      .from('exams')
      .select('*')
      .eq('id', examId)
      .maybeSingle(),
    supabase
      .from('exam_results')
      .select('id, submitted_at, started_at')
      .eq('exam_id', examId)
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('questions')
      .select('id, correct_option')
      .eq('exam_id', examId)
  ]);

  if (examRes.error) throw examRes.error;
  if (existingRes.error) throw existingRes.error;
  if (questionsRes.error) throw questionsRes.error;

  const exam = examRes.data;
  if (!exam) {
    throw new AppError('الاختبار غير موجود', 404);
  }

  // Enforce exam closing deadline check server-side
  if (exam.end_time && new Date(exam.end_time) < new Date()) {
    throw new AppError('انتهى الوقت المسموح لتقديم هذا الاختبار.', 400);
  }

  const existingResult = existingRes.data;
  if (existingResult && existingResult.submitted_at) {
    throw new AppError('لقد قمت بتقديم هذا الاختبار بالفعل ولا يمكنك التعديل أو التقديم مرة أخرى.', 400);
  }

  // Create result row if not exists
  let resultId;
  if (!existingResult) {
    const { data: newResult, error: insertErr } = await supabase
      .from('exam_results')
      .insert({
        exam_id: Number(examId),
        user_id: userId,
        score: null,
        total_marks: null,
        percentage: null,
        submitted_at: null,
        started_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (insertErr) throw insertErr;
    resultId = newResult.id;
  } else {
    resultId = existingResult.id;
  }

  const questions = questionsRes.data;
  if (!questions || questions.length === 0) {
    throw new Error('لا توجد أسئلة في هذا الاختبار بعد');
  }

  const questionMap = new Map();
  questions.forEach((q) => {
    questionMap.set(q.id, q.correct_option.trim().toLowerCase());
  });

  // 2. If userAnswers are provided, upsert them first (final sync)
  if (userAnswers && userAnswers.length > 0) {
    const answersToUpsert = userAnswers.map((ua) => {
      const correctAnswer = questionMap.get(ua.question_id);
      const isCorrect = correctAnswer ? correctAnswer === ua.selected_option.trim().toLowerCase() : false;
      return {
        result_id: resultId,
        question_id: ua.question_id,
        selected_option: ua.selected_option,
        is_correct: isCorrect
      };
    });

    const { error: upsertErr } = await supabase
      .from('exam_answers')
      .upsert(answersToUpsert, { onConflict: 'result_id,question_id' });

    if (upsertErr) throw upsertErr;
  }

  // 3. Fetch all current answers from DB to calculate score
  const { data: dbAnswers, error: dbAnswersErr } = await supabase
    .from('exam_answers')
    .select('question_id, selected_option, is_correct')
    .eq('result_id', resultId);

  if (dbAnswersErr) throw dbAnswersErr;

  const dbAnswersMap = new Map();
  if (dbAnswers) {
    dbAnswers.forEach((ans) => {
      dbAnswersMap.set(ans.question_id, ans);
    });
  }

  // 4. Score the answers
  let correctCount = 0;
  questions.forEach((q) => {
    const ans = dbAnswersMap.get(q.id);
    if (ans && ans.is_correct) {
      correctCount++;
    }
  });

  const totalQuestions = questions.length;
  const markPerQuestion = parseFloat(exam.mark_per_question);
  const score = correctCount * markPerQuestion;
  const totalMarks = totalQuestions * markPerQuestion;
  const percentage = (correctCount / totalQuestions) * 100;

  // 5. Mark the exam result as submitted atomically (only if submitted_at is currently null)
  const { data: updatedResult, error: updateErr } = await supabase
    .from('exam_results')
    .update({
      score,
      total_marks: totalMarks,
      percentage,
      submitted_at: new Date().toISOString()
    })
    .eq('id', resultId)
    .is('submitted_at', null)
    .select('*')
    .maybeSingle();

  if (updateErr) throw updateErr;
  if (!updatedResult) {
    throw new AppError('لقد تم تقديم هذا الاختبار بالفعل.', 400);
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
  // 1. Fetch exam result, exam details, and questions in parallel
  const [resultRes, examRes, questionsRes] = await Promise.all([
    supabase
      .from('exam_results')
      .select('*')
      .eq('exam_id', examId)
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('exams')
      .select('*')
      .eq('id', examId)
      .maybeSingle(),
    supabase
      .from('questions')
      .select('id, content, option_a, option_b, option_c, option_d, correct_option')
      .eq('exam_id', examId)
      .order('id', { ascending: true })
  ]);

  if (resultRes.error) throw resultRes.error;
  if (examRes.error) throw examRes.error;
  if (questionsRes.error) throw questionsRes.error;

  const result = resultRes.data;
  if (!result || !result.submitted_at) {
    throw new AppError('لم تقم بتقديم هذا الاختبار بعد لرؤية النتيجة والتفاصيل.', 400);
  }

  const exam = examRes.data;
  if (!exam) throw new AppError('الاختبار غير موجود', 404);

  const questions = questionsRes.data;

  // 2. Fetch user's answers using result.id
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
  getExamForUser,
  createExam,
  updateExam,
  deleteExam,
  checkAndHandleExpiration,
  startExamSession,
  saveUserAnswer,
  submitExamResult,
  getExamResults,
  getExamReviewForUser
};
