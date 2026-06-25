// src/modules/attachments/attachments.validation.js
const Joi = require('joi');

const attachmentSchema = Joi.object({
  sessionNumber: Joi.string().trim().required().messages({
    'string.empty': 'رقم الجلسة مطلوب',
    'any.required': 'رقم الجلسة مطلوب'
  }),
  category: Joi.string().trim().required().messages({
    'string.empty': 'التصنيف مطلوب',
    'any.required': 'التصنيف مطلوب'
  }),
  title: Joi.string().trim().required().messages({
    'string.empty': 'عنوان المرفق مطلوب',
    'any.required': 'عنوان المرفق مطلوب'
  }),
  description: Joi.string().trim().required().messages({
    'string.empty': 'وصف المرفق مطلوب',
    'any.required': 'وصف المرفق مطلوب'
  })
});

module.exports = {
  attachmentSchema
};
