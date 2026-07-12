// src/modules/profiles/profiles.routes.js
const express = require('express');
const profilesController = require('./profiles.controller');
const { auth, authorize } = require('../../middleware/auth');

const router = express.Router();

// Get dashboard stats for the authenticated user
router.get('/dashboard-stats', auth, profilesController.getDashboardStats);

// Get list of users (Admin only)
router.get('/', auth, authorize('admin'), profilesController.getProfiles);

// Delete user by ID (Admin only)
router.delete('/:id', auth, authorize('admin'), profilesController.deleteProfile);

module.exports = router;
