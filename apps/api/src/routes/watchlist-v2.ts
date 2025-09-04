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
// Removed old storage layer import - using Supabase services only

const router = Router();

// Create a default watchlist service instance for routes that don't have user tokens
// Individual routes may create their own instances with specific user tokens
const watchlistService = new WatchlistService();

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
    const isUUID = /^[0-9a-fA-F-]{36}$/.test(userId);

    if (!isUUID) {
      // Fallback to simple in-memory list for non-UUID users (e.g., user-1)
      const userWatchlist = watchlistStorageService.getUserWatchlist(userId);
      const filtered = status ? userWatchlist.filter(i => i.status === status) : userWatchlist;
      const transformed = await Promise.all(filtered.map(async (item) => {
        // Light enrichment for UI (best-effort)
        let overview = '';
        let poster_path: string | null = null;
        let statusText = 'Unknown';
        let total_episodes = 0;
        try {
          const analysis = await (await import('../services/tmdb.js')).tmdbService.analyzeShow(item.tmdbId);
          if (analysis?.showDetails) {
            overview = analysis.showDetails.overview;
            poster_path = analysis.showDetails.poster || null;
            statusText = analysis.showDetails.status || 'Unknown';
            total_episodes = analysis.episodeCount || 0;
          }
        } catch {}

        return {
          id: item.id,
          user_id: userId,
          show_id: `tmdb-${item.tmdbId}`,
          status: item.status,
          added_at: item.addedAt,
          show_rating: null,
          notes: null,
          streaming_provider: item.streamingProvider || null,
          show: {
            id: `tmdb-${item.tmdbId}`,
            tmdb_id: item.tmdbId,
            title: item.title,
            overview,
            poster_path,
            status: statusText,
            total_episodes
          },
          progress: (() => {
            const stats = watchlistStorageService.getShowProgressStats(userId, item.tmdbId, total_episodes);
            const showProgress = watchlistStorageService.getShowProgress(userId, item.tmdbId);
            const latestWatched = showProgress
              .filter(ep => ep.status === 'watched')
              .sort((a, b) => (a.seasonNumber * 1000 + a.episodeNumber) - (b.seasonNumber * 1000 + b.episodeNumber))
              .pop();
            return {
              totalEpisodes: stats.totalEpisodes,
              watchedEpisodes: stats.watchedEpisodes,
              currentEpisode: latestWatched ? {
                season_number: latestWatched.seasonNumber,
                episode_number: latestWatched.episodeNumber + 1,
                name: `Episode ${latestWatched.episodeNumber + 1}`
              } : null
            };
          })()
        };
      }));

      return res.json({ success: true, data: { shows: transformed, totalCount: transformed.length, statusFilter: status || 'all' } });
    }

    // Supabase path
    const watchlist = await watchlistService.getUserWatchlist(userId, status as any);
    // Normalize poster paths to full TMDB URLs for the web client
    const normalized = (watchlist || []).map(item => {
      // Fix: Supabase returns show data under 'shows' key, but frontend expects 'show' key
      const show: any = { ...item.shows };
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
    const isUUID = /^[0-9a-fA-F-]{36}$/.test(userId);
    if (!isUUID) {
      const stats = watchlistStorageService.getStats(userId);
      return res.json({ success: true, data: stats });
    }
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
    const watchlistService = new WatchlistService(userToken);
    
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
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    const { id } = req.params;
    const { status } = req.body;
    if (!['watchlist', 'watching', 'completed', 'dropped'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status. Must be one of: watchlist, watching, completed, dropped' });
    }
    const isUUID = /^[0-9a-fA-F-]{36}$/.test(userId);
    if (!isUUID) {
      const updated = watchlistStorageService.updateItemStatus(userId, id, status);
      if (!updated) return res.status(404).json({ success: false, error: 'Show not found' });
      return res.json({ success: true, data: { userShow: updated, message: `Status updated to ${status}` } });
    }
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
    const { rating } = req.body;

    if (typeof rating !== 'number' || rating < 0 || rating > 10) {
      return res.status(400).json({ success: false, error: 'Rating must be a number between 0.0 and 10.0' });
    }
    const isUUID = /^[0-9a-fA-F-]{36}$/.test(userId);
    if (!isUUID) {
      return res.json({ success: true, data: { rating, message: `Show rated ${rating}/10` } });
    }
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
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    const { id } = req.params;
    const isUUID = /^[0-9a-fA-F-]{36}$/.test(userId);
    if (!isUUID) {
      const ok = watchlistStorageService.removeItem(userId, id);
      if (!ok) return res.status(404).json({ success: false, error: 'Show not found' });
      return res.json({ success: true, data: { message: 'Show removed from watchlist' } });
    }
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
    const isUUID = /^[0-9a-fA-F-]{36}$/.test(userId);
    if (!isUUID) {
      const shows = watchlistStorageService.getUserWatchlist(userId).filter(i => i.status === 'watching');
      return res.json({ success: true, data: { shows, totalCount: shows.length } });
    }
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
/**
 * Compatibility endpoints for simple client flows
 * These mirror the simple watchlist-v2 routes used by SearchShows page
 */

/**
 * PUT /api/watchlist-v2/:tmdbId/progress
 * Mark episode as watched (and all previous episodes)
 * Body: { seasonNumber: number, episodeNumber: number, status?: 'watched' | 'watching' | 'unwatched' }
 */
router.put('/:tmdbId/progress', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    const { tmdbId } = req.params;
    const { seasonNumber, episodeNumber, status = 'watched' } = req.body as {
      seasonNumber: number;
      episodeNumber: number;
      status?: 'watched' | 'watching' | 'unwatched';
    };

    if (!seasonNumber || !episodeNumber) {
      return res.status(400).json({ success: false, error: 'seasonNumber and episodeNumber are required' });
    }

    const tmdbIdNum = parseInt(tmdbId);
    if (isNaN(tmdbIdNum)) {
      return res.status(400).json({ success: false, error: 'Invalid TMDB ID' });
    }

    if (status === 'watched') {
      watchlistStorageService.markEpisodeWatched(userId, tmdbIdNum, seasonNumber, episodeNumber, true);
    } else {
      watchlistStorageService.updateEpisodeStatus(userId, tmdbIdNum, seasonNumber, episodeNumber, status);
    }

    const showProgress = watchlistStorageService.getShowProgress(userId, tmdbIdNum);
    const seasonProgress = watchlistStorageService.getSeasonProgress(userId, tmdbIdNum, seasonNumber);

    return res.json({
      success: true,
      data: {
        message: `Episode S${seasonNumber}E${episodeNumber} marked as ${status}`,
        progress: { showProgress, seasonProgress, updatedEpisode: { seasonNumber, episodeNumber, status } }
      }
    });
  } catch (error) {
    console.error('Failed to update episode progress:', error);
    return res.status(500).json({ success: false, error: 'Failed to update episode progress' });
  }
});

/**
 * GET /api/watchlist-v2/:tmdbId/progress
 * Get detailed progress for a specific show
 */
router.get('/:tmdbId/progress', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    const { tmdbId } = req.params;
    const tmdbIdNum = parseInt(tmdbId);
    if (isNaN(tmdbIdNum)) return res.status(400).json({ success: false, error: 'Invalid TMDB ID' });

    const showProgress = watchlistStorageService.getShowProgress(userId, tmdbIdNum);
    const seasonProgress = showProgress.reduce((acc, ep) => {
      if (!acc[ep.seasonNumber]) acc[ep.seasonNumber] = [] as typeof showProgress;
      acc[ep.seasonNumber].push(ep);
      return acc;
    }, {} as Record<number, typeof showProgress>);
    Object.keys(seasonProgress).forEach(season => {
      seasonProgress[parseInt(season)].sort((a, b) => a.episodeNumber - b.episodeNumber);
    });

    return res.json({
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
    return res.status(500).json({ success: false, error: 'Failed to retrieve show progress' });
  }
});
/**
 * PUT /api/watchlist-v2/:id/provider
 * Update selected streaming provider for a show (Supabase)
 * Body: { provider: { id: number, name: string, logo_url: string } | null }
 */
router.put('/:id/provider', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    const { id } = req.params;
    const { provider } = req.body as { provider: { id: number; name: string; logo_url: string } | null };
    const isUUID = /^[0-9a-fA-F-]{36}$/.test(userId);
    if (!isUUID) {
      const updatedItem = watchlistStorageService.updateStreamingProvider(userId, id, provider || null);
      if (!updatedItem) return res.status(404).json({ success: false, error: 'Show not found' });
      return res.json({ success: true, data: { userShow: updatedItem, message: provider ? `Streaming provider updated to ${provider.name}` : 'Streaming provider removed' } });
    }

    // Resolve provider UUID from tmdb_provider_id
    let selected_service_id: string | null = null;
    if (provider) {
      let { data: svc, error } = await (await import('../db/supabase.js')).supabase
        .from('streaming_services')
        .select('id')
        .eq('tmdb_provider_id', provider.id)
        .single();
      
      if (error && error.code === 'PGRST116') {
        // Provider not found - try to auto-discover it
        console.log(`🔍 Auto-discovering missing provider: ${provider.name} (TMDB ID: ${provider.id})`);
        
        const discoveredService = await (await import('../services/StreamingService.js')).streamingService.autoDiscoverProvider(
          provider.id, 
          provider.name, 
          provider.logo_url
        );
        
        if (discoveredService) {
          selected_service_id = discoveredService.id;
          console.log(`✅ Successfully auto-discovered provider: ${provider.name}`);
        } else {
          return res.status(400).json({ 
            success: false, 
            error: `Failed to auto-discover provider: ${provider.name}. Please try the backfill endpoint first.` 
          });
        }
      } else if (error) {
        return res.status(500).json({ success: false, error: 'Database error while looking up provider' });
      } else {
        selected_service_id = svc?.id || null;
      }
    }

    const { error: updateError } = await (await import('../db/supabase.js')).supabase
      .from('user_shows')
      .update({ selected_service_id })
      .eq('id', id)
      .eq('user_id', userId);

    if (updateError) {
      return res.status(500).json({ success: false, error: 'Failed to update provider' });
    }

    res.json({ success: true, data: { provider } });
  } catch (error) {
    console.error('Failed to update provider:', error);
    res.status(500).json({ success: false, error: 'Failed to update provider' });
  }
});

