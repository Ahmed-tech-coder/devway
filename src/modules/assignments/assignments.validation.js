// src/modules/assignments/assignments.validation.js
const Joi = require('joi');

const assignmentSchema = Joi.object({
  title: Joi.string().trim().required().messages({
    'string.empty': 'عنوان الواجب مطلوب',
    'any.required': 'عنوان الواجب مطلوب'
  }),
  description: Joi.string().trim().allow('', null),
  instructions: Joi.string().trim().allow('', null),
  objectives: Joi.string().trim().allow('', null),
  maxGrade: Joi.number().positive().required().messages({
    'number.base': 'الدرجة القصوى يجب أن تكون رقماً',
    'number.positive': 'الدرجة القصوى يجب أن تكون أكبر من 0',
    'any.required': 'الدرجة القصوى مطلوبة'
  }),
  deadline: Joi.string().isoDate().required().messages({
    'string.isoDate': 'تاريخ غلق الواجب غير صالح',
    'any.required': 'تاريخ غلق الواجب مطلوب'
  }),
  dueTime: Joi.string().trim().allow('', null),
  publishDate: Joi.string().isoDate().allow('', null).messages({
    'string.isoDate': 'تاريخ النشر غير صالح'
  }),
  allowLateSubmission: Joi.boolean().default(false),
  maxAttempts: Joi.number().integer().min(1).default(1).messages({
    'number.min': 'الحد الأقصى للمحاولات يجب أن يكون 1 على الأقل'
  }),
  allowText: Joi.boolean().default(true),
  allowFile: Joi.boolean().default(true),
  allowedExtensions: Joi.string().trim().allow('', null),
  maxUploadSize: Joi.number().integer().min(1).default(10),
  status: Joi.string().valid('draft', 'scheduled', 'published', 'closed', 'archived').default('draft'),
  rubrics: Joi.array().items(
    Joi.object({
      title: Joi.string().trim().required().messages({ 'string.empty': 'اسم معيار التقييم مطلوب' }),
      percentage: Joi.number().min(0).max(100).required().messages({ 'number.base': 'نسبة التقييم مطلوبة' }),
      description: Joi.string().trim().allow('', null)
    })
  ).allow(null),
  resources: Joi.array().items(
    Joi.object({
      title: Joi.string().trim().allow('', null),
      url: Joi.string().uri().required().messages({ 'string.uri': 'رابط المصدر غير صالح' }),
      type: Joi.string().trim().allow('', null)
    })
  ).allow(null),
  templateId: Joi.number().integer().allow(null)
});

const templateSchema = Joi.object({
  title: Joi.string().trim().required().messages({
    'string.empty': 'عنوان القالب مطلوب',
    'any.required': 'عنوان القالب مطلوب'
  }),
  description: Joi.string().trim().allow('', null),
  instructions: Joi.string().trim().allow('', null),
  objectives: Joi.string().trim().allow('', null),
  rubrics: Joi.array().items(
    Joi.object({
      title: Joi.string().trim().required(),
      percentage: Joi.number().min(0).max(100).required(),
      description: Joi.string().trim().allow('', null)
    })
  ).allow(null),
  allowText: Joi.boolean().default(true),
  allowFile: Joi.boolean().default(true),
  allowedExtensions: Joi.string().trim().allow('', null),
  maxUploadSize: Joi.number().integer().min(1).default(10),
  maxAttempts: Joi.number().integer().min(1).default(1),
  defaultGrade: Joi.number().positive().allow(null),
  defaultDurationDays: Joi.number().integer().min(1).allow(null),
  resources: Joi.array().items(
    Joi.object({
      title: Joi.string().trim().allow('', null),
      url: Joi.string().uri().required(),
      type: Joi.string().trim().allow('', null)
    })
  ).allow(null)
});

const submissionSchema = Joi.object({
  textAnswer: Joi.string().trim().allow('', null),
  isDraft: Joi.boolean().default(false)
});

const gradeSchema = Joi.object({
  grade: Joi.number().min(0).required().messages({
    'number.min': 'الدرجة لا يمكن أن تكون أقل من 0',
    'any.required': 'الدرجة مطلوبة للمحاسبة'
  }),
  feedback: Joi.string().trim().allow('', null)
});

const commentSchema = Joi.object({
  text: Joi.string().trim().required().messages({
    'string.empty': 'محتوى التعليق مطلوب',
    'any.required': 'محتوى التعليق مطلوب'
  }),
  parentCommentId: Joi.number().integer().allow(null)
});

module.exports = {
  assignmentSchema,
  templateSchema,
  submissionSchema,
  gradeSchema,
  commentSchema
};
