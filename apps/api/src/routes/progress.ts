/**
 * Episode Progress API Routes
 *
 * Handles episode watch progress tracking with live statistics,
 * auto-completion features, and bulk operations.
 */

import { Router, Request, Response, NextFunction } from 'express';
// Request type augmented with optional userId set by auth middleware
type AuthedRequest = Request & { userId?: string };

import { episodeProgressService } from '../services/EpisodeProgressService.js';
import { showService } from '../services/ShowService.js';

const router: Router = Router();

// Middleware to extract userId (stub implementation)
const authenticateUser = (req: AuthedRequest, res: Response, next: NextFunction) => {
  // TODO: Replace with proper JWT authentication
  const userId = (req.headers['x-user-id'] as string) || 'user-1';
  (req as AuthedRequest).userId = userId;
  next();
};

router.use(authenticateUser);

/**
 * GET /api/progress/:showId
 * Get show watch progress with episode details and live stats
 */
router.get('/:showId', async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }
    const uid = userId as string;

    const { showId } = req.params as { showId?: string };
    if (!showId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required path parameter: showId',
      });
    }
    const sid: string = showId;

    const showDetails = await showService.getShowWithDetails(sid);

    if (!showDetails) {
      return res.status(404).json({
        success: false,
        error: 'Show not found',
      });
    }

    // Get all episode IDs for this show
    const allEpisodeIds = showDetails.seasons.flatMap((season) =>
      season.episodes.map((episode) => episode.id)
    );

    // Get progress for all episodes
    const episodesWithProgress = await episodeProgressService.getEpisodesWithProgress(
      uid,
      allEpisodeIds,
      req.query.liveStats !== 'false'
    );

    // Group episodes back into seasons
    const seasonsWithProgress = showDetails.seasons.map((season) => ({
      ...season,
      episodes: season.episodes.map((episode) => {
        const episodeWithProgress = episodesWithProgress.find((ep) => ep.id === episode.id);
        return {
          ...episode,
          progress: episodeWithProgress?.progress,
          liveStats: episodeWithProgress?.liveStats,
        };
      }),
    }));

    // Calculate overall progress
    const totalEpisodes = allEpisodeIds.length;
    const watchedEpisodes = episodesWithProgress.filter(
      (ep) => ep.progress?.status === 'watched'
    ).length;
    const currentlyWatching = episodesWithProgress.filter(
      (ep) => ep.progress?.status === 'watching'
    ).length;

    res.json({
      success: true,
      data: {
        show: showDetails.show,
        seasons: seasonsWithProgress,
        progress: {
          totalEpisodes,
          watchedEpisodes,
          currentlyWatching,
          completionPercentage:
            totalEpisodes > 0 ? Math.round((watchedEpisodes / totalEpisodes) * 100) : 0,
        },
      },
    });
  } catch (error) {
    console.error('Failed to get show progress:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve show progress',
    });
  }
});

/**
 * POST /api/progress/episode/:episodeId/watching
 * Mark episode as currently watching
 */
router.post('/episode/:episodeId/watching', async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }
    const uid = userId as string;

    const { episodeId } = req.params as { episodeId?: string };
    if (!episodeId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required path parameter: episodeId',
      });
    }
    const eid: string = episodeId;

    const progress = await episodeProgressService.markEpisodeWatching(uid, eid);

    if (!progress) {
      return res.status(400).json({
        success: false,
        error: 'Failed to mark episode as watching',
      });
    }

    // Get live stats for the episode
    const liveStats = await episodeProgressService.getEpisodeLiveStats(eid);

    res.json({
      success: true,
      data: {
        progress,
        liveStats,
        message: 'Episode marked as currently watching',
      },
    });
  } catch (error) {
    console.error('Failed to mark episode as watching:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark episode as watching',
    });
  }
});

/**
 * POST /api/progress/episode/:episodeId/watched
 * Mark episode as watched
 */
router.post('/episode/:episodeId/watched', async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }
    const uid = userId as string;

    const { episodeId } = req.params as { episodeId?: string };
    if (!episodeId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required path parameter: episodeId',
      });
    }
    const eid: string = episodeId;

    const progress = await episodeProgressService.markEpisodeWatched(uid, eid);

    if (!progress) {
      return res.status(400).json({
        success: false,
        error: 'Failed to mark episode as watched',
      });
    }

    // Get live stats for the episode
    const liveStats = await episodeProgressService.getEpisodeLiveStats(eid);

    res.json({
      success: true,
      data: {
        progress,
        liveStats,
        message: 'Episode marked as watched',
      },
    });
  } catch (error) {
    console.error('Failed to mark episode as watched:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark episode as watched',
    });
  }
});

