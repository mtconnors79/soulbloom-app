/**
 * Cache Headers Middleware
 *
 * Different cache strategies for different types of data:
 *
 * 1. static - Public data that rarely changes (crisis resources, templates)
 *    Cache for 1 hour, CDN and browser caching enabled
 *
 * 2. private - User-specific data that should never be cached
 *    Used for mood entries, check-ins, personal data
 *
 * 3. swr (stale-while-revalidate) - Data that can be slightly stale
 *    Cache for 5 minutes, serve stale while revalidating for 1 minute
 *    Good for goal templates, achievement definitions
 *
 * 4. shortLived - Data that changes frequently but benefits from brief caching
 *    Cache for 1 minute only
 *    Good for stats, summaries
 */

const cacheStrategies = {
  /**
   * Static data - cache for 1 hour
   * Use for: crisis resources, app configuration, static content
   */
  static: (req, res, next) => {
    res.set('Cache-Control', 'public, max-age=3600');
    res.set('Vary', 'Accept-Encoding');
    next();
  },

  /**
   * Private/No cache - user-specific data
   * Use for: mood entries, check-ins, goals, personal data
   */
  private: (req, res, next) => {
    res.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
  },

  /**
   * Stale-while-revalidate - semi-static data
   * Cache for 5 minutes, serve stale for up to 1 minute while revalidating
   * Use for: goal templates, achievements list, static lookups
   */
  swr: (req, res, next) => {
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    res.set('Vary', 'Accept-Encoding');
    next();
  },

  /**
   * Short-lived cache - frequently changing aggregate data
   * Cache for 1 minute only
   * Use for: stats, summaries, dashboard data
   */
  shortLived: (req, res, next) => {
    res.set('Cache-Control', 'public, max-age=60');
    res.set('Vary', 'Accept-Encoding, Authorization');
    next();
  },

  /**
   * Immutable - content that never changes (versioned assets)
   * Cache for 1 year
   * Use for: versioned static files, uploaded content with hash
   */
  immutable: (req, res, next) => {
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.set('Vary', 'Accept-Encoding');
    next();
  }
};

/**
 * Custom cache duration middleware factory
 * @param {number} maxAge - Cache duration in seconds
 * @param {boolean} isPublic - Whether cache is public or private
 */
const customCache = (maxAge, isPublic = true) => (req, res, next) => {
  const visibility = isPublic ? 'public' : 'private';
  res.set('Cache-Control', `${visibility}, max-age=${maxAge}`);
  if (isPublic) {
    res.set('Vary', 'Accept-Encoding');
  }
  next();
};

module.exports = {
  ...cacheStrategies,
  customCache
};
