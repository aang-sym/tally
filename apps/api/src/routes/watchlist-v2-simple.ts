/**
 * Simple Watchlist API Routes
 * 
 * Bridge between My Shows page expectations and simple TMDB watchlist storage
 */

import { Router, Request, Response } from 'express';
import { ValidationError } from '../middleware/errorHandler.js';
import { tmdbService } from '../services/tmdb.js';
import { watchlistStorageService, type WatchlistItem } from '../storage/simple-watchlist.js';

const router = Router();

// Middleware to extract userId
const authenticateUser = (req: Request, res: Response, next: any) => {
  const userId = req.headers['x-user-id'] as string || 'user-1';
  (req as any).userId = userId;
  next();
};

router.use(authenticateUser);

/**
 * GET /api/watchlist-v2
 * Get user's complete watchlist with show details
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const status = req.query.status as string;

    const userWatchlist = watchlistStorageService.getUserWatchlist(userId);
    
    const filteredList = status 
      ? userWatchlist.filter(item => item.status === status)
      : userWatchlist;

    // Transform to match expected format for My Shows page
    const transformedShows = await Promise.all(filteredList.map(async (item) => {
      let showDetails = null;
      
      // Try to get show details from TMDB if available
      try {
        if (tmdbService.isAvailable) {
          // Use the analyzeShow method which includes show details
          const analysis = await tmdbService.analyzeShow(item.tmdbId);
          if (analysis?.showDetails) {
            showDetails = {
              overview: analysis.showDetails.overview,
              poster_path: analysis.showDetails.poster,
              status: analysis.showDetails.status,
              number_of_episodes: analysis.episodeCount || 0
            };
          }
        }
      } catch (error) {
        console.warn(`Failed to get details for show ${item.tmdbId}:`, error);
      }

      return {
        id: item.id,
        user_id: userId,
        show_id: item.tmdbId.toString(),
        status: item.status,
        added_at: item.addedAt,
        show_rating: null,
        notes: null,
        streaming_provider: item.streamingProvider || null,
        show: {
          id: item.tmdbId.toString(),
          tmdb_id: item.tmdbId,
          title: item.title,
          overview: showDetails?.overview || '',
          poster_path: showDetails?.poster_path || null,
          status: showDetails?.status || 'Unknown',
          total_episodes: showDetails?.number_of_episodes || null
        },
        progress: (() => {
          const totalEpisodes = showDetails?.number_of_episodes || 0;
          const progressStats = watchlistStorageService.getShowProgressStats(userId, item.tmdbId, totalEpisodes);
          const showProgress = watchlistStorageService.getShowProgress(userId, item.tmdbId);
          
          // Find the latest watched episode to determine current episode
          const latestWatched = showProgress
            .filter(ep => ep.status === 'watched')
            .sort((a, b) => (a.seasonNumber * 1000 + a.episodeNumber) - (b.seasonNumber * 1000 + b.episodeNumber))
            .pop();
          
          return {
            totalEpisodes,
            watchedEpisodes: progressStats.watchedEpisodes,
            currentEpisode: latestWatched ? {
              season_number: latestWatched.seasonNumber,
              episode_number: latestWatched.episodeNumber + 1, // Next episode
              name: `Episode ${latestWatched.episodeNumber + 1}`
            } : null
          };
        })()
      };
    }));

    res.json({
      success: true,
      data: {
        shows: transformedShows,
        totalCount: transformedShows.length,
        statusFilter: status || 'all'
      }
    });
  } catch (error) {
    console.error('Failed to get watchlist:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve watchlist',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/watchlist-v2/stats
 * Get user's watchlist statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const stats = watchlistStorageService.getStats(userId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Failed to get watchlist stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve watchlist statistics'
    });
  }
});

/**
 * PUT /api/watchlist-v2/:id/status
 * Update show status
 */
router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { status } = req.body;

    if (!['watchlist', 'watching', 'completed', 'dropped'].includes(status)) {
      throw new ValidationError('Invalid status');
    }

    const updatedItem = watchlistStorageService.updateItemStatus(userId, id, status);
    
    if (!updatedItem) {
      return res.status(404).json({
        success: false,
        error: 'Show not found'
      });
    }

    res.json({
      success: true,
      data: {
        userShow: updatedItem,
        message: `Status updated to ${status}`
      }
    });
  } catch (error) {
    console.error('Failed to update show status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update show status'
    });
  }
});

/**
 * PUT /api/watchlist-v2/:id/rating
 * Rate a show
 */
router.put('/:id/rating', async (req: Request, res: Response) => {
  try {
    const { rating } = req.body;
    
    if (typeof rating !== 'number' || rating < 0 || rating > 10) {
      throw new ValidationError('Rating must be a number between 0.0 and 10.0');
    }

    // Simple version - just return success (rating not stored)
    res.json({
      success: true,
      data: {
        rating,
        message: `Show rated ${rating}/10`
      }
    });
  } catch (error) {
    console.error('Failed to rate show:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to rate show'
    });
  }
});

