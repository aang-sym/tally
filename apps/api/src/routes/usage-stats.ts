/**
 * API Usage Statistics Routes
 *
 * Endpoints for retrieving API usage statistics for the dashboard
 */

import { Router } from 'express';
import { usageTracker } from '../middleware/usage-tracker.js';

const router = Router();

// Get all usage statistics
router.get('/', async (req, res) => {
  try {
    const stats = usageTracker.getAllUsageStats();

    // Add quota information
    const enhancedStats = {
      ...stats,
      quotas: {
        tmdb: {
          // TMDB doesn't have hard limits but we can track for monitoring
          dailyLimit: 1000,
          monthlyLimit: 40000,
        },
        streamingAvailability: {
          // Based on RapidAPI free tier
          dailyLimit: 500,
          monthlyLimit: parseInt(process.env.STREAMING_API_MONTHLY_LIMIT || '950', 10),
        },
      },
    };

    res.json({
      success: true,
      data: enhancedStats,
    });
  } catch (error) {
    console.error('Error getting usage stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve usage statistics',
    });
  }
});

// Get usage statistics for a specific service
router.get('/:service', async (req, res) => {
  try {
    const { service } = req.params;

    if (service !== 'tmdb' && service !== 'streaming-availability') {
      return res.status(400).json({
        success: false,
        error: 'Invalid service. Must be "tmdb" or "streaming-availability"',
      });
    }

    const stats = usageTracker.getUsageStats(service);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error(`Error getting ${req.params.service} stats:`, error);
    res.status(500).json({
      success: false,
      error: `Failed to retrieve ${req.params.service} statistics`,
    });
  }
});

// Get recent API calls for debugging
router.get('/debug/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const recentCalls = usageTracker.getRecentCalls(limit);

    res.json({
      success: true,
      data: recentCalls,
    });
  } catch (error) {
    console.error('Error getting recent calls:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve recent calls',
    });
  }
});

export { router as usageStatsRouter };
