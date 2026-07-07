// src/modules/profiles/profiles.controller.js
const profilesService = require('./profiles.service');
const ApiResponse = require('../../utils/ApiResponse');
const AppError = require('../../utils/AppError');
const { mapProfileToDTO } = require('../../utils/dtos');

/**
 * Get all user profiles (admin access only)
 */
const getProfiles = async (req, res, next) => {
  try {
    const profiles = await profilesService.getAllUserProfiles();
    
    const dtos = (profiles || []).map(p => mapProfileToDTO(p));
    // Format response payload exactly as frontend expects: { profiles: [...] }
    return res.status(200).json({
      success: true,
      profiles: dtos
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a profile (admin access only)
 */
const deleteProfile = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Prevent administrators from deleting themselves via this route
    if (id === req.user.id) {
      return next(new AppError('لا يمكنك حذف حسابك الحالي', 400));
    }

    const deleted = await profilesService.deleteProfile(id);
    if (!deleted) {
      return next(new AppError('المستخدم غير موجود', 404));
    }

    return res.status(200).json({
      success: true,
      message: 'تم حذف المستخدم بنجاح',
      deleted
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfiles,
  deleteProfile
};