/**
 * DELETE /api/watchlist-v2/:id
 * Remove show from watchlist
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const success = watchlistStorageService.removeItem(userId, id);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Show not found'
      });
    }

    res.json({
      success: true,
      data: {
        message: 'Show removed from watchlist'
      }
    });
  } catch (error) {
    console.error('Failed to remove show from watchlist:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove show from watchlist'
    });
  }
});

/**
 * PUT /api/watchlist-v2/:tmdbId/progress
 * Mark episode as watched (and all previous episodes)
 * Body: { seasonNumber: number, episodeNumber: number, status?: 'watched' | 'watching' | 'unwatched' }
 */
router.put('/:tmdbId/progress', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { tmdbId } = req.params;
    const { seasonNumber, episodeNumber, status = 'watched' } = req.body;

    if (!seasonNumber || !episodeNumber) {
      return res.status(400).json({
        success: false,
        error: 'seasonNumber and episodeNumber are required'
      });
    }

    const tmdbIdNum = parseInt(tmdbId);
    if (isNaN(tmdbIdNum)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid TMDB ID'
      });
    }

    if (status === 'watched') {
      // Mark episode and all previous episodes as watched
      watchlistStorageService.markEpisodeWatched(userId, tmdbIdNum, seasonNumber, episodeNumber, true);
    } else {
      // Mark only this specific episode with the given status
      watchlistStorageService.updateEpisodeStatus(userId, tmdbIdNum, seasonNumber, episodeNumber, status);
    }

    // Get updated progress for response
    const showProgress = watchlistStorageService.getShowProgress(userId, tmdbIdNum);
    const seasonProgress = watchlistStorageService.getSeasonProgress(userId, tmdbIdNum, seasonNumber);

    res.json({
      success: true,
      data: {
        message: `Episode S${seasonNumber}E${episodeNumber} marked as ${status}`,
        progress: {
          showProgress,
          seasonProgress,
          updatedEpisode: {
            seasonNumber,
            episodeNumber,
            status
          }
        }
      }
    });
  } catch (error) {
    console.error('Failed to update episode progress:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update episode progress'
    });
  }
});

/**
 * GET /api/watchlist-v2/:tmdbId/progress
 * Get detailed progress for a specific show
 */
router.get('/:tmdbId/progress', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { tmdbId } = req.params;

    const tmdbIdNum = parseInt(tmdbId);
    if (isNaN(tmdbIdNum)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid TMDB ID'
      });
    }

    const showProgress = watchlistStorageService.getShowProgress(userId, tmdbIdNum);
    
    // Group episodes by season
    const seasonProgress = showProgress.reduce((acc, episode) => {
      if (!acc[episode.seasonNumber]) {
        acc[episode.seasonNumber] = [];
      }
      acc[episode.seasonNumber].push(episode);
      return acc;
    }, {} as Record<number, typeof showProgress>);

    // Sort episodes within each season
    Object.keys(seasonProgress).forEach(season => {
      seasonProgress[parseInt(season)].sort((a, b) => a.episodeNumber - b.episodeNumber);
    });

    res.json({
      success: true,
      data: {
        tmdbId: tmdbIdNum,
        totalEpisodes: showProgress.length,
        watchedEpisodes: showProgress.filter(ep => ep.status === 'watched').length,
        seasons: seasonProgress,
        lastWatched: showProgress
          .filter(ep => ep.watchedAt)
          .sort((a, b) => new Date(b.watchedAt!).getTime() - new Date(a.watchedAt!).getTime())[0]
      }
    });
  } catch (error) {
    console.error('Failed to get show progress:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve show progress'
    });
  }
});

/**
 * GET /api/watchlist-v2/progress/stats
 * Get user's overall progress statistics
 */
router.get('/progress/stats', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const allProgress = watchlistStorageService.getUserEpisodeProgress(userId);
    
    const stats = {
      totalEpisodesWatched: allProgress.filter(ep => ep.status === 'watched').length,
      totalEpisodesInProgress: allProgress.filter(ep => ep.status === 'watching').length,
      totalEpisodesTracked: allProgress.length,
      showsWithProgress: [...new Set(allProgress.map(ep => ep.tmdbId))].length,
      recentlyWatched: allProgress
        .filter(ep => ep.watchedAt)
        .sort((a, b) => new Date(b.watchedAt!).getTime() - new Date(a.watchedAt!).getTime())
        .slice(0, 10)
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Failed to get progress stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve progress statistics'
    });
  }
});

/**
 * PUT /api/watchlist-v2/:id/provider
 * Update streaming provider for a show
 * Body: { provider: { id: number, name: string, logo_url: string } | null }
 */
router.put('/:id/provider', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { provider } = req.body;

    // Validate provider if provided
    if (provider && (!provider.id || !provider.name || !provider.logo_url)) {
      return res.status(400).json({
        success: false,
        error: 'Provider must include id, name, and logo_url'
      });
    }

    const updatedItem = watchlistStorageService.updateStreamingProvider(userId, id, provider);
    
    if (!updatedItem) {
      return res.status(404).json({
        success: false,
        error: 'Show not found'
      });
    }

    res.json({
      success: true,
      data: {
        userShow: updatedItem,
        message: provider 
          ? `Streaming provider updated to ${provider.name}`
          : 'Streaming provider removed'
      }
    });
  } catch (error) {
    console.error('Failed to update streaming provider:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update streaming provider'
    });
  }
});

export default router;