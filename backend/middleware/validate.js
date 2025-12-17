const { body, param, query, validationResult } = require('express-validator');

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid input data',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

// Auth validations
const authValidation = {
  register: [
    body('email')
      .isEmail()
      .withMessage('Valid email is required')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/\d/)
      .withMessage('Password must contain at least one number'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Name must be between 1 and 255 characters'),
    body('age')
      .optional()
      .isInt({ min: 1, max: 150 })
      .withMessage('Age must be between 1 and 150'),
    handleValidationErrors
  ],
  login: [
    body('email')
      .isEmail()
      .withMessage('Valid email is required')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
    handleValidationErrors
  ]
};

// Profile validations
const profileValidation = {
  update: [
    body('name')
      .optional()
      .trim()
      .isLength({ max: 255 })
      .withMessage('Name must not exceed 255 characters'),
    body('age')
      .optional()
      .isInt({ min: 1, max: 150 })
      .withMessage('Age must be between 1 and 150'),
    body('preferences')
      .optional()
      .isObject()
      .withMessage('Preferences must be an object'),
    handleValidationErrors
  ],
  updatePreferences: [
    body()
      .isObject()
      .withMessage('Request body must be an object'),
    handleValidationErrors
  ],
  deletePreference: [
    param('key')
      .notEmpty()
      .withMessage('Preference key is required')
      .isString()
      .withMessage('Preference key must be a string'),
    handleValidationErrors
  ]
};

// Mood validations
const moodValidation = {
  create: [
    body('sentiment_score')
      .isFloat({ min: -1, max: 1 })
      .withMessage('Sentiment score must be between -1 and 1'),
    body('sentiment_label')
      .notEmpty()
      .withMessage('Sentiment label is required')
      .isString()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Sentiment label must not exceed 50 characters'),
    body('check_in_date')
      .isISO8601()
      .withMessage('Valid date is required (ISO 8601 format)'),
    handleValidationErrors
  ],
  update: [
    param('id')
      .isInt()
      .withMessage('Valid mood entry ID is required'),
    body('sentiment_score')
      .optional()
      .isFloat({ min: -1, max: 1 })
      .withMessage('Sentiment score must be between -1 and 1'),
    body('sentiment_label')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Sentiment label must not exceed 50 characters'),
    body('check_in_date')
      .optional()
      .isISO8601()
      .withMessage('Valid date is required (ISO 8601 format)'),
    handleValidationErrors
  ],
  getById: [
    param('id')
      .isInt()
      .withMessage('Valid mood entry ID is required'),
    handleValidationErrors
  ],
  list: [
    query('start_date')
      .optional()
      .isISO8601()
      .withMessage('Start date must be valid ISO 8601 format'),
    query('end_date')
      .optional()
      .isISO8601()
      .withMessage('End date must be valid ISO 8601 format'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a non-negative integer'),
    handleValidationErrors
  ]
};

// Check-in validations
const checkinValidation = {
  create: [
    body('mood_rating')
      .notEmpty()
      .withMessage('Mood rating is required')
      .isIn(['great', 'good', 'okay', 'not_good', 'terrible'])
      .withMessage('Mood rating must be great, good, okay, not_good, or terrible'),
    body('stress_level')
      .notEmpty()
      .withMessage('Stress level is required')
      .isInt({ min: 1, max: 10 })
      .withMessage('Stress level must be between 1 and 10'),
    body('selected_emotions')
      .optional()
      .isArray()
      .withMessage('Selected emotions must be an array'),
    body('selected_emotions.*')
      .optional()
      .isIn(['anxious', 'calm', 'sad', 'happy', 'angry', 'tired', 'energetic', 'stressed'])
      .withMessage('Invalid emotion value'),
    body('check_in_text')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 10000 })
      .withMessage('Check-in text must not exceed 10000 characters'),
    body('ai_analysis')
      .optional()
      .isObject()
      .withMessage('AI analysis must be an object'),
    body('ai_analysis.sentiment')
      .optional()
      .isIn(['positive', 'negative', 'neutral', 'mixed'])
      .withMessage('Sentiment must be positive, negative, neutral, or mixed'),
    body('ai_analysis.risk_level')
      .optional()
      .isIn(['low', 'moderate', 'high', 'critical'])
      .withMessage('Risk level must be low, moderate, high, or critical'),
    body('ai_analysis.keywords')
      .optional()
      .isArray()
      .withMessage('Keywords must be an array'),
    body('ai_analysis.suggestions')
      .optional()
      .isArray()
      .withMessage('Suggestions must be an array'),
    handleValidationErrors
  ],
  update: [
    param('id')
      .isMongoId()
      .withMessage('Valid check-in ID is required'),
    body('mood_rating')
      .optional()
      .isIn(['great', 'good', 'okay', 'not_good', 'terrible'])
      .withMessage('Mood rating must be great, good, okay, not_good, or terrible'),
    body('stress_level')
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage('Stress level must be between 1 and 10'),
    body('selected_emotions')
      .optional()
      .isArray()
      .withMessage('Selected emotions must be an array'),
    body('selected_emotions.*')
      .optional()
      .isIn(['anxious', 'calm', 'sad', 'happy', 'angry', 'tired', 'energetic', 'stressed'])
      .withMessage('Invalid emotion value'),
    body('check_in_text')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 10000 })
      .withMessage('Check-in text must not exceed 10000 characters'),
    body('ai_analysis')
      .optional()
      .isObject()
      .withMessage('AI analysis must be an object'),
    handleValidationErrors
  ],
  getById: [
    param('id')
      .isMongoId()
      .withMessage('Valid check-in ID is required'),
    handleValidationErrors
  ],
  addAnalysis: [
    param('id')
      .isMongoId()
      .withMessage('Valid check-in ID is required'),
    body('ai_analysis')
      .notEmpty()
      .withMessage('AI analysis is required')
      .isObject()
      .withMessage('AI analysis must be an object'),
    handleValidationErrors
  ],
  list: [
    query('start_date')
      .optional()
      .isISO8601()
      .withMessage('Start date must be valid ISO 8601 format'),
    query('end_date')
      .optional()
      .isISO8601()
      .withMessage('End date must be valid ISO 8601 format'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a non-negative integer'),
    handleValidationErrors
  ]
};

