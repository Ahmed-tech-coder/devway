// src/modules/exams/exams.validation.js
const Joi = require('joi');

const examSchema = Joi.object({
  title: Joi.string().trim().required().messages({
    'string.empty': 'عنوان الاختبار مطلوب',
    'any.required': 'عنوان الاختبار مطلوب'
  }),
  mark_per_question: Joi.number().positive().required().messages({
    'number.base': 'الدرجة لكل سؤال يجب أن تكون رقماً',
    'number.positive': 'الدرجة يجب أن تكون أكبر من صفر',
    'any.required': 'الدرجة لكل سؤال مطلوبة'
  }),
  duration: Joi.number().integer().positive().required().messages({
    'number.base': 'المدة يجب أن تكون رقماً بالدقائق',
    'number.positive': 'المدة يجب أن تكون أكبر من صفر',
    'any.required': 'مدة الاختبار مطلوبة'
  }),
  start_time: Joi.date().required().messages({
    'date.base': 'تاريخ البداية غير صالح',
    'any.required': 'تاريخ بداية الاختبار مطلوب'
  }),
  end_time: Joi.date().required().messages({
    'date.base': 'تاريخ الغلق غير صالح',
    'any.required': 'تاريخ غلق الاختبار مطلوب'
  }),
  status: Joi.boolean().default(false)
});

const submissionSchema = Joi.object({
  answers: Joi.array().items(
    Joi.object({
      question_id: Joi.number().integer().required().messages({
        'any.required': 'رقم السؤال مطلوب'
      }),
      selected_option: Joi.string().length(1).valid('a', 'b', 'c', 'd').required().messages({
        'any.only': 'الإجابة المختارة يجب أن تكون A أو B أو C أو D',
        'any.required': 'الإجابة المختارة مطلوبة'
      })
    })
  ).required().messages({
    'any.required': 'إجابات الأسئلة مطلوبة'
  })
});

module.exports = {
  examSchema,
  submissionSchema
};
