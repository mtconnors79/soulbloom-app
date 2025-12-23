/**
 * Pattern Check Cron Job
 *
 * Runs scheduled checks to detect mood patterns and trigger interventions:
 * - Negative mood streak detection (3+ consecutive low mood days)
 * - Streak at risk notifications (evening reminder if no check-in)
 * - Re-engagement for inactive users (3-14 days since last check-in)
 * - High stress pattern detection
 */

const cron = require('node-cron');
const patternDetectionService = require('../services/patternDetectionService');
const pushNotificationService = require('../services/pushNotificationService');

let negativePatternJob = null;
let streakRiskJob = null;
let reengagementJob = null;

/**
 * Notification messages for different patterns
 */
const NOTIFICATION_MESSAGES = {
  negative_streak: {
    title: "We're here for you 💙",
    body: "We noticed you've been having a tough few days. Would a breathing exercise help?",
    data: { action: 'open_breathing' },
  },
  streak_at_risk: {
    title: (streak) => `Your ${streak}-day streak! 🔥`,
    body: "Don't forget to check in today to keep it going!",
    data: { action: 'open_checkin' },
  },
  re_engagement: {
    title: 'We miss you! 🌱',
    body: "It's been a few days since your last check-in. How are you feeling?",
    data: { action: 'open_checkin' },
  },
  high_stress: {
    title: 'Take a breath 🧘',
    body: "You've had some stressful days lately. Would you like to try a calming exercise?",
    data: { action: 'open_mindfulness' },
  },
};

/**
 * Process negative mood patterns for all users
 */
const processNegativePatterns = async () => {
  console.log('[PatternJob] Processing negative mood patterns...');

  try {
    const users = await patternDetectionService.getActiveUsersWithTokens();
    console.log(`[PatternJob] Checking ${users.length} users for negative patterns`);

    let notificationsSent = 0;

    for (const user of users) {
      try {
        const pattern = await patternDetectionService.checkNegativePattern(user.id);

        if (pattern) {
          console.log(`[PatternJob] Negative pattern detected for user ${user.id}: ${pattern.days} days`);

          const result = await pushNotificationService.sendToUser(
            user.id,
            'pattern_intervention',
            NOTIFICATION_MESSAGES.negative_streak.title,
            NOTIFICATION_MESSAGES.negative_streak.body,
            {
              ...NOTIFICATION_MESSAGES.negative_streak.data,
              pattern: 'negative_streak',
              days: pattern.days.toString(),
            }
          );

          if (result.success) {
            notificationsSent++;
          }
        }

        // Also check for high stress
        const stressPattern = await patternDetectionService.checkHighStressPattern(user.id);

        if (stressPattern) {
          console.log(`[PatternJob] High stress pattern detected for user ${user.id}`);

          await pushNotificationService.sendToUser(
            user.id,
            'pattern_intervention',
            NOTIFICATION_MESSAGES.high_stress.title,
            NOTIFICATION_MESSAGES.high_stress.body,
            {
              ...NOTIFICATION_MESSAGES.high_stress.data,
              pattern: 'high_stress',
              avgStress: stressPattern.avgStress.toString(),
            }
          );
        }
      } catch (error) {
        console.error(`[PatternJob] Error processing user ${user.id}:`, error.message);
      }
    }

    console.log(`[PatternJob] Negative pattern check complete. Sent ${notificationsSent} notifications`);
  } catch (error) {
    console.error('[PatternJob] Negative pattern processing failed:', error.message);
  }
};

/**
 * Process streak at risk notifications for all users
 */
const processStreakRisk = async () => {
  console.log('[PatternJob] Processing streak risk notifications...');

  try {
    const users = await patternDetectionService.getActiveUsersWithTokens();
    let notificationsSent = 0;

    for (const user of users) {
      try {
        const pattern = await patternDetectionService.checkStreakAtRisk(user.id);

        if (pattern) {
          console.log(`[PatternJob] Streak at risk for user ${user.id}: ${pattern.currentStreak} days`);

          const result = await pushNotificationService.sendToUser(
            user.id,
            'streak_reminders',
            NOTIFICATION_MESSAGES.streak_at_risk.title(pattern.currentStreak),
            NOTIFICATION_MESSAGES.streak_at_risk.body,
            {
              ...NOTIFICATION_MESSAGES.streak_at_risk.data,
              pattern: 'streak_at_risk',
              streak: pattern.currentStreak.toString(),
            }
          );

          if (result.success) {
            notificationsSent++;
          }
        }
      } catch (error) {
        console.error(`[PatternJob] Error checking streak for user ${user.id}:`, error.message);
      }
    }

    console.log(`[PatternJob] Streak risk check complete. Sent ${notificationsSent} notifications`);
  } catch (error) {
    console.error('[PatternJob] Streak risk processing failed:', error.message);
  }
};