// Activity validations
const activityValidation = {
  create: [
    body('activity_type')
      .notEmpty()
      .withMessage('Activity type is required')
      .isIn(['meditation', 'breathing', 'journaling', 'exercise', 'sleep', 'gratitude', 'mindfulness', 'other'])
      .withMessage('Invalid activity type'),
    body('activity_name')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 255 })
      .withMessage('Activity name must not exceed 255 characters'),
    body('duration_minutes')
      .optional()
      .isInt({ min: 0, max: 1440 })
      .withMessage('Duration must be between 0 and 1440 minutes'),
    body('notes')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Notes must not exceed 2000 characters'),
    body('completed_at')
      .optional()
      .isISO8601()
      .withMessage('Completed date must be valid ISO 8601 format'),
    handleValidationErrors
  ],
  update: [
    param('id')
      .isMongoId()
      .withMessage('Valid activity ID is required'),
    body('activity_type')
      .optional()
      .isIn(['meditation', 'breathing', 'journaling', 'exercise', 'sleep', 'gratitude', 'mindfulness', 'other'])
      .withMessage('Invalid activity type'),
    body('activity_name')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 255 })
      .withMessage('Activity name must not exceed 255 characters'),
    body('duration_minutes')
      .optional()
      .isInt({ min: 0, max: 1440 })
      .withMessage('Duration must be between 0 and 1440 minutes'),
    body('notes')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Notes must not exceed 2000 characters'),
    handleValidationErrors
  ],
  getById: [
    param('id')
      .isMongoId()
      .withMessage('Valid activity ID is required'),
    handleValidationErrors
  ],
  list: [
    query('activity_type')
      .optional()
      .isIn(['meditation', 'breathing', 'journaling', 'exercise', 'sleep', 'gratitude', 'mindfulness', 'other'])
      .withMessage('Invalid activity type'),
    query('start_date')
      .optional()
      .isISO8601()
      .withMessage('Start date must be valid ISO 8601 format'),
    query('end_date')
      .optional()
      .isISO8601()
      .withMessage('End date must be valid ISO 8601 format'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a non-negative integer'),
    handleValidationErrors
  ]
};

// Emergency contact validations
const emergencyContactValidation = {
  create: [
    body('name')
      .notEmpty()
      .withMessage('Name is required')
      .isString()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Name must be between 1 and 255 characters'),
    body('phone')
      .notEmpty()
      .withMessage('Phone is required')
      .isString()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Phone must be between 1 and 50 characters')
      .matches(/^[\d\s\-\+\(\)]+$/)
      .withMessage('Phone must contain only valid phone characters'),
    body('relationship')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Relationship must not exceed 100 characters'),
    handleValidationErrors
  ],
  update: [
    param('id')
      .isInt()
      .withMessage('Valid contact ID is required'),
    body('name')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Name must be between 1 and 255 characters'),
    body('phone')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Phone must be between 1 and 50 characters')
      .matches(/^[\d\s\-\+\(\)]+$/)
      .withMessage('Phone must contain only valid phone characters'),
    body('relationship')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Relationship must not exceed 100 characters'),
    handleValidationErrors
  ],
  getById: [
    param('id')
      .isInt()
      .withMessage('Valid contact ID is required'),
    handleValidationErrors
  ],
  reorder: [
    body('contactIds')
      .isArray({ min: 1 })
      .withMessage('Contact IDs array is required'),
    body('contactIds.*')
      .isInt()
      .withMessage('Each contact ID must be an integer'),
    handleValidationErrors
  ]
};

module.exports = {
  handleValidationErrors,
  authValidation,
  profileValidation,
  moodValidation,
  checkinValidation,
  activityValidation,
  emergencyContactValidation
};
