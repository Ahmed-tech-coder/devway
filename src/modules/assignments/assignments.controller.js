// src/modules/assignments/assignments.controller.js
const assignmentsService = require('./assignments.service');
const {
  mapAssignmentToDTO,
  mapAssignmentDetailsToDTO
} = require('../../utils/dtos');
const {
  assignmentSchema,
  templateSchema,
  submissionSchema,
  gradeSchema,
  commentSchema
} = require('./assignments.validation');

// Helper for error responses
const handleError = (res, err) => {
  console.error(err);
  return res.status(err.status || 500).json({
    success: false,
    error: err.message || 'حدث خطأ غير متوقع في الخادم'
  });
};

const parseIfString = (val) => {
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch (e) {
      return val;
    }
  }
  return val;
};

const parseMultipartBody = (body) => {
  const parsed = { ...body };
  if (parsed.rubrics !== undefined) parsed.rubrics = parseIfString(parsed.rubrics);
  if (parsed.resources !== undefined) parsed.resources = parseIfString(parsed.resources);
  
  // Cast booleans
  if (parsed.allowText === 'true') parsed.allowText = true;
  if (parsed.allowText === 'false') parsed.allowText = false;
  
  if (parsed.allowFile === 'true') parsed.allowFile = true;
  if (parsed.allowFile === 'false') parsed.allowFile = false;
  
  if (parsed.allowLateSubmission === 'true') parsed.allowLateSubmission = true;
  if (parsed.allowLateSubmission === 'false') parsed.allowLateSubmission = false;

  // Cast numeric fields
  if (parsed.maxGrade !== undefined && parsed.maxGrade !== '') parsed.maxGrade = Number(parsed.maxGrade);
  if (parsed.maxAttempts !== undefined && parsed.maxAttempts !== '') parsed.maxAttempts = Number(parsed.maxAttempts);
  if (parsed.maxUploadSize !== undefined && parsed.maxUploadSize !== '') parsed.maxUploadSize = Number(parsed.maxUploadSize);
  if (parsed.defaultGrade !== undefined && parsed.defaultGrade !== '') parsed.defaultGrade = Number(parsed.defaultGrade);
  if (parsed.defaultDurationDays !== undefined && parsed.defaultDurationDays !== '') parsed.defaultDurationDays = Number(parsed.defaultDurationDays);
  if (parsed.templateId !== undefined && parsed.templateId !== '') parsed.templateId = Number(parsed.templateId);

  return parsed;
};

// =========================================================================
// TEMPLATE CONTROLLERS
// =========================================================================

const getAllTemplates = async (req, res) => {
  try {
    const templates = await assignmentsService.getAllTemplates();
    return res.status(200).json({ success: true, data: templates });
  } catch (err) {
    return handleError(res, err);
  }
};

const getTemplateById = async (req, res) => {
  try {
    const template = await assignmentsService.getTemplateById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, error: 'القالب المطلوب غير موجود' });
    }
    return res.status(200).json({ success: true, data: template });
  } catch (err) {
    return handleError(res, err);
  }
};

const createTemplate = async (req, res) => {
  try {
    req.body = parseMultipartBody(req.body);
    const { error, value } = templateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const template = await assignmentsService.createTemplate(value, req.files || [], req.user.id);
    return res.status(201).json({ success: true, data: template });
  } catch (err) {
    return handleError(res, err);
  }
};

const updateTemplate = async (req, res) => {
  try {
    req.body = parseMultipartBody(req.body);
    const { error, value } = templateSchema.validate(req.body, { allowUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const template = await assignmentsService.updateTemplate(req.params.id, req.body, req.files || []);
    if (!template) {
      return res.status(404).json({ success: false, error: 'القالب المطلوب غير موجود' });
    }
    return res.status(200).json({ success: true, data: template });
  } catch (err) {
    return handleError(res, err);
  }
};

const deleteTemplate = async (req, res) => {
  try {
    const template = await assignmentsService.deleteTemplate(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, error: 'القالب المطلوب غير موجود' });
    }
    return res.status(200).json({ success: true, message: 'تم حذف القالب بنجاح' });
  } catch (err) {
    return handleError(res, err);
  }
};

const duplicateTemplate = async (req, res) => {
  try {
    const template = await assignmentsService.duplicateTemplate(req.params.id, req.user.id);
    return res.status(201).json({ success: true, data: template });
  } catch (err) {
    return handleError(res, err);
  }
};

// =========================================================================
// ASSIGNMENT CONTROLLERS
// =========================================================================

