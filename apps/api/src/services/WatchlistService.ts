/**
 * Watchlist Service
 * 
 * Handles user show tracking operations including watchlist management,
 * watching progress, and status transitions between different states.
 */

import { supabase, createUserClient } from '../db/supabase.js';
import { serviceSupabase } from '../db/supabase.js'; // Keep serviceSupabase for specific admin tasks if absolutely necessary, but avoid for user-facing ops
import { showService, Show } from './ShowService.js';
import { SupabaseClient } from '@supabase/supabase-js';

export interface UserShow {
  id: string;
  user_id: string;
  show_id: string;
  status: 'watchlist' | 'watching' | 'completed' | 'dropped';
  added_at: string;
  started_watching_at?: string;
  completed_at?: string;
  last_episode_watched_id?: string;
  show_rating?: number;
  notes?: string;
  updated_at?: string;
}

export interface UserShowWithDetails extends UserShow {
  show: Show;
  progress?: {
    totalEpisodes: number;
    watchedEpisodes: number;
    currentEpisode?: {
      season_number: number;
      episode_number: number;
      name?: string;
    } | undefined;
  };
}

export class WatchlistService {
  private client: SupabaseClient;

  constructor(userToken?: string) {
    // Revert: Use authenticated client for user-specific operations
    // RLS policies and RPCs will handle security
    this.client = userToken ? createUserClient(userToken) : supabase;

    console.log('🔧 [WATCHLIST_SERVICE] Constructor called (REVERTED):', {
      hasUserToken: !!userToken,
      userTokenLength: userToken?.length || 0,
      clientType: userToken ? 'authenticated_user' : 'anonymous',
      fixApplied: 'Reverted to authenticated client for RLS/RPCs',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Add a show to user's watchlist
   */
  async addToWatchlist(userId: string, tmdbId: number, status: 'watchlist' | 'watching' = 'watchlist'): Promise<UserShow | null> {
    try {
      console.log('📝 [WATCHLIST_SERVICE] Starting addToWatchlist:', {
        userId,
        tmdbId,
        status,
        clientType: this.client === supabase ? 'anonymous' : 'authenticated_user',
        timestamp: new Date().toISOString()
      });

      // Get or create the show first, using the service client to bypass RLS
      // This is an admin-like operation, so it's acceptable to use serviceSupabase here
      console.log('🎭 [WATCHLIST_SERVICE] Getting/creating show via ShowService with serviceSupabase...');
      let show = await showService.getOrCreateShow(tmdbId, serviceSupabase);
      
      if (!show) {
        console.warn('⚠️ [WATCHLIST_SERVICE] ShowService failed, attempting fallback show creation...');
        
        // Fallback: Create a minimal show entry for immediate use
        const fallbackShowData = {
          tmdb_id: tmdbId,
          title: `Show (TMDB ID: ${tmdbId})`,
          status: 'Airing' as const,
          overview: `Show data from TMDB ID ${tmdbId} - will be updated when TMDB service is available`,
          tmdb_last_updated: new Date().toISOString(),
          is_popular: false
        };
        
        console.log('🔄 [WATCHLIST_SERVICE] Creating fallback show entry:', fallbackShowData);
        
        const { data: fallbackShow, error: fallbackError } = await serviceSupabase
          .from('shows')
          .upsert(fallbackShowData)
          .select()
          .single();
          
        if (fallbackError) {
          console.error('❌ [WATCHLIST_SERVICE] Fallback show creation also failed:', {
            error: fallbackError,
            errorMessage: fallbackError.message,
            errorCode: fallbackError.code,
            tmdbId
          });
          throw new Error(`Failed to create show data: ${fallbackError.message}`);
        }
        
        show = fallbackShow;
        console.log('✅ [WATCHLIST_SERVICE] Fallback show created successfully:', {
          showId: fallbackShow.id,
          title: fallbackShow.title,
          tmdbId: fallbackShow.tmdb_id
        });
      }
      
      // At this point, show should never be null
      if (!show) {
        console.error('❌ [WATCHLIST_SERVICE] Show is still null after all attempts');
        throw new Error('Unable to create or retrieve show data');
      }
      
      console.log('✅ [WATCHLIST_SERVICE] Show retrieved/created:', {
        showId: show.id,
        title: show.title,
        tmdbId: show.tmdb_id
      });

      // Test both authenticated client and service client
      console.log('➕ [WATCHLIST_SERVICE] Testing INSERT with service client first...');
      
      const userShowData = {
        user_id: userId,
        show_id: show.id,
        status,
        added_at: new Date().toISOString(),
        ...(status === 'watching' && {
          started_watching_at: new Date().toISOString()
        })
      };

      // First try with serviceSupabase (should bypass RLS)
      const { data: serviceInsertResult, error: serviceInsertError } = await serviceSupabase
        .from('user_shows')
        .upsert([userShowData], { onConflict: 'user_id,show_id' })
        .select()
        .single();

      if (serviceInsertError) {
        console.error('❌ [WATCHLIST_SERVICE] Service client INSERT failed:', {
          error: serviceInsertError,
          errorCode: serviceInsertError.code,
          errorMessage: serviceInsertError.message,
          userShowData
        });
        throw serviceInsertError;
      } else {
        console.log('✅ [WATCHLIST_SERVICE] Service client INSERT successful:', {
          userShowId: serviceInsertResult.id,
          showId: serviceInsertResult.show_id,
          status: serviceInsertResult.status
        });
        
        // Now test if we can read it back with authenticated client
        console.log('🔍 [WATCHLIST_SERVICE] Testing SELECT with authenticated client...');
        const { data: selectResult, error: selectError } = await this.client
          .from('user_shows')
          .select('*')
          .eq('id', serviceInsertResult.id)
          .single();

        if (selectError) {
          console.error('❌ [WATCHLIST_SERVICE] Authenticated client SELECT failed:', {
            error: selectError,
            errorCode: selectError.code,
            errorMessage: selectError.message
          });
        } else {
          console.log('✅ [WATCHLIST_SERVICE] Authenticated client SELECT successful:', {
            userShowId: selectResult.id,
            userId: selectResult.user_id
          });
        }

        const userShow = serviceInsertResult;

        // Mark show as popular if it's being actively tracked
        if (status === 'watching' && show) {
          console.log('⭐ [WATCHLIST_SERVICE] Marking show as popular...');
          await showService.markShowAsPopular(show.id);
        }

        return userShow;
      }
    } catch (error) {
      console.error('❌ [WATCHLIST_SERVICE] addToWatchlist failed:', {
        error,
        errorType: typeof error,
        errorMessage: (error as Error)?.message,
        errorCode: (error as any)?.code,
        errorDetails: (error as any)?.details,
        errorHint: (error as any)?.hint,
        userId,
        tmdbId,
        status
      });
      return null;
    }
  }

  /**
   * Update show status (watchlist -> watching -> completed, etc.)
   */
  async updateShowStatus(userId: string, userShowId: string, newStatus: UserShow['status']): Promise<UserShow | null> {
    try {
      const updateData: Partial<UserShow> = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      // Set timestamps based on status
      if (newStatus === 'watching' && !await this.hasStartedWatching(userShowId)) {
        updateData.started_watching_at = new Date().toISOString();
      }

      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { data: updatedShow, error } = await this.client
        .from('user_shows')
        .update(updateData)
        .eq('id', userShowId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      // Mark show as popular if user is actively watching
      if (newStatus === 'watching') {
        await showService.markShowAsPopular(updatedShow.show_id);
      }

      return updatedShow;
    } catch (error) {
      console.error('Failed to update show status:', error);
      return null;
    }
  }

  /**
   * Remove show from user's lists entirely
   */
  async removeFromWatchlist(userId: string, showId: string): Promise<boolean> {
    try {
      console.log('➖ [WATCHLIST_SERVICE] Calling rpc_remove_from_watchlist:', { userId, showId });
      const { error: rpcError } = await this.client.rpc('rpc_remove_from_watchlist', {
        p_show_id: showId
      });

      if (rpcError) {
        console.error('❌ [WATCHLIST_SERVICE] rpc_remove_from_watchlist failed:', {
          error: rpcError,
          errorCode: rpcError.code,
          errorMessage: rpcError.message,
          errorDetails: rpcError.details,
          errorHint: rpcError.hint,
          userId,
          showId
        });
        throw rpcError;
      }

      console.log('✅ [WATCHLIST_SERVICE] rpc_remove_from_watchlist called successfully.');
      return true;
    } catch (error) {
      console.error('Failed to remove show from watchlist:', error);
      return false;
    }
  }

  /**
   * Get user's watchlist with show details
   */
  async getUserWatchlist(userId: string, status?: UserShow['status']): Promise<UserShowWithDetails[]> {
    try {
      let query = this.client
        .from('user_shows')
        .select(`
          *,
          shows (*)
        `)
        .eq('user_id', userId);

      if (status) {
        query = query.eq('status', status);
      }

      const { data: userShows, error } = await query.order('added_at', { ascending: false });

      if (error) throw error;

      // Enhance with progress information
      const showsWithProgress = await Promise.all(
        (userShows || []).map(async (userShow) => {
          const progress = await this.getShowProgress(userId, userShow.show_id);
          return {
            ...userShow,
            progress
          };
        })
      );

      return showsWithProgress;
    } catch (error) {
      console.error('Failed to get user watchlist:', error);
      return [];
    }
  }

  /**
   * Get detailed watch progress for a show
   */
  async getShowProgress(userId: string, showId: string): Promise<{
    totalEpisodes: number;
    watchedEpisodes: number;
    currentEpisode?: {
      season_number: number;
      episode_number: number;
      name?: string;
    };
  }> {
    try {
      // Get all episodes for the show
      const { data: episodes, error: episodesError } = await this.client
        .from('episodes')
        .select(`
          *,
          seasons!inner (
            show_id,
            season_number
          )
        `)
        .eq('seasons.show_id', showId);

      if (episodesError) throw episodesError;

      const totalEpisodes = episodes?.length || 0;

      // Get user's watched episodes
      const episodeIds = episodes?.map(ep => ep.id) || [];
      // Use the authenticated client for reading user_episode_progress, RLS will handle access
      const { data: watchedProgress, error: progressError } = await this.client
        .from('user_episode_progress')
        .select('episode_id, state')
        .eq('user_id', userId)
        .in('episode_id', episodeIds)
        .eq('state', 'watched');

      if (progressError) throw progressError;

      const watchedEpisodes = watchedProgress?.length || 0;

      // Find current episode (last watched + 1, or first unwatched)
      let currentEpisode: { season_number: number; episode_number: number; name?: string } | undefined = undefined;

      if (watchedEpisodes > 0 && watchedEpisodes < totalEpisodes) {
        // Find the next unwatched episode
        const watchedEpisodeIds = new Set(watchedProgress?.map(wp => wp.episode_id) || []);
        const nextUnwatched = episodes?.find(ep => !watchedEpisodeIds.has(ep.id));

        if (nextUnwatched) {
          currentEpisode = {
            season_number: nextUnwatched.seasons.season_number,
            episode_number: nextUnwatched.episode_number,
            name: nextUnwatched.name
          };
        }
      } else if (watchedEpisodes === 0 && episodes && episodes.length > 0) {
        // No episodes watched, start with first episode
        const firstEpisode = episodes.sort((a, b) => {
          if (a.seasons.season_number !== b.seasons.season_number) {
            return a.seasons.season_number - b.seasons.season_number;
          }
          return a.episode_number - b.episode_number;
        })[0];

        if (firstEpisode) {
          currentEpisode = {
            season_number: firstEpisode.seasons.season_number,
            episode_number: firstEpisode.episode_number,
            name: firstEpisode.name
          };
        }
      }

      const result: {
        totalEpisodes: number;
        watchedEpisodes: number;
        currentEpisode?: {
          season_number: number;
          episode_number: number;
          name?: string;
        };
      } = {
        totalEpisodes,
        watchedEpisodes
      };
      
      if (currentEpisode) {
        result.currentEpisode = currentEpisode;
      }
      
      return result;
    } catch (error) {
      console.error(`Failed to get show progress for show ${showId}:`, error);
      return {
        totalEpisodes: 0,
        watchedEpisodes: 0
      };
    }
  }

  /**
   * Rate a show
   */
  async rateShow(userId: string, userShowId: string, rating: number): Promise<boolean> {
    try {
      // Validate rating
      if (rating < 0 || rating > 10) {
        throw new Error('Rating must be between 0 and 10');
      }

      const { error } = await this.client
        .from('user_shows')
        .update({
          show_rating: rating,
          updated_at: new Date().toISOString()
        })
        .eq('id', userShowId)
        .eq('user_id', userId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Failed to rate show:', error);
      return false;
    }
  }

  /**
   * Add notes to a show
   */
  async updateShowNotes(userId: string, userShowId: string, notes: string): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('user_shows')
        .update({
          notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', userShowId)
        .eq('user_id', userId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Failed to update show notes:', error);
      return false;
    }
  }

  /**
   * Get watchlist statistics for a user
   */
  async getUserWatchlistStats(userId: string): Promise<{
    totalShows: number;
    byStatus: Record<UserShow['status'], number>;
    totalHoursWatched: number;
    averageRating: number;
  }> {
    try {
      const { data: userShows, error } = await this.client
        .from('user_shows')
        .select('status, show_rating')
        .eq('user_id', userId);

      if (error) throw error;

      const stats = {
        totalShows: userShows?.length || 0,
        byStatus: {
          watchlist: 0,
          watching: 0,
          completed: 0,
          dropped: 0
        } as Record<UserShow['status'], number>,
        totalHoursWatched: 0, // Would need episode runtime data
        averageRating: 0
      };

      // Count by status
      userShows?.forEach(show => {
        if (show.status in stats.byStatus) {
          stats.byStatus[show.status as UserShow['status']]++;
        }
      });

      // Calculate average rating
      const ratingsWithValues = userShows?.filter(s => s.show_rating !== null) || [];
      if (ratingsWithValues.length > 0) {
        stats.averageRating = ratingsWithValues.reduce((sum, show) => sum + (show.show_rating || 0), 0) / ratingsWithValues.length;
        stats.averageRating = Math.round(stats.averageRating * 10) / 10; // Round to 1 decimal
      }

      return stats;
    } catch (error) {
      console.error('Failed to get watchlist stats:', error);
      return {
        totalShows: 0,
        byStatus: { watchlist: 0, watching: 0, completed: 0, dropped: 0 },
        totalHoursWatched: 0,
        averageRating: 0
      };
    }
  }

  /**
   * Set episode progress for a user
   */
  async setEpisodeProgress(
    userId: string,
    showId: string,
    episodeId: string,
    state: 'watched' | 'watching' | 'skipped',
    progress: number
  ): Promise<boolean> {
    try {
      console.log('▶️ [WATCHLIST_SERVICE] Upserting user_episode_progress (service role):', { userId, showId, episodeId, state, progress });

      const { error: upsertError } = await serviceSupabase
        .from('user_episode_progress')
        .upsert(
          [{
            user_id: userId,
            show_id: showId,
            episode_id: episodeId,
            state,
            progress
          }],
          { onConflict: 'user_id,show_id,episode_id' }
        );

      if (upsertError) {
        console.error('❌ [WATCHLIST_SERVICE] Upsert user_episode_progress failed:', {
          error: upsertError,
          errorCode: upsertError.code,
          errorMessage: upsertError.message,
          errorDetails: upsertError.details,
          errorHint: upsertError.hint,
          userId,
          showId,
          episodeId,
          state,
          progress
        });
        throw upsertError;
      }

      console.log('✅ [WATCHLIST_SERVICE] user_episode_progress upsert successful.');
      return true;
    } catch (error) {
      console.error('Failed to set episode progress:', error);
      return false;
    }
  }

  /**
   * Private: Check if user has started watching a show
   */
  private async hasStartedWatching(userShowId: string): Promise<boolean> {
    try {
      const { data: userShow, error } = await this.client
        .from('user_shows')
        .select('started_watching_at')
        .eq('id', userShowId)
        .single();

      if (error) return false;

      return !!userShow?.started_watching_at;
    } catch (error) {
      return false;
    }
  }
}