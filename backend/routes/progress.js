const express = require('express');
const router = express.Router();
const { authenticateAndLoadUser: authenticate } = require('../middleware/auth');
const { UserAchievement, ActivityCompletion, MoodEntry, CheckinResponse, UserGoal } = require('../models');
const { Op } = require('sequelize');
const { shortLived, swr } = require('../middleware/cacheHeaders');

// Badge definitions
const BADGES = {
  first_checkin: {
    id: 'first_checkin',
    name: 'First Steps',
    description: 'Complete your first check-in',
    icon: 'star',
    category: 'milestones'
  },
  week_one: {
    id: 'week_one',
    name: 'Week One',
    description: 'Use the app for 7 days',
    icon: 'calendar',
    category: 'milestones'
  },
  streak_7: {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Maintain a 7-day check-in streak',
    icon: 'fire',
    category: 'streaks'
  },
  streak_30: {
    id: 'streak_30',
    name: 'Monthly Master',
    description: 'Maintain a 30-day check-in streak',
    icon: 'trophy',
    category: 'streaks'
  },
  mindful_5: {
    id: 'mindful_5',
    name: 'Mindful Beginner',
    description: 'Complete 5 mindfulness activities',
    icon: 'leaf',
    category: 'mindfulness'
  },
  mindful_30: {
    id: 'mindful_30',
    name: 'Zen Master',
    description: 'Complete 30 mindfulness activities',
    icon: 'spa',
    category: 'mindfulness'
  },
  breather_10: {
    id: 'breather_10',
    name: 'Deep Breather',
    description: 'Complete 10 breathing exercises',
    icon: 'wind',
    category: 'mindfulness'
  },
  moods_20: {
    id: 'moods_20',
    name: 'Mood Tracker',
    description: 'Log 20 mood entries',
    icon: 'chart-line',
    category: 'tracking'
  },
  words_500: {
    id: 'words_500',
    name: 'Journaler',
    description: 'Write 500+ words in check-in notes',
    icon: 'pencil',
    category: 'tracking'
  },
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

// Challenge definitions
const CHALLENGES = [
  {
    id: 'daily_calm',
    name: 'Daily Calm',
    description: 'Complete a breathing exercise every day for 5 days',
    target: 5,
    type: 'breathing_streak',
    reward: '50 mindfulness points',
    duration_days: 7
  },
  {
    id: 'mood_awareness',
    name: 'Mood Awareness',
    description: 'Log your mood 10 times this week',
    target: 10,
    type: 'mood_count',
    reward: 'Unlock special insights',
    duration_days: 7
  },
  {
    id: 'checkin_champion',
    name: 'Check-in Champion',
    description: 'Complete 5 full check-ins this week',
    target: 5,
    type: 'checkin_count',
    reward: 'Streak protection badge',
    duration_days: 7
  }
];

// Helper function to get start of today in UTC
const getStartOfToday = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

// Helper function to get start of a day N days ago
const getDaysAgo = (days) => {
  const date = getStartOfToday();
  date.setUTCDate(date.getUTCDate() - days);
  return date;
};

// GET /api/progress/today - Today's goal completion status (short-lived cache)
router.get('/today', authenticate, shortLived, async (req, res) => {
  try {
    const user_id = req.user.dbId;
    const startOfToday = getStartOfToday();
    const endOfToday = new Date(startOfToday);
    endOfToday.setUTCDate(endOfToday.getUTCDate() + 1);

    // Check for today's check-in (MongoDB)
    const todayCheckin = await CheckinResponse.findOne({
      user_id: req.user.dbId,
      created_at: { $gte: startOfToday, $lt: endOfToday }
    });

    // Check for today's mindfulness activity (PostgreSQL)
    const todayMindfulness = await ActivityCompletion.findOne({
      where: {
        user_id,
        completed_at: { [Op.gte]: startOfToday, [Op.lt]: endOfToday }
      }
    });

    // Check for today's mood entry (PostgreSQL)
    const todayMood = await MoodEntry.findOne({
      where: {
        user_id,
        created_at: { [Op.gte]: startOfToday, [Op.lt]: endOfToday }
      }
    });

    res.json({
      has_checkin: !!todayCheckin,
      has_mindfulness: !!todayMindfulness,
      has_quick_mood: !!todayMood,
      completed_count: [todayCheckin, todayMindfulness, todayMood].filter(Boolean).length,
      total_goals: 3
    });
  } catch (error) {
    console.error('Get today progress error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch today\'s progress'
    });
  }
});

