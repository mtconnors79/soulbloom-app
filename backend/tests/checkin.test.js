/**
 * Check-in API Tests
 *
 * Tests for:
 * - POST /api/checkins - create check-in
 * - GET /api/checkins - list check-ins
 * - GET /api/checkins/stats - statistics
 * - GET /api/checkins/daily - daily mood details
 */

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { mockUser, generateTestToken, clearTestMongoDB } = require('./setup');

// Mock the sentiment service to avoid Claude API calls
jest.mock('../services/sentimentService', () => ({
  analyzeCheckIn: jest.fn().mockResolvedValue({
    sentiment: 'positive',
    risk_level: 'low',
    keywords: ['good', 'happy'],
    requires_immediate_attention: false
  })
}));

// Import after mocking
const { CheckinResponse } = require('../models');
const checkinController = require('../controllers/checkinController');

// Create test Express app
const createApp = () => {
  const app = express();
  app.use(express.json());

  // Mock authentication middleware
  app.use((req, res, next) => {
    if (req.headers.authorization) {
      req.user = { ...mockUser };
    }
    next();
  });

  // Auth middleware for protected routes
  const requireAuth = (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  };

  // Routes
  app.post('/api/checkins', requireAuth, checkinController.createCheckin);
  app.get('/api/checkins', requireAuth, checkinController.getCheckins);
  app.get('/api/checkins/stats', requireAuth, checkinController.getCheckinStats);
  app.get('/api/checkins/daily', requireAuth, checkinController.getDailyMoodDetails);
  app.get('/api/checkins/:id', requireAuth, checkinController.getCheckin);
  app.put('/api/checkins/:id', requireAuth, checkinController.updateCheckin);
  app.delete('/api/checkins/:id', requireAuth, checkinController.deleteCheckin);

  return app;
};

