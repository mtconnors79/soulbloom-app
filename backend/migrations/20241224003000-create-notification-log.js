'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create notification_log table
    await queryInterface.createTable('notification_log', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      notification_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      body: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      data: {
        type: Sequelize.JSONB,
        defaultValue: {},
      },
      status: {
        type: Sequelize.STRING(20),
        defaultValue: 'sent',
        validate: {
          isIn: [['sent', 'delivered', 'failed', 'blocked']],
        },
      },
      fcm_response: {
        type: Sequelize.JSONB,
        defaultValue: null,
      },
      sent_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    // Add index for querying user notifications by date
    await queryInterface.addIndex('notification_log', ['user_id', 'sent_at'], {
      name: 'idx_notification_log_user_date',
      order: [['sent_at', 'DESC']],
    });

    // Add index for querying by notification type and date
    await queryInterface.addIndex('notification_log', ['notification_type', 'sent_at'], {
      name: 'idx_notification_log_type_date',
      order: [['sent_at', 'DESC']],
    });

    // Add index for frequency cap queries (user + type + recent)
    await queryInterface.addIndex('notification_log', ['user_id', 'notification_type', 'sent_at'], {
      name: 'idx_notification_log_frequency_cap',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('notification_log');
  },
};