// GET /api/progress/streaks - Current streak counts (short-lived cache)
router.get('/streaks', authenticate, shortLived, async (req, res) => {
  try {
    const user_id = req.user.dbId;

    // Calculate check-in streak
    const checkinStreak = await calculateCheckinStreak(user_id);

    // Calculate mindfulness streak
    const mindfulnessStreak = await calculateMindfulnessStreak(user_id);

    // Calculate mood streak
    const moodStreak = await calculateMoodStreak(user_id);

    // Overall streak is the minimum of all streaks (they all need to be maintained)
    const overallStreak = Math.min(checkinStreak, mindfulnessStreak, moodStreak);

    res.json({
      checkin_streak: checkinStreak,
      mindfulness_streak: mindfulnessStreak,
      quick_mood_streak: moodStreak,
      overall_streak: overallStreak
    });
  } catch (error) {
    console.error('Get streaks error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch streaks'
    });
  }
});

// Helper function to calculate check-in streak
async function calculateCheckinStreak(user_id) {
  let streak = 0;
  let currentDate = getStartOfToday();

  while (true) {
    const nextDate = new Date(currentDate);
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);

    const hasCheckin = await CheckinResponse.findOne({
      user_id,
      created_at: { $gte: currentDate, $lt: nextDate }
    });

    if (hasCheckin) {
      streak++;
      currentDate.setUTCDate(currentDate.getUTCDate() - 1);
    } else if (streak === 0) {
      // Check yesterday if today hasn't been completed yet
      currentDate.setUTCDate(currentDate.getUTCDate() - 1);
      const nextDateYesterday = new Date(currentDate);
      nextDateYesterday.setUTCDate(nextDateYesterday.getUTCDate() + 1);

      const hadCheckinYesterday = await CheckinResponse.findOne({
        user_id,
        created_at: { $gte: currentDate, $lt: nextDateYesterday }
      });

      if (hadCheckinYesterday) {
        streak++;
        currentDate.setUTCDate(currentDate.getUTCDate() - 1);
      } else {
        break;
      }
    } else {
      break;
    }

    // Safety limit
    if (streak > 365) break;
  }

  return streak;
}

// Helper function to calculate mindfulness streak
async function calculateMindfulnessStreak(user_id) {
  let streak = 0;
  let currentDate = getStartOfToday();

  while (true) {
    const nextDate = new Date(currentDate);
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);

    const hasActivity = await ActivityCompletion.findOne({
      where: {
        user_id,
        completed_at: { [Op.gte]: currentDate, [Op.lt]: nextDate }
      }
    });

    if (hasActivity) {
      streak++;
      currentDate.setUTCDate(currentDate.getUTCDate() - 1);
    } else if (streak === 0) {
      currentDate.setUTCDate(currentDate.getUTCDate() - 1);
      const nextDateYesterday = new Date(currentDate);
      nextDateYesterday.setUTCDate(nextDateYesterday.getUTCDate() + 1);

      const hadActivityYesterday = await ActivityCompletion.findOne({
        where: {
          user_id,
          completed_at: { [Op.gte]: currentDate, [Op.lt]: nextDateYesterday }
        }
      });

      if (hadActivityYesterday) {
        streak++;
        currentDate.setUTCDate(currentDate.getUTCDate() - 1);
      } else {
        break;
      }
    } else {
      break;
    }

    if (streak > 365) break;
  }

  return streak;
}