/**
 * POST /api/progress/bulk-update
 * Bulk update multiple episodes
 *
 * Body: {
 *   episodeIds: string[],
 *   status: 'watched' | 'unwatched'
 * }
 */
router.post('/bulk-update', async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }
    const uid = userId as string;
    const { episodeIds, status } = req.body;

    if (!Array.isArray(episodeIds) || episodeIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'episodeIds must be a non-empty array',
      });
    }

    if (!['watched', 'unwatched'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'status must be either "watched" or "unwatched"',
      });
    }

    const updates = await episodeProgressService.bulkUpdateEpisodes(uid, episodeIds, status);

    res.json({
      success: true,
      data: {
        updatedCount: updates.length,
        totalRequested: episodeIds.length,
        updates,
        message: `Bulk updated ${updates.length} episodes to ${status}`,
      },
    });
  } catch (error) {
    console.error('Failed to bulk update episodes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk update episodes',
    });
  }
});

/**
 * PUT /api/progress/episode/:episodeId/rating
 * Rate an episode
 *
 * Body: { rating: number } (0.0-10.0)
 */
router.put('/episode/:episodeId/rating', async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }
    const uid = userId as string;

    const { episodeId } = req.params as { episodeId?: string };
    if (!episodeId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required path parameter: episodeId',
      });
    }
    const eid: string = episodeId;

    const { rating } = req.body;

    if (typeof rating !== 'number' || rating < 0 || rating > 10) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be a number between 0.0 and 10.0',
      });
    }

    const success = await episodeProgressService.rateEpisode(uid, eid, rating);

    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'Failed to rate episode',
      });
    }

    // Get updated live stats
    const liveStats = await episodeProgressService.getEpisodeLiveStats(eid);

    res.json({
      success: true,
      data: {
        rating,
        liveStats,
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
 * GET /api/progress/user/stats
 * Get user's watch statistics
 */
router.get('/user/stats', async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }
    const uid = userId as string;

    const stats = await episodeProgressService.getUserWatchStats(uid);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Failed to get user watch stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user watch statistics',
    });
  }
});

/**
 * GET /api/progress/episode/:episodeId/stats
 * Get live statistics for a specific episode
 */
router.get('/episode/:episodeId/stats', async (req: AuthedRequest, res: Response) => {
  try {
    const { episodeId } = req.params as { episodeId?: string };
    if (!episodeId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required path parameter: episodeId',
      });
    }
    const eid: string = episodeId;

    const liveStats = await episodeProgressService.getEpisodeLiveStats(eid);

    res.json({
      success: true,
      data: {
        episodeId: eid,
        ...liveStats,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to get episode stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve episode statistics',
    });
  }
});

/**
 * POST /api/progress/season/:seasonId/mark-watched
 * Mark all episodes in a season as watched
 */
router.post('/season/:seasonId/mark-watched', async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }
    const { seasonId } = req.params as { seasonId?: string };
    if (!seasonId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required path parameter: seasonId',
      });
    }
    // TODO: Once season→show mapping is available, fetch episodes by seasonId here.
    // For now, we'll need a different approach to get episodes by season ID

    // Alternative: Query episodes directly by season ID
    // This would require additional database queries

    res.status(501).json({
      success: false,
      error: 'Season marking not yet implemented - use bulk-update with episode IDs instead',
    });
  } catch (error) {
    console.error('Failed to mark season as watched:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark season as watched',
    });
  }
});

/**
 * GET /api/progress/episodes/currently-watching
 * Get all episodes the user is currently watching across all shows
 */
router.get('/episodes/currently-watching', async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    // This would require a more complex query across multiple tables
    // For now, return a placeholder response
    res.json({
      success: true,
      data: {
        episodes: [],
        totalCount: 0,
        message: 'Currently watching episodes endpoint - implementation pending',
      },
    });
  } catch (error) {
    console.error('Failed to get currently watching episodes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve currently watching episodes',
    });
  }
});

export default router;
