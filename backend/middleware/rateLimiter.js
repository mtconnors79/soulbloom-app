const rateLimit = require('express-rate-limit');
const { getUserDistressContext, getCrisisResources } = require('../services/distressContextService');

// Read rate limits from environment with fallback defaults
const RATE_LIMITS = {
  general: {
    max: parseInt(process.env.RATE_LIMIT_GENERAL_MAX, 10) || 100,
    windowMs: parseInt(process.env.RATE_LIMIT_GENERAL_WINDOW_MS, 10) || 900000 // 15 min
  },
  auth: {
    max: parseInt(process.env.RATE_LIMIT_AUTH_MAX, 10) || 5,
    windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS, 10) || 900000 // 15 min
  },
  ai: {
    max: parseInt(process.env.RATE_LIMIT_AI_MAX, 10) || 20,
    windowMs: parseInt(process.env.RATE_LIMIT_AI_WINDOW_MS, 10) || 3600000 // 1 hour
  },
  checkin: {
    max: parseInt(process.env.RATE_LIMIT_CHECKIN_MAX, 10) || 10,
    windowMs: parseInt(process.env.RATE_LIMIT_CHECKIN_WINDOW_MS, 10) || 3600000 // 1 hour
  }
};

// Key generator: use user ID for authenticated users, IP for anonymous
const userKeyGenerator = (req) => {
  if (req.user?.dbId) {
    return `user_${req.user.dbId}`;
  }
  // Fallback to IP for anonymous users
  return req.ip || req.connection?.remoteAddress || 'anonymous';
};

// Create smart rate limit handler with distress context
const createSmartRateLimitHandler = (defaultMessage) => async (req, res) => {
  const retryAfter = req.rateLimit?.resetTime
    ? Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000)
    : 60;

  let distressContext = { hasRecentDistress: false, lastRiskLevel: null };
  let crisisResources = null;

  // Check distress context for authenticated users
  if (req.user?.dbId) {
    try {
      distressContext = await getUserDistressContext(req.user.dbId);

      if (distressContext.hasRecentDistress) {
        crisisResources = getCrisisResources();
      }
    } catch (error) {
      console.error('[RateLimiter] Error getting distress context:', error);
    }
  }

  // Build response
  const response = {
    error: 'Too Many Requests',
    retryAfter,
    distressContext: {
      hasRecentDistress: distressContext.hasRecentDistress,
      lastRiskLevel: distressContext.lastRiskLevel
    }
  };

  if (distressContext.hasRecentDistress && crisisResources) {
    response.message = crisisResources.message;
    response.crisisResources = crisisResources.hotlines;
  } else {
    response.message = defaultMessage || "You're using the app a lot - that's great! Give us a moment to catch up.";
  }

  res.status(429).json(response);
};

// Base options for all limiters
const baseOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  keyGenerator: userKeyGenerator
};

// General API rate limiter
const generalLimiter = rateLimit({
  ...baseOptions,
  windowMs: RATE_LIMITS.general.windowMs,
  max: RATE_LIMITS.general.max,
  handler: createSmartRateLimitHandler("You're using the app a lot - that's great! Give us a moment to catch up.")
});

// Strict limiter for authentication routes
const authLimiter = rateLimit({
  ...baseOptions,
  windowMs: RATE_LIMITS.auth.windowMs,
  max: RATE_LIMITS.auth.max,
  skipSuccessfulRequests: true,
  handler: createSmartRateLimitHandler('Too many authentication attempts. Please try again in a few minutes.')
});

// Limiter for sensitive operations (password reset, etc.)
const sensitiveLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  handler: createSmartRateLimitHandler('Too many attempts. Please try again in an hour.')
});

// Limiter for AI/analysis endpoints (expensive operations)
const aiLimiter = rateLimit({
  ...baseOptions,
  windowMs: RATE_LIMITS.ai.windowMs,
  max: RATE_LIMITS.ai.max,
  handler: createSmartRateLimitHandler("You're using the app a lot - that's great! Give us a moment to catch up.")
});

// Limiter for check-in creation
const checkinLimiter = rateLimit({
  ...baseOptions,
  windowMs: RATE_LIMITS.checkin.windowMs,
  max: RATE_LIMITS.checkin.max,
  handler: createSmartRateLimitHandler("You're using the app a lot - that's great! Give us a moment to catch up.")
});

// Limiter for data export/bulk operations
const bulkLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  handler: createSmartRateLimitHandler('Bulk operation rate limit exceeded. Please try again later.')
});

// Very strict limiter for crisis-related endpoints
const crisisLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  handler: createSmartRateLimitHandler('Please take a moment. If you need immediate help, contact: 988 (Suicide & Crisis Lifeline)')
});

// Relaxed limiter for read-only operations
const readOnlyLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  handler: createSmartRateLimitHandler("You're using the app a lot - that's great! Give us a moment to catch up.")
});

// Create a custom limiter with specific options
const createLimiter = (options) => {
  return rateLimit({
    ...baseOptions,
    handler: createSmartRateLimitHandler(options.message),
    ...options
  });
};

// Skip rate limiting for certain conditions
const skipIf = (conditionFn) => (req, res, next) => {
  if (conditionFn(req)) {
    return next();
  }
  return generalLimiter(req, res, next);
};

// Skip rate limiting in test environment
const skipInTest = (limiter) => (req, res, next) => {
  if (process.env.NODE_ENV === 'test') {
    return next();
  }
  return limiter(req, res, next);
};

module.exports = {
  generalLimiter,
  authLimiter,
  sensitiveLimiter,
  aiLimiter,
  checkinLimiter,
  bulkLimiter,
  crisisLimiter,
  readOnlyLimiter,
  createLimiter,
  skipIf,
  skipInTest,
  RATE_LIMITS
};
