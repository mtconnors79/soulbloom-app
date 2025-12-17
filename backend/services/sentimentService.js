const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const ANALYSIS_PROMPT = `You are a mental health analysis assistant for a wellness app called MindWell. Analyze the following check-in from a user and provide a structured assessment.

Your analysis must be compassionate, non-judgmental, and focused on supporting the user's mental wellbeing.

The user has provided both structured data (mood rating, stress level, selected emotions) and optional free-text thoughts. Use ALL of this information to provide a comprehensive analysis.

Analyze the check-in and return a JSON object with the following structure:
{
  "sentiment": "positive" | "negative" | "neutral" | "mixed",
  "sentiment_score": <number between -1 and 1, where -1 is most negative and 1 is most positive>,
  "emotions": [<array of detected emotions, combining user-selected and detected from text>],
  "keywords": [<array of significant words or phrases from the text>],
  "themes": [<array of identified themes, e.g., "work stress", "relationships", "self-care">],
  "suggestions": [<array of 2-4 personalized mindfulness suggestions based on the mood, stress, and emotions>],
  "risk_level": "low" | "moderate" | "high" | "critical",
  "risk_indicators": [<array of any concerning phrases or patterns detected, empty if none>],
  "supportive_message": "<a brief, compassionate message acknowledging their feelings>"
}

Risk Level Guidelines:
- "low": Normal daily emotions, no concerning content
- "moderate": Signs of stress, anxiety, or mild depression that could benefit from attention (stress level 6-7, negative mood)
- "high": Significant distress, isolation, hopelessness, but no immediate danger (stress level 8-10, terrible mood)
- "critical": Any mention of self-harm, suicide, or harming others - requires immediate attention

Consider the structured inputs:
- Mood Rating: great (very positive), good (positive), okay (neutral), not_good (negative), terrible (very negative)
- Stress Level: 1-3 (low), 4-6 (moderate), 7-8 (high), 9-10 (very high)
- Selected Emotions: anxious, calm, sad, happy, angry, tired, energetic, stressed

For suggestions, consider:
- Breathing exercises for anxiety/stress/high stress levels
- Gratitude practices for negative thinking
- Mindful movement for low energy or feeling tired
- Journaling prompts for processing emotions
- Grounding techniques for overwhelming feelings
- Social connection activities for loneliness/sadness
- Celebration/savoring exercises for positive moods
- Energy management for high-stress situations

IMPORTANT:
- Always respond with valid JSON only, no additional text
- Be sensitive to cultural contexts
- If risk_level is "critical", include crisis resources in suggestions
- Keep suggestions actionable and specific
- Weight the structured inputs heavily in your analysis, especially if text is minimal

User's check-in:
`;

const CRISIS_RESOURCES = [
  "Please reach out to a crisis helpline: National Suicide Prevention Lifeline: 988 (US)",
  "Text HOME to 741741 to reach the Crisis Text Line",
  "Contact a trusted friend, family member, or mental health professional",
  "If you're in immediate danger, please call emergency services (911)"
];

const formatCheckinForAnalysis = (text, structuredData = {}) => {
  const { mood_rating, stress_level, selected_emotions = [] } = structuredData;

  const moodLabels = {
    great: 'Great (very positive)',
    good: 'Good (positive)',
    okay: 'Okay (neutral)',
    not_good: 'Not Good (negative)',
    terrible: 'Terrible (very negative)'
  };

  let formattedInput = '';

  if (mood_rating) {
    formattedInput += `Mood Rating: ${moodLabels[mood_rating] || mood_rating}\n`;
  }

  if (stress_level) {
    formattedInput += `Stress Level: ${stress_level}/10\n`;
  }

  if (selected_emotions.length > 0) {
    formattedInput += `Selected Emotions: ${selected_emotions.join(', ')}\n`;
  }

  if (text && text.trim()) {
    formattedInput += `\nAdditional Thoughts:\n"${text.trim()}"`;
  } else {
    formattedInput += '\nAdditional Thoughts: (none provided)';
  }

  return formattedInput;
};

