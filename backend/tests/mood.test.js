/**
 * Mood API Tests
 *
 * Tests for:
 * - POST /api/mood - create mood entry
 * - GET /api/mood - list mood entries
 * - GET /api/mood/stats - mood statistics
 */

const request = require('supertest');
const express = require('express');
const { mockUser, generateTestToken } = require('./setup');

// Mock MoodEntry model (Sequelize/PostgreSQL)
const mockMoodEntries = [];
let mockIdCounter = 1;

const mockMoodEntry = {
  create: jest.fn().mockImplementation((data) => {
    const entry = {
      id: mockIdCounter++,
      ...data,
      created_at: new Date(),
      toJSON: () => entry
    };
    mockMoodEntries.push(entry);
    return Promise.resolve(entry);
  }),
  findAndCountAll: jest.fn().mockImplementation(({ where, limit, offset }) => {
    const filtered = mockMoodEntries.filter(e => e.user_id === where.user_id);
    return Promise.resolve({
      count: filtered.length,
      rows: filtered.slice(offset || 0, (offset || 0) + (limit || 30))
    });
  }),
  findOne: jest.fn().mockImplementation(({ where }) => {
    const entry = mockMoodEntries.find(e => e.id === where.id && e.user_id === where.user_id);
    if (entry) {
      entry.update = jest.fn().mockImplementation((updates) => {
        Object.assign(entry, updates);
        return Promise.resolve(entry);
      });
      entry.destroy = jest.fn().mockImplementation(() => {
        const index = mockMoodEntries.findIndex(e => e.id === entry.id);
        if (index > -1) mockMoodEntries.splice(index, 1);
        return Promise.resolve();
      });
    }
    return Promise.resolve(entry || null);
  }),
  findAll: jest.fn().mockImplementation(({ where }) => {
    const filtered = mockMoodEntries.filter(e => e.user_id === where.user_id);
    return Promise.resolve(filtered);
  })
};

// Mock the models module
jest.mock('../models', () => ({
  MoodEntry: mockMoodEntry,
  CheckinResponse: require('../models/CheckinResponse'),
  User: {},
  Profile: {}
}));

// Import controller after mocking
const moodController = require('../controllers/moodController');

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

  // Auth middleware
  const requireAuth = (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  };

  // Routes
  app.post('/api/mood', requireAuth, moodController.createMoodEntry);
  app.get('/api/mood', requireAuth, moodController.getMoodEntries);
  app.get('/api/mood/stats', requireAuth, moodController.getMoodStats);
  app.get('/api/mood/:id', requireAuth, moodController.getMoodEntry);
  app.put('/api/mood/:id', requireAuth, moodController.updateMoodEntry);
  app.delete('/api/mood/:id', requireAuth, moodController.deleteMoodEntry);

  return app;
};

