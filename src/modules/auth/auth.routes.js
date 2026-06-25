// src/modules/auth/auth.routes.js
const express = require('express');
const authController = require('./auth.controller');
const validate = require('../../middleware/validate');
const { registerSchema, loginSchema } = require('./auth.validation');
const { auth } = require('../../middleware/auth');

const router = express.Router();

// Public registration endpoint
router.post('/register', validate(registerSchema), authController.register);

// Public login endpoint
router.post('/login', validate(loginSchema), authController.login);

// Protected endpoint to fetch current user context
router.get('/me', auth, authController.me);

module.exports = router;
