// src/modules/questions/questions.controller.js
const questionsService = require('./questions.service');
const AppError = require('../../utils/AppError');

/**
 * Get all questions for a specific exam
 */
const getQuestions = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const role = req.user ? req.user.role : 'user';

    const questions = await questionsService.getQuestionsByExamId(examId, role);

    // Return the array directly as the frontend expects
    return res.status(200).json(questions);
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new question (Admin only)
 */
const createQuestion = async (req, res, next) => {
  try {
    const question = await questionsService.createQuestion(req.body);
    return res.status(201).json(question);
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing question (Admin only)
 */
const updateQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const question = await questionsService.updateQuestion(id, req.body);

    if (!question) {
      return next(new AppError('السؤال غير موجود للتعديل', 404));
    }

    return res.status(200).json(question);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a question (Admin only)
 */
const deleteQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await questionsService.deleteQuestion(id);

    if (!deleted) {
      return next(new AppError('السؤال غير موجود للحذف', 404));
    }

    return res.status(200).json({ success: true, message: 'تم حذف السؤال بنجاح' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion
};
