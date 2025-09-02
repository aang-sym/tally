/**
 * Database Admin Routes
 * 
 * Administrative endpoints for database health monitoring and live statistics.
 * These routes provide insights into database status and real-time user activity.
 */

import { Router, Request, Response } from 'express';
import { supabase, getDatabaseHealth } from '../db/supabase.js';

const router = Router();

/**
 * GET /api/admin/db-status
 * 
 * Returns database health status and table counts
 */
router.get('/db-status', async (req: Request, res: Response) => {
  try {
    const health = await getDatabaseHealth();
    
    res.json({
      success: true,
      data: {
        connected: health.connected,
        tables: health.tables,
        timestamp: new Date().toISOString(),
        ...(health.error && { error: health.error })
      }
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check database health',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/live-stats
 * 
 * Returns live statistics about user activity and currently watching episodes
 */
router.get('/live-stats', async (req: Request, res: Response) => {
  try {
    // Get currently watching episodes count
    const { data: watchingEpisodes, error: watchingError } = await supabase
      .from('user_episode_progress')
      .select('episode_id')
      .eq('status', 'watching');

    if (watchingError) {
      throw watchingError;
    }

    // Get total active users (users with any shows in their lists)
    const { data: activeUsers, error: usersError } = await supabase
      .from('user_shows')
      .select('user_id')
      .neq('status', 'dropped');

    if (usersError) {
      throw usersError;
    }

    // Get unique active users count
    const uniqueActiveUsers = new Set(activeUsers?.map(u => u.user_id) || []).size;

    // Get show status distribution
    const { data: showStats, error: showStatsError } = await supabase
      .from('user_shows')
      .select('status')
      .neq('status', 'dropped');

    if (showStatsError) {
      throw showStatsError;
    }

    // Count by status
    const statusCounts = {
      watchlist: 0,
      watching: 0,
      completed: 0,
      dropped: 0
    };

    showStats?.forEach(show => {
      if (show.status in statusCounts) {
        statusCounts[show.status as keyof typeof statusCounts]++;
      }
    });

    // Get most popular shows (most users have them)
    const { data: popularShows, error: popularError } = await supabase
      .from('user_shows')
      .select(`
        show_id,
        shows!inner(title),
        count:user_shows(count)
      `)
      .neq('status', 'dropped')
      .order('count', { ascending: false })
      .limit(5);

    if (popularError) {
      console.warn('Failed to get popular shows:', popularError);
    }

    res.json({
      success: true,
      data: {
        liveActivity: {
          currentlyWatchingEpisodes: watchingEpisodes?.length || 0,
          activeUsers: uniqueActiveUsers,
          totalShowEntries: showStats?.length || 0
        },
        showDistribution: statusCounts,
        popularShows: popularShows || [],
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Live stats query failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve live statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/episode-stats/:episodeId
 * 
 * Returns live statistics for a specific episode
 */
router.get('/episode-stats/:episodeId', async (req: Request, res: Response) => {
  try {
    const { episodeId } = req.params;

    // Get watching count for this episode
    const { data: watchingCount, error: watchingError } = await supabase
      .from('user_episode_progress')
      .select('user_id')
      .eq('episode_id', episodeId)
      .eq('status', 'watching');

    if (watchingError) {
      throw watchingError;
    }

    // Get completed count for this episode
    const { data: watchedCount, error: watchedError } = await supabase
      .from('user_episode_progress')
      .select('user_id')
      .eq('episode_id', episodeId)
      .eq('status', 'watched');

    if (watchedError) {
      throw watchedError;
    }

    // Get episode ratings
    const { data: ratings, error: ratingsError } = await supabase
      .from('user_episode_progress')
      .select('episode_rating')
      .eq('episode_id', episodeId)
      .not('episode_rating', 'is', null);

    if (ratingsError) {
      throw ratingsError;
    }

    // Calculate average rating
    const validRatings = ratings?.map(r => r.episode_rating).filter(r => r !== null) || [];
    const averageRating = validRatings.length > 0 
      ? validRatings.reduce((sum, rating) => sum + rating, 0) / validRatings.length 
      : null;

    res.json({
      success: true,
      data: {
        episodeId,
        currentlyWatching: watchingCount?.length || 0,
        totalWatched: watchedCount?.length || 0,
        averageRating: averageRating ? Math.round(averageRating * 10) / 10 : null,
        totalRatings: validRatings.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Episode stats query failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve episode statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/show-stats/:showId
 * 
 * Returns live statistics for a specific show
 */
router.get('/show-stats/:showId', async (req: Request, res: Response) => {
  try {
    const { showId } = req.params;

    // Get all episodes for this show that someone is currently watching
    const { data: showEpisodes, error: episodesError } = await supabase
      .from('episodes')
      .select('id')
      .in('season_id', 
        supabase
          .from('seasons')
          .select('id')
          .eq('show_id', showId)
      );

    if (episodesError) {
      throw episodesError;
    }

    const episodeIds = showEpisodes?.map(e => e.id) || [];

    // Get currently watching count across all episodes
    const { data: watchingCount, error: watchingError } = await supabase
      .from('user_episode_progress')
      .select('user_id')
      .in('episode_id', episodeIds)
      .eq('status', 'watching');

    if (watchingError) {
      throw watchingError;
    }

    // Get user show status distribution for this show
    const { data: userShows, error: userShowsError } = await supabase
      .from('user_shows')
      .select('status, show_rating')
      .eq('show_id', showId);

    if (userShowsError) {
      throw userShowsError;
    }

    // Count by status
    const statusCounts = {
      watchlist: 0,
      watching: 0,
      completed: 0,
      dropped: 0
    };

    const showRatings = userShows?.map(s => s.show_rating).filter(r => r !== null) || [];
    const averageShowRating = showRatings.length > 0
      ? showRatings.reduce((sum, rating) => sum + rating, 0) / showRatings.length
      : null;

    userShows?.forEach(show => {
      if (show.status in statusCounts) {
        statusCounts[show.status as keyof typeof statusCounts]++;
      }
    });

    res.json({
      success: true,
      data: {
        showId,
        currentlyWatchingEpisodes: new Set(watchingCount?.map(w => w.user_id) || []).size,
        totalEpisodesInShow: episodeIds.length,
        userDistribution: statusCounts,
        averageShowRating: averageShowRating ? Math.round(averageShowRating * 10) / 10 : null,
        totalShowRatings: showRatings.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Show stats query failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve show statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;