const analyzeCheckIn = async (text, structuredData = {}) => {
  const { mood_rating, stress_level, selected_emotions = [] } = structuredData;

  // At minimum, we need structured data OR text
  const hasStructuredData = mood_rating && stress_level;
  const hasText = text && typeof text === 'string' && text.trim().length > 0;

  if (!hasStructuredData && !hasText) {
    throw new Error('Either structured data (mood_rating, stress_level) or check-in text is required');
  }

  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_anthropic_api_key_here') {
    console.warn('ANTHROPIC_API_KEY not configured, using fallback analysis');
    return getFallbackAnalysis(text, structuredData);
  }

  const formattedInput = formatCheckinForAnalysis(text, structuredData);

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: ANALYSIS_PROMPT + formattedInput
        }
      ]
    });

    const responseText = message.content[0].text;
    let analysis;

    try {
      analysis = JSON.parse(responseText);
    } catch (parseError) {
      // Try to extract JSON from response if wrapped in other text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse AI response');
      }
    }

    // Validate and sanitize the response
    analysis = validateAndSanitizeAnalysis(analysis);

    // Add crisis resources if critical
    if (analysis.risk_level === 'critical') {
      analysis.suggestions = [...CRISIS_RESOURCES, ...analysis.suggestions];
      analysis.requires_immediate_attention = true;
    }

    return analysis;
  } catch (error) {
    console.error('Sentiment analysis error:', error.message);

    // Return fallback analysis on error
    if (error.status === 401) {
      throw new Error('Invalid Anthropic API key');
    }

    if (error.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    // For other errors, return a basic fallback
    return getFallbackAnalysis(text);
  }
};

const validateAndSanitizeAnalysis = (analysis) => {
  const validSentiments = ['positive', 'negative', 'neutral', 'mixed'];
  const validRiskLevels = ['low', 'moderate', 'high', 'critical'];

  return {
    sentiment: validSentiments.includes(analysis.sentiment) ? analysis.sentiment : 'neutral',
    sentiment_score: typeof analysis.sentiment_score === 'number'
      ? Math.max(-1, Math.min(1, analysis.sentiment_score))
      : 0,
    emotions: Array.isArray(analysis.emotions) ? analysis.emotions.slice(0, 10) : [],
    keywords: Array.isArray(analysis.keywords) ? analysis.keywords.slice(0, 10) : [],
    themes: Array.isArray(analysis.themes) ? analysis.themes.slice(0, 5) : [],
    suggestions: Array.isArray(analysis.suggestions) ? analysis.suggestions.slice(0, 6) : [],
    risk_level: validRiskLevels.includes(analysis.risk_level) ? analysis.risk_level : 'low',
    risk_indicators: Array.isArray(analysis.risk_indicators) ? analysis.risk_indicators : [],
    supportive_message: typeof analysis.supportive_message === 'string'
      ? analysis.supportive_message
      : 'Thank you for sharing. Your feelings are valid.'
  };
};

