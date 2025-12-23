const { initializeGoalCronJobs, stopGoalCronJobs } = require('./goalCronJobs');
const { initializeCleanupJob, stopCleanupJob } = require('./goalHistoryCleanup');
const { initializePatternCheckJobs, stopPatternCheckJobs } = require('./patternCheckJob');

/**
 * Initialize all cron jobs
 * Should be called when the server starts
 */
const initializeCronJobs = () => {
  console.log('[CronJobs] Initializing all cron jobs...');

  // Only initialize cron jobs in production or if explicitly enabled
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_CRON_JOBS === 'true') {
    initializeGoalCronJobs();
    initializeCleanupJob();
    initializePatternCheckJobs();
    console.log('[CronJobs] All cron jobs initialized');
  } else {
    console.log('[CronJobs] Cron jobs disabled in development (set ENABLE_CRON_JOBS=true to enable)');
  }
};

/**
 * Stop all cron jobs gracefully
 * Should be called when the server shuts down
 */
const stopAllCronJobs = () => {
  console.log('[CronJobs] Stopping all cron jobs...');
  stopGoalCronJobs();
  stopCleanupJob();
  stopPatternCheckJobs();
  console.log('[CronJobs] All cron jobs stopped');
};

module.exports = {
  initializeCronJobs,
  stopAllCronJobs
};
