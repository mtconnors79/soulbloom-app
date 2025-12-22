/**
 * Authentication API Tests
 *
 * Tests for:
 * - POST /api/auth/register - user registration
 * - POST /api/auth/login - user login
 */

const request = require('supertest');
const express = require('express');
const bcrypt = require('bcrypt');

// Mock user storage
const mockUsers = [];
let mockIdCounter = 1;

// Mock User model
const mockUserModel = {
  findOne: jest.fn().mockImplementation(({ where }) => {
    const user = mockUsers.find(u => u.email === where.email);
    if (user) {
      user.profile = user.profile || null;
    }
    return Promise.resolve(user || null);
  }),
  findByPk: jest.fn().mockImplementation((id, options) => {
    const user = mockUsers.find(u => u.id === id);
    if (user && options?.include) {
      user.profile = user.profile || { id: 1, name: null, age: null, preferences: {} };
    }
    return Promise.resolve(user || null);
  }),
  create: jest.fn().mockImplementation(async (data) => {
    const user = {
      id: mockIdCounter++,
      ...data,
      created_at: new Date()
    };
    mockUsers.push(user);
    return user;
  })
};

// Mock Profile model
const mockProfileModel = {
  create: jest.fn().mockImplementation((data) => {
    const profile = {
      id: mockIdCounter++,
      ...data
    };
    const user = mockUsers.find(u => u.id === data.user_id);
    if (user) user.profile = profile;
    return Promise.resolve(profile);
  })
};

// Mock Firebase verification (always reject for these tests)
jest.mock('../config/firebase', () => ({
  verifyIdToken: jest.fn().mockRejectedValue(new Error('Firebase not configured for tests'))
}));

// Mock models
jest.mock('../models', () => ({
  User: mockUserModel,
  Profile: mockProfileModel,
  CheckinResponse: require('../models/CheckinResponse'),
  MoodEntry: {}
}));

// Import controller after mocking
const authController = require('../controllers/authController');

// Create test Express app
const createApp = () => {
  const app = express();
  app.use(express.json());

  // Routes
  app.post('/api/auth/register', authController.register);
  app.post('/api/auth/login', authController.login);

  return app;
};

describe('Authentication API', () => {
  let app;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-jwt-secret-for-testing';
    process.env.JWT_EXPIRES_IN = '1h';
    app = createApp();
  });

  beforeEach(() => {
    // Clear mock data
    mockUsers.length = 0;
    mockIdCounter = 1;
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user with valid credentials', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'SecurePassword123!'
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('User registered successfully');
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('newuser@example.com');
      expect(res.body.user.password_hash).toBeUndefined(); // Password hash should not be exposed
    });

    it('should register user with name and age', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'SecurePassword123!',
        name: 'John Doe',
        age: 25
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(res.status).toBe(201);
      expect(mockProfileModel.create).toHaveBeenCalledWith(expect.objectContaining({
        name: 'John Doe',
        age: 25
      }));
    });

    it('should reject registration without email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          password: 'SecurePassword123!'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Email and password are required');
    });

    it('should reject registration without password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Email and password are required');
    });

    it('should reject registration with duplicate email', async () => {
      // Pre-populate with existing user
      mockUsers.push({
        id: 1,
        email: 'existing@example.com',
        password_hash: 'hashed_password',
        created_at: new Date()
      });
      mockIdCounter = 2;

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'NewPassword123!'
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Conflict');
      expect(res.body.message).toContain('already exists');
    });

    it('should hash the password before storing', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'SecurePassword123!'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(mockUserModel.create).toHaveBeenCalled();
      const createCall = mockUserModel.create.mock.calls[0][0];
      expect(createCall.password_hash).toBeDefined();
      expect(createCall.password_hash).not.toBe(userData.password);
      // Verify it's a bcrypt hash
      expect(createCall.password_hash.startsWith('$2')).toBe(true);
    });

    it('should return a valid JWT token', async () => {
      const jwt = require('jsonwebtoken');

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'SecurePassword123!'
        });

      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();

      // Verify token is valid
      const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
      expect(decoded.email).toBe('newuser@example.com');
      expect(decoded.id).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user with hashed password
      const password_hash = await bcrypt.hash('ValidPassword123!', 10);
      mockUsers.push({
        id: 1,
        email: 'testuser@example.com',
        password_hash,
        created_at: new Date(),
        profile: {
          id: 1,
          name: 'Test User',
          age: 30,
          preferences: {}
        }
      });
      mockIdCounter = 2;
    });

    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'ValidPassword123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Login successful');
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('testuser@example.com');
    });

    it('should reject login without email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'ValidPassword123!'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Email and password are required');
    });

    it('should reject login without password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testuser@example.com'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Email and password are required');
    });

    it('should reject login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePassword123!'
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid email or password');
    });

    it('should reject login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'WrongPassword123!'
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid email or password');
    });

    it('should return user profile with login response', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'ValidPassword123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.user.profile).toBeDefined();
      expect(res.body.user.profile.name).toBe('Test User');
    });

    it('should return a valid JWT token on successful login', async () => {
      const jwt = require('jsonwebtoken');

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'ValidPassword123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();

      const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
      expect(decoded.email).toBe('testuser@example.com');
      expect(decoded.id).toBe(1);
    });

    it('should reject Firebase users trying to use password login', async () => {
      // Add a Firebase user
      mockUsers.push({
        id: 2,
        email: 'firebaseuser@example.com',
        password_hash: 'firebase:some-uid',
        created_at: new Date(),
        profile: null
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'firebaseuser@example.com',
          password: 'AnyPassword123!'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Firebase authentication');
    });

    it('should not expose password hash in response', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'ValidPassword123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.user.password_hash).toBeUndefined();
      expect(res.body.user.password).toBeUndefined();
    });
  });

  describe('Security Tests', () => {
    it('should use bcrypt with appropriate salt rounds', async () => {
      const bcryptSpy = jest.spyOn(bcrypt, 'hash');

      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'security@example.com',
          password: 'SecurePassword123!'
        });

      expect(bcryptSpy).toHaveBeenCalled();
      // Verify salt rounds (should be >= 10 for security)
      const [password, saltRounds] = bcryptSpy.mock.calls[0];
      expect(saltRounds).toBeGreaterThanOrEqual(10);
    });

    it('should handle empty email gracefully', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: '',
          password: 'SomePassword123!'
        });

      expect(res.status).toBe(400);
    });

    it('should handle empty password gracefully', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: ''
        });

      expect(res.status).toBe(400);
    });

    it('should not leak information about whether email exists', async () => {
      // Login with non-existent email
      const res1 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePassword!'
        });

      // Create user and login with wrong password
      const password_hash = await bcrypt.hash('RealPassword!', 10);
      mockUsers.push({
        id: 10,
        email: 'realuser@example.com',
        password_hash,
        created_at: new Date(),
        profile: null
      });

      const res2 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'realuser@example.com',
          password: 'WrongPassword!'
        });

      // Both should return same generic error message
      expect(res1.status).toBe(401);
      expect(res2.status).toBe(401);
      expect(res1.body.message).toBe(res2.body.message);
    });
  });
});
