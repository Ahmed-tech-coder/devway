// src/modules/attachments/attachments.routes.js
const express = require('express');
const attachmentsController = require('./attachments.controller');
const { auth, authorize } = require('../../middleware/auth');
const upload = require('../../middleware/upload');
const validate = require('../../middleware/validate');
const { attachmentSchema } = require('./attachments.validation');

const router = express.Router();

// Retrieve all attachments (All authenticated users)
router.get('/', auth, attachmentsController.getAttachments);

// Create new attachment (Admin only)
// Note: upload.single('file') must be run first so multipart/form-data fields are parsed into req.body for validation
router.post(
  '/',
  auth,
  authorize('admin'),
  upload.single('file'),
  validate(attachmentSchema),
  attachmentsController.createAttachment
);

// Delete an attachment (Admin only)
router.delete('/:id', auth, authorize('admin'), attachmentsController.deleteAttachment);

module.exports = router;
