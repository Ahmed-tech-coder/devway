// src/middleware/auth.js
const supabase = require('../config/supabase');
const AppError = require('../utils/AppError');

/**
 * Middleware to authenticate requests using a simple session token (user ID)
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

    // In this simple session strategy, the token is the user's profile ID (UUID)
    const { data: user, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, phone')
      .eq('id', token)
      .maybeSingle();

    if (error || !user) {
      return next(new AppError('الجلسة غير صالحة أو الحساب غير موجود', 401));
    }

    // Attach user information to the request
    req.user = user;
    next();
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
