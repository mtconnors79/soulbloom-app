const mongoose = require('mongoose');

const aiAnalysisSchema = new mongoose.Schema({
  sentiment: {
    type: String,
    enum: ['positive', 'negative', 'neutral', 'mixed'],
  },
  keywords: [{
    type: String
  }],
  suggestions: [{
    type: String
  }],
  risk_level: {
    type: String,
    enum: ['low', 'moderate', 'high', 'critical'],
  }
}, { _id: false });

const checkinResponseSchema = new mongoose.Schema({
  user_id: {
    type: Number,
    required: true,
    index: true
  },
  mood_rating: {
    type: String,
    enum: ['great', 'good', 'okay', 'not_good', 'terrible'],
    required: true
  },
  stress_level: {
    type: Number,
    min: 1,
    max: 10,
    required: true
  },
  selected_emotions: [{
    type: String,
    enum: ['anxious', 'calm', 'sad', 'happy', 'angry', 'tired', 'energetic', 'stressed']
  }],
  check_in_text: {
    type: String,
    default: ''
  },
  ai_analysis: {
    type: aiAnalysisSchema,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  collection: 'checkin_responses',
  timestamps: false
});

// Index for querying user check-ins by date range
checkinResponseSchema.index({ user_id: 1, created_at: -1 });

const CheckinResponse = mongoose.model('CheckinResponse', checkinResponseSchema);

module.exports = CheckinResponse;
