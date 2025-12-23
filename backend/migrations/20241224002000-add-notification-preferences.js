'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add notification_preferences JSONB column to users table
    await queryInterface.addColumn('users', 'notification_preferences', {
      type: Sequelize.JSONB,
      defaultValue: {
        // Notification types
        pattern_intervention: true,
        goal_reminders: true,
        streak_reminders: true,
        care_circle_alerts: true,
        check_in_reminders: true,
        re_engagement: true,
        // Quiet hours settings
        quiet_hours_enabled: true,
        quiet_hours_start: '21:00',
        quiet_hours_end: '08:00',
        // Frequency limits
        daily_limit: 5,
        // User timezone
        timezone: 'America/New_York',
      },
    });

    // Add index for querying users by notification preferences
    await queryInterface.sequelize.query(`
      CREATE INDEX idx_users_notification_prefs
      ON users USING gin (notification_preferences)
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_users_notification_prefs
    `);
    await queryInterface.removeColumn('users', 'notification_preferences');
  },
};