/**
 * Process re-engagement notifications for inactive users
 */
const processReengagement = async () => {
  console.log('[PatternJob] Processing re-engagement notifications...');

  try {
    const users = await patternDetectionService.getActiveUsersWithTokens();
    let notificationsSent = 0;

    for (const user of users) {
      try {
        const pattern = await patternDetectionService.checkReengagementOpportunity(user.id);

        if (pattern) {
          console.log(`[PatternJob] Re-engagement opportunity for user ${user.id}: ${pattern.daysSinceLastCheckin} days inactive`);

          const result = await pushNotificationService.sendToUser(
            user.id,
            're_engagement',
            NOTIFICATION_MESSAGES.re_engagement.title,
            NOTIFICATION_MESSAGES.re_engagement.body,
            {
              ...NOTIFICATION_MESSAGES.re_engagement.data,
              pattern: 're_engagement',
              daysSinceLastCheckin: pattern.daysSinceLastCheckin.toString(),
            }
          );

          if (result.success) {
            notificationsSent++;
          }
        }
      } catch (error) {
        console.error(`[PatternJob] Error checking re-engagement for user ${user.id}:`, error.message);
      }
    }

    console.log(`[PatternJob] Re-engagement check complete. Sent ${notificationsSent} notifications`);
  } catch (error) {
    console.error('[PatternJob] Re-engagement processing failed:', error.message);
  }
};

/**
 * Initialize pattern check cron jobs
 */
const initializePatternCheckJobs = () => {
  console.log('[PatternJob] Initializing pattern check cron jobs...');

  // Check for negative patterns daily at 10:00 AM
  // This gives users time to check in before we analyze their pattern
  negativePatternJob = cron.schedule(
    '0 10 * * *',
    async () => {
      console.log('[PatternJob] Running negative pattern check...');
      await processNegativePatterns();
    },
    {
      timezone: 'America/Los_Angeles',
    }
  );

  // Check for streak at risk at 7:00 PM daily
  // Evening reminder to maintain streak
  streakRiskJob = cron.schedule(
    '0 19 * * *',
    async () => {
      console.log('[PatternJob] Running streak risk check...');
      await processStreakRisk();
    },
    {
      timezone: 'America/Los_Angeles',
    }
  );

  // Check for re-engagement at 11:00 AM daily
  // Mid-morning is a good time to reach inactive users
  reengagementJob = cron.schedule(
    '0 11 * * *',
    async () => {
      console.log('[PatternJob] Running re-engagement check...');
      await processReengagement();
    },
    {
      timezone: 'America/Los_Angeles',
    }
  );

  console.log('[PatternJob] Pattern check cron jobs initialized');
  console.log('[PatternJob] - Negative pattern check: daily at 10:00 AM');
  console.log('[PatternJob] - Streak risk check: daily at 7:00 PM');
  console.log('[PatternJob] - Re-engagement check: daily at 11:00 AM');
};

/**
 * Stop all pattern check jobs
 */
const stopPatternCheckJobs = () => {
  if (negativePatternJob) {
    negativePatternJob.stop();
    console.log('[PatternJob] Negative pattern job stopped');
  }
  if (streakRiskJob) {
    streakRiskJob.stop();
    console.log('[PatternJob] Streak risk job stopped');
  }
  if (reengagementJob) {
    reengagementJob.stop();
    console.log('[PatternJob] Re-engagement job stopped');
  }
};

/**
 * Manually trigger pattern checks (for testing)
 */
const triggerNegativePatternCheck = async () => {
  console.log('[PatternJob] Manually triggering negative pattern check...');
  await processNegativePatterns();
};

const triggerStreakRiskCheck = async () => {
  console.log('[PatternJob] Manually triggering streak risk check...');
  await processStreakRisk();
};

const triggerReengagementCheck = async () => {
  console.log('[PatternJob] Manually triggering re-engagement check...');
  await processReengagement();
};

module.exports = {
  initializePatternCheckJobs,
  stopPatternCheckJobs,
  triggerNegativePatternCheck,
  triggerStreakRiskCheck,
  triggerReengagementCheck,
};