const getFallbackAnalysis = (text, structuredData = {}) => {
  const { mood_rating, stress_level, selected_emotions = [] } = structuredData;
  const lowerText = (text || '').toLowerCase();

  // Crisis detection keywords
  const crisisKeywords = ['suicide', 'kill myself', 'end my life', 'want to die', 'self-harm', 'hurt myself'];
  const hasCrisisIndicators = crisisKeywords.some(keyword => lowerText.includes(keyword));

  if (hasCrisisIndicators) {
    return {
      sentiment: 'negative',
      sentiment_score: -0.9,
      emotions: [...selected_emotions, 'distressed'],
      keywords: [],
      themes: ['crisis'],
      suggestions: CRISIS_RESOURCES,
      risk_level: 'critical',
      risk_indicators: ['Crisis-related content detected'],
      supportive_message: 'I\'m concerned about what you\'ve shared. Please reach out to a crisis helpline or trusted person immediately. You matter and help is available.',
      requires_immediate_attention: true,
      is_fallback: true
    };
  }

  // Determine sentiment from structured data first
  let sentiment = 'neutral';
  let sentiment_score = 0;
  let risk_level = 'low';

  // Map mood rating to sentiment
  const moodToSentiment = {
    great: { sentiment: 'positive', score: 0.9 },
    good: { sentiment: 'positive', score: 0.6 },
    okay: { sentiment: 'neutral', score: 0 },
    not_good: { sentiment: 'negative', score: -0.5 },
    terrible: { sentiment: 'negative', score: -0.8 }
  };

  if (mood_rating && moodToSentiment[mood_rating]) {
    sentiment = moodToSentiment[mood_rating].sentiment;
    sentiment_score = moodToSentiment[mood_rating].score;
  }

  // Adjust based on stress level
  if (stress_level) {
    if (stress_level >= 8) {
      sentiment_score = Math.min(sentiment_score, -0.3);
      risk_level = 'high';
    } else if (stress_level >= 6) {
      sentiment_score = Math.min(sentiment_score, 0);
      risk_level = mood_rating === 'terrible' ? 'high' : 'moderate';
    }
  }

  // Consider selected emotions
  const negativeEmotions = ['anxious', 'sad', 'angry', 'tired', 'stressed'];
  const positiveEmotions = ['calm', 'happy', 'energetic'];

  const negEmotionCount = selected_emotions.filter(e => negativeEmotions.includes(e)).length;
  const posEmotionCount = selected_emotions.filter(e => positiveEmotions.includes(e)).length;

  if (negEmotionCount > posEmotionCount && negEmotionCount >= 2) {
    sentiment_score = Math.min(sentiment_score, -0.2);
    if (sentiment === 'neutral') sentiment = 'negative';
  }

  // Also consider text-based keywords if provided
  if (text) {
    const positiveKeywords = ['happy', 'good', 'great', 'wonderful', 'amazing', 'grateful', 'thankful', 'excited', 'peaceful', 'calm', 'better', 'love', 'joy'];
    const negativeKeywords = ['sad', 'angry', 'frustrated', 'anxious', 'worried', 'stressed', 'tired', 'exhausted', 'lonely', 'depressed', 'hopeless', 'overwhelmed', 'scared'];

    const positiveCount = positiveKeywords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeKeywords.filter(word => lowerText.includes(word)).length;

    // Slightly adjust based on text
    if (negativeCount > positiveCount && negativeCount >= 2) {
      sentiment_score = Math.max(-0.9, sentiment_score - 0.2);
    } else if (positiveCount > negativeCount && positiveCount >= 2) {
      sentiment_score = Math.min(0.9, sentiment_score + 0.2);
    }
  }

  // Determine final sentiment label
  if (sentiment_score > 0.2) sentiment = 'positive';
  else if (sentiment_score < -0.2) sentiment = 'negative';
  else if (posEmotionCount > 0 && negEmotionCount > 0) sentiment = 'mixed';
  else sentiment = 'neutral';

  // Extract keywords from text
  const words = (text || '').match(/\b[a-zA-Z]{4,}\b/g) || [];
  const keywords = [...new Set(words)].slice(0, 5);

  // Generate contextual suggestions
  const suggestions = getSuggestionsForContext(sentiment, stress_level, selected_emotions);

  return {
    sentiment,
    sentiment_score: Math.round(sentiment_score * 100) / 100,
    emotions: selected_emotions.length > 0 ? selected_emotions : [],
    keywords,
    themes: [],
    suggestions,
    risk_level,
    risk_indicators: [],
    supportive_message: getSupportiveMessageForContext(mood_rating, stress_level, selected_emotions),
    is_fallback: true
  };
};

const getSuggestionsForSentiment = (sentiment) => {
  const suggestionMap = {
    positive: [
      'Continue your positive momentum with a gratitude journal entry',
      'Share your good feelings with someone you care about',
      'Take a moment to appreciate what\'s going well'
    ],
    negative: [
      'Try a 5-minute breathing exercise: breathe in for 4 counts, hold for 4, exhale for 6',
      'Write down three things, no matter how small, that you\'re grateful for',
      'Consider reaching out to a friend or loved one for support',
      'Take a short walk outside if possible - nature can help shift your mood'
    ],
    neutral: [
      'Check in with your body - are you holding any tension?',
      'Set an intention for the rest of your day',
      'Take a mindful moment to notice five things around you'
    ],
    mixed: [
      'Acknowledge that it\'s okay to feel multiple emotions at once',
      'Try journaling about what\'s causing these mixed feelings',
      'Practice self-compassion - you\'re doing your best'
    ]
  };

  return suggestionMap[sentiment] || suggestionMap.neutral;
};

const getSupportiveMessage = (sentiment) => {
  const messageMap = {
    positive: 'It\'s wonderful to hear you\'re doing well! Keep nurturing these positive feelings.',
    negative: 'I hear that things are difficult right now. Remember, it\'s okay to not be okay, and these feelings will pass.',
    neutral: 'Thank you for checking in today. Taking time to reflect on your feelings is an important step.',
    mixed: 'It sounds like you\'re experiencing a range of emotions. That\'s completely normal and valid.'
  };

  return messageMap[sentiment] || messageMap.neutral;
};

