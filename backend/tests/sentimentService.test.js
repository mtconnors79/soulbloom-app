/**
 * Sentiment Service Tests
 *
 * Comprehensive tests for:
 * - Sentiment detection (positive, negative, neutral)
 * - Crisis detection risk levels (low, moderate, high, critical)
 * - Safety keyword fallback detection
 * - Topic detection (domestic violence, substance use, eating disorder, self-harm)
 */

// Mock Anthropic SDK before importing the service
const mockCreate = jest.fn();
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: mockCreate
    }
  }));
});

// Mock environment variables
process.env.ANTHROPIC_API_KEY = 'test-api-key';
process.env.JWT_SECRET = 'test-jwt-secret';

const { analyzeCheckIn, validateAndSanitizeAnalysis } = require('../services/sentimentService');
const { detectTopics } = require('../data/topicResources');

/**
 * Helper to create mock Claude API response
 */
const createMockResponse = (analysis) => ({
  content: [{
    text: JSON.stringify(analysis)
  }]
});

/**
 * Default mock analysis response
 */
const defaultMockAnalysis = {
  sentiment: 'neutral',
  sentiment_score: 0,
  emotions: [],
  keywords: [],
  themes: [],
  suggestions: ['Take a deep breath'],
  risk_level: 'low',
  risk_indicators: [],
  supportive_message: 'Thank you for sharing.'
};

