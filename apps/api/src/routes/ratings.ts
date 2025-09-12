/**
 * Rating API Routes
 *
 * Handles rating operations for shows, seasons, and episodes,
 * including aggregate ratings and rating-based recommendations.
 */

import { Router, Request, Response } from 'express';
import { ratingService } from '../services/RatingService.js';

const router: Router = Router();

// Middleware to extract userId (stub implementation)
const authenticateUser = (req: Request, res: Response, next: any) => {
  // TODO: Replace with proper JWT authentication
  const userId = (req.headers['x-user-id'] as string) || 'user-1';
  (req as any).userId = userId;
  next();
};

router.use(authenticateUser);

/**
 * POST /api/ratings/show/:userShowId
 * Rate a show (0.0-10.0)
 *
 * Body: { rating: number }
 */
router.post('/show/:userShowId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string | undefined;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }
    const userShowId = req.params.userShowId as string;
    const { rating } = req.body;

    if (typeof rating !== 'number' || rating < 0 || rating > 10) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be a number between 0.0 and 10.0',
      });
    }

    const success = await ratingService.rateShow(userId!, userShowId, rating);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Show not found or access denied',
      });
    }

    res.json({
      success: true,
      data: {
        rating,
        message: `Show rated ${rating}/10`,
      },
    });
  } catch (error) {
    console.error('Failed to rate show:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to rate show',
    });
  }
});

/**
 * POST /api/ratings/season/:seasonId
 * Rate a season (0.0-10.0)
 *
 * Body: { rating: number }
 */
router.post('/season/:seasonId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string | undefined;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }
    const seasonId = req.params.seasonId as string;
    const { rating } = req.body;

    if (typeof rating !== 'number' || rating < 0 || rating > 10) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be a number between 0.0 and 10.0',
      });
    }

    const ratingRecord = await ratingService.rateSeason(userId!, seasonId, rating);

    if (!ratingRecord) {
      return res.status(400).json({
        success: false,
        error: 'Failed to rate season',
      });
    }

    // Get updated aggregate rating
    const aggregateRating = await ratingService.getSeasonAggregateRating(seasonId);

    res.json({
      success: true,
      data: {
        rating,
        aggregateRating,
        message: `Season rated ${rating}/10`,
      },
    });
  } catch (error) {
    console.error('Failed to rate season:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to rate season',
    });
  }
});

/**
 * POST /api/ratings/episode/:episodeId
 * Rate an episode (0.0-10.0)
 *
 * Body: { rating: number }
 */
router.post('/episode/:episodeId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string | undefined;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }
    const episodeId = req.params.episodeId as string;
    const { rating } = req.body;

    if (typeof rating !== 'number' || rating < 0 || rating > 10) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be a number between 0.0 and 10.0',
      });
    }

    const success = await ratingService.rateEpisode(userId!, episodeId, rating);

    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'Failed to rate episode',
      });
    }

    // Get updated aggregate rating
    const aggregateRating = await ratingService.getEpisodeAggregateRating(episodeId);

    res.json({
      success: true,
      data: {
        rating,
        aggregateRating,
        message: `Episode rated ${rating}/10`,
      },
    });
  } catch (error) {
    console.error('Failed to rate episode:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to rate episode',
    });
  }
});

/**
 * GET /api/ratings/show/:showId/aggregate
 * Get aggregate rating for a show
 */
