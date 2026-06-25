// src/middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  // Handle multer file size limit error
  if (err.code === 'LIMIT_FILE_SIZE') {
    err.statusCode = 400;
    err.message = 'حجم الملف كبير جداً، الحد الأقصى المسموح به هو 10 ميجابايت';
  }

  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error stack for debugging
  console.error('API Error:', {
    message: err.message,
    statusCode: err.statusCode,
    stack: err.stack
  });

  // Return formatted error response that the frontend expects (data.error)
  res.status(err.statusCode).json({
    status: err.status,
    error: err.message || 'حدث خطأ غير متوقع في السيرفر'
  });
};

module.exports = errorHandler;