describe('Mood API', () => {
  let app;
  let testToken;

  beforeAll(() => {
    app = createApp();
    testToken = generateTestToken();
  });

  beforeEach(() => {
    // Clear mock data
    mockMoodEntries.length = 0;
    mockIdCounter = 1;
    jest.clearAllMocks();
  });

  describe('POST /api/mood', () => {
    it('should create a mood entry with all required fields', async () => {
      const moodData = {
        sentiment_score: 0.8,
        sentiment_label: 'positive',
        check_in_date: '2024-01-15'
      };

      const res = await request(app)
        .post('/api/mood')
        .set('Authorization', `Bearer ${testToken}`)
        .send(moodData);

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Mood entry created successfully');
      expect(res.body.moodEntry).toBeDefined();
      expect(res.body.moodEntry.sentiment_score).toBe(0.8);
      expect(res.body.moodEntry.sentiment_label).toBe('positive');
      expect(mockMoodEntry.create).toHaveBeenCalledWith(expect.objectContaining({
        user_id: mockUser.dbId,
        sentiment_score: 0.8,
        sentiment_label: 'positive',
        check_in_date: '2024-01-15'
      }));
    });

    it('should require sentiment_score', async () => {
      const res = await request(app)
        .post('/api/mood')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          sentiment_label: 'positive',
          check_in_date: '2024-01-15'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('required');
    });

    it('should require sentiment_label', async () => {
      const res = await request(app)
        .post('/api/mood')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          sentiment_score: 0.8,
          check_in_date: '2024-01-15'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('required');
    });

    it('should require check_in_date', async () => {
      const res = await request(app)
        .post('/api/mood')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          sentiment_score: 0.8,
          sentiment_label: 'positive'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('required');
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app)
        .post('/api/mood')
        .send({
          sentiment_score: 0.8,
          sentiment_label: 'positive',
          check_in_date: '2024-01-15'
        });

      expect(res.status).toBe(401);
    });

    it('should accept various sentiment scores', async () => {
      const scores = [-1, -0.5, 0, 0.5, 1];

      for (const score of scores) {
        const res = await request(app)
          .post('/api/mood')
          .set('Authorization', `Bearer ${testToken}`)
          .send({
            sentiment_score: score,
            sentiment_label: 'neutral',
            check_in_date: '2024-01-15'
          });

        expect(res.status).toBe(201);
        expect(res.body.moodEntry.sentiment_score).toBe(score);
      }
    });
  });

  describe('GET /api/mood', () => {
    beforeEach(() => {
      // Pre-populate mock entries
      const entries = [
        { id: 1, user_id: mockUser.dbId, sentiment_score: 0.8, sentiment_label: 'positive', check_in_date: '2024-01-15', created_at: new Date('2024-01-15') },
        { id: 2, user_id: mockUser.dbId, sentiment_score: 0.5, sentiment_label: 'positive', check_in_date: '2024-01-16', created_at: new Date('2024-01-16') },
        { id: 3, user_id: mockUser.dbId, sentiment_score: -0.2, sentiment_label: 'negative', check_in_date: '2024-01-17', created_at: new Date('2024-01-17') },
        { id: 4, user_id: 999, sentiment_score: 0.9, sentiment_label: 'positive', check_in_date: '2024-01-17', created_at: new Date('2024-01-17') }
      ];
      mockMoodEntries.push(...entries);
      mockIdCounter = 5;
    });

    it('should list only the authenticated user\'s mood entries', async () => {
      const res = await request(app)
        .get('/api/mood')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.moodEntries).toBeDefined();
      expect(res.body.moodEntries.length).toBe(3);
    });

    it('should return pagination info', async () => {
      const res = await request(app)
        .get('/api/mood')
        .query({ limit: 2 })
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBe(3);
      expect(res.body.pagination.limit).toBe(2);
      expect(res.body.pagination.hasMore).toBe(true);
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app)
        .get('/api/mood');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/mood/stats', () => {
    beforeEach(() => {
      // Pre-populate mock entries
      const entries = [
        { id: 1, user_id: mockUser.dbId, sentiment_score: 0.8, sentiment_label: 'positive', check_in_date: '2024-01-15', created_at: new Date('2024-01-15') },
        { id: 2, user_id: mockUser.dbId, sentiment_score: 0.6, sentiment_label: 'positive', check_in_date: '2024-01-16', created_at: new Date('2024-01-16') },
        { id: 3, user_id: mockUser.dbId, sentiment_score: -0.2, sentiment_label: 'negative', check_in_date: '2024-01-17', created_at: new Date('2024-01-17') },
        { id: 4, user_id: mockUser.dbId, sentiment_score: 0.0, sentiment_label: 'neutral', check_in_date: '2024-01-18', created_at: new Date('2024-01-18') }
      ];
      mockMoodEntries.push(...entries);
      mockIdCounter = 5;
    });

    it('should return mood statistics', async () => {
      const res = await request(app)
        .get('/api/mood/stats')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.stats).toBeDefined();
    });

    it('should return total entries count', async () => {
      const res = await request(app)
        .get('/api/mood/stats')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.stats.totalEntries).toBe(4);
    });

    it('should return average score', async () => {
      const res = await request(app)
        .get('/api/mood/stats')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.stats.averageScore).toBeDefined();
      // Average of 0.8, 0.6, -0.2, 0.0 = 0.3
      expect(res.body.stats.averageScore).toBeCloseTo(0.3, 1);
    });

    it('should return sentiment distribution', async () => {
      const res = await request(app)
        .get('/api/mood/stats')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.stats.sentimentDistribution).toBeDefined();
      expect(res.body.stats.sentimentDistribution.positive).toBe(2);
      expect(res.body.stats.sentimentDistribution.negative).toBe(1);
      expect(res.body.stats.sentimentDistribution.neutral).toBe(1);
    });

    it('should return trend analysis', async () => {
      const res = await request(app)
        .get('/api/mood/stats')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.stats.trend).toBeDefined();
      expect(['improving', 'declining', 'stable']).toContain(res.body.stats.trend);
    });

    it('should return empty stats for user with no entries', async () => {
      mockMoodEntries.length = 0;

      const res = await request(app)
        .get('/api/mood/stats')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.stats.totalEntries).toBe(0);
      expect(res.body.stats.averageScore).toBeNull();
      expect(res.body.stats.sentimentDistribution).toEqual({});
      expect(res.body.stats.trend).toBeNull();
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app)
        .get('/api/mood/stats');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/mood/:id', () => {
    beforeEach(() => {
      mockMoodEntries.push({
        id: 1,
        user_id: mockUser.dbId,
        sentiment_score: 0.8,
        sentiment_label: 'positive',
        check_in_date: '2024-01-15',
        created_at: new Date()
      });
      mockIdCounter = 2;
    });

    it('should return a specific mood entry', async () => {
      const res = await request(app)
        .get('/api/mood/1')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.moodEntry).toBeDefined();
      expect(res.body.moodEntry.id).toBe(1);
    });

    it('should return 404 for non-existent entry', async () => {
      const res = await request(app)
        .get('/api/mood/999')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('not found');
    });
  });

  describe('PUT /api/mood/:id', () => {
    beforeEach(() => {
      const entry = {
        id: 1,
        user_id: mockUser.dbId,
        sentiment_score: 0.8,
        sentiment_label: 'positive',
        check_in_date: '2024-01-15',
        created_at: new Date()
      };
      mockMoodEntries.push(entry);
      mockIdCounter = 2;
    });

    it('should update a mood entry', async () => {
      const res = await request(app)
        .put('/api/mood/1')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          sentiment_score: 0.5,
          sentiment_label: 'neutral'
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Mood entry updated successfully');
    });

    it('should return 404 for non-existent entry', async () => {
      const res = await request(app)
        .put('/api/mood/999')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          sentiment_score: 0.5
        });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/mood/:id', () => {
    beforeEach(() => {
      mockMoodEntries.push({
        id: 1,
        user_id: mockUser.dbId,
        sentiment_score: 0.8,
        sentiment_label: 'positive',
        check_in_date: '2024-01-15',
        created_at: new Date()
      });
      mockIdCounter = 2;
    });

    it('should delete a mood entry', async () => {
      const res = await request(app)
        .delete('/api/mood/1')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Mood entry deleted successfully');
    });

    it('should return 404 for non-existent entry', async () => {
      const res = await request(app)
        .delete('/api/mood/999')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(404);
    });
  });
});
