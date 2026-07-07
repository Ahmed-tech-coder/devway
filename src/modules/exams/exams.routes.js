// src/modules/exams/exams.routes.js
const express = require('express');
const examsController = require('./exams.controller');
const { auth, authorize } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const { examSchema, submissionSchema } = require('./exams.validation');

const router = express.Router();

// Get list of exams (visible according to role status filtering)
router.get('/', auth, examsController.getExams);

// Get specific exam details
router.get('/:id', auth, examsController.getExam);

// Create new exam (Admin only)
router.post('/', auth, authorize('admin'), validate(examSchema), examsController.createExam);

// Update existing exam (Admin only)
router.put('/:id', auth, authorize('admin'), validate(examSchema), examsController.updateExam);

// Delete exam (Admin only)
router.delete('/:id', auth, authorize('admin'), examsController.deleteExam);

// Submit answers for scoring (All authenticated users)
router.post('/:id/submit', auth, validate(submissionSchema), examsController.submitExam);

// Record violation (All authenticated users)
router.post('/:id/violation', auth, examsController.recordViolation);

// Retrieve submission results list (Admin only)
router.get('/:id/results', auth, authorize('admin'), examsController.getResults);

module.exports = router;
