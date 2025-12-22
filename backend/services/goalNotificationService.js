const { UserGoal, User } = require('../models');
const { Op } = require('sequelize');
const { calculateProgress, isGoalCompleted, getDateRange } = require('./goalProgressService');
const { sendToUser } = require('./notificationService');
const { checkGoalAchieverBadge } = require('./badgeService');

/**
 * Check if a goal was just achieved after an activity completion
 * Called after activity is recorded (check-in, mood entry, mindfulness, etc.)
 * @param {number} userId - The user's database ID
 * @param {string} activityType - The type of activity completed
 */
const checkGoalAchieved = async (userId, activityType) => {
  try {
    // Get user to check notification preferences
    const user = await User.findByPk(userId);
    if (!user || !user.goal_notify_achieved) {
      return; // User doesn't want achievement notifications
    }

    // Find active goals for this activity type
    const goals = await UserGoal.findAll({
      where: {
        user_id: userId,
        activity_type: activityType,
        is_active: true,
        completed_at: null
      }
    });

    for (const goal of goals) {
      // Check if goal is now completed
      const completed = await isGoalCompleted(goal);

      if (completed) {
        // Mark goal as completed
        await goal.update({
          completed_at: new Date(),
          is_active: false
        });

        // Send notification
        await sendGoalAchievedNotification(user, goal);

        // Check for Goal Achiever badge (first goal completed)
        checkGoalAchieverBadge(userId).catch(err =>
          console.error('[GoalNotification] Goal Achiever badge check failed:', err.message)
        );

        console.log(`[GoalNotification] Goal achieved: ${goal.title} for user ${userId}`);
      }
    }
  } catch (error) {
    console.error('[GoalNotification] Error checking goal achieved:', error.message);
  }
};

/**
 * Check for goals expiring within 24 hours
 * Should be run daily via cron job (e.g., at 8am)
 */
const checkExpiringGoals = async () => {
  try {
    console.log('[GoalNotification] Checking for expiring goals...');

    // Get all active goals
    const activeGoals = await UserGoal.findAll({
      where: {
        is_active: true,
        completed_at: null
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'device_tokens', 'goal_notify_expiring']
      }]
    });

    const now = new Date();
    let notificationCount = 0;

    for (const goal of activeGoals) {
      // Skip if user doesn't want expiring notifications
      if (!goal.user?.goal_notify_expiring) {
        continue;
      }

      // Calculate time remaining
      const { endDate } = getDateRange(goal.time_frame);
      const hoursRemaining = (endDate - now) / (1000 * 60 * 60);

      // If less than 24 hours remaining
      if (hoursRemaining > 0 && hoursRemaining <= 24) {
        // Check progress
        const progress = await calculateProgress(goal);

        // Only notify if not yet complete
        if (progress.percentComplete < 100) {
          await sendGoalExpiringNotification(goal.user, goal, progress, hoursRemaining);
          notificationCount++;
        }
      }
    }

    console.log(`[GoalNotification] Sent ${notificationCount} expiring goal notifications`);
  } catch (error) {
    console.error('[GoalNotification] Error checking expiring goals:', error.message);
  }
};

/**
 * Check for goals that expired incomplete the previous day
 * Should be run daily via cron job (e.g., at 9am)
 */
const checkIncompleteGoals = async () => {
  try {
    console.log('[GoalNotification] Checking for incomplete goals...');

    // Get all active goals
    const activeGoals = await UserGoal.findAll({
      where: {
        is_active: true,
        completed_at: null
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'device_tokens', 'goal_notify_incomplete']
      }]
    });

    const now = new Date();
    let notificationCount = 0;
    let deactivatedCount = 0;

    for (const goal of activeGoals) {
      // Calculate time remaining
      const { endDate } = getDateRange(goal.time_frame);

      // If goal period has ended
      if (endDate < now) {
        // Check final progress
        const progress = await calculateProgress(goal);

        // Goal expired incomplete
        if (progress.percentComplete < 100) {
          // Deactivate the goal
          await goal.update({ is_active: false });
          deactivatedCount++;

          // Send notification if user wants it
          if (goal.user?.goal_notify_incomplete) {
            await sendGoalIncompleteNotification(goal.user, goal, progress);
            notificationCount++;
          }
        } else {
          // Goal was actually completed, mark it
          await goal.update({
            completed_at: new Date(),
            is_active: false
          });
        }
      }
    }

    console.log(`[GoalNotification] Deactivated ${deactivatedCount} expired goals, sent ${notificationCount} incomplete notifications`);
  } catch (error) {
    console.error('[GoalNotification] Error checking incomplete goals:', error.message);
  }
};

/**
 * Send push notification for goal achieved
 */
const sendGoalAchievedNotification = async (user, goal) => {
  try {
    await sendToUser(user.id, {
      title: 'Goal Achieved!',
      body: `Congratulations! You completed "${goal.title}"`
    }, {
      type: 'goal_achieved',
      goalId: goal.id,
      goalTitle: goal.title,
      channelId: 'goals'
    });
  } catch (error) {
    console.error('[GoalNotification] Error sending achieved notification:', error.message);
  }
};

/**
 * Send push notification for expiring goal
 */
const sendGoalExpiringNotification = async (user, goal, progress, hoursRemaining) => {
  try {
    const hours = Math.round(hoursRemaining);
    await sendToUser(user.id, {
      title: 'Goal Expiring Soon',
      body: `"${goal.title}" expires in ${hours} hour${hours !== 1 ? 's' : ''}. You're at ${progress.current}/${progress.target}!`
    }, {
      type: 'goal_expiring',
      goalId: goal.id,
      goalTitle: goal.title,
      progress: String(progress.percentComplete),
      channelId: 'goals'
    });
  } catch (error) {
    console.error('[GoalNotification] Error sending expiring notification:', error.message);
  }
};

/**
 * Send push notification for incomplete goal
 */
const sendGoalIncompleteNotification = async (user, goal, progress) => {
  try {
    await sendToUser(user.id, {
      title: 'Goal Expired',
      body: `"${goal.title}" ended at ${progress.current}/${progress.target}. Don't worry, you can try again!`
    }, {
      type: 'goal_incomplete',
      goalId: goal.id,
      goalTitle: goal.title,
      finalProgress: String(progress.percentComplete),
      channelId: 'goals'
    });
  } catch (error) {
    console.error('[GoalNotification] Error sending incomplete notification:', error.message);
  }
};

module.exports = {
  checkGoalAchieved,
  checkExpiringGoals,
  checkIncompleteGoals
};
