'use strict';

/**
 * Migration: Add Performance Indexes
 *
 * This migration adds compound indexes to optimize common query patterns:
 *
 * 1. mood_entries: Queries by user_id + check_in_date (getMoodEntries)
 * 2. mood_entries: Queries by user_id + created_at (getMoodStats with days param)
 * 3. user_achievements: Queries by user_id alone (getAchievements)
 *
 * Also removes duplicate indexes created by Sequelize that are redundant.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // =====================================================
    // ADD COMPOUND INDEXES FOR COMMON QUERY PATTERNS
    // =====================================================

    // mood_entries: user's moods by date (getMoodEntries API)
    // Query: WHERE user_id = X ORDER BY check_in_date DESC
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_mood_entries_user_date
      ON mood_entries(user_id, check_in_date DESC);
    `);

    // mood_entries: user's moods by created_at (getMoodStats with days param)
    // Query: WHERE user_id = X AND created_at BETWEEN start AND end
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_mood_entries_user_created
      ON mood_entries(user_id, created_at DESC);
    `);

    // user_achievements: user's badges (getAchievements API)
    // Query: WHERE user_id = X ORDER BY unlocked_at DESC
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_user_achievements_user_unlocked
      ON user_achievements(user_id, unlocked_at DESC);
    `);

    // =====================================================
    // ADD PARTIAL INDEX FOR ACTIVE GOALS OPTIMIZATION
    // =====================================================

    // Partial index for active goals only (most common query pattern)
    // Query: WHERE user_id = X AND is_active = true
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_user_goals_user_active_partial
      ON user_goals(user_id)
      WHERE is_active = true;
    `);

    // =====================================================
    // REMOVE DUPLICATE INDEXES (cleanup)
    // =====================================================

    // These duplicates were created by Sequelize auto-sync + manual migrations
    // Keeping the idx_* versions which have consistent naming

    // Duplicate mood_entries indexes
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS mood_entries_user_id;
    `).catch(() => {}); // Ignore if doesn't exist

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS mood_entries_check_in_date;
    `).catch(() => {}); // Ignore if doesn't exist

    // Duplicate activity_completions indexes
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS activity_completions_user_id;
    `).catch(() => {});

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS activity_completions_completed_at;
    `).catch(() => {});

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS activity_completions_activity_id;
    `).catch(() => {});

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS activity_completions_user_id_completed_at;
    `).catch(() => {});

    // Duplicate profiles indexes
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS profiles_user_id;
    `).catch(() => {});

    // Duplicate users indexes (keep users_pkey and one email unique)
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS users_email;
    `).catch(() => {});

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS users_email_key1;
    `).catch(() => {});

    console.log('Performance indexes created successfully');
  },

  async down(queryInterface, Sequelize) {
    // Drop the new indexes we created
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_mood_entries_user_date;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_mood_entries_user_created;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_user_achievements_user_unlocked;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_user_goals_user_active_partial;
    `);

    // Note: We don't recreate the duplicate indexes in down migration
    // as they were redundant and the application works without them

    console.log('Performance indexes dropped');
  }
};
