const { UserGoal } = require('../models');
const { Op } = require('sequelize');
const { calculateProgressForGoals, calculateProgress, isGoalCompleted, getTimeRemaining } = require('../services/goalProgressService');
const { getAllTemplates, getTemplateById, getTemplatesByCategory, getTemplatesByActivityType } = require('../data/goalTemplates');
const { checkGoalSetterBadge } = require('../services/badgeService');

const MAX_ACTIVE_GOALS = 10;

const VALID_ACTIVITY_TYPES = ['check_in', 'quick_mood', 'mindfulness', 'breathing', 'journaling'];
const VALID_TIME_FRAMES = ['daily', 'weekly', 'monthly'];

/**
 * GET /api/goals
 * List user's active goals with calculated progress
 */
const getActiveGoals = async (req, res) => {
  try {
    const userId = req.user.dbId;

    const goals = await UserGoal.findAll({
      where: {
        user_id: userId,
        is_active: true
      },
      order: [['created_at', 'DESC']]
    });

    // Calculate progress for each goal
    const goalsWithProgress = await calculateProgressForGoals(goals);

    // Add time remaining info
    const enrichedGoals = goalsWithProgress.map(goal => ({
      ...goal,
      timeRemaining: getTimeRemaining(goal.time_frame)
    }));

    res.json({
      goals: enrichedGoals,
      count: enrichedGoals.length,
      maxAllowed: MAX_ACTIVE_GOALS
    });
  } catch (error) {
    console.error('Get active goals error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch goals'
    });
  }
};

/**
 * GET /api/goals/templates
 * Get all goal templates
 */
const getGoalTemplates = async (req, res) => {
  try {
    const { category, activity_type } = req.query;

    let templates = getAllTemplates();

    // Filter by category if provided
    if (category) {
      templates = getTemplatesByCategory(category);
    }

    // Filter by activity_type if provided
    if (activity_type) {
      templates = templates.filter(t => t.activity_type === activity_type);
    }

    res.json({
      templates,
      count: templates.length
    });
  } catch (error) {
    console.error('Get goal templates error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch goal templates'
    });
  }
};

/**
 * POST /api/goals
 * Create a new goal (validate max 10 active goals)
 * Accepts optional template_id to pre-fill values
 */
