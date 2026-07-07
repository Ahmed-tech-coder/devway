// src/modules/assignments/assignments.routes.js
const express = require('express');
const router = express.Router();
const assignmentsController = require('./assignments.controller');
const { auth, authorize } = require('../../middleware/auth');
const upload = require('../../middleware/upload');

// All routes require authentication
router.use(auth);


// =========================================================================
// STATS, NOTIFICATIONS & HISTORY ENDPOINTS
// =========================================================================
router.get('/stats/dashboard', assignmentsController.getDashboardStats);
router.get('/notifications', assignmentsController.getUserNotifications);
router.patch('/notifications/read', assignmentsController.markNotificationsRead);
router.get('/deleted', authorize('admin'), assignmentsController.getDeletedAssignments);

// =========================================================================
// ASSIGNMENTS CORE ENDPOINTS
// =========================================================================
router.route('/')
  .get(assignmentsController.getAllAssignments)
  .post(authorize('admin'), upload.array('files'), assignmentsController.createAssignment);

router.route('/:id')
  .get(assignmentsController.getAssignmentById)
  .put(authorize('admin'), upload.array('files'), assignmentsController.updateAssignment)
  .delete(authorize('admin'), assignmentsController.softDeleteAssignment);

router.patch('/:id/restore', authorize('admin'), assignmentsController.restoreAssignment);
router.delete('/:id/permanent', authorize('admin'), assignmentsController.permanentDeleteAssignment);

// =========================================================================
// SUBMISSIONS & GRADING ENDPOINTS
// =========================================================================
// Get list of all submissions for this assignment (Admin only)
router.get('/:id/submissions', authorize('admin'), assignmentsController.getSubmissionsForAssignment);

// Student saves draft or finally submits assignment
router.post('/:id/submissions/draft', authorize('user'), upload.array('files'), assignmentsController.saveDraftSubmission);
router.post('/:id/submissions/submit', authorize('user'), upload.array('files'), assignmentsController.finalizeSubmission);

// Record tab-switch/copy violation
router.post('/:id/violation', authorize('user'), assignmentsController.recordViolation);

// Get student's own submission details (or admin view specific student's submission via ?userId=...)
router.get('/:assignmentId/submission/details', assignmentsController.getSubmissionDetails);

// Manage single submission files & grading
router.route('/submissions/:submissionId')
  .get(assignmentsController.getSubmissionById);

router.delete('/submissions/files/:fileId', authorize('user'), assignmentsController.removeSubmissionFile);
router.put('/submissions/:submissionId/grade', authorize('admin'), assignmentsController.gradeSubmission);
router.put('/submissions/:submissionId/return', authorize('admin'), assignmentsController.returnSubmission);

// Threaded comments on submissions
router.route('/submissions/:submissionId/comments')
  .get(assignmentsController.getSubmissionComments)
  .post(assignmentsController.createComment);

module.exports = router;
