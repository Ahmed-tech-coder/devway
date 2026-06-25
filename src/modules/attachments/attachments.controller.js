// src/modules/attachments/attachments.controller.js
const attachmentsService = require('./attachments.service');
const storageService = require('../../services/storage.service');
const AppError = require('../../utils/AppError');
const ApiResponse = require('../../utils/ApiResponse');

/**
 * Retrieve all attachments
 */
const getAttachments = async (req, res, next) => {
  try {
    const attachments = await attachmentsService.getAllAttachments();
    
    // Return structured object exactly as the frontend expects
    return res.status(200).json({
      success: true,
      attachments
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create/Upload a new attachment
 */
const createAttachment = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('يجب تحديد ملف لرفعه', 400));
    }

    // 1. Upload the file to Supabase Storage bucket
    const uploadResult = await storageService.uploadFile('attachments', req.file);

    // 2. Build record payload and insert to database
    const attachmentPayload = {
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      sessionNumber: req.body.sessionNumber,
      fileUrl: uploadResult.publicUrl,
      filePath: uploadResult.path
    };

    const attachment = await attachmentsService.createAttachment(attachmentPayload);

    return new ApiResponse(201, attachment, 'تم رفع وحفظ المرفق بنجاح').send(res);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete an attachment (including files in Supabase Storage)
 */
const deleteAttachment = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Delete from database
    const deleted = await attachmentsService.deleteAttachment(id);
    if (!deleted) {
      return next(new AppError('المرفق المطلوب غير موجود', 404));
    }

    // 2. Delete the actual file object from Supabase Storage
    if (deleted.filePath) {
      try {
        await storageService.deleteFile('attachments', deleted.filePath);
      } catch (storageErr) {
        // Log storage deletion error, but don't fail the request since database record is gone
        console.error(`Failed to clean up storage object: ${deleted.filePath}`, storageErr);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'تم حذف المرفق بنجاح',
      id: deleted.id
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAttachments,
  createAttachment,
  deleteAttachment
};
