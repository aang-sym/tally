/**
 * Enhanced Watchlist API Routes
 * 
 * Comprehensive RESTful API for watchlist and show tracking functionality
 * with support for detailed progress tracking and live statistics.
 */

import { Router, Request, Response } from 'express';
import { WatchlistService } from '../services/WatchlistService.js';
import { showService } from '../services/ShowService.js';
import { streamingService } from '../services/StreamingService.js';

const router = Router();

// Note: Authentication is now handled by server-level middleware

/**
 * Helper function to extract JWT token from request
 */
function getUserToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7); // Remove 'Bearer ' prefix
  }
  return undefined;
}

/**
 * GET /api/watchlist-v2
 * Get user's complete watchlist with show details and progress
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    const status = req.query.status as string;
    
    // Supabase path
    const watchlistService = new WatchlistService(getUserToken(req));
    const watchlist = await watchlistService.getUserWatchlist(userId, status as any);

    // Normalize poster paths to full TMDB URLs for the web client
    const normalized = (watchlist || []).map(item => {
      // Fix: Supabase returns show data under 'show' key, which is correct.
      const show: any = { ...item.show };
      if (show && show.poster_path) {
        if (typeof show.poster_path === 'string' && show.poster_path.startsWith('/')) {
          show.poster_path = `https://image.tmdb.org/t/p/w500${show.poster_path}`;
        }
      }
      return { ...item, show };
    });
    res.json({ success: true, data: { shows: normalized, totalCount: normalized.length, statusFilter: status || 'all' } });
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
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    const watchlistService = new WatchlistService(getUserToken(req));
    const stats = await watchlistService.getUserWatchlistStats(userId);
    res.json({ success: true, data: stats });
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
    const userId = req.userId;
    
    console.log('🎬 [ROUTE] Starting watchlist addition:', {
      userId,
      body: req.body,
      hasAuthHeader: !!req.headers.authorization,
      authHeaderStart: req.headers.authorization ? req.headers.authorization.substring(0, 20) + '...' : 'none',
      timestamp: new Date().toISOString()
    });
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    const { tmdbId, status = 'watchlist' } = req.body;

    if (!tmdbId) {
      return res.status(400).json({
        success: false,
        error: 'TMDB ID is required'
      });
    }

    // Create authenticated watchlist service with user's JWT token
    const userToken = getUserToken(req);
    console.log('🔑 [ROUTE] User authentication details:', {
      userId,
      hasUserToken: !!userToken,
      userTokenLength: userToken?.length || 0,
      userTokenStart: userToken ? userToken.substring(0, 30) + '...' : 'none'
    });
    
    const watchlistService = new WatchlistService(userToken);
    
    console.log('🚀 [ROUTE] Calling WatchlistService.addToWatchlist...', {
      userId,
      tmdbId,
      status,
      timestamp: new Date().toISOString()
    });
    
    const userShow = await watchlistService.addToWatchlist(userId, tmdbId, status);

    if (!userShow) {
      console.error('❌ [ROUTE] WatchlistService returned null:', {
        userId,
        tmdbId,
        status,
        userToken: userToken ? `${userToken.substring(0, 20)}...` : 'none',
        timestamp: new Date().toISOString()
      });
      return res.status(400).json({
        success: false,
        error: 'Failed to add show to watchlist - service returned null'
      });
    }
    
    console.log('✅ [ROUTE] WatchlistService returned success:', {
      userShowId: userShow.id,
      showId: userShow.show_id,
      status: userShow.status,
      timestamp: new Date().toISOString()
    });

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
    const { tmdbId, status = 'watchlist' } = req.body;
    console.error('❌ [ROUTE] Exception in watchlist route:', {
      error,
      userId: req.userId,
      tmdbId,
      status,
      errorType: typeof error,
      errorMessage: (error as Error)?.message,
      errorCode: (error as any)?.code,
      errorDetails: (error as any)?.details,
      errorHint: (error as any)?.hint,
      errorStack: (error as any)?.stack?.substring(0, 500) + '...',
      timestamp: new Date().toISOString(),
      isPGRST301: (error as any)?.code === 'PGRST301'
    });
    
    // Special handling for PGRST301 errors
    if ((error as any)?.code === 'PGRST301') {
      console.error('🔥 [ROUTE] PGRST301 ERROR DETECTED - Foreign key constraint issue:', {
        message: (error as Error)?.message,
        hint: (error as any)?.hint,
        details: (error as any)?.details,
        userId: req.userId,
        tmdbId,
        userToken: getUserToken(req) ? 'present' : 'missing'
      });
    }
    
    res.status(500).json({
      success: false,
      error: `Failed to add show to watchlist: ${(error as any)?.code || 'UNKNOWN_ERROR'}`,
      details: (error as Error)?.message
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
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Show ID is required.' });
    }
    const { status } = req.body;
    if (!['watchlist', 'watching', 'completed', 'dropped'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status. Must be one of: watchlist, watching, completed, dropped' });
    }
    const watchlistService = new WatchlistService(getUserToken(req));
    const updatedShow = await watchlistService.updateShowStatus(userId, id, status);
    if (!updatedShow) return res.status(404).json({ success: false, error: 'Show not found or access denied' });
    res.json({ success: true, data: { userShow: updatedShow, message: `Status updated to ${status}` } });
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
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Show ID is required.' });
    }
    const { rating } = req.body;

    if (typeof rating !== 'number' || rating < 0 || rating > 10) {
      return res.status(400).json({ success: false, error: 'Rating must be a number between 0.0 and 10.0' });
    }
    const watchlistService = new WatchlistService(getUserToken(req));
    const ok = await watchlistService.rateShow(userId, id, rating);
    if (!ok) return res.status(404).json({ success: false, error: 'Show not found or access denied' });
    res.json({ success: true, data: { rating, message: `Show rated ${rating}/10` } });
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
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Show ID is required.' });
    }
    const { notes } = req.body;

    if (typeof notes !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Notes must be a string'
      });
    }
    const watchlistService = new WatchlistService(getUserToken(req));
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
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Show ID is required.' });
    }
    const watchlistService = new WatchlistService(getUserToken(req));
    const success = await watchlistService.removeFromWatchlist(userId, id);
    if (!success) return res.status(404).json({ success: false, error: 'Show not found or access denied' });
    res.json({ success: true, data: { message: 'Show removed from watchlist' } });
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
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    const watchlistService = new WatchlistService(getUserToken(req));
    const watchingShows = await watchlistService.getUserWatchlist(userId, 'watching');
    res.json({ success: true, data: { shows: watchingShows, totalCount: watchingShows.length } });
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
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    const { showId } = req.params;
    if (!showId) {
      return res.status(400).json({ success: false, error: 'Show ID is required.' });
    }
    const watchlistService = new WatchlistService(getUserToken(req));
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
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
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
    const watchlistService = new WatchlistService(getUserToken(req));
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
