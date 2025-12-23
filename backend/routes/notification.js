const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateAndLoadUser } = require('../middleware/auth');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validate');

// All routes require authentication
router.use(authenticateAndLoadUser);

// Token validation
const tokenValidation = [
  body('token')
    .notEmpty()
    .withMessage('Device token is required')
    .isString()
    .withMessage('Device token must be a string')
    .isLength({ min: 10, max: 500 })
    .withMessage('Invalid device token length'),
  handleValidationErrors
];

// Device registration validation (with platform)
const deviceValidation = [
  body('token')
    .notEmpty()
    .withMessage('Device token is required')
    .isString()
    .withMessage('Device token must be a string')
    .isLength({ min: 10, max: 500 })
    .withMessage('Invalid device token length'),
  body('platform')
    .notEmpty()
    .withMessage('Platform is required')
    .isIn(['ios', 'android', 'web'])
    .withMessage('Platform must be ios, android, or web'),
  handleValidationErrors
];

// ============================
// Device Token Management
// ============================

// Register device for push notifications (new - with platform)
router.post('/register-device', deviceValidation, notificationController.registerDevice);

// Unregister device from push notifications
router.post('/unregister-device', tokenValidation, notificationController.unregisterDevice);

// Register device token for push notifications (legacy)
router.post('/token', tokenValidation, notificationController.registerToken);

// Remove device token (legacy)
router.delete('/token', tokenValidation, notificationController.removeToken);

// ============================
// Notification Preferences
// ============================

// Get notification preferences
router.get('/preferences', notificationController.getPreferences);

// Update notification preferences
router.put('/preferences', notificationController.updatePreferences);

// ============================
// Notification History & Status
// ============================

// Get notification status
router.get('/status', notificationController.getStatus);

// Get notification history
router.get('/history', notificationController.getHistory);

// ============================
// Test & Reminders
// ============================

// Send test notification
router.post('/test', notificationController.sendTest);

// Request check-in reminder
router.post('/reminder', notificationController.sendCheckinReminder);

module.exports = router;
