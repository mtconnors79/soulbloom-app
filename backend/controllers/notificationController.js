const notificationService = require('../services/notificationService');
const pushNotificationService = require('../services/pushNotificationService');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Register a device token for push notifications (legacy)
 */
const registerToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    const userId = req.user.id;

    if (!token) {
      throw ApiError.badRequest('Device token is required');
    }

    const result = await notificationService.registerDeviceToken(userId, token);

    if (!result.success) {
      throw ApiError.internal(result.error);
    }

    res.json({
      success: true,
      message: 'Device token registered successfully',
      tokenCount: result.tokenCount
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Register a device for push notifications (new - with platform)
 * POST /api/notifications/register-device
 */
const registerDevice = async (req, res, next) => {
  try {
    const { token, platform } = req.body;
    const userId = req.user.id;

    if (!token) {
      throw ApiError.badRequest('Device token is required');
    }

    if (!platform || !['ios', 'android', 'web'].includes(platform)) {
      throw ApiError.badRequest('Valid platform (ios, android, web) is required');
    }

    await pushNotificationService.registerDevice(userId, token, platform);

    // Also register in legacy system for backwards compatibility
    await notificationService.registerDeviceToken(userId, token);

    res.json({
      success: true,
      message: 'Device registered successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Unregister a device from push notifications
 * POST /api/notifications/unregister-device
 */
const unregisterDevice = async (req, res, next) => {
  try {
    const { token } = req.body;
    const userId = req.user.id;

    if (!token) {
      throw ApiError.badRequest('Device token is required');
    }

    await pushNotificationService.unregisterDevice(userId, token);

    // Also remove from legacy system
    await notificationService.removeDeviceToken(userId, token);

    res.json({
      success: true,
      message: 'Device unregistered successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove a device token
 */
const removeToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    const userId = req.user.id;

    if (!token) {
      throw ApiError.badRequest('Device token is required');
    }

    const result = await notificationService.removeDeviceToken(userId, token);

    if (!result.success) {
      throw ApiError.internal(result.error);
    }

    res.json({
      success: true,
      message: 'Device token removed successfully',
      tokenCount: result.tokenCount
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get notification status for user
 */
const getStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await notificationService.getDeviceTokens(userId);

    if (!result.success) {
      throw ApiError.internal(result.error);
    }

    res.json({
      success: true,
      fcmEnabled: notificationService.isEnabled(),
      registeredDevices: result.tokens.length,
      hasTokens: result.tokens.length > 0
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send a test notification to the current user
 */
const sendTest = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await notificationService.sendToUser(userId, {
      title: 'Test Notification',
      body: 'This is a test notification from MindWell.'
    }, {
      type: 'test'
    });

    if (!result.success) {
      return res.json({
        success: false,
        reason: result.reason || result.error
      });
    }

    res.json({
      success: true,
      message: 'Test notification sent',
      results: result.results
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Trigger a check-in reminder for the current user
 */
const sendCheckinReminder = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { message } = req.body;

    const result = await notificationService.sendCheckinReminder(userId, message);

    if (!result.success) {
      return res.json({
        success: false,
        reason: result.reason || result.error
      });
    }

    res.json({
      success: true,
      message: 'Check-in reminder sent',
      results: result.results
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's notification preferences
 * GET /api/notifications/preferences
 */
const getPreferences = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const preferences = await pushNotificationService.getUserPreferences(userId);

    res.json({
      success: true,
      preferences,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user's notification preferences
 * PUT /api/notifications/preferences
 */
const updatePreferences = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    // Validate preference keys
    const validKeys = [
      'pattern_intervention',
      'goal_reminders',
      'streak_reminders',
      'care_circle_alerts',
      'check_in_reminders',
      're_engagement',
      'quiet_hours_enabled',
      'quiet_hours_start',
      'quiet_hours_end',
      'daily_limit',
      'timezone',
    ];

    const invalidKeys = Object.keys(updates).filter((key) => !validKeys.includes(key));
    if (invalidKeys.length > 0) {
      throw ApiError.badRequest(`Invalid preference keys: ${invalidKeys.join(', ')}`);
    }

    // Validate time format for quiet hours
    if (updates.quiet_hours_start && !/^\d{2}:\d{2}$/.test(updates.quiet_hours_start)) {
      throw ApiError.badRequest('Invalid quiet_hours_start format. Use HH:MM');
    }

    if (updates.quiet_hours_end && !/^\d{2}:\d{2}$/.test(updates.quiet_hours_end)) {
      throw ApiError.badRequest('Invalid quiet_hours_end format. Use HH:MM');
    }

    // Validate daily_limit
    if (updates.daily_limit !== undefined) {
      const limit = parseInt(updates.daily_limit);
      if (isNaN(limit) || limit < 0 || limit > 20) {
        throw ApiError.badRequest('daily_limit must be between 0 and 20');
      }
      updates.daily_limit = limit;
    }

    const preferences = await pushNotificationService.updateUserPreferences(userId, updates);

    res.json({
      success: true,
      preferences,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get notification history
 * GET /api/notifications/history
 */
const getHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);

    const history = await pushNotificationService.getNotificationHistory(userId, limit);

    res.json({
      success: true,
      history,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerToken,
  registerDevice,
  unregisterDevice,
  removeToken,
  getStatus,
  getPreferences,
  updatePreferences,
  getHistory,
  sendTest,
  sendCheckinReminder
};
