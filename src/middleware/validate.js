// src/middleware/validate.js
const AppError = require('../utils/AppError');

/**
 * Express middleware to validate request body against a Joi schema
 * @param {Joi.Schema} schema - Joi schema to validate against
 */
const validate = (schema) => (req, res, next) => {
  if (!schema) return next();

  const { value, error } = schema.validate(req.body, {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map((detail) => detail.message).join(', ');
    return next(new AppError(errorMessage, 400));
  }

  req.body = value;
  next();
};

module.exports = validate;
