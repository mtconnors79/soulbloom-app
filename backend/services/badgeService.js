const { UserAchievement, UserGoal } = require('../models');
const { Op } = require('sequelize');
const { sendToUser } = require('./notificationService');

// Badge definitions (keep in sync with routes/progress.js)
const BADGES = {
  goal_setter: {
    id: 'goal_setter',
    name: 'Goal Setter',
    description: 'Created your first personal goal',
    icon: 'target',
    category: 'goals'
  },
  goal_achiever: {
    id: 'goal_achiever',
    name: 'Goal Achiever',
    description: 'Completed your first personal goal',
    icon: 'ribbon',
    category: 'goals'
  }
};

/**
 * Check if user has a specific badge
 * @param {number} userId - User's database ID
 * @param {string} badgeId - Badge ID to check
 * @returns {boolean} - True if user has the badge
 */
const hasBadge = async (userId, badgeId) => {
  const achievement = await UserAchievement.findOne({
    where: {
      user_id: userId,
      badge_id: badgeId
    }
  });
  return !!achievement;
};

/**
 * Award a badge to a user
 * @param {number} userId - User's database ID
 * @param {string} badgeId - Badge ID to award
 * @returns {object|null} - Badge details if newly awarded, null if already had
 */
const awardBadge = async (userId, badgeId) => {
  try {
    // Check if user already has this badge
    const hasIt = await hasBadge(userId, badgeId);
    if (hasIt) {
      return null;
    }

    // Award the badge
    await UserAchievement.create({
      user_id: userId,
      badge_id: badgeId,
      unlocked_at: new Date()
    });

    const badge = BADGES[badgeId];
    console.log(`[BadgeService] Awarded ${badgeId} badge to user ${userId}`);

    // Send notification
    if (badge) {
      sendToUser(userId, {
        title: 'Achievement Unlocked!',
        body: `You earned "${badge.name}" - ${badge.description}`
      }, {
        type: 'badge_unlocked',
        badgeId: badgeId,
        badgeName: badge.name,
        channelId: 'achievements'
      }).catch(err => console.error('[BadgeService] Notification failed:', err.message));
    }

    return badge || { id: badgeId };
  } catch (error) {
    console.error('[BadgeService] Error awarding badge:', error.message);
    return null;
  }
};

/**
 * Check and award Goal Setter badge (first goal created)
 * @param {number} userId - User's database ID
 */
const checkGoalSetterBadge = async (userId) => {
  try {
    // Only award if this is their first goal
    const goalCount = await UserGoal.count({ where: { user_id: userId } });
    if (goalCount === 1) {
      return await awardBadge(userId, 'goal_setter');
    }
    return null;
  } catch (error) {
    console.error('[BadgeService] Error checking goal_setter badge:', error.message);
    return null;
  }
};

/**
 * Check and award Goal Achiever badge (first goal completed)
 * @param {number} userId - User's database ID
 */
const checkGoalAchieverBadge = async (userId) => {
  try {
    // Only award if this is their first completed goal
    const completedCount = await UserGoal.count({
      where: {
        user_id: userId,
        completed_at: { [Op.ne]: null }
      }
    });
    if (completedCount === 1) {
      return await awardBadge(userId, 'goal_achiever');
    }
    return null;
  } catch (error) {
    console.error('[BadgeService] Error checking goal_achiever badge:', error.message);
    return null;
  }
};

module.exports = {
  BADGES,
  hasBadge,
  awardBadge,
  checkGoalSetterBadge,
  checkGoalAchieverBadge
};
