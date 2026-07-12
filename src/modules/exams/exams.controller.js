// src/modules/exams/exams.controller.js
const examsService = require('./exams.service');
const AppError = require('../../utils/AppError');
const ApiResponse = require('../../utils/ApiResponse');
const { mapExamToDTO, mapExamDetailsToDTO } = require('../../utils/dtos');

/**
 * Get list of all exams
 */
const getExams = async (req, res, next) => {
  try {
    const role = req.user ? req.user.role : 'user';
    const userId = req.user ? req.user.id : null;
    const exams = await examsService.getAllExams(role, userId);

    const dtos = exams.map(e => mapExamToDTO(e));
    return res.status(200).json(dtos);
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single exam details
 */
const getExam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user.id : null;
    const role = req.user ? req.user.role : 'user';

    const exam = await examsService.getExamForUser(id, userId, role);

    if (!exam) {
      return next(new AppError('الاختبار غير موجود', 404));
    }

    const dto = mapExamDetailsToDTO(exam);
    if (exam.remaining_seconds !== undefined) {
      dto.remaining_seconds = exam.remaining_seconds;
    }
    return res.status(200).json(dto);
  } catch (error) {
    next(error);
  }
};

/**
 * Start or resume an exam session
 */
const startExam = async (req, res, next) => {
  try {
    const { id: examId } = req.params;
    const userId = req.user.id;

    const result = await examsService.startExamSession(examId, userId);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Save user answer for a question dynamically
 */
const saveAnswer = async (req, res, next) => {
  try {
    const { id: examId } = req.params;
    const userId = req.user.id;
    const { question_id, selected_option } = req.body;

    const result = await examsService.saveUserAnswer(examId, userId, question_id, selected_option);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new exam (Admin only)
 */
const createExam = async (req, res, next) => {
  try {
    const exam = await examsService.createExam(req.body);
    const dto = mapExamDetailsToDTO(exam);
    return res.status(201).json(dto);
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing exam (Admin only)
 */
const updateExam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const exam = await examsService.updateExam(id, req.body);

    if (!exam) {
      return next(new AppError('الاختبار غير موجود للتعديل', 404));
    }

    const dto = mapExamDetailsToDTO(exam);
    return res.status(200).json(dto);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete an exam (Admin only)
 */
const deleteExam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await examsService.deleteExam(id);

    if (!deleted) {
      return next(new AppError('الاختبار غير موجود للحذف', 404));
    }

    return res.status(200).json({ success: true, message: 'تم حذف الاختبار بنجاح' });
  } catch (error) {
    next(error);
  }
};

/**
 * Submit exam answers and receive immediate scoring
 */
const submitExam = async (req, res, next) => {
  try {
    const { id: examId } = req.params;
    const userId = req.user.id; // Securely take userId from authenticated session
    const { answers } = req.body;

    const result = await examsService.submitExamResult(examId, userId, answers);

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get results of an exam (Admin only)
 */
const getResults = async (req, res, next) => {
  try {
    const { id: examId } = req.params;
    const results = await examsService.getExamResults(examId);

    return res.status(200).json(results);
  } catch (error) {
    next(error);
  }
};

/**
 * Get exam review and results for the logged-in student
 */
const getExamReview = async (req, res, next) => {
  try {
    const { id: examId } = req.params;
    const userId = req.user.id;

    const review = await examsService.getExamReviewForUser(examId, userId);
    return res.status(200).json(review);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getExams,
  getExam,
  startExam,
  saveAnswer,
  createExam,
  updateExam,
  deleteExam,
  submitExam,
  getResults,
  getExamReview
};