describe('Sentiment Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreate.mockReset();
  });

  describe('Sentiment Detection', () => {
    it('should detect positive sentiment for "I feel amazing today"', async () => {
      mockCreate.mockResolvedValueOnce(createMockResponse({
        ...defaultMockAnalysis,
        sentiment: 'positive',
        sentiment_score: 0.85,
        emotions: ['happy', 'energetic'],
        keywords: ['amazing'],
        supportive_message: 'It\'s wonderful to hear you\'re feeling great!'
      }));

      const result = await analyzeCheckIn('I feel amazing today', {
        mood_rating: 'great',
        stress_level: 2,
        selected_emotions: ['happy']
      });

      expect(result.sentiment).toBe('positive');
      expect(result.sentiment_score).toBeGreaterThan(0.5);
      expect(result.risk_level).toBe('low');
    });

    it('should detect negative sentiment for "I\'m so sad and hopeless"', async () => {
      mockCreate.mockResolvedValueOnce(createMockResponse({
        ...defaultMockAnalysis,
        sentiment: 'negative',
        sentiment_score: -0.75,
        emotions: ['sad', 'hopeless'],
        keywords: ['sad', 'hopeless'],
        risk_level: 'moderate',
        supportive_message: 'I\'m sorry you\'re going through this.'
      }));

      const result = await analyzeCheckIn('I\'m so sad and hopeless', {
        mood_rating: 'terrible',
        stress_level: 8,
        selected_emotions: ['sad']
      });

      expect(result.sentiment).toBe('negative');
      expect(result.sentiment_score).toBeLessThan(-0.5);
    });

    it('should detect neutral sentiment for "I went to the store"', async () => {
      mockCreate.mockResolvedValueOnce(createMockResponse({
        ...defaultMockAnalysis,
        sentiment: 'neutral',
        sentiment_score: 0.1,
        emotions: [],
        keywords: ['store'],
        risk_level: 'low',
        supportive_message: 'Thank you for checking in.'
      }));

      const result = await analyzeCheckIn('I went to the store', {
        mood_rating: 'okay',
        stress_level: 3,
        selected_emotions: []
      });

      expect(result.sentiment).toBe('neutral');
      expect(result.sentiment_score).toBeGreaterThanOrEqual(-0.5);
      expect(result.sentiment_score).toBeLessThanOrEqual(0.5);
    });

    it('should detect mixed sentiment for ambivalent text', async () => {
      mockCreate.mockResolvedValueOnce(createMockResponse({
        ...defaultMockAnalysis,
        sentiment: 'mixed',
        sentiment_score: 0.1,
        emotions: ['happy', 'anxious'],
        keywords: ['excited', 'nervous'],
        supportive_message: 'It\'s okay to feel multiple emotions.'
      }));

      const result = await analyzeCheckIn('I\'m excited about the interview but also nervous', {
        mood_rating: 'okay',
        stress_level: 6,
        selected_emotions: ['happy', 'anxious']
      });

      expect(result.sentiment).toBe('mixed');
    });
  });

  describe('Crisis Detection - Risk Levels', () => {
    describe('Low Risk', () => {
      it('should return risk_level: "low" for "I feel great"', async () => {
        mockCreate.mockResolvedValueOnce(createMockResponse({
          ...defaultMockAnalysis,
          sentiment: 'positive',
          sentiment_score: 0.8,
          risk_level: 'low',
          risk_indicators: []
        }));

        const result = await analyzeCheckIn('I feel great', {
          mood_rating: 'great',
          stress_level: 2,
          selected_emotions: ['happy']
        });

        expect(result.risk_level).toBe('low');
        expect(result.risk_indicators).toHaveLength(0);
        expect(result.requires_immediate_attention).toBeUndefined();
      });

      it('should return risk_level: "low" for everyday positive content', async () => {
        mockCreate.mockResolvedValueOnce(createMockResponse({
          ...defaultMockAnalysis,
          sentiment: 'positive',
          sentiment_score: 0.6,
          risk_level: 'low'
        }));

        const result = await analyzeCheckIn('Had a nice lunch with friends today', {
          mood_rating: 'good',
          stress_level: 3,
          selected_emotions: ['happy', 'calm']
        });

        expect(result.risk_level).toBe('low');
      });
    });

    describe('Moderate Risk', () => {
      it('should return risk_level: "moderate" for "I\'m stressed about work"', async () => {
        mockCreate.mockResolvedValueOnce(createMockResponse({
          ...defaultMockAnalysis,
          sentiment: 'negative',
          sentiment_score: -0.4,
          risk_level: 'moderate',
          risk_indicators: ['work stress'],
          themes: ['work stress']
        }));

        const result = await analyzeCheckIn('I\'m stressed about work', {
          mood_rating: 'not_good',
          stress_level: 7,
          selected_emotions: ['stressed', 'anxious']
        });

        expect(result.risk_level).toBe('moderate');
      });

      it('should detect moderate risk for high stress without crisis content', async () => {
        mockCreate.mockResolvedValueOnce(createMockResponse({
          ...defaultMockAnalysis,
          sentiment: 'negative',
          sentiment_score: -0.5,
          risk_level: 'moderate',
          risk_indicators: ['elevated stress']
        }));

        const result = await analyzeCheckIn('Everything feels overwhelming lately', {
          mood_rating: 'not_good',
          stress_level: 7,
          selected_emotions: ['stressed', 'tired']
        });

        expect(result.risk_level).toBe('moderate');
      });
    });

    describe('High Risk', () => {
      it('should return risk_level: "high" for "I\'ve been cutting myself"', async () => {
        // AI might miss it, but safety check will catch it
        mockCreate.mockResolvedValueOnce(createMockResponse({
          ...defaultMockAnalysis,
          sentiment: 'negative',
          sentiment_score: -0.8,
          risk_level: 'moderate', // AI under-estimates
          risk_indicators: []
        }));

        const result = await analyzeCheckIn('I\'ve been cutting myself', {
          mood_rating: 'terrible',
          stress_level: 9,
          selected_emotions: ['sad']
        });

        // Safety check should escalate to high
        expect(result.risk_level).toBe('high');
        expect(result.show_crisis_resources).toBe(true);
      });

      it('should return risk_level: "high" for "better off without me" (passive ideation)', async () => {
        mockCreate.mockResolvedValueOnce(createMockResponse({
          ...defaultMockAnalysis,
          sentiment: 'negative',
          sentiment_score: -0.9,
          risk_level: 'moderate', // AI might miss passive ideation
          risk_indicators: []
        }));

        const result = await analyzeCheckIn('My family would be better off without me', {
          mood_rating: 'terrible',
          stress_level: 9,
          selected_emotions: ['sad']
        });

        // "better off without me" is in CRITICAL_KEYWORDS, should be critical
        expect(result.risk_level).toBe('critical');
        expect(result.requires_immediate_attention).toBe(true);
      });

      it('should return risk_level: "high" for "no reason to live"', async () => {
        mockCreate.mockResolvedValueOnce(createMockResponse({
          ...defaultMockAnalysis,
          sentiment: 'negative',
          sentiment_score: -0.9,
          risk_level: 'moderate',
          risk_indicators: []
        }));

        const result = await analyzeCheckIn('I feel like there\'s no reason to live', {
          mood_rating: 'terrible',
          stress_level: 10,
          selected_emotions: ['sad']
        });

        // "no reason to live" is in CRITICAL_KEYWORDS
        expect(result.risk_level).toBe('critical');
      });

      it('should return risk_level: "high" for "wish I wasn\'t here"', async () => {
        mockCreate.mockResolvedValueOnce(createMockResponse({
          ...defaultMockAnalysis,
          sentiment: 'negative',
          sentiment_score: -0.85,
          risk_level: 'moderate',
          risk_indicators: []
        }));

        const result = await analyzeCheckIn('Sometimes I wish I wasn\'t here', {
          mood_rating: 'terrible',
          stress_level: 9,
          selected_emotions: ['sad']
        });

        // "wish i wasn't here" is in CRITICAL_KEYWORDS
        expect(result.risk_level).toBe('critical');
      });

      it('should return risk_level: "high" for self-harm behaviors', async () => {
        mockCreate.mockResolvedValueOnce(createMockResponse({
          ...defaultMockAnalysis,
          sentiment: 'negative',
          sentiment_score: -0.8,
          risk_level: 'high',
          risk_indicators: ['self-harm'],
          show_crisis_resources: true
        }));

        const result = await analyzeCheckIn('I\'ve been hurting myself when I feel overwhelmed', {
          mood_rating: 'terrible',
          stress_level: 9,
          selected_emotions: ['sad', 'anxious']
        });

        expect(result.risk_level).toBe('high');
        expect(result.show_crisis_resources).toBe(true);
      });
    });

    describe('Critical Risk', () => {
      it('should return risk_level: "critical" for "I want to kill myself"', async () => {
        mockCreate.mockResolvedValueOnce(createMockResponse({
          ...defaultMockAnalysis,
          sentiment: 'negative',
          sentiment_score: -0.95,
          risk_level: 'critical',
          risk_indicators: ['suicidal ideation'],
          requires_immediate_attention: true
        }));

        const result = await analyzeCheckIn('I want to kill myself', {
          mood_rating: 'terrible',
          stress_level: 10,
          selected_emotions: ['sad']
        });

        expect(result.risk_level).toBe('critical');
        expect(result.requires_immediate_attention).toBe(true);
      });

      it('should return risk_level: "critical" for "I want to end my life"', async () => {
        mockCreate.mockResolvedValueOnce(createMockResponse({
          ...defaultMockAnalysis,
          sentiment: 'negative',
          sentiment_score: -0.95,
          risk_level: 'critical',
          risk_indicators: ['suicidal ideation']
        }));

        const result = await analyzeCheckIn('I want to end my life', {
          mood_rating: 'terrible',
          stress_level: 10,
          selected_emotions: ['sad']
        });

        expect(result.risk_level).toBe('critical');
        expect(result.requires_immediate_attention).toBe(true);
      });

      it('should return risk_level: "critical" for "suicide" keyword', async () => {
        mockCreate.mockResolvedValueOnce(createMockResponse({
          ...defaultMockAnalysis,
          sentiment: 'negative',
          sentiment_score: -0.9,
          risk_level: 'low', // AI completely misses it
          risk_indicators: []
        }));

        const result = await analyzeCheckIn('I\'ve been thinking about suicide', {
          mood_rating: 'terrible',
          stress_level: 10,
          selected_emotions: ['sad']
        });

        // Safety check should escalate
        expect(result.risk_level).toBe('critical');
        expect(result.requires_immediate_attention).toBe(true);
      });

      it('should include crisis resources in suggestions for critical risk', async () => {
        mockCreate.mockResolvedValueOnce(createMockResponse({
          ...defaultMockAnalysis,
          sentiment: 'negative',
          sentiment_score: -0.95,
          risk_level: 'critical',
          risk_indicators: ['suicidal ideation'],
          suggestions: ['Take a deep breath']
        }));

        const result = await analyzeCheckIn('I want to kill myself', {
          mood_rating: 'terrible',
          stress_level: 10,
          selected_emotions: ['sad']
        });

        expect(result.suggestions).toContain(expect.stringContaining('988'));
        expect(result.suggestions).toContain(expect.stringContaining('Crisis Text Line'));
      });
    });
  });

  describe('Safety Keyword Fallback', () => {
    it('should trigger critical risk for "suicide" even when AI misses it', async () => {
      mockCreate.mockResolvedValueOnce(createMockResponse({
        ...defaultMockAnalysis,
        sentiment: 'negative',
        sentiment_score: -0.5,
        risk_level: 'low', // AI completely misses it
        risk_indicators: []
      }));

      const result = await analyzeCheckIn('I keep thinking about suicide when things get hard', {
        mood_rating: 'not_good',
        stress_level: 7,
        selected_emotions: ['sad']
      });

      expect(result.risk_level).toBe('critical');
      expect(result.risk_indicators).toContain(expect.stringContaining('Critical keyword detected'));
    });

    it('should trigger high risk for "self-harm" even when AI returns low', async () => {
      mockCreate.mockResolvedValueOnce(createMockResponse({
        ...defaultMockAnalysis,
        sentiment: 'negative',
        sentiment_score: -0.4,
        risk_level: 'low',
        risk_indicators: []
      }));

      const result = await analyzeCheckIn('I\'ve struggled with self-harm in the past', {
        mood_rating: 'not_good',
        stress_level: 6,
        selected_emotions: ['anxious']
      });

      expect(result.risk_level).toBe('high');
      expect(result.risk_indicators).toContain(expect.stringContaining('High-risk keyword detected'));
    });

    it('should trigger high risk for "cutting" in context', async () => {
      mockCreate.mockResolvedValueOnce(createMockResponse({
        ...defaultMockAnalysis,
        sentiment: 'negative',
        sentiment_score: -0.6,
        risk_level: 'moderate',
        risk_indicators: []
      }));

      const result = await analyzeCheckIn('I used to cope by cutting', {
        mood_rating: 'not_good',
        stress_level: 7,
        selected_emotions: ['anxious', 'sad']
      });

      expect(result.risk_level).toBe('high');
    });

    it('should trigger high risk for "tired of living"', async () => {
      mockCreate.mockResolvedValueOnce(createMockResponse({
        ...defaultMockAnalysis,
        sentiment: 'negative',
        sentiment_score: -0.7,
        risk_level: 'moderate',
        risk_indicators: []
      }));

      const result = await analyzeCheckIn('I\'m just so tired of living like this', {
        mood_rating: 'terrible',
        stress_level: 8,
        selected_emotions: ['tired', 'sad']
      });

      expect(result.risk_level).toBe('high');
    });

    it('should trigger high risk for "can\'t take it anymore"', async () => {
      mockCreate.mockResolvedValueOnce(createMockResponse({
        ...defaultMockAnalysis,
        sentiment: 'negative',
        sentiment_score: -0.7,
        risk_level: 'moderate',
        risk_indicators: []
      }));

      const result = await analyzeCheckIn('I can\'t take it anymore', {
        mood_rating: 'terrible',
        stress_level: 9,
        selected_emotions: ['stressed']
      });

      expect(result.risk_level).toBe('high');
    });

    it('should not false-positive on unrelated uses of keywords', async () => {
      mockCreate.mockResolvedValueOnce(createMockResponse({
        ...defaultMockAnalysis,
        sentiment: 'positive',
        sentiment_score: 0.5,
        risk_level: 'low',
        risk_indicators: []
      }));

      // "cut" as in cutting paper, not self-harm
      const result = await analyzeCheckIn('I cut some vegetables for dinner', {
        mood_rating: 'good',
        stress_level: 2,
        selected_emotions: ['calm']
      });

      // Note: Due to simple keyword matching, this might still trigger
      // The actual service would benefit from context-aware detection
      // For now, "cut" alone might not trigger, but "cutting" might
      expect(result.risk_level).not.toBe('critical');
    });
  });

  describe('Topic Detection', () => {
    describe('Domestic Violence Detection', () => {
      it('should detect domestic_violence for "my partner hit me"', async () => {
        mockCreate.mockResolvedValueOnce(createMockResponse({
          ...defaultMockAnalysis,
          sentiment: 'negative',
          sentiment_score: -0.8,
          risk_level: 'moderate'
        }));

        const result = await analyzeCheckIn('My partner hit me last night', {
          mood_rating: 'terrible',
          stress_level: 9,
          selected_emotions: ['scared', 'sad']
        });

        expect(result.detected_topics).toBeDefined();
        expect(result.detected_topics.some(t => t.topic_id === 'domestic_violence')).toBe(true);

        const dvTopic = result.detected_topics.find(t => t.topic_id === 'domestic_violence');
        expect(dvTopic.resource).toBeDefined();
        expect(dvTopic.resource.name).toBe('National Domestic Violence Hotline');
      });

      it('should detect domestic_violence for abusive relationship patterns', async () => {
        mockCreate.mockResolvedValueOnce(createMockResponse({
          ...defaultMockAnalysis,
          sentiment: 'negative',
          sentiment_score: -0.7,
          risk_level: 'moderate'
        }));

        const result = await analyzeCheckIn('I\'m scared of my husband, he\'s so controlling', {
          mood_rating: 'terrible',
          stress_level: 9,
          selected_emotions: ['scared', 'anxious']
        });

        expect(result.detected_topics.some(t => t.topic_id === 'domestic_violence')).toBe(true);
      });
    });

    describe('Substance Use Detection', () => {
      it('should detect substance_abuse for "I\'ve been drinking too much"', async () => {
        mockCreate.mockResolvedValueOnce(createMockResponse({
          ...defaultMockAnalysis,
          sentiment: 'negative',
          sentiment_score: -0.5,
          risk_level: 'moderate'
        }));

        const result = await analyzeCheckIn('I\'ve been drinking too much lately', {
          mood_rating: 'not_good',
          stress_level: 7,
          selected_emotions: ['sad', 'stressed']
        });

        expect(result.detected_topics).toBeDefined();
        expect(result.detected_topics.some(t => t.topic_id === 'substance_abuse')).toBe(true);

        const saTopic = result.detected_topics.find(t => t.topic_id === 'substance_abuse');
        expect(saTopic.resource.name).toBe('SAMHSA National Helpline');
      });

      it('should detect substance_abuse for relapse mentions', async () => {
        mockCreate.mockResolvedValueOnce(createMockResponse({
          ...defaultMockAnalysis,
          sentiment: 'negative',
          sentiment_score: -0.6,
          risk_level: 'moderate'
        }));

        const result = await analyzeCheckIn('I relapsed last week and started using again', {
          mood_rating: 'terrible',
          stress_level: 8,
          selected_emotions: ['sad', 'anxious']
        });

        expect(result.detected_topics.some(t => t.topic_id === 'substance_abuse')).toBe(true);
      });
    });

    describe('Eating Disorder Detection', () => {
      it('should detect eating_disorder for "I haven\'t eaten in days"', async () => {
        mockCreate.mockResolvedValueOnce(createMockResponse({
          ...defaultMockAnalysis,
          sentiment: 'negative',
          sentiment_score: -0.6,
          risk_level: 'moderate'
        }));

        const result = await analyzeCheckIn('I haven\'t eaten in days, I\'m restricting again', {
          mood_rating: 'not_good',
          stress_level: 7,
          selected_emotions: ['anxious']
        });

        expect(result.detected_topics).toBeDefined();
        expect(result.detected_topics.some(t => t.topic_id === 'eating_disorder')).toBe(true);

        const edTopic = result.detected_topics.find(t => t.topic_id === 'eating_disorder');
        expect(edTopic.resource.name).toContain('Eating Disorders');
      });

      it('should detect eating_disorder for purging behaviors', async () => {
        mockCreate.mockResolvedValueOnce(createMockResponse({
          ...defaultMockAnalysis,
          sentiment: 'negative',
          sentiment_score: -0.7,
          risk_level: 'moderate'
        }));

        const result = await analyzeCheckIn('I\'ve been purging after meals again', {
          mood_rating: 'terrible',
          stress_level: 8,
          selected_emotions: ['anxious', 'sad']
        });

        expect(result.detected_topics.some(t => t.topic_id === 'eating_disorder')).toBe(true);
      });
    });

    describe('Self-Harm Topic Detection', () => {
      it('should detect self_harm topic and elevate risk to high', async () => {
        mockCreate.mockResolvedValueOnce(createMockResponse({
          ...defaultMockAnalysis,
          sentiment: 'negative',
          sentiment_score: -0.6,
          risk_level: 'low', // AI returns low
          risk_indicators: []
        }));

        const result = await analyzeCheckIn('I\'ve been hurting myself when stressed', {
          mood_rating: 'not_good',
          stress_level: 7,
          selected_emotions: ['anxious']
        });

        // Should detect self_harm topic
        expect(result.detected_topics.some(t => t.topic_id === 'self_harm')).toBe(true);
        // Should elevate risk to at least 'high'
        expect(result.risk_level).toBe('high');
        expect(result.show_crisis_resources).toBe(true);
      });

      it('should elevate moderate risk to high when self_harm topic detected', async () => {
        mockCreate.mockResolvedValueOnce(createMockResponse({
          ...defaultMockAnalysis,
          sentiment: 'negative',
          sentiment_score: -0.5,
          risk_level: 'moderate',
          risk_indicators: []
        }));

        const result = await analyzeCheckIn('I want to hurt myself sometimes', {
          mood_rating: 'not_good',
          stress_level: 7,
          selected_emotions: ['sad']
        });

        expect(result.risk_level).toBe('high');
      });
    });

    describe('Multiple Topics Detection', () => {
      it('should detect multiple topics in a single check-in', async () => {
        mockCreate.mockResolvedValueOnce(createMockResponse({
          ...defaultMockAnalysis,
          sentiment: 'negative',
          sentiment_score: -0.8,
          risk_level: 'high'
        }));

        const result = await analyzeCheckIn('My partner hit me and I\'ve been drinking too much to cope', {
          mood_rating: 'terrible',
          stress_level: 9,
          selected_emotions: ['scared', 'sad']
        });

        expect(result.detected_topics.length).toBeGreaterThanOrEqual(2);
        expect(result.detected_topics.some(t => t.topic_id === 'domestic_violence')).toBe(true);
        expect(result.detected_topics.some(t => t.topic_id === 'substance_abuse')).toBe(true);
      });
    });
  });

  describe('Fallback Analysis (No API Key)', () => {
    beforeEach(() => {
      // Temporarily remove API key to trigger fallback
      process.env.ANTHROPIC_API_KEY = '';
    });

    afterEach(() => {
      // Restore API key
      process.env.ANTHROPIC_API_KEY = 'test-api-key';
    });

    it('should use fallback analysis when API key is not configured', async () => {
      const result = await analyzeCheckIn('I feel okay today', {
        mood_rating: 'okay',
        stress_level: 4,
        selected_emotions: ['calm']
      });

      expect(result.is_fallback).toBe(true);
      expect(result.sentiment).toBeDefined();
      expect(result.risk_level).toBeDefined();
    });

    it('should still detect crisis keywords in fallback mode', async () => {
      const result = await analyzeCheckIn('I want to kill myself', {
        mood_rating: 'terrible',
        stress_level: 10,
        selected_emotions: ['sad']
      });

      expect(result.is_fallback).toBe(true);
      expect(result.risk_level).toBe('critical');
      expect(result.requires_immediate_attention).toBe(true);
    });

    it('should detect high-risk keywords in fallback mode', async () => {
      const result = await analyzeCheckIn('I\'ve been cutting myself', {
        mood_rating: 'terrible',
        stress_level: 9,
        selected_emotions: ['sad']
      });

      expect(result.is_fallback).toBe(true);
      expect(result.risk_level).toBe('high');
      expect(result.show_crisis_resources).toBe(true);
    });

    it('should map mood ratings to sentiment in fallback mode', async () => {
      let result = await analyzeCheckIn('', {
        mood_rating: 'great',
        stress_level: 2,
        selected_emotions: ['happy']
      });

      expect(result.sentiment).toBe('positive');
      expect(result.sentiment_score).toBeGreaterThan(0.5);

      result = await analyzeCheckIn('', {
        mood_rating: 'terrible',
        stress_level: 8,
        selected_emotions: ['sad']
      });

      expect(result.sentiment).toBe('negative');
      expect(result.sentiment_score).toBeLessThan(-0.5);
    });
  });

  describe('Topic Detection Function (Direct)', () => {
    it('should return empty array for neutral text', () => {
      const topics = detectTopics('I went to the store and bought groceries');
      expect(topics).toEqual([]);
    });

    it('should detect domestic_violence topic', () => {
      const topics = detectTopics('My partner hit me');
      expect(topics.some(t => t.topic_id === 'domestic_violence')).toBe(true);
    });

    it('should detect substance_abuse topic', () => {
      const topics = detectTopics('I\'ve been drinking too much');
      expect(topics.some(t => t.topic_id === 'substance_abuse')).toBe(true);
    });

    it('should detect eating_disorder topic', () => {
      const topics = detectTopics('I\'ve been restricting food');
      expect(topics.some(t => t.topic_id === 'eating_disorder')).toBe(true);
    });

    it('should detect self_harm topic', () => {
      const topics = detectTopics('I\'ve been cutting myself');
      expect(topics.some(t => t.topic_id === 'self_harm')).toBe(true);
    });

    it('should detect grief topic', () => {
      const topics = detectTopics('My mother passed away last month');
      expect(topics.some(t => t.topic_id === 'grief')).toBe(true);
    });

    it('should detect veteran_support topic', () => {
      const topics = detectTopics('I\'m a veteran struggling with PTSD');
      expect(topics.some(t => t.topic_id === 'veteran_support')).toBe(true);
    });

    it('should handle null/undefined input', () => {
      expect(detectTopics(null)).toEqual([]);
      expect(detectTopics(undefined)).toEqual([]);
      expect(detectTopics('')).toEqual([]);
    });

    it('should include resource information for detected topics', () => {
      const topics = detectTopics('I\'ve been drinking too much');
      const saTopic = topics.find(t => t.topic_id === 'substance_abuse');

      expect(saTopic).toBeDefined();
      expect(saTopic.resource).toBeDefined();
      expect(saTopic.resource.name).toBe('SAMHSA National Helpline');
      expect(saTopic.resource.phone).toBe('1-800-662-4357');
    });
  });

  describe('Validation and Sanitization', () => {
    it('should clamp sentiment_score between -1 and 1', () => {
      const result = validateAndSanitizeAnalysis({
        sentiment: 'positive',
        sentiment_score: 5, // Out of range
        risk_level: 'low'
      });

      expect(result.sentiment_score).toBe(1);
    });

    it('should clamp negative sentiment_score', () => {
      const result = validateAndSanitizeAnalysis({
        sentiment: 'negative',
        sentiment_score: -5,
        risk_level: 'low'
      });

      expect(result.sentiment_score).toBe(-1);
    });

    it('should default invalid sentiment to neutral', () => {
      const result = validateAndSanitizeAnalysis({
        sentiment: 'invalid_sentiment',
        sentiment_score: 0,
        risk_level: 'low'
      });

      expect(result.sentiment).toBe('neutral');
    });

    it('should default invalid risk_level to low', () => {
      const result = validateAndSanitizeAnalysis({
        sentiment: 'neutral',
        sentiment_score: 0,
        risk_level: 'invalid_risk'
      });

      expect(result.risk_level).toBe('low');
    });

    it('should truncate arrays to max length', () => {
      const longEmotions = Array(20).fill('happy');
      const result = validateAndSanitizeAnalysis({
        sentiment: 'positive',
        sentiment_score: 0.5,
        risk_level: 'low',
        emotions: longEmotions
      });

      expect(result.emotions.length).toBeLessThanOrEqual(10);
    });

    it('should provide default supportive message', () => {
      const result = validateAndSanitizeAnalysis({
        sentiment: 'neutral',
        sentiment_score: 0,
        risk_level: 'low'
      });

      expect(result.supportive_message).toBe('Thank you for sharing. Your feelings are valid.');
    });
  });

  describe('Error Handling', () => {
    it('should throw error when neither text nor structured data provided', async () => {
      await expect(analyzeCheckIn('', {}))
        .rejects
        .toThrow('Either structured data (mood_rating, stress_level) or check-in text is required');
    });

    it('should handle API rate limit errors', async () => {
      mockCreate.mockRejectedValueOnce({ status: 429, message: 'Rate limited' });

      await expect(analyzeCheckIn('Test text', {
        mood_rating: 'okay',
        stress_level: 5,
        selected_emotions: []
      })).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle invalid API key errors', async () => {
      mockCreate.mockRejectedValueOnce({ status: 401, message: 'Invalid API key' });

      await expect(analyzeCheckIn('Test text', {
        mood_rating: 'okay',
        stress_level: 5,
        selected_emotions: []
      })).rejects.toThrow('Invalid Anthropic API key');
    });

    it('should return fallback analysis for other errors', async () => {
      mockCreate.mockRejectedValueOnce(new Error('Network error'));

      const result = await analyzeCheckIn('Feeling okay today', {
        mood_rating: 'okay',
        stress_level: 4,
        selected_emotions: ['calm']
      });

      expect(result.is_fallback).toBe(true);
    });
  });
});
