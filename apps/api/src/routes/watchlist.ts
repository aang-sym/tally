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
import { supabase, serviceSupabase, createUserClient } from '../db/supabase.js';

const router: Router = Router();

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
 * GET /api/watchlist
 * Get user's complete watchlist with show details and progress
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    // Diagnostic logging for GET /
    const token = getUserToken(req);
    console.log('🧪 [WATCHLIST-V2][GET /] Auth diagnostics:', {
      hasAuthHeader: !!req.headers.authorization,
      tokenPresent: !!token,
      tokenStart: token ? token.substring(0, 20) + '...' : 'none',
      userId: req.userId,
      status: req.query.status || 'all',
      timestamp: new Date().toISOString()
    });

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
    console.log('🧪 [WATCHLIST-V2][GET /] Data shape diagnostics:', {
      itemCount: (watchlist || []).length,
      sampleKeys: watchlist && watchlist[0] ? Object.keys(watchlist[0]) : [],
      hasShowKey: watchlist && watchlist[0] ? 'show' in watchlist[0] : false,
      hasShowsKey: watchlist && watchlist[0] ? 'shows' in watchlist[0] : false,
      showKeys: watchlist && watchlist[0] && (watchlist[0] as any).show ? Object.keys((watchlist[0] as any).show) : [],
    });

    // Normalize poster paths and attach selected streaming provider for each row
    // 1) collect selected_service_id values to batch-fetch providers
    const selectedIds = (watchlist || [])
      .map((it: any) => it?.selected_service_id)
      .filter((v: any): v is string => typeof v === 'string' && v.length > 0);

    let providerByUuid = new Map<string, { id: number; name: string; logo_path: string }>();
    if (selectedIds.length > 0) {
      const { data: providers, error: provErr } = await serviceSupabase
        .from('streaming_services')
        .select('id, tmdb_provider_id, name, logo_path')
        .in('id', Array.from(new Set(selectedIds)));

      if (provErr) {
        console.error('⚠️ [WATCHLIST-V2][GET /] provider fetch error:', provErr);
      } else {
        for (const p of providers || []) {
          const logo_path = p.logo_path
            ? (p.logo_path.startsWith('http') ? p.logo_path : `https://image.tmdb.org/t/p/w45${p.logo_path}`)
            : null;
          providerByUuid.set(p.id, {
            id: p.tmdb_provider_id,
            name: p.name,
            logo_path: logo_path || ''
          });
        }
      }
    }

    const normalized = (watchlist || []).map((item: any) => {
      // Supabase returns show data under 'show' (singular). Keep a defensive fallback.
      const show = { ...(item.show ?? item.shows) };
      if (show && show.poster_path && typeof show.poster_path === 'string' && show.poster_path.startsWith('/')) {
        show.poster_path = `https://image.tmdb.org/t/p/w500${show.poster_path}`;
      }

      const selectedUuid = item.selected_service_id as string | null;
      const streaming_provider = selectedUuid ? providerByUuid.get(selectedUuid) ?? null : null;

      return { ...item, show, streaming_provider };
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
 * GET /api/watchlist/stats
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
 * POST /api/watchlist
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
 * PUT /api/watchlist/:id/status
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
 * PUT /api/watchlist/:id/rating
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
 * PUT /api/watchlist/:id/notes
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
 * PUT /api/watchlist/:id/provider
 * Update streaming provider for the user's show
 *
 * Body: { provider: { id: number, name: string, logo_path: string } | null }
 */
router.put('/:id/provider', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Show ID is required.' });
    }
    const { provider } = req.body;

    // Validate provider structure if not null
    if (provider !== null && (typeof provider !== 'object' || !provider.id || !provider.name || !provider.logo_path)) {
      return res.status(400).json({ success: false, error: 'Invalid provider object. Expected { id: number, name: string, logo_path: string } or null.' });
    }

    const watchlistService = new WatchlistService(getUserToken(req));
    const success = await watchlistService.updateStreamingProvider(userId, id, provider);

    if (!success) {
      return res.status(404).json({ success: false, error: 'Show not found or access denied' });
    }

    res.json({ success: true, data: { provider, message: 'Streaming provider updated successfully' } });
  } catch (error) {
    console.error('Failed to update streaming provider:', error);
    res.status(500).json({ success: false, error: 'Failed to update streaming provider' });
  }
});

/**
 * PUT /api/watchlist/:id/country
 * Update country code for the user's show
 *
 * Body: { countryCode: string | null }
 */
