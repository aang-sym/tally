/**
 * Watchlist Service
 * 
 * Handles user show tracking operations including watchlist management,
 * watching progress, and status transitions between different states.
 */

import { supabase, createUserClient } from '../db/supabase.js';
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
    };
  };
}

export class WatchlistService {
  private client: SupabaseClient;

  constructor(userToken?: string) {
    // Use authenticated client if token provided, otherwise use anonymous client
    this.client = userToken ? createUserClient(userToken) : supabase;
  }

  /**
   * Add a show to user's watchlist
   */
  async addToWatchlist(userId: string, tmdbId: number, status: 'watchlist' | 'watching' = 'watchlist'): Promise<UserShow | null> {
    try {
      // Get or create the show first
      const show = await showService.getOrCreateShow(tmdbId);
      if (!show) {
        throw new Error('Failed to get show data');
      }

      // Check if show is already in user's list
      const { data: existing, error: checkError } = await this.client
        .from('user_shows')
        .select('*')
        .eq('user_id', userId)
        .eq('show_id', show.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // Not found is OK
        throw checkError;
      }

      if (existing) {
        // Update existing entry if status is different
        if (existing.status !== status) {
          return await this.updateShowStatus(userId, existing.id, status);
        }
        return existing;
      }

      // Create new watchlist entry
      const userShowData = {
        user_id: userId,
        show_id: show.id,
        status,
        added_at: new Date().toISOString(),
        ...(status === 'watching' && {
          started_watching_at: new Date().toISOString()
        })
      };

      const { data: userShow, error: createError } = await this.client
        .from('user_shows')
        .insert([userShowData])
        .select()
        .single();

      if (createError) {
        console.error('Detailed user_shows insert error:', {
          error: createError,
          userData: userShowData,
          userId,
          showId: show.id,
          tmdbId,
          status
        });
        throw createError;
      }

      // Mark show as popular if it's being actively tracked
      if (status === 'watching') {
        await showService.markShowAsPopular(show.id);
      }

      return userShow;
    } catch (error) {
      console.error('Failed to add show to watchlist:', error);
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
  async removeFromWatchlist(userId: string, userShowId: string): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('user_shows')
        .delete()
        .eq('id', userShowId)
        .eq('user_id', userId);

      if (error) throw error;

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
      let query = supabase
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
      const { data: watchedProgress, error: progressError } = await this.client
        .from('user_episode_progress')
        .select('episode_id, status')
        .eq('user_id', userId)
        .in('episode_id', episodeIds)
        .eq('status', 'watched');

      if (progressError) throw progressError;

      const watchedEpisodes = watchedProgress?.length || 0;

      // Find current episode (last watched + 1, or first unwatched)
      let currentEpisode = undefined;

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

      return {
        totalEpisodes,
        watchedEpisodes,
        currentEpisode
      };
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
          stats.byStatus[show.status]++;
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

// Removed singleton export - services should be instantiated with user authentication