const getAllAssignments = async (req, res) => {
  try {
    const assignments = await assignmentsService.getAllAssignments(req.user.role, req.user.id);
    const dtos = assignments.map(a => mapAssignmentToDTO(a));
    return res.status(200).json({ success: true, data: dtos });
  } catch (err) {
    return handleError(res, err);
  }
};

const getDeletedAssignments = async (req, res) => {
  try {
    const assignments = await assignmentsService.getDeletedAssignments();
    const dtos = assignments.map(a => mapAssignmentToDTO(a));
    return res.status(200).json({ success: true, data: dtos });
  } catch (err) {
    return handleError(res, err);
  }
};

const getAssignmentById = async (req, res) => {
  try {
    const assignment = await assignmentsService.getAssignmentById(req.params.id, req.user.role, req.user.id);
    if (!assignment) {
      return res.status(404).json({ success: false, error: 'الواجب المطلوب غير موجود أو غير متاح' });
    }
    const dto = mapAssignmentDetailsToDTO(assignment);
    return res.status(200).json({ success: true, data: dto });
  } catch (err) {
    return handleError(res, err);
  }
};

const createAssignment = async (req, res) => {
  try {
    req.body = parseMultipartBody(req.body);
    const { error, value } = assignmentSchema.validate(req.body, { allowUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const assignment = await assignmentsService.createAssignment(req.body, req.files || [], req.user.id);
    const dto = mapAssignmentDetailsToDTO(assignment);
    return res.status(201).json({ success: true, data: dto });
  } catch (err) {
    return handleError(res, err);
  }
};

const updateAssignment = async (req, res) => {
  try {
    req.body = parseMultipartBody(req.body);
    const { error } = assignmentSchema.validate(req.body, { allowUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const assignment = await assignmentsService.updateAssignment(req.params.id, req.body, req.files || [], req.user.id);
    const dto = mapAssignmentDetailsToDTO(assignment);
    return res.status(200).json({ success: true, data: dto });
  } catch (err) {
    return handleError(res, err);
  }
};

const softDeleteAssignment = async (req, res) => {
  try {
    const assignment = await assignmentsService.softDeleteAssignment(req.params.id);
    if (!assignment) {
      return res.status(404).json({ success: false, error: 'الواجب المطلوب غير موجود' });
    }
    return res.status(200).json({ success: true, message: 'تم إخفاء/حذف الواجب بنجاح (يمكن استعادته)' });
  } catch (err) {
    return handleError(res, err);
  }
};

const restoreAssignment = async (req, res) => {
  try {
    const assignment = await assignmentsService.restoreAssignment(req.params.id);
    if (!assignment) {
      return res.status(404).json({ success: false, error: 'الواجب المطلوب غير موجود' });
    }
    return res.status(200).json({ success: true, message: 'تم استعادة الواجب بنجاح', data: assignment });
  } catch (err) {
    return handleError(res, err);
  }
};

const permanentDeleteAssignment = async (req, res) => {
  try {
    const assignment = await assignmentsService.permanentDeleteAssignment(req.params.id);
    if (!assignment) {
      return res.status(404).json({ success: false, error: 'الواجب المطلوب غير موجود' });
    }
    return res.status(200).json({ success: true, message: 'تم حذف الواجب بشكل نهائي ومسح ملفاته بنجاح' });
  } catch (err) {
    return handleError(res, err);
  }
};

// =========================================================================
// SUBMISSION CONTROLLERS
// =========================================================================

const getSubmissionDetails = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { userId } = req.query; // If admin wants specific student submission

    const targetUserId = req.user.role === 'admin' && userId ? userId : req.user.id;

    const sub = await assignmentsService.getSubmissionDetails(assignmentId, targetUserId);
    if (!sub) {
      return res.status(200).json({ success: true, data: null });
    }
    return res.status(200).json({ success: true, data: sub });
  } catch (err) {
    return handleError(res, err);
  }
};

const getSubmissionById = async (req, res) => {
  try {
    const sub = await assignmentsService.getSubmissionById(req.params.submissionId);
    if (!sub) {
      return res.status(404).json({ success: false, error: 'التسليم غير موجود' });
    }

    // Permission check
    if (req.user.role !== 'admin' && sub.user_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'غير مصرح لك بالوصول لهذا التسليم' });
    }

    return res.status(200).json({ success: true, data: sub });
  } catch (err) {
    return handleError(res, err);
  }
};

const getSubmissionsForAssignment = async (req, res) => {
  try {
    const subs = await assignmentsService.getSubmissionsForAssignment(req.params.id);
    return res.status(200).json({ success: true, data: subs });
  } catch (err) {
    return handleError(res, err);
  }
};