// Helper function to calculate mood streak
async function calculateMoodStreak(user_id) {
  let streak = 0;
  let currentDate = getStartOfToday();

  while (true) {
    const nextDate = new Date(currentDate);
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);

    const hasMood = await MoodEntry.findOne({
      where: {
        user_id,
        created_at: { [Op.gte]: currentDate, [Op.lt]: nextDate }
      }
    });

    if (hasMood) {
      streak++;
      currentDate.setUTCDate(currentDate.getUTCDate() - 1);
    } else if (streak === 0) {
      currentDate.setUTCDate(currentDate.getUTCDate() - 1);
      const nextDateYesterday = new Date(currentDate);
      nextDateYesterday.setUTCDate(nextDateYesterday.getUTCDate() + 1);

      const hadMoodYesterday = await MoodEntry.findOne({
        where: {
          user_id,
          created_at: { [Op.gte]: currentDate, [Op.lt]: nextDateYesterday }
        }
      });

      if (hadMoodYesterday) {
        streak++;
        currentDate.setUTCDate(currentDate.getUTCDate() - 1);
      } else {
        break;
      }
    } else {
      break;
    }

    if (streak > 365) break;
  }

  return streak;
}

// GET /api/progress/achievements - List all badges with unlocked status (semi-static badge list with user data)
router.get('/achievements', authenticate, swr, async (req, res) => {
  try {
    const user_id = req.user.dbId;

    // Get user's unlocked achievements
    const userAchievements = await UserAchievement.findAll({
      where: { user_id }
    });

    const unlockedMap = {};
    userAchievements.forEach(achievement => {
      unlockedMap[achievement.badge_id] = achievement.unlocked_at;
    });

    // Build response with all badges
    const badges = Object.values(BADGES).map(badge => ({
      ...badge,
      unlocked: !!unlockedMap[badge.id],
      unlocked_at: unlockedMap[badge.id] || null
    }));

    res.json({
      badges,
      unlocked_count: userAchievements.length,
      total_count: Object.keys(BADGES).length
    });
  } catch (error) {
    console.error('Get achievements error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch achievements'
    });
  }
});

// POST /api/progress/achievements/check - Evaluate and unlock any earned badges
router.post('/achievements/check', authenticate, async (req, res) => {
  try {
    const user_id = req.user.dbId;

    // Get already unlocked badges
    const existingAchievements = await UserAchievement.findAll({
      where: { user_id }
    });
    const unlockedBadges = new Set(existingAchievements.map(a => a.badge_id));

    const newlyUnlocked = [];

    // Check each badge
    // first_checkin: Complete your first check-in
    if (!unlockedBadges.has('first_checkin')) {
      const checkinCount = await CheckinResponse.countDocuments({ user_id });
      if (checkinCount >= 1) {
        newlyUnlocked.push('first_checkin');
      }
    }

    // week_one: Use the app for 7 days
    if (!unlockedBadges.has('week_one')) {
      const uniqueDays = await getUniqueDaysUsed(user_id);
      if (uniqueDays >= 7) {
        newlyUnlocked.push('week_one');
      }
    }

    // streak_7: Maintain a 7-day check-in streak
    if (!unlockedBadges.has('streak_7')) {
      const streak = await calculateCheckinStreak(user_id);
      if (streak >= 7) {
        newlyUnlocked.push('streak_7');
      }
    }

    // streak_30: Maintain a 30-day check-in streak
    if (!unlockedBadges.has('streak_30')) {
      const streak = await calculateCheckinStreak(user_id);
      if (streak >= 30) {
        newlyUnlocked.push('streak_30');
      }
    }

    // mindful_5: Complete 5 mindfulness activities
    if (!unlockedBadges.has('mindful_5')) {
      const activityCount = await ActivityCompletion.count({ where: { user_id } });
      if (activityCount >= 5) {
        newlyUnlocked.push('mindful_5');
      }
    }

    // mindful_30: Complete 30 mindfulness activities
    if (!unlockedBadges.has('mindful_30')) {
      const activityCount = await ActivityCompletion.count({ where: { user_id } });
      if (activityCount >= 30) {
        newlyUnlocked.push('mindful_30');
      }
    }

    // breather_10: Complete 10 breathing exercises
    if (!unlockedBadges.has('breather_10')) {
      const breathingCount = await ActivityCompletion.count({
        where: {
          user_id,
          activity_id: { [Op.like]: 'breathing_%' }
        }
      });
      if (breathingCount >= 10) {
        newlyUnlocked.push('breather_10');
      }
    }

    // moods_20: Log 20 mood entries
    if (!unlockedBadges.has('moods_20')) {
      const moodCount = await MoodEntry.count({ where: { user_id } });
      if (moodCount >= 20) {
        newlyUnlocked.push('moods_20');
      }
    }

    // words_500: Write 500+ words in check-in notes
    if (!unlockedBadges.has('words_500')) {
      const checkins = await CheckinResponse.find({ user_id });
      let totalWords = 0;
      checkins.forEach(checkin => {
        if (checkin.check_in_text) {
          totalWords += checkin.check_in_text.split(/\s+/).filter(Boolean).length;
        }
      });
      if (totalWords >= 500) {
        newlyUnlocked.push('words_500');
      }
    }

    // goal_setter: Created your first personal goal
    if (!unlockedBadges.has('goal_setter')) {
      const goalCount = await UserGoal.count({ where: { user_id } });
      if (goalCount >= 1) {
        newlyUnlocked.push('goal_setter');
      }
    }

    // goal_achiever: Completed your first personal goal
    if (!unlockedBadges.has('goal_achiever')) {
      const completedGoalCount = await UserGoal.count({
        where: {
          user_id,
          completed_at: { [Op.ne]: null }
        }
      });
      if (completedGoalCount >= 1) {
        newlyUnlocked.push('goal_achiever');
      }
    }

    // Save newly unlocked badges
    const unlockedBadgeDetails = [];
    for (const badgeId of newlyUnlocked) {
      await UserAchievement.create({
        user_id,
        badge_id: badgeId,
        unlocked_at: new Date()
      });
      unlockedBadgeDetails.push(BADGES[badgeId]);
    }

    res.json({
      newly_unlocked: unlockedBadgeDetails,
      newly_unlocked_count: newlyUnlocked.length
    });
  } catch (error) {
    console.error('Check achievements error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to check achievements'
    });
  }
});

