// src/modules/auth/auth.validation.js
const Joi = require('joi');

const registerSchema = Joi.object({
  full_name: Joi.string().trim().required().messages({
    'string.empty': 'الاسم الكامل مطلوب',
    'any.required': 'الاسم الكامل مطلوب'
  }),
  email: Joi.string().email().trim().required().messages({
    'string.email': 'البريد الإلكتروني غير صالح',
    'string.empty': 'البريد الإلكتروني مطلوب',
    'any.required': 'البريد الإلكتروني مطلوب'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'كلمة المرور يجب ألا تقل عن 6 أحرف',
    'string.empty': 'كلمة المرور مطلوبة',
    'any.required': 'كلمة المرور مطلوبة'
  }),
  phone: Joi.string().allow('', null).optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().trim().required().messages({
    'string.email': 'البريد الإلكتروني غير صالح',
    'string.empty': 'البريد الإلكتروني مطلوب',
    'any.required': 'البريد الإلكتروني مطلوب'
  }),
  password: Joi.string().required().messages({
    'string.empty': 'كلمة المرور مطلوبة',
    'any.required': 'كلمة المرور مطلوبة'
  })
});

module.exports = {
  registerSchema,
  loginSchema
};
