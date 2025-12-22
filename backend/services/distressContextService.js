/**
 * Distress Context Service
 *
 * Provides context about user's recent mental state for rate limit messaging.
 * Used to show supportive crisis resources when distressed users hit rate limits.
 */

const CheckinResponse = require('../models/CheckinResponse');

/**
 * Get user's distress context from recent check-ins
 * @param {number} userId - The user's database ID
 * @returns {Promise<{hasRecentDistress: boolean, lastRiskLevel: string|null}>}
 */
async function getUserDistressContext(userId) {
  if (!userId) {
    return { hasRecentDistress: false, lastRiskLevel: null };
  }

  try {
    // Get check-ins from the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentCheckins = await CheckinResponse.find({
      user_id: userId,
      created_at: { $gte: twentyFourHoursAgo }
    })
      .sort({ created_at: -1 })
      .limit(20)
      .lean();

    if (!recentCheckins || recentCheckins.length === 0) {
      return { hasRecentDistress: false, lastRiskLevel: null };
    }

    // Check if any check-in indicates distress
    // Distress = high/critical risk level OR negative sentiment
    const hasRecentDistress = recentCheckins.some(checkin => {
      const riskLevel = checkin.ai_analysis?.risk_level;
      const sentiment = checkin.ai_analysis?.sentiment;

      return (
        riskLevel === 'high' ||
        riskLevel === 'critical' ||
        sentiment === 'negative'
      );
    });

    // Get the most recent risk level (from the latest check-in with AI analysis)
    const lastAnalyzedCheckin = recentCheckins.find(c => c.ai_analysis?.risk_level);
    const lastRiskLevel = lastAnalyzedCheckin?.ai_analysis?.risk_level || null;

    return {
      hasRecentDistress,
      lastRiskLevel
    };
  } catch (error) {
    console.error('[DistressContext] Error fetching user distress context:', error);
    // On error, default to non-distressed to avoid showing unnecessary crisis resources
    return { hasRecentDistress: false, lastRiskLevel: null };
  }
}

/**
 * Get crisis resources for distressed users
 * @returns {Object} Crisis resources object
 */
function getCrisisResources() {
  return {
    hotlines: [
      {
        id: 'suicide-lifeline',
        name: '988 Suicide & Crisis Lifeline',
        description: 'Free, confidential support 24/7',
        phone: '988',
        type: 'call'
      },
      {
        id: 'crisis-text',
        name: 'Crisis Text Line',
        description: 'Text HOME to 741741',
        phone: '741741',
        type: 'text'
      },
      {
        id: 'emergency',
        name: 'Emergency Services',
        description: 'For immediate emergencies',
        phone: '911',
        type: 'emergency'
      }
    ],
    message: "We're here for you. While we process your previous entries, here are resources available right now:"
  };
}

module.exports = {
  getUserDistressContext,
  getCrisisResources
};