/**
 * PUT /api/watchlist-v2/:id/buffer
 * Update per-show buffer days
 * Body: { bufferDays: number }
 */
router.put('/:id/buffer', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    const { id } = req.params;
    const { bufferDays } = req.body as { bufferDays: number };
    const isUUID = /^[0-9a-fA-F-]{36}$/.test(userId);
    const days = Math.max(0, Math.min(30, Number(bufferDays) || 0));
    if (!isUUID) {
      const updated = watchlistStorageService.updateBufferDays(userId, id, days);
      if (!updated) return res.status(404).json({ success: false, error: 'Show not found' });
      return res.json({ success: true, data: { bufferDays: updated.bufferDays || 0 } });
    }
    const { error } = await (await import('../db/supabase.js')).supabase
      .from('user_shows')
      .update({ buffer_days: days })
      .eq('id', id)
      .eq('user_id', userId);
    if (error) return res.status(500).json({ success: false, error: 'Failed to update buffer' });
    res.json({ success: true, data: { bufferDays: days } });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to update buffer' });
  }
});

/**
 * PUT /api/watchlist-v2/country
 * Update user default country code
 * Body: { countryCode: string }
 */
router.put('/country', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    const { countryCode } = req.body as { countryCode: string };
    if (!countryCode || countryCode.length !== 2) return res.status(400).json({ success: false, error: 'Invalid country code' });
    const isUUID = /^[0-9a-fA-F-]{36}$/.test(userId);
    if (!isUUID) {
      // Simple mode: acknowledge without persistence
      return res.json({ success: true, data: { countryCode } });
    }
    const { error } = await (await import('../db/supabase.js')).supabase
      .from('users')
      .update({ country_code: countryCode })
      .eq('id', userId);
    if (error) return res.status(500).json({ success: false, error: 'Failed to update country' });
    res.json({ success: true, data: { countryCode } });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to update country' });
  }
});

/**
 * PUT /api/watchlist-v2/:id/country
 * Update per-show country override
 * Body: { countryCode: string | null }
 */
router.put('/:id/country', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    const { id } = req.params;
    const { countryCode } = req.body as { countryCode: string | null };
    if (countryCode && countryCode.length !== 2) return res.status(400).json({ success: false, error: 'Invalid country code' });
    const isUUID = /^[0-9a-fA-F-]{36}$/.test(userId);
    if (!isUUID) {
      const updated = watchlistStorageService.updateCountry(userId, id, countryCode || null);
      if (!updated) return res.status(404).json({ success: false, error: 'Show not found' });
      return res.json({ success: true, data: { countryCode: updated.country || null } });
    }
    const { error } = await (await import('../db/supabase.js')).supabase
      .from('user_shows')
      .update({ country_code: countryCode || null })
      .eq('id', id)
      .eq('user_id', userId);
    if (error) return res.status(500).json({ success: false, error: 'Failed to update show country' });
    res.json({ success: true, data: { countryCode: countryCode || null } });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to update show country' });
  }
});
