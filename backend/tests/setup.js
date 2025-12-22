/**
 * Test Setup File
 *
 * Sets up test environment, database connections, and cleanup utilities.
 */

require('dotenv').config();

const mongoose = require('mongoose');
const { Sequelize } = require('sequelize');

// Test database configuration
const TEST_MONGODB_URI = process.env.TEST_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/soulbloom_test';

// Store original env values
const originalEnv = { ...process.env };

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';

/**
 * Mock user data for authenticated requests
 */
const mockUser = {
  id: 1,
  dbId: 1,
  email: 'test@example.com',
  tokenType: 'jwt'
};

/**
 * Create a mock authentication middleware
 * Injects mock user into req.user for protected routes
 */
const mockAuthMiddleware = (req, res, next) => {
  req.user = { ...mockUser };
  next();
};

/**
 * Generate a test JWT token
 */
const generateTestToken = () => {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { id: mockUser.id, email: mockUser.email },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

/**
 * Connect to test MongoDB database
 */
const connectTestMongoDB = async () => {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(TEST_MONGODB_URI);
      console.log('Test MongoDB connected');
    }
  } catch (error) {
    console.error('Test MongoDB connection error:', error.message);
    throw error;
  }
};

/**
 * Disconnect from test MongoDB
 */
const disconnectTestMongoDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('Test MongoDB disconnected');
    }
  } catch (error) {
    console.error('Test MongoDB disconnect error:', error.message);
  }
};

/**
 * Clear all test data from MongoDB collections
 */
const clearTestMongoDB = async () => {
  try {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  } catch (error) {
    console.error('Error clearing test MongoDB:', error.message);
  }
};

/**
 * Create test app with mocked authentication
 */
const createTestApp = () => {
  const express = require('express');
  const app = express();

  app.use(express.json());

  // Mock the auth middleware globally for test app
  app.use((req, res, next) => {
    // Check if route should be authenticated
    if (req.headers.authorization) {
      req.user = { ...mockUser };
    }
    next();
  });

  return app;
};

// Global setup before all tests
beforeAll(async () => {
  await connectTestMongoDB();
});

// Global cleanup after all tests
afterAll(async () => {
  await clearTestMongoDB();
  await disconnectTestMongoDB();
});

// Cleanup after each test
afterEach(async () => {
  // Clear mocks
  jest.clearAllMocks();
});

module.exports = {
  mockUser,
  mockAuthMiddleware,
  generateTestToken,
  connectTestMongoDB,
  disconnectTestMongoDB,
  clearTestMongoDB,
  createTestApp,
  TEST_MONGODB_URI
};