router.put('/:id/country', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Show ID is required.' });
    }
    const { countryCode } = req.body;

    if (countryCode !== null && typeof countryCode !== 'string') {
      return res.status(400).json({ success: false, error: 'Invalid countryCode. Expected string or null.' });
    }

    const watchlistService = new WatchlistService(getUserToken(req));
    const success = await watchlistService.updateCountryCode(userId, id, countryCode);

    if (!success) {
      return res.status(404).json({ success: false, error: 'Show not found or access denied' });
    }

    res.json({ success: true, data: { countryCode, message: 'Country code updated successfully' } });
  } catch (error) {
    console.error('Failed to update country code:', error);
    res.status(500).json({ success: false, error: 'Failed to update country code' });
  }
});

/**
 * PUT /api/watchlist/:id/buffer
 * Update buffer days for the user's show
 *
 * Body: { bufferDays: number }
 */
router.put('/:id/buffer', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Show ID is required.' });
    }
    const { bufferDays } = req.body;

    if (typeof bufferDays !== 'number' || bufferDays < 0) {
      return res.status(400).json({ success: false, error: 'Invalid bufferDays. Expected a non-negative number.' });
    }

    const watchlistService = new WatchlistService(getUserToken(req));
    const success = await watchlistService.updateBufferDays(userId, id, bufferDays);

    if (!success) {
      return res.status(404).json({ success: false, error: 'Show not found or access denied' });
    }

    res.json({ success: true, data: { bufferDays, message: 'Buffer days updated successfully' } });
  } catch (error) {
    console.error('Failed to update buffer days:', error);
    res.status(500).json({ success: false, error: 'Failed to update buffer days' });
  }
});

