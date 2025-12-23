'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create user_device_tokens table
    await queryInterface.createTable('user_device_tokens', {
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
      token: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      platform: {
        type: Sequelize.STRING(10),
        allowNull: false,
        validate: {
          isIn: [['ios', 'android', 'web']],
        },
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      last_used_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    // Add unique constraint on user_id + token
    await queryInterface.addConstraint('user_device_tokens', {
      fields: ['user_id', 'token'],
      type: 'unique',
      name: 'unique_user_device_token',
    });

    // Add index on user_id for faster lookups
    await queryInterface.addIndex('user_device_tokens', ['user_id'], {
      name: 'idx_device_tokens_user',
    });

    // Add partial index on active tokens
    await queryInterface.sequelize.query(`
      CREATE INDEX idx_device_tokens_active
      ON user_device_tokens(user_id)
      WHERE is_active = true
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('user_device_tokens');
  },
};
