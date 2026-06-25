// src/modules/questions/questions.routes.js
const express = require('express');
const questionsController = require('./questions.controller');
const { auth, authorize } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const { questionSchema } = require('./questions.validation');

const router = express.Router();

// Retrieve questions for a specific exam (All authenticated users)
router.get('/exams/:examId/questions', auth, questionsController.getQuestions);

// Create a new question (Admin only)
router.post('/questions', auth, authorize('admin'), validate(questionSchema), questionsController.createQuestion);

// Update an existing question (Admin only)
router.put('/questions/:id', auth, authorize('admin'), validate(questionSchema), questionsController.updateQuestion);

// Delete a question (Admin only)
router.delete('/questions/:id', auth, authorize('admin'), questionsController.deleteQuestion);

module.exports = router;