/**
 * DELETE /api/watchlist/:id
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
 * GET /api/watchlist/watching
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
 * GET /api/watchlist/watching/:showId
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
 * POST /api/watchlist/search-and-add
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

// -----------------------------------------------------------------------------
// NEW: Episode progress endpoints for watchlist
// -----------------------------------------------------------------------------

/**
 * GET /api/watchlist/:tmdbId/progress
 * Return user's episode progress for a show identified by TMDB ID
 * Response format (used by SearchShows): { data: { showProgress: [{ seasonNumber, episodeNumber, status }] } }
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

    const tmdbIdRaw = req.params.tmdbId;
    const tmdbId = Number(tmdbIdRaw);

    if (!Number.isFinite(tmdbId)) {
      return res.status(400).json({ success: false, error: 'Invalid TMDB ID' });
    }

    // Find or create the show (ensures seasons/episodes exist)
    let showId: string | null = null;

    // First look up by tmdb_id
    const { data: showRow, error: showFetchError } = await supabase
      .from('shows')
      .select('id')
      .eq('tmdb_id', tmdbId)
      .single();

    if (showFetchError && showFetchError.code !== 'PGRST116') {
      console.error('Failed to fetch show by TMDB ID:', showFetchError);
      return res.status(500).json({ success: false, error: 'Failed to fetch show' });
    }

    if (showRow?.id) {
      showId = showRow.id;
    } else {
      // Create using service role (bypasses RLS and ensures episodes exist)
      const created = await showService.getOrCreateShow(tmdbId, serviceSupabase);
      if (!created) {
        return res.status(404).json({ success: false, error: 'Show not found' });
      }
      showId = created.id;
    }

    // Load seasons with episodes
    const details = await showService.getShowWithDetails(showId!);
    if (!details) {
      return res.status(404).json({ success: false, error: 'Show not found' });
    }

    // Collect all episode IDs
    const episodes = details.seasons.flatMap(season =>
      season.episodes.map(ep => ({
        id: ep.id,
        season_number: season.season_number,
        episode_number: ep.episode_number
      }))
    );

    const episodeIds = episodes.map(e => e.id);
    if (episodeIds.length === 0) {
      return res.json({ success: true, data: { showProgress: [] } });
    }

    // Fetch user progress for these episodes (DB column is "state" per migration 009)
    // Use service role to avoid dependency on Supabase JWT parsing
    const { data: progressRows, error: progressErr } = await serviceSupabase
      .from('user_episode_progress')
      .select('episode_id, state')
      .eq('user_id', userId)
      .in('episode_id', episodeIds);

    if (progressErr) {
      console.error('Failed to fetch episode progress:', progressErr);
      return res.status(500).json({ success: false, error: 'Failed to fetch episode progress' });
    }

    // Map episodeId -> state and return only those with a recorded state (frontend filters for "watched")
    const stateByEpisodeId = new Map<string, string>(
      (progressRows || []).map(r => [r.episode_id, r.state])
    );

    const showProgress = episodes
      .map(ep => {
        const state = stateByEpisodeId.get(ep.id);
        if (!state) return null;
        return {
          seasonNumber: ep.season_number,
          episodeNumber: ep.episode_number,
          status: state
        };
      })
      .filter(Boolean);

    const seasonsGrouped: { [seasonNumber: number]: Array<{ episodeNumber: number; status: string }> } = {};

    (showProgress as Array<NonNullable<typeof showProgress[number]>>).forEach(ep => {
      if (!ep) return;
      if (!seasonsGrouped[ep.seasonNumber]) {
        seasonsGrouped[ep.seasonNumber] = [];
      }
      seasonsGrouped[ep.seasonNumber]!.push({
        episodeNumber: ep.episodeNumber,
        status: ep.status
      });
    });

    res.json({ success: true, data: { seasons: seasonsGrouped } });
  } catch (error) {
    console.error('Failed to get show episode progress:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve episode progress'
    });
  }
});

/**
 * PUT /api/watchlist/:tmdbId/progress
 * Body: { seasonNumber: number, episodeNumber: number, status: 'watched' | 'unwatched' | 'watching' }
 * Sets progress up to the specified episode (inclusive).
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

    const tmdbIdRaw = req.params.tmdbId;
    const tmdbId = Number(tmdbIdRaw);

    if (!Number.isFinite(tmdbId)) {
      return res.status(400).json({ success: false, error: 'Invalid TMDB ID' });
    }

    const { seasonNumber, episodeNumber, status = 'watched' } = req.body || {};
    if (
      typeof seasonNumber !== 'number' ||
      typeof episodeNumber !== 'number' ||
      !['watched', 'unwatched', 'watching'].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        error: 'Invalid body. Expect { seasonNumber:number, episodeNumber:number, status:"watched"|"unwatched"|"watching" }'
      });
    }

    console.log('🎯 [WATCHLIST-V2] PUT progress request:', {
      userId,
      tmdbId,
      seasonNumber,
      episodeNumber,
      status
    });

    // Ensure show exists; create if needed
    let showId: string | null = null;

    const { data: showRow, error: showFetchError } = await supabase
      .from('shows')
      .select('id')
      .eq('tmdb_id', tmdbId)
      .single();

    if (showFetchError && showFetchError.code !== 'PGRST116') {
      console.error('Failed to fetch show by TMDB ID:', showFetchError);
      return res.status(500).json({ success: false, error: 'Failed to fetch show' });
    }

    if (showRow?.id) {
      showId = showRow.id;
    } else {
      const created = await showService.getOrCreateShow(tmdbId, serviceSupabase);
      if (!created) {
        return res.status(404).json({ success: false, error: 'Show not found' });
      }
      showId = created.id;
    }

    // Get all seasons/episodes and select target range
    const details = await showService.getShowWithDetails(showId!);
    if (!details) {
      return res.status(404).json({ success: false, error: 'Show not found' });
    }

    const targetEpisodes = details.seasons
      .filter(season => season.season_number < seasonNumber || season.season_number === seasonNumber)
      .flatMap(season => {
        const limit = season.season_number < seasonNumber ? Infinity : episodeNumber;
        return season.episodes
          .filter(ep => ep.episode_number <= limit)
          .map(ep => ({
            id: ep.id,
            season_number: season.season_number,
            episode_number: ep.episode_number
          }));
      });

    if (targetEpisodes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No episodes found for the requested range'
      });
    }

    // Batch upsert progress using service role (bypasses RLS safely on server)
    const progressValue = status === 'watched' ? 100 : status === 'watching' ? 50 : 0;

    const rows = targetEpisodes.map(ep => ({
      user_id: userId,
      show_id: showId!,
      episode_id: ep.id,
      state: status,
      progress: progressValue
    }));

    const { error: upsertError } = await serviceSupabase
      .from('user_episode_progress')
      .upsert(rows, { onConflict: 'user_id,show_id,episode_id' });

    if (upsertError) {
      console.error('Failed to upsert episode progress:', upsertError);
      return res.status(500).json({ success: false, error: 'Failed to set episode progress' });
    }

    const updatedCount = rows.length;

    console.log('✅ [WATCHLIST-V2] Progress update complete:', {
      userId,
      tmdbId,
      requestedEpisodes: targetEpisodes.length,
      updatedCount,
      status
    });

    return res.json({
      success: true,
      data: {
        updatedCount,
        totalRequested: targetEpisodes.length,
        status,
        message:
          status === 'watched'
            ? `Marked ${updatedCount}/${targetEpisodes.length} episodes as watched`
            : status === 'unwatched'
              ? `Marked ${updatedCount}/${targetEpisodes.length} episodes as unwatched`
              : `Marked ${updatedCount}/${targetEpisodes.length} episodes as watching`
      }
    });
  } catch (error) {
    console.error('Failed to set episode progress:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to set episode progress'
    });
  }
});

export default router;
