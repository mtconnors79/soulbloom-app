const { CheckinResponse } = require('../models');
const sentimentService = require('../services/sentimentService');

const createCheckin = async (req, res) => {
  try {
    const {
      mood_rating,
      stress_level,
      selected_emotions = [],
      check_in_text = '',
      ai_analysis,
      auto_analyze = false
    } = req.body;
    const user_id = req.user.dbId;

    // Validate required fields
    if (!mood_rating) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'mood_rating is required'
      });
    }

    if (!stress_level || stress_level < 1 || stress_level > 10) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'stress_level is required and must be between 1 and 10'
      });
    }

    const validMoods = ['great', 'good', 'okay', 'not_good', 'terrible'];
    if (!validMoods.includes(mood_rating)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid mood_rating. Must be one of: great, good, okay, not_good, terrible'
      });
    }

    const validEmotions = ['anxious', 'calm', 'sad', 'happy', 'angry', 'tired', 'energetic', 'stressed'];
    const filteredEmotions = selected_emotions.filter(e => validEmotions.includes(e));

    let finalAnalysis = ai_analysis || null;

    // Auto-analyze if requested and no analysis provided
    if (auto_analyze && !ai_analysis) {
      try {
        finalAnalysis = await sentimentService.analyzeCheckIn(check_in_text, {
          mood_rating,
          stress_level,
          selected_emotions: filteredEmotions
        });
      } catch (analysisError) {
        console.error('Auto-analysis failed:', analysisError.message);
        // Continue without analysis
      }
    }

    const checkin = await CheckinResponse.create({
      user_id,
      mood_rating,
      stress_level,
      selected_emotions: filteredEmotions,
      check_in_text,
      ai_analysis: finalAnalysis,
      created_at: new Date()
    });

    res.status(201).json({
      message: 'Check-in created successfully',
      checkin,
      ...(finalAnalysis?.requires_immediate_attention && {
        alert: {
          type: 'crisis',
          message: 'We noticed some concerning content. Please reach out to a crisis helpline if you need support.'
        }
      })
    });
  } catch (error) {
    console.error('Create check-in error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create check-in'
    });
  }
};

const getCheckins = async (req, res) => {
  try {
    const user_id = req.user.dbId;
    const { start_date, end_date, limit = 30, offset = 0 } = req.query;

    const query = { user_id };

    if (start_date || end_date) {
      query.created_at = {};
      if (start_date) query.created_at.$gte = new Date(start_date);
      if (end_date) query.created_at.$lte = new Date(end_date);
    }

    const total = await CheckinResponse.countDocuments(query);
    const checkins = await CheckinResponse.find(query)
      .sort({ created_at: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit));

    res.json({
      checkins,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + checkins.length < total
      }
    });
  } catch (error) {
    console.error('Get check-ins error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch check-ins'
    });
  }
};

const getCheckin = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.dbId;

    const checkin = await CheckinResponse.findOne({
      _id: id,
      user_id
    });

    if (!checkin) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Check-in not found'
      });
    }

    res.json({ checkin });
  } catch (error) {
    console.error('Get check-in error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch check-in'
    });
  }
};

const updateCheckin = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.dbId;
    const { mood_rating, stress_level, selected_emotions, check_in_text, ai_analysis } = req.body;

    const updateFields = {};

    if (mood_rating) {
      const validMoods = ['great', 'good', 'okay', 'not_good', 'terrible'];
      if (!validMoods.includes(mood_rating)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid mood_rating'
        });
      }
      updateFields.mood_rating = mood_rating;
    }

    if (stress_level !== undefined) {
      if (stress_level < 1 || stress_level > 10) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'stress_level must be between 1 and 10'
        });
      }
      updateFields.stress_level = stress_level;
    }

    if (selected_emotions) {
      const validEmotions = ['anxious', 'calm', 'sad', 'happy', 'angry', 'tired', 'energetic', 'stressed'];
      updateFields.selected_emotions = selected_emotions.filter(e => validEmotions.includes(e));
    }

    if (check_in_text !== undefined) updateFields.check_in_text = check_in_text;
    if (ai_analysis) updateFields.ai_analysis = ai_analysis;

    const checkin = await CheckinResponse.findOneAndUpdate(
      { _id: id, user_id },
      { $set: updateFields },
      { new: true }
    );

    if (!checkin) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Check-in not found'
      });
    }

    res.json({
      message: 'Check-in updated successfully',
      checkin
    });
  } catch (error) {
    console.error('Update check-in error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update check-in'
    });
  }
};

const deleteCheckin = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.dbId;

    const checkin = await CheckinResponse.findOneAndDelete({
      _id: id,
      user_id
    });

    if (!checkin) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Check-in not found'
      });
    }

    res.json({
      message: 'Check-in deleted successfully'
    });
  } catch (error) {
    console.error('Delete check-in error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete check-in'
    });
  }
};

