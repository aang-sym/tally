import { Router } from 'express';
import { quotaTracker } from '../services/quota-tracker.js';
import { streamingAvailabilityService } from '../services/streaming-availability.js';
import { config } from '../config/index.js';

const router = Router();

// Get quota usage statistics
router.get('/', async (req, res, next) => {
  try {
    const stats = await quotaTracker.getUsageStats();
    const isLowQuota = await quotaTracker.shouldWarnLowQuota();

    res.json({
      ...stats,
      isLowQuota,
      devMode: config.streamingApiDevMode,
      hasApiKey: config.streamingAvailabilityApiKey !== 'dev-key-placeholder',
      cacheStats: streamingAvailabilityService.getCacheStats(),
    });
  } catch (error) {
    next(error);
  }
});

// Get recent call log
router.get('/log', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const log = await quotaTracker.getCallLog(limit);

    res.json({
      calls: log,
      totalCalls: log.length,
    });
  } catch (error) {
    next(error);
  }
});

// Reset quota (admin/development only)
router.post('/reset', async (req, res, next) => {
  try {
    // Only allow in development
    if (config.nodeEnv !== 'development') {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Quota reset only allowed in development environment',
      });
    }

    await quotaTracker.resetQuota();
    streamingAvailabilityService.clearCache();

    res.json({
      success: true,
      message: 'Quota reset successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Clear cache (useful for testing)
router.post('/clear-cache', async (req, res, next) => {
  try {
    streamingAvailabilityService.clearCache();

    res.json({
      success: true,
      message: 'Cache cleared successfully',
    });
  } catch (error) {
    next(error);
  }
});

export { router as streamingQuotaRouter };
