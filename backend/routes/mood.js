const express = require('express');
const router = express.Router();
const moodController = require('../controllers/moodController');
const { authenticateAndLoadUser } = require('../middleware/auth');
const { moodValidation } = require('../middleware/validate');
const { private: privateCache, shortLived } = require('../middleware/cacheHeaders');
const selectFields = require('../middleware/selectFields');

// All routes require authentication
router.use(authenticateAndLoadUser);

// Enable field selection for GET requests
router.use(selectFields);

// Get mood statistics - short-lived cache (aggregate data)
router.get('/stats', moodValidation.list, shortLived, moodController.getMoodStats);

// CRUD operations - private, no cache (user-specific data)
router.post('/', moodValidation.create, moodController.createMoodEntry);
router.get('/', moodValidation.list, privateCache, moodController.getMoodEntries);
router.get('/:id', moodValidation.getById, privateCache, moodController.getMoodEntry);
router.put('/:id', moodValidation.update, moodController.updateMoodEntry);
router.delete('/:id', moodValidation.getById, moodController.deleteMoodEntry);

module.exports = router;
