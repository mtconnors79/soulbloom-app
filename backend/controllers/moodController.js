const { MoodEntry } = require('../models');
const { Op } = require('sequelize');

const createMoodEntry = async (req, res) => {
  try {
    const { sentiment_score, sentiment_label, check_in_date } = req.body;
    const user_id = req.user.dbId;

    if (sentiment_score === undefined || !sentiment_label || !check_in_date) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'sentiment_score, sentiment_label, and check_in_date are required'
      });
    }

    const moodEntry = await MoodEntry.create({
      user_id,
      sentiment_score,
      sentiment_label,
      check_in_date
    });

    res.status(201).json({
      message: 'Mood entry created successfully',
      moodEntry
    });
  } catch (error) {
    console.error('Create mood entry error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create mood entry'
    });
  }
};

const getMoodEntries = async (req, res) => {
  try {
    const user_id = req.user.dbId;
    const { start_date, end_date, limit = 30, offset = 0 } = req.query;

    const where = { user_id };

    if (start_date || end_date) {
      where.check_in_date = {};
      if (start_date) where.check_in_date[Op.gte] = start_date;
      if (end_date) where.check_in_date[Op.lte] = end_date;
    }

    const { count, rows: moodEntries } = await MoodEntry.findAndCountAll({
      where,
      order: [['check_in_date', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      moodEntries,
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + moodEntries.length < count
      }
    });
  } catch (error) {
    console.error('Get mood entries error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch mood entries'
    });
  }
};

const getMoodEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.dbId;

    const moodEntry = await MoodEntry.findOne({
      where: { id, user_id }
    });

    if (!moodEntry) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Mood entry not found'
      });
    }

    res.json({ moodEntry });
  } catch (error) {
    console.error('Get mood entry error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch mood entry'
    });
  }
};

const updateMoodEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.dbId;
    const { sentiment_score, sentiment_label, check_in_date } = req.body;

    const moodEntry = await MoodEntry.findOne({
      where: { id, user_id }
    });

    if (!moodEntry) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Mood entry not found'
      });
    }

    await moodEntry.update({
      sentiment_score: sentiment_score ?? moodEntry.sentiment_score,
      sentiment_label: sentiment_label ?? moodEntry.sentiment_label,
      check_in_date: check_in_date ?? moodEntry.check_in_date
    });

    res.json({
      message: 'Mood entry updated successfully',
      moodEntry
    });
  } catch (error) {
    console.error('Update mood entry error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update mood entry'
    });
  }
};

const deleteMoodEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.dbId;

    const moodEntry = await MoodEntry.findOne({
      where: { id, user_id }
    });

    if (!moodEntry) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Mood entry not found'
      });
    }

    await moodEntry.destroy();

    res.json({
      message: 'Mood entry deleted successfully'
    });
  } catch (error) {
    console.error('Delete mood entry error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete mood entry'
    });
  }
};

const getMoodStats = async (req, res) => {
  try {
    const user_id = req.user.dbId;
    const { days, start_date, end_date } = req.query;

    const where = { user_id };

    // Support 'days' parameter (e.g., days=7 for last 7 days)
    if (days) {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      where.created_at = {
        [Op.gte]: startDate,
        [Op.lte]: endDate
      };
    } else if (start_date || end_date) {
      // Fallback to explicit start_date/end_date
      where.check_in_date = {};
      if (start_date) where.check_in_date[Op.gte] = start_date;
      if (end_date) where.check_in_date[Op.lte] = end_date;
    }

    const moodEntries = await MoodEntry.findAll({ where });

    if (moodEntries.length === 0) {
      return res.json({
        stats: {
          totalEntries: 0,
          averageScore: null,
          sentimentDistribution: {},
          trend: null
        }
      });
    }

    // Calculate statistics
    const totalEntries = moodEntries.length;
    const averageScore = moodEntries.reduce((sum, e) => sum + parseFloat(e.sentiment_score), 0) / totalEntries;

    // Sentiment distribution
    const sentimentDistribution = moodEntries.reduce((acc, e) => {
      acc[e.sentiment_label] = (acc[e.sentiment_label] || 0) + 1;
      return acc;
    }, {});

    // Calculate trend (compare first half to second half)
    const midpoint = Math.floor(totalEntries / 2);
    const firstHalf = moodEntries.slice(midpoint);
    const secondHalf = moodEntries.slice(0, midpoint);

    let trend = null;
    if (firstHalf.length > 0 && secondHalf.length > 0) {
      const firstAvg = firstHalf.reduce((sum, e) => sum + parseFloat(e.sentiment_score), 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, e) => sum + parseFloat(e.sentiment_score), 0) / secondHalf.length;
      const diff = secondAvg - firstAvg;

      if (diff > 0.1) trend = 'improving';
      else if (diff < -0.1) trend = 'declining';
      else trend = 'stable';
    }

    res.json({
      stats: {
        totalEntries,
        averageScore: Math.round(averageScore * 100) / 100,
        sentimentDistribution,
        trend
      }
    });
  } catch (error) {
    console.error('Get mood stats error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch mood statistics'
    });
  }
};

module.exports = {
  createMoodEntry,
  getMoodEntries,
  getMoodEntry,
  updateMoodEntry,
  deleteMoodEntry,
  getMoodStats
};
