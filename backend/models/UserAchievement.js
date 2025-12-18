const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const UserAchievement = sequelize.define('UserAchievement', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  badge_id: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  unlocked_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'user_achievements',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'badge_id']
    }
  ]
});

module.exports = UserAchievement;
