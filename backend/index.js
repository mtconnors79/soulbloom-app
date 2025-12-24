require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');

const { connectSequelize, disconnectSequelize } = require('./config/sequelize');
const { connectMongoDB, disconnectMongoDB } = require('./config/mongodb');
const { initializeFirebase } = require('./config/firebase');

// Import models to initialize associations
require('./models');

// Import routes
const authRoutes = require('./routes/auth');
const moodRoutes = require('./routes/mood');
const checkinRoutes = require('./routes/checkin');
const activityRoutes = require('./routes/activity');
const mindfulnessRoutes = require('./routes/mindfulness');
const emergencyContactRoutes = require('./routes/emergencyContact');
const profileRoutes = require('./routes/profile');
const notificationRoutes = require('./routes/notification');
const resourcesRoutes = require('./routes/resources');
const progressRoutes = require('./routes/progress');
const careCircleRoutes = require('./routes/careCircle');
const goalsRoutes = require('./routes/goals');
const userSettingsRoutes = require('./routes/userSettings');

// Import error handlers
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Import rate limiters
const { generalLimiter } = require('./middleware/rateLimiter');

// Import cron jobs
const { initializeCronJobs, stopAllCronJobs } = require('./jobs');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration for production and development
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? [
        /\.elasticbeanstalk\.com$/,   // Allow EB domains
        /\.soulbloom\.com$/,           // Allow soulbloom.com domains
        /\.soulbloom\.care$/,          // Allow soulbloom.care domains
        /^https:\/\/soulbloom\.care$/, // Allow root soulbloom.care
        process.env.FRONTEND_URL       // Allow configured frontend URL
      ].filter(Boolean)
    : '*', // Allow all in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable response compression
app.use(compression({
  level: 6, // Balance between speed and compression ratio (1-9)
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    // Don't compress if client sends x-no-compression header
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// Enable weak ETags for conditional requests
app.set('etag', 'weak');

// Apply general rate limiting to all API routes
app.use('/api', generalLimiter);

app.get('/', (req, res) => {
  res.json({ message: 'SoulBloom API is running' });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      postgres: 'connected',
      mongodb: 'connected',
      firebase: 'initialized'
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/mood', moodRoutes);
app.use('/api/checkins', checkinRoutes);
app.use('/api/activities/mindfulness', mindfulnessRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/emergency-contacts', emergencyContactRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/resources', resourcesRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/care-circle', careCircleRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/users/settings', userSettingsRoutes);

// Error handling middleware (must be after all routes)
app.use(notFoundHandler);
app.use(errorHandler);

const startServer = async () => {
  try {
    // Initialize Firebase Admin SDK
    initializeFirebase();

    // Connect to PostgreSQL via Sequelize
    await connectSequelize();

    // Connect to MongoDB
    await connectMongoDB();

    // Start Express server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);

      // Initialize cron jobs after server is listening
      initializeCronJobs();
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  try {
    // Stop cron jobs first
    stopAllCronJobs();

    await disconnectSequelize();
    await disconnectMongoDB();
    console.log('All connections closed. Exiting.');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error.message);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit in development, but log the error
  if (process.env.NODE_ENV === 'production') {
    shutdown('UNHANDLED_REJECTION');
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Always exit on uncaught exceptions
  process.exit(1);
});

startServer();