const getSuggestionsForContext = (sentiment, stress_level, selected_emotions = []) => {
  const suggestions = [];

  // High stress suggestions
  if (stress_level >= 7) {
    suggestions.push('Try a 5-minute breathing exercise: breathe in for 4 counts, hold for 4, exhale for 6');
    suggestions.push('Step away from stressors if possible - even a 5-minute break can help');
  }

  // Emotion-specific suggestions
  if (selected_emotions.includes('anxious')) {
    suggestions.push('Practice the 5-4-3-2-1 grounding technique: notice 5 things you see, 4 you hear, 3 you feel, 2 you smell, 1 you taste');
  }

  if (selected_emotions.includes('sad')) {
    suggestions.push('Reach out to someone you trust - connection can help lift your spirits');
  }

  if (selected_emotions.includes('angry')) {
    suggestions.push('Try progressive muscle relaxation - tense and release each muscle group to release tension');
  }

  if (selected_emotions.includes('tired')) {
    suggestions.push('Consider a short power nap (15-20 min) or some gentle stretching to restore energy');
  }

  if (selected_emotions.includes('stressed')) {
    suggestions.push('Write down your worries to get them out of your head - it can reduce their power over you');
  }

  // Positive emotion reinforcement
  if (selected_emotions.includes('happy') || selected_emotions.includes('calm') || selected_emotions.includes('energetic')) {
    suggestions.push('Take a moment to savor this positive feeling - what contributed to it?');
  }

  // Sentiment-based suggestions if we haven't added enough
  if (suggestions.length < 2) {
    const sentimentSuggestions = getSuggestionsForSentiment(sentiment);
    for (const s of sentimentSuggestions) {
      if (!suggestions.includes(s) && suggestions.length < 4) {
        suggestions.push(s);
      }
    }
  }

  return suggestions.slice(0, 4);
};

const getSupportiveMessageForContext = (mood_rating, stress_level, selected_emotions = []) => {
  // High stress message
  if (stress_level >= 8) {
    return 'I can see you\'re under a lot of stress right now. Remember to be gentle with yourself - you\'re doing the best you can.';
  }

  // Mood-based messages
  const moodMessages = {
    great: 'It\'s wonderful to see you\'re feeling great! Cherish this positive energy.',
    good: 'Good to hear things are going well. Keep taking care of yourself!',
    okay: 'Thank you for checking in. It\'s perfectly fine to have average days too.',
    not_good: 'I\'m sorry to hear things aren\'t going well. Remember, tough times are temporary.',
    terrible: 'I hear that things are really hard right now. Please know that you\'re not alone, and it\'s okay to reach out for support.'
  };

  if (mood_rating && moodMessages[mood_rating]) {
    return moodMessages[mood_rating];
  }

  // Emotion-based fallback
  if (selected_emotions.includes('anxious') || selected_emotions.includes('stressed')) {
    return 'Feeling anxious can be overwhelming. Take things one step at a time - you\'ve got this.';
  }

  if (selected_emotions.includes('sad')) {
    return 'It\'s okay to feel sad. Your emotions are valid, and it\'s brave of you to acknowledge them.';
  }

  return 'Thank you for taking the time to check in with yourself. Self-awareness is an important part of wellbeing.';
};

const analyzeBatch = async (texts) => {
  if (!Array.isArray(texts) || texts.length === 0) {
    throw new Error('Array of texts is required');
  }

  const results = await Promise.all(
    texts.map(async (text, index) => {
      try {
        const analysis = await analyzeCheckIn(text);
        return { index, success: true, analysis };
      } catch (error) {
        return { index, success: false, error: error.message };
      }
    })
  );

  return results;
};

const getAggregateAnalysis = (analyses) => {
  if (!Array.isArray(analyses) || analyses.length === 0) {
    return null;
  }

  const validAnalyses = analyses.filter(a => a && a.sentiment_score !== undefined);

  if (validAnalyses.length === 0) {
    return null;
  }

  const avgScore = validAnalyses.reduce((sum, a) => sum + a.sentiment_score, 0) / validAnalyses.length;

  const sentimentCounts = validAnalyses.reduce((acc, a) => {
    acc[a.sentiment] = (acc[a.sentiment] || 0) + 1;
    return acc;
  }, {});

  const allEmotions = validAnalyses.flatMap(a => a.emotions || []);
  const emotionCounts = allEmotions.reduce((acc, e) => {
    acc[e] = (acc[e] || 0) + 1;
    return acc;
  }, {});

  const topEmotions = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([emotion]) => emotion);

  const riskLevels = validAnalyses.map(a => a.risk_level);
  const hasHighRisk = riskLevels.includes('high') || riskLevels.includes('critical');

  return {
    average_sentiment_score: Math.round(avgScore * 100) / 100,
    sentiment_distribution: sentimentCounts,
    top_emotions: topEmotions,
    total_entries: validAnalyses.length,
    has_high_risk_entries: hasHighRisk,
    trend: avgScore > 0.2 ? 'positive' : avgScore < -0.2 ? 'negative' : 'stable'
  };
};

module.exports = {
  analyzeCheckIn,
  analyzeBatch,
  getAggregateAnalysis,
  validateAndSanitizeAnalysis
};
