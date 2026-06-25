// src/modules/questions/questions.validation.js
const Joi = require('joi');

const questionSchema = Joi.object({
  exam_id: Joi.number().integer().required().messages({
    'number.base': 'رقم الاختبار يجب أن يكون رقماً صحيحاً',
    'any.required': 'رقم الاختبار مطلوب'
  }),
  content: Joi.string().trim().required().messages({
    'string.empty': 'محتوى السؤال مطلوب',
    'any.required': 'محتوى السؤال مطلوب'
  }),
  option_a: Joi.string().trim().required().messages({
    'string.empty': 'الخيار (أ) مطلوب',
    'any.required': 'الخيار (أ) مطلوب'
  }),
  option_b: Joi.string().trim().required().messages({
    'string.empty': 'الخيار (ب) مطلوب',
    'any.required': 'الخيار (ب) مطلوب'
  }),
  option_c: Joi.string().trim().required().messages({
    'string.empty': 'الخيار (ج) مطلوب',
    'any.required': 'الخيار (ج) مطلوب'
  }),
  option_d: Joi.string().trim().required().messages({
    'string.empty': 'الخيار (د) مطلوب',
    'any.required': 'الخيار (د) مطلوب'
  }),
  correct_option: Joi.string().length(1).valid('a', 'b', 'c', 'd').required().messages({
    'any.only': 'الخيار الصحيح يجب أن يكون a أو b أو c أو d',
    'any.required': 'الخيار الصحيح مطلوب'
  })
});

module.exports = {
  questionSchema
};
