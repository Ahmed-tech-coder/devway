// src/modules/profiles/profiles.routes.js
const express = require('express');
const profilesController = require('./profiles.controller');
const { auth, authorize } = require('../../middleware/auth');

const router = express.Router();

// Get dashboard stats for the authenticated user
router.get('/dashboard-stats', auth, profilesController.getDashboardStats);

// Get top 3 performers (Authenticated users)
router.get('/top-performers', auth, profilesController.getTopPerformers);

// Update top 3 performers (Admin only)
router.put('/top-performers', auth, authorize('admin'), profilesController.updateTopPerformers);

// Get list of users (Admin only)
router.get('/', auth, authorize('admin'), profilesController.getProfiles);

// Delete user by ID (Admin only)
router.delete('/:id', auth, authorize('admin'), profilesController.deleteProfile);

module.exports = router;