const saveDraftSubmission = async (req, res) => {
  try {
    const { error, value } = submissionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const sub = await assignmentsService.saveOrSubmitSubmission(
      req.params.id,
      req.user.id,
      value.textAnswer || '',
      req.files || [],
      false // isFinalSubmit = false
    );
    return res.status(200).json({ success: true, data: sub, message: 'تم حفظ المسودة بنجاح' });
  } catch (err) {
    return handleError(res, err);
  }
};

const finalizeSubmission = async (req, res) => {
  try {
    const { error, value } = submissionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const sub = await assignmentsService.saveOrSubmitSubmission(
      req.params.id,
      req.user.id,
      value.textAnswer || '',
      req.files || [],
      true // isFinalSubmit = true
    );
    return res.status(200).json({ success: true, data: sub, message: 'تم تسليم الواجب بنجاح' });
  } catch (err) {
    return handleError(res, err);
  }
};

const removeSubmissionFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const removed = await assignmentsService.removeSubmissionFile(fileId);
    if (!removed) {
      return res.status(404).json({ success: false, error: 'الملف غير موجود أو تم حذفه مسبقاً' });
    }
    return res.status(200).json({ success: true, message: 'تم حذف الملف المرفق بنجاح' });
  } catch (err) {
    return handleError(res, err);
  }
};

const gradeSubmission = async (req, res) => {
  try {
    const { error, value } = gradeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const sub = await assignmentsService.gradeSubmission(req.params.submissionId, value, req.user.id);
    return res.status(200).json({ success: true, data: sub, message: 'تم تصحيح التسليم بنجاح' });
  } catch (err) {
    return handleError(res, err);
  }
};

const returnSubmission = async (req, res) => {
  try {
    const { feedback } = req.body;
    const sub = await assignmentsService.returnSubmission(req.params.submissionId, feedback, req.user.id);
    return res.status(200).json({ success: true, data: sub, message: 'تم إرجاع التسليم للطالب بنجاح' });
  } catch (err) {
    return handleError(res, err);
  }
};

// =========================================================================
// COMMENT CONTROLLERS
// =========================================================================

const getSubmissionComments = async (req, res) => {
  try {
    const comments = await assignmentsService.getSubmissionComments(req.params.submissionId);
    return res.status(200).json({ success: true, data: comments });
  } catch (err) {
    return handleError(res, err);
  }
};

const createComment = async (req, res) => {
  try {
    const { error, value } = commentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const comment = await assignmentsService.createComment(
      req.params.submissionId,
      req.user.id,
      value.text,
      value.parentCommentId
    );
    return res.status(201).json({ success: true, data: comment });
  } catch (err) {
    return handleError(res, err);
  }
};

// =========================================================================
// STATS & NOTIFICATIONS CONTROLLERS
// =========================================================================

const getDashboardStats = async (req, res) => {
  try {
    const stats = await assignmentsService.getDashboardStats(req.user.role, req.user.id);
    return res.status(200).json({ success: true, data: stats });
  } catch (err) {
    return handleError(res, err);
  }
};

const getUserNotifications = async (req, res) => {
  try {
    const notifs = await assignmentsService.getUserNotifications(req.user.id);
    return res.status(200).json({ success: true, data: notifs });
  } catch (err) {
    return handleError(res, err);
  }
};

const markNotificationsRead = async (req, res) => {
  try {
    const notifs = await assignmentsService.markNotificationsAsRead(req.user.id);
    return res.status(200).json({ success: true, data: notifs, message: 'تم قراءة جميع التنبيهات' });
  } catch (err) {
    return handleError(res, err);
  }
};

const recordViolation = async (req, res) => {
  try {
    const { id: assignmentId } = req.params;
    const userId = req.user.id;
    const { reason } = req.body;

    const result = await assignmentsService.recordAssignmentViolation(assignmentId, userId, reason || 'Tab switch / blur');
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    return handleError(res, err);
  }
};

module.exports = {
  // Templates
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,

  // Assignments
  getAllAssignments,
  getDeletedAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  softDeleteAssignment,
  restoreAssignment,
  permanentDeleteAssignment,

  // Submissions
  getSubmissionDetails,
  getSubmissionById,
  getSubmissionsForAssignment,
  saveDraftSubmission,
  finalizeSubmission,
  removeSubmissionFile,
  gradeSubmission,
  recordViolation,
  returnSubmission,

  // Comments
  getSubmissionComments,
  createComment,

  // Stats & Notifications
  getDashboardStats,
  getUserNotifications,
  markNotificationsRead
};