const createGoal = async (req, res) => {
  try {
    const userId = req.user.dbId;
    let { title, activity_type, target_count, time_frame, template_id } = req.body;

    // If template_id is provided, use template values as defaults
    if (template_id) {
      const template = getTemplateById(template_id);
      if (!template) {
        return res.status(400).json({
          error: 'Bad Request',
          message: `Invalid template_id: ${template_id}`
        });
      }
      // Use template values, but allow overrides from request body
      title = title || template.title;
      activity_type = activity_type || template.activity_type;
      target_count = target_count || template.target_count;
      time_frame = time_frame || template.time_frame;
    }

    // Validate required fields
    if (!title || !activity_type || !target_count || !time_frame) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'title, activity_type, target_count, and time_frame are required'
      });
    }

    // Validate title length
    if (title.length > 50) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Title must be 50 characters or less'
      });
    }

    // Validate activity_type
    if (!VALID_ACTIVITY_TYPES.includes(activity_type)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `activity_type must be one of: ${VALID_ACTIVITY_TYPES.join(', ')}`
      });
    }

    // Validate time_frame
    if (!VALID_TIME_FRAMES.includes(time_frame)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `time_frame must be one of: ${VALID_TIME_FRAMES.join(', ')}`
      });
    }

    // Validate target_count
    const targetCountNum = parseInt(target_count, 10);
    if (isNaN(targetCountNum) || targetCountNum < 1 || targetCountNum > 100) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'target_count must be a number between 1 and 100'
      });
    }

    // Check active goal count
    const activeGoalCount = await UserGoal.count({
      where: {
        user_id: userId,
        is_active: true
      }
    });

    if (activeGoalCount >= MAX_ACTIVE_GOALS) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Maximum of ${MAX_ACTIVE_GOALS} active goals allowed. Please complete or delete existing goals first.`
      });
    }

    // Create the goal
    const goal = await UserGoal.create({
      user_id: userId,
      title: title.trim(),
      activity_type,
      target_count: targetCountNum,
      time_frame,
      is_active: true
    });

    // Check for Goal Setter badge (first goal created)
    checkGoalSetterBadge(userId).catch(err =>
      console.error('Goal Setter badge check failed:', err.message)
    );

    // Calculate initial progress
    const progress = await calculateProgress(goal);
    const timeRemaining = getTimeRemaining(time_frame);

    res.status(201).json({
      message: 'Goal created successfully',
      goal: {
        ...goal.toJSON(),
        progress,
        timeRemaining
      }
    });
  } catch (error) {
    console.error('Create goal error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create goal'
    });
  }
};

/**
 * GET /api/goals/:id
 * Get a single goal with progress
 */
const getGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.dbId;

    const goal = await UserGoal.findOne({
      where: { id, user_id: userId }
    });

    if (!goal) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Goal not found'
      });
    }

    const progress = await calculateProgress(goal);
    const timeRemaining = getTimeRemaining(goal.time_frame);

    res.json({
      goal: {
        ...goal.toJSON(),
        progress,
        timeRemaining
      }
    });
  } catch (error) {
    console.error('Get goal error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch goal'
    });
  }
};

/**
 * PUT /api/goals/:id
 * Update goal (only title, target_count, time_frame allowed)
 */
const updateGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.dbId;
    const { title, target_count, time_frame } = req.body;

    const goal = await UserGoal.findOne({
      where: { id, user_id: userId }
    });

    if (!goal) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Goal not found'
      });
    }

    // Only allow updating active goals
    if (!goal.is_active) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Cannot update inactive goals'
      });
    }

    // Build update object
    const updates = {};

    if (title !== undefined) {
      if (title.length > 50) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Title must be 50 characters or less'
        });
      }
      updates.title = title.trim();
    }

    if (target_count !== undefined) {
      const targetCountNum = parseInt(target_count, 10);
      if (isNaN(targetCountNum) || targetCountNum < 1 || targetCountNum > 100) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'target_count must be a number between 1 and 100'
        });
      }
      updates.target_count = targetCountNum;
    }

    if (time_frame !== undefined) {
      if (!VALID_TIME_FRAMES.includes(time_frame)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: `time_frame must be one of: ${VALID_TIME_FRAMES.join(', ')}`
        });
      }
      updates.time_frame = time_frame;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No valid fields to update. Allowed fields: title, target_count, time_frame'
      });
    }

    await goal.update(updates);

    // Recalculate progress with potentially new parameters
    const progress = await calculateProgress(goal);
    const timeRemaining = getTimeRemaining(goal.time_frame);

    res.json({
      message: 'Goal updated successfully',
      goal: {
        ...goal.toJSON(),
        progress,
        timeRemaining
      }
    });
  } catch (error) {
    console.error('Update goal error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update goal'
    });
  }
};

/**
 * DELETE /api/goals/:id
 * Soft delete (set is_active=false)
 */
const deleteGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.dbId;

    const goal = await UserGoal.findOne({
      where: { id, user_id: userId }
    });

    if (!goal) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Goal not found'
      });
    }

    // Soft delete by setting is_active = false
    await goal.update({ is_active: false });

    res.json({
      message: 'Goal deleted successfully'
    });
  } catch (error) {
    console.error('Delete goal error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete goal'
    });
  }
};

/**
 * POST /api/goals/:id/complete
 * Mark a goal as completed
 */
const completeGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.dbId;

    const goal = await UserGoal.findOne({
      where: { id, user_id: userId }
    });

    if (!goal) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Goal not found'
      });
    }

    if (!goal.is_active) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Goal is not active'
      });
    }

    if (goal.completed_at) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Goal is already completed'
      });
    }

    // Verify goal is actually achieved
    const completed = await isGoalCompleted(goal);
    if (!completed) {
      const progress = await calculateProgress(goal);
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Goal target not yet reached',
        progress
      });
    }

    await goal.update({
      completed_at: new Date(),
      is_active: false
    });

    res.json({
      message: 'Goal completed successfully',
      goal: goal.toJSON()
    });
  } catch (error) {
    console.error('Complete goal error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to complete goal'
    });
  }
};

/**
 * GET /api/goals/history
 * Get inactive/completed goals
 */
const getGoalHistory = async (req, res) => {
  try {
    const userId = req.user.dbId;
    const { limit = 50, offset = 0, completed_only } = req.query;

    const where = {
      user_id: userId,
      is_active: false
    };

    // Filter to only completed goals if requested
    if (completed_only === 'true') {
      where.completed_at = { [Op.ne]: null };
    }

    const { count, rows: goals } = await UserGoal.findAndCountAll({
      where,
      order: [['updated_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      goals,
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + goals.length < count
      }
    });
  } catch (error) {
    console.error('Get goal history error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch goal history'
    });
  }
};

/**
 * DELETE /api/goals/history
 * Bulk delete goal history (for erase feature)
 */
const deleteGoalHistory = async (req, res) => {
  try {
    const userId = req.user.dbId;
    const { older_than_days } = req.query;

    const where = {
      user_id: userId,
      is_active: false
    };

    // If older_than_days is specified, only delete goals older than that
    if (older_than_days) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(older_than_days));
      where.updated_at = { [Op.lt]: cutoffDate };
    }

    const deletedCount = await UserGoal.destroy({ where });

    res.json({
      message: `Deleted ${deletedCount} goal(s) from history`,
      deletedCount
    });
  } catch (error) {
    console.error('Delete goal history error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete goal history'
    });
  }
};

/**
 * GET /api/goals/summary
 * Get summary statistics for user's goals
 */
const getGoalsSummary = async (req, res) => {
  try {
    const userId = req.user.dbId;

    // Count active goals
    const activeCount = await UserGoal.count({
      where: { user_id: userId, is_active: true }
    });

    // Count completed goals (all time)
    const completedCount = await UserGoal.count({
      where: {
        user_id: userId,
        completed_at: { [Op.ne]: null }
      }
    });

    // Count deleted/abandoned goals
    const abandonedCount = await UserGoal.count({
      where: {
        user_id: userId,
        is_active: false,
        completed_at: null
      }
    });

    // Get active goals with progress to calculate overall completion rate
    const activeGoals = await UserGoal.findAll({
      where: { user_id: userId, is_active: true }
    });

    let overallProgress = 0;
    if (activeGoals.length > 0) {
      const goalsWithProgress = await calculateProgressForGoals(activeGoals);
      const totalPercent = goalsWithProgress.reduce((sum, g) => sum + g.progress.percentComplete, 0);
      overallProgress = Math.round(totalPercent / goalsWithProgress.length);
    }

    res.json({
      summary: {
        activeGoals: activeCount,
        completedGoals: completedCount,
        abandonedGoals: abandonedCount,
        totalGoals: activeCount + completedCount + abandonedCount,
        overallProgress,
        maxAllowed: MAX_ACTIVE_GOALS,
        slotsRemaining: MAX_ACTIVE_GOALS - activeCount
      }
    });
  } catch (error) {
    console.error('Get goals summary error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch goals summary'
    });
  }
};

module.exports = {
  getActiveGoals,
  createGoal,
  getGoal,
  updateGoal,
  deleteGoal,
  completeGoal,
  getGoalHistory,
  deleteGoalHistory,
  getGoalsSummary,
  getGoalTemplates
};