router.get('/show/:showId/aggregate', async (req: Request, res: Response) => {
  try {
    const showId = req.params.showId as string;

    const aggregateRating = await ratingService.getShowAggregateRating(showId);

    res.json({
      success: true,
      data: {
        showId,
        ...aggregateRating,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to get show aggregate rating:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve show aggregate rating',
    });
  }
});

/**
 * GET /api/ratings/season/:seasonId/aggregate
 * Get aggregate rating for a season
 */
router.get('/season/:seasonId/aggregate', async (req: Request, res: Response) => {
  try {
    const seasonId = req.params.seasonId as string;

    const aggregateRating = await ratingService.getSeasonAggregateRating(seasonId);

    res.json({
      success: true,
      data: {
        seasonId,
        ...aggregateRating,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to get season aggregate rating:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve season aggregate rating',
    });
  }
});

/**
 * GET /api/ratings/episode/:episodeId/aggregate
 * Get aggregate rating for an episode
 */
router.get('/episode/:episodeId/aggregate', async (req: Request, res: Response) => {
  try {
    const episodeId = req.params.episodeId as string;

    const aggregateRating = await ratingService.getEpisodeAggregateRating(episodeId);

    res.json({
      success: true,
      data: {
        episodeId,
        ...aggregateRating,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to get episode aggregate rating:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve episode aggregate rating',
    });
  }
});

/**
 * GET /api/ratings/user/stats
 * Get user's rating statistics
 */
router.get('/user/stats', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string | undefined;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const stats = await ratingService.getUserRatingStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Failed to get user rating stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user rating statistics',
    });
  }
});

/**
 * GET /api/ratings/user/preferences
 * Get user's rating preferences for recommendations
 */
router.get('/user/preferences', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string | undefined;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const preferences = await ratingService.getUserRatingPreferences(userId);

    res.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    console.error('Failed to get user rating preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user rating preferences',
    });
  }
});

/**
 * GET /api/ratings/top-rated
 * Get globally top-rated shows
 */
router.get('/top-rated', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50); // Max 50

    const topRatedShows = await ratingService.getTopRatedShows(limit);

    res.json({
      success: true,
      data: {
        shows: topRatedShows,
        totalCount: topRatedShows.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to get top-rated shows:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve top-rated shows',
    });
  }
});

/**
 * POST /api/ratings/batch
 * Batch rate multiple items at once
 *
 * Body: {
 *   ratings: Array<{
 *     type: 'show' | 'season' | 'episode',
 *     id: string, // userShowId for shows, seasonId for seasons, episodeId for episodes
 *     rating: number
 *   }>
 * }
 */
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string | undefined;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }
    const { ratings } = req.body;

    if (!Array.isArray(ratings) || ratings.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ratings must be a non-empty array',
      });
    }

    // Validate all ratings first
    for (const rating of ratings) {
      if (!['show', 'season', 'episode'].includes(rating.type)) {
        return res.status(400).json({
          success: false,
          error: `Invalid rating type: ${rating.type}. Must be 'show', 'season', or 'episode'`,
        });
      }

      if (typeof rating.rating !== 'number' || rating.rating < 0 || rating.rating > 10) {
        return res.status(400).json({
          success: false,
          error: `Invalid rating value: ${rating.rating}. Must be between 0.0 and 10.0`,
        });
      }
    }

    // Process all ratings
    const results = [];

    for (const rating of ratings) {
      try {
        let success = false;

        switch (rating.type) {
          case 'show':
            success = await ratingService.rateShow(userId, rating.id, rating.rating);
            break;
          case 'season': {
            const seasonRating = await ratingService.rateSeason(userId, rating.id, rating.rating);
            success = !!seasonRating;
            break;
          }
          case 'episode':
            success = await ratingService.rateEpisode(userId, rating.id, rating.rating);
            break;
        }

        results.push({
          type: rating.type,
          id: rating.id,
          rating: rating.rating,
          success,
        });
      } catch (error) {
        results.push({
          type: rating.type,
          id: rating.id,
          rating: rating.rating,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    res.json({
      success: true,
      data: {
        results,
        successCount,
        totalCount: ratings.length,
        message: `Successfully processed ${successCount}/${ratings.length} ratings`,
      },
    });
  } catch (error) {
    console.error('Failed to process batch ratings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process batch ratings',
    });
  }
});

/**
 * GET /api/ratings/analytics
 * Get platform-wide rating analytics
 */
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    // This would be an admin-only endpoint in production
    // For now, return basic analytics

    const topRatedShows = await ratingService.getTopRatedShows(5);

    res.json({
      success: true,
      data: {
        topRatedShows,
        timestamp: new Date().toISOString(),
        message: 'Basic analytics - full implementation pending',
      },
    });
  } catch (error) {
    console.error('Failed to get rating analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve rating analytics',
    });
  }
});

export default router;
