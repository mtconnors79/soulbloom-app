const express = require('express');
const router = express.Router();
const goalsController = require('../controllers/goalsController');
const { authenticateAndLoadUser } = require('../middleware/auth');
const { swr, private: privateCache, shortLived } = require('../middleware/cacheHeaders');

// All routes require authentication
router.use(authenticateAndLoadUser);

// Templates endpoint - semi-static data, cache with SWR (must be before /:id routes)
router.get('/templates', swr, goalsController.getGoalTemplates);

// Summary statistics - short-lived cache (must be before /:id routes)
router.get('/summary', shortLived, goalsController.getGoalsSummary);

// Goal history routes - private, no cache (must be before /:id routes)
router.get('/history', privateCache, goalsController.getGoalHistory);
router.delete('/history', goalsController.deleteGoalHistory);

// Active goals - private, no cache (user-specific data)
router.get('/', privateCache, goalsController.getActiveGoals);
router.post('/', goalsController.createGoal);
router.get('/:id', privateCache, goalsController.getGoal);
router.put('/:id', goalsController.updateGoal);
router.delete('/:id', goalsController.deleteGoal);

// Complete a goal
router.post('/:id/complete', goalsController.completeGoal);

module.exports = router;