describe('Check-in API', () => {
  let app;
  let testToken;

  beforeAll(() => {
    app = createApp();
    testToken = generateTestToken();
  });

  beforeEach(async () => {
    // Clear check-ins before each test
    await CheckinResponse.deleteMany({ user_id: mockUser.dbId });
  });

  afterAll(async () => {
    await clearTestMongoDB();
  });

  describe('POST /api/checkins', () => {
    it('should create a check-in with all valid fields', async () => {
      const checkinData = {
        mood_rating: 'good',
        stress_level: 5,
        selected_emotions: ['calm', 'happy'],
        check_in_text: 'Feeling good today!'
      };

      const res = await request(app)
        .post('/api/checkins')
        .set('Authorization', `Bearer ${testToken}`)
        .send(checkinData);

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Check-in created successfully');
      expect(res.body.checkin).toBeDefined();
      expect(res.body.checkin.mood_rating).toBe('good');
      expect(res.body.checkin.stress_level).toBe(5);
      expect(res.body.checkin.selected_emotions).toEqual(['calm', 'happy']);
      expect(res.body.checkin.time_bucket).toBeDefined();
    });

    it('should reject invalid mood_rating enum values', async () => {
      const checkinData = {
        mood_rating: 'invalid_mood',
        stress_level: 5,
        selected_emotions: ['calm']
      };

      const res = await request(app)
        .post('/api/checkins')
        .set('Authorization', `Bearer ${testToken}`)
        .send(checkinData);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid mood_rating');
    });

    it('should accept all valid mood_rating values', async () => {
      const validMoods = ['great', 'good', 'okay', 'not_good', 'terrible'];

      for (const mood of validMoods) {
        const res = await request(app)
          .post('/api/checkins')
          .set('Authorization', `Bearer ${testToken}`)
          .send({
            mood_rating: mood,
            stress_level: 5,
            selected_emotions: ['calm']
          });

        expect(res.status).toBe(201);
        expect(res.body.checkin.mood_rating).toBe(mood);
      }
    });

    it('should validate stress_level is between 1-10', async () => {
      // Test stress_level = 0 (invalid)
      let res = await request(app)
        .post('/api/checkins')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          mood_rating: 'good',
          stress_level: 0,
          selected_emotions: ['calm']
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('stress_level');

      // Test stress_level = 11 (invalid)
      res = await request(app)
        .post('/api/checkins')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          mood_rating: 'good',
          stress_level: 11,
          selected_emotions: ['calm']
        });

      expect(res.status).toBe(400);

      // Test stress_level = 1 (valid)
      res = await request(app)
        .post('/api/checkins')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          mood_rating: 'good',
          stress_level: 1,
          selected_emotions: ['calm']
        });

      expect(res.status).toBe(201);

      // Test stress_level = 10 (valid)
      res = await request(app)
        .post('/api/checkins')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          mood_rating: 'good',
          stress_level: 10,
          selected_emotions: ['calm']
        });

      expect(res.status).toBe(201);
    });

    it('should filter out invalid emotions', async () => {
      const checkinData = {
        mood_rating: 'good',
        stress_level: 5,
        selected_emotions: ['calm', 'invalid_emotion', 'happy', 'not_a_real_emotion']
      };

      const res = await request(app)
        .post('/api/checkins')
        .set('Authorization', `Bearer ${testToken}`)
        .send(checkinData);

      expect(res.status).toBe(201);
      // Only valid emotions should be saved
      expect(res.body.checkin.selected_emotions).toEqual(['calm', 'happy']);
      expect(res.body.checkin.selected_emotions).not.toContain('invalid_emotion');
    });

    it('should accept all valid emotion values', async () => {
      const validEmotions = ['anxious', 'calm', 'sad', 'happy', 'angry', 'tired', 'energetic', 'stressed'];

      const res = await request(app)
        .post('/api/checkins')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          mood_rating: 'okay',
          stress_level: 5,
          selected_emotions: validEmotions
        });

      expect(res.status).toBe(201);
      expect(res.body.checkin.selected_emotions).toEqual(validEmotions);
    });

    it('should auto-calculate time_bucket based on creation hour', async () => {
      const res = await request(app)
        .post('/api/checkins')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          mood_rating: 'good',
          stress_level: 5,
          selected_emotions: ['calm']
        });

      expect(res.status).toBe(201);
      expect(res.body.checkin.time_bucket).toBeDefined();
      expect(['morning', 'afternoon', 'evening', 'night']).toContain(res.body.checkin.time_bucket);
    });

    it('should require mood_rating field', async () => {
      const res = await request(app)
        .post('/api/checkins')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          stress_level: 5,
          selected_emotions: ['calm']
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('mood_rating is required');
    });

    it('should require stress_level field', async () => {
      const res = await request(app)
        .post('/api/checkins')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          mood_rating: 'good',
          selected_emotions: ['calm']
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('stress_level');
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app)
        .post('/api/checkins')
        .send({
          mood_rating: 'good',
          stress_level: 5
        });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/checkins', () => {
    beforeEach(async () => {
      // Create test check-ins
      const checkins = [
        { user_id: mockUser.dbId, mood_rating: 'great', stress_level: 3, selected_emotions: ['happy'], created_at: new Date('2024-01-15') },
        { user_id: mockUser.dbId, mood_rating: 'good', stress_level: 5, selected_emotions: ['calm'], created_at: new Date('2024-01-16') },
        { user_id: mockUser.dbId, mood_rating: 'okay', stress_level: 7, selected_emotions: ['tired'], created_at: new Date('2024-01-17') },
        { user_id: 999, mood_rating: 'terrible', stress_level: 9, selected_emotions: ['anxious'], created_at: new Date('2024-01-17') } // Different user
      ];

      await CheckinResponse.insertMany(checkins);
    });

    it('should list only the authenticated user\'s check-ins', async () => {
      const res = await request(app)
        .get('/api/checkins')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.checkins).toBeDefined();
      expect(res.body.checkins.length).toBe(3);
      // Should not include the other user's check-in
      res.body.checkins.forEach(checkin => {
        expect(checkin.user_id).toBe(mockUser.dbId);
      });
    });

    it('should filter by date range', async () => {
      const res = await request(app)
        .get('/api/checkins')
        .query({
          start_date: '2024-01-16',
          end_date: '2024-01-17'
        })
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.checkins.length).toBe(2);
    });

    it('should support pagination with limit and offset', async () => {
      const res = await request(app)
        .get('/api/checkins')
        .query({ limit: 2, offset: 0 })
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.checkins.length).toBe(2);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBe(3);
      expect(res.body.pagination.limit).toBe(2);
      expect(res.body.pagination.hasMore).toBe(true);
    });

    it('should return check-ins sorted by created_at descending', async () => {
      const res = await request(app)
        .get('/api/checkins')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      const dates = res.body.checkins.map(c => new Date(c.created_at).getTime());
      // Should be in descending order (most recent first)
      for (let i = 0; i < dates.length - 1; i++) {
        expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
      }
    });
  });

  describe('GET /api/checkins/stats', () => {
    beforeEach(async () => {
      const checkins = [
        { user_id: mockUser.dbId, mood_rating: 'great', stress_level: 3, selected_emotions: ['happy', 'calm'], created_at: new Date() },
        { user_id: mockUser.dbId, mood_rating: 'good', stress_level: 4, selected_emotions: ['calm'], created_at: new Date() },
        { user_id: mockUser.dbId, mood_rating: 'good', stress_level: 5, selected_emotions: ['happy', 'energetic'], created_at: new Date() },
        { user_id: mockUser.dbId, mood_rating: 'okay', stress_level: 6, selected_emotions: ['tired'], created_at: new Date() }
      ];

      await CheckinResponse.insertMany(checkins);
    });

    it('should return mood distribution', async () => {
      const res = await request(app)
        .get('/api/checkins/stats')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.stats).toBeDefined();
      expect(res.body.stats.moodDistribution).toBeDefined();
      expect(res.body.stats.moodDistribution.great).toBe(1);
      expect(res.body.stats.moodDistribution.good).toBe(2);
      expect(res.body.stats.moodDistribution.okay).toBe(1);
    });

    it('should return emotion distribution', async () => {
      const res = await request(app)
        .get('/api/checkins/stats')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.stats.emotionDistribution).toBeDefined();
      expect(res.body.stats.emotionDistribution.happy).toBe(2);
      expect(res.body.stats.emotionDistribution.calm).toBe(2);
      expect(res.body.stats.emotionDistribution.tired).toBe(1);
      expect(res.body.stats.emotionDistribution.energetic).toBe(1);
    });

    it('should return average stress level', async () => {
      const res = await request(app)
        .get('/api/checkins/stats')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.stats.averageStressLevel).toBeDefined();
      // Average of 3, 4, 5, 6 = 4.5
      expect(res.body.stats.averageStressLevel).toBe(4.5);
    });

    it('should return total check-ins count', async () => {
      const res = await request(app)
        .get('/api/checkins/stats')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.stats.totalCheckins).toBe(4);
    });

    it('should return empty stats for user with no check-ins', async () => {
      await CheckinResponse.deleteMany({ user_id: mockUser.dbId });

      const res = await request(app)
        .get('/api/checkins/stats')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.stats.totalCheckins).toBe(0);
      expect(res.body.stats.moodDistribution).toEqual({});
      expect(res.body.stats.emotionDistribution).toEqual({});
      expect(res.body.stats.averageStressLevel).toBe(0);
    });
  });

  describe('GET /api/checkins/daily', () => {
    beforeEach(async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const checkins = [
        // Morning check-in
        {
          user_id: mockUser.dbId,
          mood_rating: 'good',
          stress_level: 4,
          selected_emotions: ['calm'],
          time_bucket: 'morning',
          created_at: new Date(today.getTime() + 8 * 60 * 60 * 1000) // 8 AM
        },
        // Afternoon check-in
        {
          user_id: mockUser.dbId,
          mood_rating: 'great',
          stress_level: 3,
          selected_emotions: ['happy', 'energetic'],
          time_bucket: 'afternoon',
          created_at: new Date(today.getTime() + 14 * 60 * 60 * 1000) // 2 PM
        },
        // Evening check-in
        {
          user_id: mockUser.dbId,
          mood_rating: 'okay',
          stress_level: 6,
          selected_emotions: ['tired'],
          time_bucket: 'evening',
          created_at: new Date(today.getTime() + 19 * 60 * 60 * 1000) // 7 PM
        }
      ];

      await CheckinResponse.insertMany(checkins);
    });

    it('should default to today when no date provided', async () => {
      const res = await request(app)
        .get('/api/checkins/daily')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.date).toBeDefined();

      const today = new Date().toISOString().split('T')[0];
      expect(res.body.date).toBe(today);
    });

    it('should return data for a specific date', async () => {
      const today = new Date().toISOString().split('T')[0];

      const res = await request(app)
        .get('/api/checkins/daily')
        .query({ date: today })
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.date).toBe(today);
    });

    it('should return summary with averageMood, averageStress, totalCheckins, dominantEmotion', async () => {
      const res = await request(app)
        .get('/api/checkins/daily')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.summary).toBeDefined();
      expect(res.body.summary.totalCheckins).toBe(3);
      expect(res.body.summary.averageMood).toBeDefined();
      expect(res.body.summary.averageMoodLabel).toBeDefined();
      expect(res.body.summary.averageStress).toBeDefined();
      expect(res.body.summary.dominantEmotion).toBeDefined();
    });

    it('should group check-ins by timeBuckets', async () => {
      const res = await request(app)
        .get('/api/checkins/daily')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.timeBuckets).toBeDefined();
      expect(res.body.timeBuckets.morning).toBeDefined();
      expect(res.body.timeBuckets.afternoon).toBeDefined();
      expect(res.body.timeBuckets.evening).toBeDefined();
      expect(res.body.timeBuckets.night).toBeDefined();

      expect(res.body.timeBuckets.morning.length).toBe(1);
      expect(res.body.timeBuckets.afternoon.length).toBe(1);
      expect(res.body.timeBuckets.evening.length).toBe(1);
      expect(res.body.timeBuckets.night.length).toBe(0);
    });

    it('should include timeBucketCounts in summary', async () => {
      const res = await request(app)
        .get('/api/checkins/daily')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.summary.timeBucketCounts).toBeDefined();
      expect(res.body.summary.timeBucketCounts.morning).toBe(1);
      expect(res.body.summary.timeBucketCounts.afternoon).toBe(1);
      expect(res.body.summary.timeBucketCounts.evening).toBe(1);
      expect(res.body.summary.timeBucketCounts.night).toBe(0);
    });

    it('should handle 0 check-ins gracefully', async () => {
      await CheckinResponse.deleteMany({ user_id: mockUser.dbId });

      const res = await request(app)
        .get('/api/checkins/daily')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.summary.totalCheckins).toBe(0);
      expect(res.body.summary.averageMood).toBeNull();
      expect(res.body.summary.averageStress).toBeNull();
      expect(res.body.summary.dominantEmotion).toBeNull();
      expect(res.body.timeBuckets.morning.length).toBe(0);
      expect(res.body.timeBuckets.afternoon.length).toBe(0);
      expect(res.body.timeBuckets.evening.length).toBe(0);
      expect(res.body.timeBuckets.night.length).toBe(0);
    });

    it('should handle single check-in correctly', async () => {
      await CheckinResponse.deleteMany({ user_id: mockUser.dbId });

      await CheckinResponse.create({
        user_id: mockUser.dbId,
        mood_rating: 'great',
        stress_level: 2,
        selected_emotions: ['happy'],
        time_bucket: 'morning',
        created_at: new Date()
      });

      const res = await request(app)
        .get('/api/checkins/daily')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.summary.totalCheckins).toBe(1);
      expect(res.body.summary.averageMood).toBe(5); // great = 5
      expect(res.body.summary.averageStress).toBe(2);
      expect(res.body.summary.dominantEmotion).toBe('happy');
    });

    it('should reject invalid date format', async () => {
      const res = await request(app)
        .get('/api/checkins/daily')
        .query({ date: 'invalid-date' })
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid date format');
    });
  });

  describe('getTimeBucket function', () => {
    const { getTimeBucket } = require('../controllers/checkinController');

    it('should return morning for 5:00 AM - 11:59 AM', () => {
      expect(getTimeBucket(new Date('2024-01-01T05:00:00'))).toBe('morning');
      expect(getTimeBucket(new Date('2024-01-01T08:30:00'))).toBe('morning');
      expect(getTimeBucket(new Date('2024-01-01T11:59:00'))).toBe('morning');
    });

    it('should return afternoon for 12:00 PM - 4:59 PM', () => {
      expect(getTimeBucket(new Date('2024-01-01T12:00:00'))).toBe('afternoon');
      expect(getTimeBucket(new Date('2024-01-01T14:30:00'))).toBe('afternoon');
      expect(getTimeBucket(new Date('2024-01-01T16:59:00'))).toBe('afternoon');
    });

    it('should return evening for 5:00 PM - 8:59 PM', () => {
      expect(getTimeBucket(new Date('2024-01-01T17:00:00'))).toBe('evening');
      expect(getTimeBucket(new Date('2024-01-01T19:30:00'))).toBe('evening');
      expect(getTimeBucket(new Date('2024-01-01T20:59:00'))).toBe('evening');
    });

    it('should return night for 9:00 PM - 4:59 AM', () => {
      expect(getTimeBucket(new Date('2024-01-01T21:00:00'))).toBe('night');
      expect(getTimeBucket(new Date('2024-01-01T23:30:00'))).toBe('night');
      expect(getTimeBucket(new Date('2024-01-01T00:00:00'))).toBe('night');
      expect(getTimeBucket(new Date('2024-01-01T04:59:00'))).toBe('night');
    });
  });
});
