// src/modules/auth/auth.controller.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authService = require('./auth.service');
const AppError = require('../../utils/AppError');
const ApiResponse = require('../../utils/ApiResponse');

const JWT_SECRET = process.env.JWT_SECRET || 'devway_access_secret_key_2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'devway_refresh_secret_key_2026';

/**
 * Generate Access and Refresh tokens
 */
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { 
      id: user.id, 
      role: user.role, 
      email: user.email, 
      full_name: user.full_name,
      name: user.full_name,
      phone: user.phone 
    },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
  const refreshToken = jwt.sign(
    { id: user.id },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  return { accessToken, refreshToken };
};

/**
 * Handle user registration
 */
const register = async (req, res, next) => {
  try {
    const { full_name, email, password, phone } = req.body;

    // Check if email is already taken
    const existingUser = await authService.findUserByEmail(email);
    if (existingUser) {
      return next(new AppError('البريد الإلكتروني مسجل بالفعل', 400));
    }

    // Hash the password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create the profile
    const user = await authService.createUser(full_name, email, passwordHash, phone);

    // Generate tokens
    const tokens = generateTokens(user);

    // Standard response payload
    const responseData = {
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        name: user.full_name, // Mapping for name compatibility
        role: user.role,
        phone: user.phone
      }
    };

    return new ApiResponse(201, responseData, 'تم إنشاء الحساب بنجاح').send(res);
  } catch (error) {
    next(error);
  }
};

/**
 * Handle user login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Retrieve user by email
    const user = await authService.findUserByEmail(email);
    if (!user) {
      return next(new AppError('البريد الإلكتروني أو كلمة المرور غير صحيحة', 401));
    }

    // Verify hashed password
    const isPasswordMatch = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordMatch) {
      return next(new AppError('البريد الإلكتروني أو كلمة المرور غير صحيحة', 401));
    }

    // Generate tokens
    const tokens = generateTokens(user);

    // Response includes the session tokens
    const responseData = {
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        name: user.full_name, // Mapping for name compatibility
        role: user.role,
        phone: user.phone
      }
    };

    return new ApiResponse(200, responseData, 'تم تسجيل الدخول بنجاح').send(res);
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user details
 */
const me = async (req, res, next) => {
  try {
    const user = req.user; // Attached by auth middleware

    const responseData = {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name || user.name,
        name: user.full_name || user.name,
        role: user.role,
        phone: user.phone
      }
    };

    return new ApiResponse(200, responseData, 'تم استرجاع بيانات المستخدم بنجاح').send(res);
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh expired access token
 */
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return next(new AppError('رمز التحديث مطلوب', 400));
    }

    try {
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
      
      const user = await authService.findUserById(decoded.id);
      if (!user) {
        return next(new AppError('المستخدم غير موجود', 401));
      }

      const tokens = generateTokens(user);

      return new ApiResponse(200, {
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken
      }, 'تم تجديد الجلسة بنجاح').send(res);
    } catch (err) {
      return next(new AppError('رمز التحديث غير صالح أو منتهي الصلاحية', 401));
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  me,
  refresh
};
