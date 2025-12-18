// MongoDB Models (Mongoose)
const CheckinResponse = require('./CheckinResponse');
const ActivityLog = require('./ActivityLog');

// PostgreSQL Models (Sequelize)
const User = require('./User');
const Profile = require('./Profile');
const MoodEntry = require('./MoodEntry');
const EmergencyContact = require('./EmergencyContact');
const ActivityCompletion = require('./ActivityCompletion');
const UserAchievement = require('./UserAchievement');

// Define Sequelize Associations
User.hasOne(Profile, { foreignKey: 'user_id', as: 'profile' });
Profile.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(MoodEntry, { foreignKey: 'user_id', as: 'moodEntries' });
MoodEntry.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(EmergencyContact, { foreignKey: 'user_id', as: 'emergencyContacts' });
EmergencyContact.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(ActivityCompletion, { foreignKey: 'user_id', as: 'activityCompletions' });
ActivityCompletion.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(UserAchievement, { foreignKey: 'user_id', as: 'achievements' });
UserAchievement.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = {
  // MongoDB Models
  CheckinResponse,
  ActivityLog,
  // PostgreSQL Models
  User,
  Profile,
  MoodEntry,
  EmergencyContact,
  ActivityCompletion,
  UserAchievement
};
