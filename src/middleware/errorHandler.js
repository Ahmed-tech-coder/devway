// src/middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  // Ensure CORS headers are explicitly set on error responses
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');

  // Handle multer file size limit error
  if (err.code === 'LIMIT_FILE_SIZE') {
    err.statusCode = 400;
    err.message = 'حجم الملف كبير جداً ويتجاوز الحد الأقصى المسموح به للسيرفر.';
  }

  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error stack for debugging
  console.error('API Error:', {
    message: err.message,
    statusCode: err.statusCode,
    stack: err.stack
  });

  // Return formatted error response compatible with frontend (both `error` and `message` key support)
  res.status(err.statusCode).json({
    success: false,
    status: err.status,
    error: err.message || 'حدث خطأ غير متوقع في السيرفر',
    message: err.message || 'حدث خطأ غير متوقع في السيرفر'
  });
};

module.exports = errorHandler;
