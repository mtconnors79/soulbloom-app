const express = require('express');
const router = express.Router();
const checkinController = require('../controllers/checkinController');
const { authenticateAndLoadUser } = require('../middleware/auth');
const { checkinValidation } = require('../middleware/validate');
const { aiLimiter, checkinLimiter } = require('../middleware/rateLimiter');
const { private: privateCache, shortLived } = require('../middleware/cacheHeaders');
const selectFields = require('../middleware/selectFields');

// All routes require authentication
router.use(authenticateAndLoadUser);

// Enable field selection for GET requests
router.use(selectFields);

// Get check-in statistics - short-lived cache (aggregate data)
router.get('/stats', checkinValidation.list, shortLived, checkinController.getCheckinStats);

// Get daily mood details - private, no cache (user-specific)
router.get('/daily', privateCache, checkinController.getDailyMoodDetails);

// Analyze text without saving (standalone analysis) - AI rate limited
router.post('/analyze', aiLimiter, checkinController.analyzeText);

// CRUD operations - private, no cache (user-specific data)
router.post('/', checkinLimiter, checkinValidation.create, checkinController.createCheckin);
router.get('/', checkinValidation.list, privateCache, checkinController.getCheckins);
router.get('/:id', checkinValidation.getById, privateCache, checkinController.getCheckin);
router.put('/:id', checkinValidation.update, checkinController.updateCheckin);
router.delete('/:id', checkinValidation.getById, checkinController.deleteCheckin);

// AI analysis operations - AI rate limited
router.post('/:id/analysis', checkinValidation.addAnalysis, checkinController.addAiAnalysis);
router.post('/:id/analyze', aiLimiter, checkinValidation.getById, checkinController.analyzeCheckin);

module.exports = router;
