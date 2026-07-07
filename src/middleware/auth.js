// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');

const JWT_SECRET = process.env.JWT_SECRET || 'devway_access_secret_key_2026';

/**
 * Middleware to authenticate requests using standard JWT
 */
const auth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token || token === 'undefined' || token === 'null') {
      return next(new AppError('غير مصرح بالدخول - الرجاء تسجيل الدخول أولاً', 401));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Attach user information decoded from stateless JWT to request
      req.user = {
        id: decoded.id,
        role: decoded.role,
        email: decoded.email,
        full_name: decoded.full_name,
        name: decoded.name || decoded.full_name,
        phone: decoded.phone
      };
      
      next();
    } catch (err) {
      return next(new AppError('الجلسة غير صالحة أو انتهت صلاحيتها', 401));
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to restrict access to specific roles
 * @param {...string} roles - Allowed roles (e.g., 'admin', 'user')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('غير مصرح لك بالوصول إلى هذه الصفحة', 403));
    }
    next();
  };
};

module.exports = {
  auth,
  authorize
};