const addAiAnalysis = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.dbId;
    const { ai_analysis } = req.body;

    if (!ai_analysis) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'ai_analysis is required'
      });
    }

    const checkin = await CheckinResponse.findOneAndUpdate(
      { _id: id, user_id },
      { $set: { ai_analysis } },
      { new: true }
    );

    if (!checkin) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Check-in not found'
      });
    }

    res.json({
      message: 'AI analysis added successfully',
      checkin
    });
  } catch (error) {
    console.error('Add AI analysis error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to add AI analysis'
    });
  }
};

const analyzeCheckin = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.dbId;

    const checkin = await CheckinResponse.findOne({
      _id: id,
      user_id
    });

    if (!checkin) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Check-in not found'
      });
    }

    // Analyze the check-in text with structured data
    const analysis = await sentimentService.analyzeCheckIn(checkin.check_in_text, {
      mood_rating: checkin.mood_rating,
      stress_level: checkin.stress_level,
      selected_emotions: checkin.selected_emotions
    });

    // Update the check-in with the analysis
    checkin.ai_analysis = analysis;
    await checkin.save();

    res.json({
      message: 'Check-in analyzed successfully',
      checkin,
      ...(analysis.requires_immediate_attention && {
        alert: {
          type: 'crisis',
          message: 'We noticed some concerning content. Please reach out to a crisis helpline if you need support.'
        }
      })
    });
  } catch (error) {
    console.error('Analyze check-in error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to analyze check-in'
    });
  }
};

const analyzeText = async (req, res) => {
  try {
    const { text, mood_rating, stress_level, selected_emotions } = req.body;

    // Either text or structured data is required
    const hasStructuredData = mood_rating && stress_level;
    if (!text && !hasStructuredData) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Either text or structured data (mood_rating, stress_level) is required'
      });
    }

    const analysis = await sentimentService.analyzeCheckIn(text || '', {
      mood_rating,
      stress_level,
      selected_emotions: selected_emotions || []
    });

    res.json({
      analysis,
      ...(analysis.requires_immediate_attention && {
        alert: {
          type: 'crisis',
          message: 'We noticed some concerning content. Please reach out to a crisis helpline if you need support.'
        }
      })
    });
  } catch (error) {
    console.error('Analyze text error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to analyze text'
    });
  }
};

const getCheckinStats = async (req, res) => {
  try {
    const user_id = req.user.dbId;
    const { start_date, end_date } = req.query;

    const matchStage = { user_id };

    if (start_date || end_date) {
      matchStage.created_at = {};
      if (start_date) matchStage.created_at.$gte = new Date(start_date);
      if (end_date) matchStage.created_at.$lte = new Date(end_date);
    }

    const stats = await CheckinResponse.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalCheckins: { $sum: 1 },
          sentiments: { $push: '$ai_analysis.sentiment' },
          riskLevels: { $push: '$ai_analysis.risk_level' },
          allKeywords: { $push: '$ai_analysis.keywords' },
          moodRatings: { $push: '$mood_rating' },
          stressLevels: { $push: '$stress_level' },
          allEmotions: { $push: '$selected_emotions' },
          avgStressLevel: { $avg: '$stress_level' }
        }
      }
    ]);

    if (stats.length === 0) {
      return res.json({
        stats: {
          totalCheckins: 0,
          sentimentDistribution: {},
          riskLevelDistribution: {},
          moodDistribution: {},
          emotionDistribution: {},
          averageStressLevel: 0,
          topKeywords: []
        }
      });
    }

    const result = stats[0];

    // Calculate sentiment distribution
    const sentimentDistribution = result.sentiments
      .filter(s => s)
      .reduce((acc, s) => {
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      }, {});

    // Calculate risk level distribution
    const riskLevelDistribution = result.riskLevels
      .filter(r => r)
      .reduce((acc, r) => {
        acc[r] = (acc[r] || 0) + 1;
        return acc;
      }, {});

    // Calculate mood distribution
    const moodDistribution = result.moodRatings
      .filter(m => m)
      .reduce((acc, m) => {
        acc[m] = (acc[m] || 0) + 1;
        return acc;
      }, {});

    // Calculate emotion distribution
    const emotionDistribution = result.allEmotions
      .flat()
      .filter(e => e)
      .reduce((acc, e) => {
        acc[e] = (acc[e] || 0) + 1;
        return acc;
      }, {});

    // Get top keywords
    const keywordCounts = result.allKeywords
      .flat()
      .filter(k => k)
      .reduce((acc, k) => {
        acc[k] = (acc[k] || 0) + 1;
        return acc;
      }, {});

    const topKeywords = Object.entries(keywordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([keyword, count]) => ({ keyword, count }));

    res.json({
      stats: {
        totalCheckins: result.totalCheckins,
        sentimentDistribution,
        riskLevelDistribution,
        moodDistribution,
        emotionDistribution,
        averageStressLevel: Math.round((result.avgStressLevel || 0) * 10) / 10,
        topKeywords
      }
    });
  } catch (error) {
    console.error('Get check-in stats error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch check-in statistics'
    });
  }
};

module.exports = {
  createCheckin,
  getCheckins,
  getCheckin,
  updateCheckin,
  deleteCheckin,
  addAiAnalysis,
  analyzeCheckin,
  analyzeText,
  getCheckinStats
};
