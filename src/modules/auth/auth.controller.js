// src/modules/auth/auth.controller.js
const bcrypt = require('bcrypt');
const authService = require('./auth.service');
const AppError = require('../../utils/AppError');
const ApiResponse = require('../../utils/ApiResponse');

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

    // Standard response payload
    const responseData = {
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

    // Response includes the session token (user ID)
    const responseData = {
      token: user.id,
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
        full_name: user.full_name,
        name: user.full_name,
        role: user.role,
        phone: user.phone
      }
    };

    return new ApiResponse(200, responseData, 'تم استرجاع بيانات المستخدم بنجاح').send(res);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  me
};
