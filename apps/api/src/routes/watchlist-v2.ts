/**
 * Enhanced Watchlist API Routes
 * 
 * Comprehensive RESTful API for watchlist and show tracking functionality
 * with support for detailed progress tracking and live statistics.
 */

import { Router, Request, Response } from 'express';
import { watchlistService } from '../services/WatchlistService.js';
import { showService } from '../services/ShowService.js';
import { streamingService } from '../services/StreamingService.js';

const router = Router();

// Middleware to extract userId (stub implementation)
const authenticateUser = (req: Request, res: Response, next: any) => {
  // TODO: Replace with proper JWT authentication
  const userId = req.headers['x-user-id'] as string || 'user-1';
  (req as any).userId = userId;
  next();
};

router.use(authenticateUser);

/**
 * GET /api/watchlist-v2
 * Get user's complete watchlist with show details and progress
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const status = req.query.status as string;

    const watchlist = await watchlistService.getUserWatchlist(userId, status as any);

    res.json({
      success: true,
      data: {
        shows: watchlist,
        totalCount: watchlist.length,
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

    const stats = await watchlistService.getUserWatchlistStats(userId);

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
 * POST /api/watchlist-v2
 * Add show to watchlist
 * 
 * Body: { tmdbId: number, status?: 'watchlist' | 'watching' }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { tmdbId, status = 'watchlist' } = req.body;

    if (!tmdbId) {
      return res.status(400).json({
        success: false,
        error: 'TMDB ID is required'
      });
    }

    const userShow = await watchlistService.addToWatchlist(userId, tmdbId, status);

    if (!userShow) {
      return res.status(400).json({
        success: false,
        error: 'Failed to add show to watchlist'
      });
    }

    // Get show details for response
    const showDetails = await showService.getShowWithDetails(userShow.show_id);

    // Get streaming availability
    const availability = await streamingService.getShowAvailability(userShow.show_id);

    res.status(201).json({
      success: true,
      data: {
        userShow,
        show: showDetails?.show,
        availability: availability.normalized,
        message: `Added to ${status}`
      }
    });
  } catch (error) {
    console.error('Failed to add show to watchlist:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add show to watchlist'
    });
  }
});

/**
 * PUT /api/watchlist-v2/:id/status
 * Update show status (watchlist -> watching -> completed, etc.)
 * 
 * Body: { status: 'watchlist' | 'watching' | 'completed' | 'dropped' }
 */
router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { status } = req.body;

    if (!['watchlist', 'watching', 'completed', 'dropped'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be one of: watchlist, watching, completed, dropped'
      });
    }

    const updatedShow = await watchlistService.updateShowStatus(userId, id, status);

    if (!updatedShow) {
      return res.status(404).json({
        success: false,
        error: 'Show not found or access denied'
      });
    }

    res.json({
      success: true,
      data: {
        userShow: updatedShow,
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
 * 
 * Body: { rating: number } (0.0-10.0)
 */
router.put('/:id/rating', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { rating } = req.body;

    if (typeof rating !== 'number' || rating < 0 || rating > 10) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be a number between 0.0 and 10.0'
      });
    }

    const success = await watchlistService.rateShow(userId, id, rating);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Show not found or access denied'
      });
    }

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
 * PUT /api/watchlist-v2/:id/notes
 * Update show notes
 * 
 * Body: { notes: string }
 */
router.put('/:id/notes', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { notes } = req.body;

    if (typeof notes !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Notes must be a string'
      });
    }

    const success = await watchlistService.updateShowNotes(userId, id, notes);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Show not found or access denied'
      });
    }

    res.json({
      success: true,
      data: {
        notes,
        message: 'Notes updated successfully'
      }
    });
  } catch (error) {
    console.error('Failed to update show notes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update show notes'
    });
  }
});

/**
 * DELETE /api/watchlist-v2/:id
 * Remove show from all lists
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const success = await watchlistService.removeFromWatchlist(userId, id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Show not found or access denied'
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
 * GET /api/watchlist-v2/watching
 * Get currently watching shows with detailed progress
 */
router.get('/watching', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const watchingShows = await watchlistService.getUserWatchlist(userId, 'watching');

    res.json({
      success: true,
      data: {
        shows: watchingShows,
        totalCount: watchingShows.length
      }
    });
  } catch (error) {
    console.error('Failed to get watching shows:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve currently watching shows'
    });
  }
});

/**
 * GET /api/watchlist-v2/watching/:showId
 * Get detailed watch progress for a specific show
 */
router.get('/watching/:showId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { showId } = req.params;

    const progress = await watchlistService.getShowProgress(userId, showId);
    const showDetails = await showService.getShowWithDetails(showId);

    if (!showDetails) {
      return res.status(404).json({
        success: false,
        error: 'Show not found'
      });
    }

    res.json({
      success: true,
      data: {
        show: showDetails.show,
        seasons: showDetails.seasons,
        progress,
        totalEpisodes: progress.totalEpisodes,
        watchedEpisodes: progress.watchedEpisodes,
        completionPercentage: progress.totalEpisodes > 0 
          ? Math.round((progress.watchedEpisodes / progress.totalEpisodes) * 100) 
          : 0
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
 * POST /api/watchlist-v2/search-and-add
 * Search TMDB and add show in one step
 * 
 * Body: { query: string, tmdbId?: number, status?: 'watchlist' | 'watching' }
 */
router.post('/search-and-add', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { query, tmdbId, status = 'watchlist' } = req.body;

    let showId = tmdbId;

    // If no TMDB ID provided, search first
    if (!showId && query) {
      const searchResults = await showService.searchShows(query);
      if (searchResults.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No shows found for the given query'
        });
      }
      
      // Use first result
      showId = searchResults[0].id;
    }

    if (!showId) {
      return res.status(400).json({
        success: false,
        error: 'Either query or tmdbId is required'
      });
    }

    const userShow = await watchlistService.addToWatchlist(userId, showId, status);

    if (!userShow) {
      return res.status(400).json({
        success: false,
        error: 'Failed to add show to watchlist'
      });
    }

    res.status(201).json({
      success: true,
      data: {
        userShow,
        message: `Show added to ${status}`
      }
    });
  } catch (error) {
    console.error('Failed to search and add show:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search and add show'
    });
  }
});

export default router;