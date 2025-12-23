/**
 * Pattern Detection Service
 *
 * Detects mood patterns to trigger proactive interventions:
 * - Consecutive negative mood days
 * - Streak at risk
 * - Re-engagement opportunities
 * - Crisis keyword detection
 */

const CheckinResponse = require('../models/CheckinResponse');
const { sequelize } = require('../config/sequelize');
const { QueryTypes } = require('sequelize');

/**
 * Mood rating values for pattern detection
 * Maps string mood to numeric value for comparison
 */
const MOOD_VALUES = {
  terrible: 1,
  not_good: 2,
  okay: 3,
  good: 4,
  great: 5,
};

/**
 * Mood threshold for "negative" mood
 * 1 (terrible) and 2 (not_good) are considered negative
 */
const NEGATIVE_MOOD_THRESHOLD = 2;

/**
 * Number of consecutive days required to trigger intervention
 */
const CONSECUTIVE_DAYS_THRESHOLD = 3;

class PatternDetectionService {
  /**
   * Check for consecutive negative mood days
   * Returns pattern info if 3+ days of low mood detected
   *
   * @param {number} userId - User ID
   * @returns {Object|null} Pattern info or null
   */
  async checkNegativePattern(userId) {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Aggregate check-ins by day
      const dailyMoods = await CheckinResponse.aggregate([
        {
          $match: {
            user_id: userId,
            created_at: { $gte: sevenDaysAgo },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$created_at' },
            },
            moods: { $push: '$mood_rating' },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { _id: -1 }, // Most recent first
        },
        {
          $limit: 7,
        },
      ]);

      if (dailyMoods.length < CONSECUTIVE_DAYS_THRESHOLD) {
        return null;
      }

      // Calculate average mood value for each day
      const daysWithMoodValues = dailyMoods.map((day) => {
        const moodValues = day.moods.map((mood) => MOOD_VALUES[mood] || 3);
        const avgMood = moodValues.reduce((sum, v) => sum + v, 0) / moodValues.length;
        return {
          date: day._id,
          avgMood,
          isNegative: avgMood <= NEGATIVE_MOOD_THRESHOLD,
        };
      });

      // Check for consecutive negative days (starting from most recent)
      let consecutiveNegativeDays = 0;
      let totalNegativeMood = 0;

      for (const day of daysWithMoodValues) {
        if (day.isNegative) {
          consecutiveNegativeDays++;
          totalNegativeMood += day.avgMood;
        } else {
          break; // Stop at first non-negative day
        }
      }

      if (consecutiveNegativeDays >= CONSECUTIVE_DAYS_THRESHOLD) {
        return {
          pattern: 'negative_streak',
          days: consecutiveNegativeDays,
          avgMood: totalNegativeMood / consecutiveNegativeDays,
          startDate: daysWithMoodValues[consecutiveNegativeDays - 1].date,
          endDate: daysWithMoodValues[0].date,
        };
      }

      return null;
    } catch (error) {
      console.error('[PatternDetection] Check negative pattern error:', error.message);
      return null;
    }
  }

  /**
   * Check if user's streak is at risk (evening with no check-in)
   *
   * @param {number} userId - User ID
   * @returns {Object|null} Pattern info or null
   */
  async checkStreakAtRisk(userId) {
    try {
      // Get current streak from PostgreSQL
      const streakResult = await sequelize.query(
        `SELECT
           COALESCE(
             (SELECT COUNT(DISTINCT DATE(la.performed_at))
              FROM activity_logs la
              WHERE la.user_id = :userId
                AND la.activity_type = 'check_in'
                AND la.performed_at >= (
                  SELECT MAX(performed_at) - INTERVAL '30 days'
                  FROM activity_logs
                  WHERE user_id = :userId AND activity_type = 'check_in'
                )
             ), 0) as current_streak`,
        {
          replacements: { userId },
          type: QueryTypes.SELECT,
        }
      );

      const currentStreak = parseInt(streakResult[0]?.current_streak) || 0;

      // Only warn if streak is worth protecting (3+ days)
      if (currentStreak < 3) {
        return null;
      }

      // Check if checked in today (MongoDB)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayCheckin = await CheckinResponse.findOne({
        user_id: userId,
        created_at: { $gte: today, $lt: tomorrow },
      });

      if (!todayCheckin) {
        const hour = new Date().getHours();
        // Only alert in the evening (after 6 PM local time)
        if (hour >= 18) {
          return {
            pattern: 'streak_at_risk',
            currentStreak,
            hoursRemaining: 24 - hour,
          };
        }
      }

      return null;
    } catch (error) {
      console.error('[PatternDetection] Check streak at risk error:', error.message);
      return null;
    }
  }

  /**
   * Check for re-engagement opportunity (user hasn't checked in for 3+ days)
   *
   * @param {number} userId - User ID
   * @returns {Object|null} Pattern info or null
   */
  async checkReengagementOpportunity(userId) {
    try {
      // Find most recent check-in
      const lastCheckin = await CheckinResponse.findOne({
        user_id: userId,
      }).sort({ created_at: -1 });

      if (!lastCheckin) {
        return null;
      }

      const daysSinceLastCheckin = Math.floor(
        (Date.now() - lastCheckin.created_at.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Only re-engage if 3-14 days since last check-in
      // Don't re-engage if too long (user may have intentionally stopped)
      if (daysSinceLastCheckin >= 3 && daysSinceLastCheckin <= 14) {
        return {
          pattern: 're_engagement',
          daysSinceLastCheckin,
          lastCheckinDate: lastCheckin.created_at,
          lastMood: lastCheckin.mood_rating,
        };
      }

      return null;
    } catch (error) {
      console.error('[PatternDetection] Check re-engagement error:', error.message);
      return null;
    }
  }

  /**
   * Check for high stress pattern (3+ days of stress level >= 7)
   *
   * @param {number} userId - User ID
   * @returns {Object|null} Pattern info or null
   */
  async checkHighStressPattern(userId) {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Aggregate stress by day
      const dailyStress = await CheckinResponse.aggregate([
        {
          $match: {
            user_id: userId,
            created_at: { $gte: sevenDaysAgo },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$created_at' },
            },
            avgStress: { $avg: '$stress_level' },
          },
        },
        {
          $sort: { _id: -1 },
        },
        {
          $limit: 7,
        },
      ]);

      if (dailyStress.length < 3) {
        return null;
      }

      // Check for 3+ consecutive high stress days
      let consecutiveHighStressDays = 0;
      let totalStress = 0;

      for (const day of dailyStress) {
        if (day.avgStress >= 7) {
          consecutiveHighStressDays++;
          totalStress += day.avgStress;
        } else {
          break;
        }
      }

      if (consecutiveHighStressDays >= 3) {
        return {
          pattern: 'high_stress',
          days: consecutiveHighStressDays,
          avgStress: totalStress / consecutiveHighStressDays,
        };
      }

      return null;
    } catch (error) {
      console.error('[PatternDetection] Check high stress error:', error.message);
      return null;
    }
  }

  /**
   * Run all pattern checks for a user
   *
   * @param {number} userId - User ID
   * @returns {Array<Object>} Array of detected patterns
   */
  async runAllChecks(userId) {
    const patterns = [];

    const negativePattern = await this.checkNegativePattern(userId);
    if (negativePattern) {
      patterns.push(negativePattern);
    }

    const streakRisk = await this.checkStreakAtRisk(userId);
    if (streakRisk) {
      patterns.push(streakRisk);
    }

    const reengagement = await this.checkReengagementOpportunity(userId);
    if (reengagement) {
      patterns.push(reengagement);
    }

    const highStress = await this.checkHighStressPattern(userId);
    if (highStress) {
      patterns.push(highStress);
    }

    return patterns;
  }

  /**
   * Get all users with active device tokens for pattern checking
   *
   * @returns {Array<{id: number}>} Array of user IDs
   */
  async getActiveUsersWithTokens() {
    try {
      const users = await sequelize.query(
        `SELECT DISTINCT u.id
         FROM users u
         INNER JOIN user_device_tokens udt ON u.id = udt.user_id
         WHERE udt.is_active = true`,
        {
          type: QueryTypes.SELECT,
        }
      );
      return users;
    } catch (error) {
      console.error('[PatternDetection] Get active users error:', error.message);
      return [];
    }
  }
}

module.exports = new PatternDetectionService();