// Helper function to count unique days the app was used
async function getUniqueDaysUsed(user_id) {
  const days = new Set();

  // Check-ins from MongoDB
  const checkins = await CheckinResponse.find({ user_id });
  checkins.forEach(c => {
    if (c.created_at) {
      days.add(c.created_at.toISOString().split('T')[0]);
    }
  });

  // Activities from PostgreSQL
  const activities = await ActivityCompletion.findAll({ where: { user_id } });
  activities.forEach(a => {
    if (a.completed_at) {
      days.add(new Date(a.completed_at).toISOString().split('T')[0]);
    }
  });

  // Moods from PostgreSQL
  const moods = await MoodEntry.findAll({ where: { user_id } });
  moods.forEach(m => {
    if (m.created_at) {
      days.add(new Date(m.created_at).toISOString().split('T')[0]);
    }
  });

  return days.size;
}

// GET /api/progress/challenges - Get active challenges with progress (short-lived cache)
router.get('/challenges', authenticate, shortLived, async (req, res) => {
  try {
    const user_id = req.user.dbId;
    const weekStart = getDaysAgo(7);

    const challengesWithProgress = await Promise.all(
      CHALLENGES.map(async (challenge) => {
        let progress = 0;

        switch (challenge.type) {
          case 'breathing_streak':
            // Count days with breathing exercises in the last week
            const breathingDays = new Set();
            const breathingActivities = await ActivityCompletion.findAll({
              where: {
                user_id,
                activity_id: { [Op.like]: 'breathing_%' },
                completed_at: { [Op.gte]: weekStart }
              }
            });
            breathingActivities.forEach(a => {
              breathingDays.add(new Date(a.completed_at).toISOString().split('T')[0]);
            });
            progress = breathingDays.size;
            break;

          case 'mood_count':
            progress = await MoodEntry.count({
              where: {
                user_id,
                created_at: { [Op.gte]: weekStart }
              }
            });
            break;

          case 'checkin_count':
            progress = await CheckinResponse.countDocuments({
              user_id,
              created_at: { $gte: weekStart }
            });
            break;
        }

        return {
          ...challenge,
          progress: Math.min(progress, challenge.target),
          completed: progress >= challenge.target,
          percentage: Math.min(100, Math.round((progress / challenge.target) * 100))
        };
      })
    );

    res.json({
      challenges: challengesWithProgress
    });
  } catch (error) {
    console.error('Get challenges error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch challenges'
    });
  }
});

module.exports = router;
