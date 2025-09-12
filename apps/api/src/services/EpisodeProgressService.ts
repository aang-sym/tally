/**
 * Episode Progress Service
 *
 * Handles episode watch progress tracking with auto-completion features,
 * live statistics, and intelligent state management.
 */

import { supabase } from '../db/supabase.js';

export interface UserEpisodeProgress {
  id: string;
  user_id: string;
  episode_id: string;
  status: 'unwatched' | 'watching' | 'watched';
  started_watching_at?: string;
  watched_at?: string;
  episode_rating?: number;
}

export interface EpisodeWithProgress {
  id: string;
  season_id: string;
  tmdb_episode_id: number;
  episode_number: number;
  name?: string;
  overview?: string;
  air_date?: string;
  runtime?: number;
  progress?: UserEpisodeProgress;
  liveStats?: {
    currentlyWatching: number;
    totalWatched: number;
    averageRating?: number;
  };
}

interface AutoCompletionTimer {
  userId: string;
  episodeId: string;
  timeoutId: NodeJS.Timeout;
}

export class EpisodeProgressService {
  private autoCompletionTimers: Map<string, AutoCompletionTimer> = new Map();

  /**
   * Mark episode as currently watching
   */
  async markEpisodeWatching(
    userId: string,
    episodeId: string
  ): Promise<UserEpisodeProgress | null> {
    try {
      // Get or create progress record
      const { data: existing, error: fetchError } = await supabase
        .from('user_episode_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('episode_id', episodeId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // Not found is OK
        throw fetchError;
      }

      const progressData = {
        user_id: userId,
        episode_id: episodeId,
        status: 'watching' as const,
        started_watching_at: new Date().toISOString(),
      };

      let result;

      if (existing) {
        // Update existing record
        const { data: updated, error: updateError } = await supabase
          .from('user_episode_progress')
          .update({
            status: 'watching',
            started_watching_at: existing.started_watching_at || new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (updateError) throw updateError;
        result = updated;
      } else {
        // Create new record
        const { data: created, error: createError } = await supabase
          .from('user_episode_progress')
          .insert([progressData])
          .select()
          .single();

        if (createError) throw createError;
        result = created;
      }

      // Schedule auto-completion
      await this.scheduleAutoComplete(userId, episodeId);

      return result;
    } catch (error) {
      console.error('Failed to mark episode as watching:', error);
      return null;
    }
  }

  /**
   * Mark episode as watched
   */
  async markEpisodeWatched(userId: string, episodeId: string): Promise<UserEpisodeProgress | null> {
    try {
      // Cancel any pending auto-completion
      this.cancelAutoComplete(userId, episodeId);

      // Get or create progress record
      const { data: existing, error: fetchError } = await supabase
        .from('user_episode_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('episode_id', episodeId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      const progressData = {
        user_id: userId,
        episode_id: episodeId,
        status: 'watched' as const,
        watched_at: new Date().toISOString(),
        started_watching_at: existing?.started_watching_at || new Date().toISOString(),
      };

      let result;

      if (existing) {
        // Update existing record
        const { data: updated, error: updateError } = await supabase
          .from('user_episode_progress')
          .update({
            status: 'watched',
            watched_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (updateError) throw updateError;
        result = updated;
      } else {
        // Create new record
        const { data: created, error: createError } = await supabase
          .from('user_episode_progress')
          .insert([progressData])
          .select()
          .single();

        if (createError) throw createError;
        result = created;
      }

      // Update user_shows last_episode_watched
      await this.updateLastWatchedEpisode(userId, episodeId);

      return result;
    } catch (error) {
      console.error('Failed to mark episode as watched:', error);
      return null;
    }
  }

  /**
   * Bulk update multiple episodes (mark range as watched)
   */
  async bulkUpdateEpisodes(
    userId: string,
    episodeIds: string[],
    status: 'watched' | 'unwatched'
  ): Promise<UserEpisodeProgress[]> {
    try {
      const updates: UserEpisodeProgress[] = [];

      for (const episodeId of episodeIds) {
        if (status === 'watched') {
          const result = await this.markEpisodeWatched(userId, episodeId);
          if (result) updates.push(result);
        } else {
          // Mark as unwatched (remove progress)
          await supabase
            .from('user_episode_progress')
            .delete()
            .eq('user_id', userId)
            .eq('episode_id', episodeId);
        }
      }

      return updates;
    } catch (error) {
      console.error('Failed to bulk update episodes:', error);
      return [];
    }
  }

  /**
   * Get episode progress for multiple episodes
   */
  async getEpisodesWithProgress(
    userId: string,
    episodeIds: string[],
    includeLiveStats: boolean = true
  ): Promise<EpisodeWithProgress[]> {
    try {
      // Get episodes with user progress
      const { data: episodes, error: episodesError } = await supabase
        .from('episodes')
        .select(
          `
          *,
          user_episode_progress!left (
            *
          )
        `
        )
        .in('id', episodeIds)
        .eq('user_episode_progress.user_id', userId);

      if (episodesError) throw episodesError;

      if (!includeLiveStats) {
        return (
          episodes?.map((ep) => ({
            ...ep,
            progress: ep.user_episode_progress?.[0] || null,
          })) || []
        );
      }

      // Get live stats for all episodes
      const episodesWithStats = await Promise.all(
        (episodes || []).map(async (episode) => {
          const liveStats = await this.getEpisodeLiveStats(episode.id);
          return {
            ...episode,
            progress: episode.user_episode_progress?.[0] || null,
            liveStats,
          };
        })
      );

      return episodesWithStats;
    } catch (error) {
      console.error('Failed to get episodes with progress:', error);
      return [];
    }
  }

  /**
   * Get live statistics for an episode
   */
  async getEpisodeLiveStats(episodeId: string): Promise<{
    currentlyWatching: number;
    totalWatched: number;
    averageRating?: number;
  }> {
    try {
      // Get currently watching count
      const { data: watching, error: watchingError } = await supabase
        .from('user_episode_progress')
        .select('user_id')
        .eq('episode_id', episodeId)
        .eq('status', 'watching');

      if (watchingError) throw watchingError;

      // Get total watched count
      const { data: watched, error: watchedError } = await supabase
        .from('user_episode_progress')
        .select('user_id')
        .eq('episode_id', episodeId)
        .eq('status', 'watched');

      if (watchedError) throw watchedError;

      // Get average rating
      const { data: ratings, error: ratingsError } = await supabase
        .from('user_episode_progress')
        .select('episode_rating')
        .eq('episode_id', episodeId)
        .not('episode_rating', 'is', null);

      if (ratingsError) throw ratingsError;

      let averageRating = undefined;
      if (ratings && ratings.length > 0) {
        const validRatings = ratings.map((r) => r.episode_rating).filter((r) => r !== null);
        if (validRatings.length > 0) {
          averageRating =
            validRatings.reduce((sum, rating) => sum + rating, 0) / validRatings.length;
          averageRating = Math.round(averageRating * 10) / 10; // Round to 1 decimal
        }
      }

      return {
        currentlyWatching: watching?.length || 0,
        totalWatched: watched?.length || 0,
        averageRating,
      };
    } catch (error) {
      console.error(`Failed to get live stats for episode ${episodeId}:`, error);
      return {
        currentlyWatching: 0,
        totalWatched: 0,
      };
    }
  }

  /**
   * Rate an episode
   */
  async rateEpisode(userId: string, episodeId: string, rating: number): Promise<boolean> {
    try {
      // Validate rating
      if (rating < 0 || rating > 10) {
        throw new Error('Rating must be between 0 and 10');
      }

      // Get existing progress or create new one
      const { data: existing, error: fetchError } = await supabase
        .from('user_episode_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('episode_id', episodeId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existing) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('user_episode_progress')
          .update({ episode_rating: rating })
          .eq('id', existing.id);

        if (updateError) throw updateError;
      } else {
        // Create new record with rating
        const { error: createError } = await supabase.from('user_episode_progress').insert([
          {
            user_id: userId,
            episode_id: episodeId,
            status: 'unwatched',
            episode_rating: rating,
          },
        ]);

        if (createError) throw createError;
      }

      return true;
    } catch (error) {
      console.error('Failed to rate episode:', error);
      return false;
    }
  }

  /**
   * Get user's watch statistics
   */
  async getUserWatchStats(userId: string): Promise<{
    totalEpisodes: number;
    watchedEpisodes: number;
    currentlyWatching: number;
    totalWatchTime: number; // in minutes
    averageEpisodeRating: number;
  }> {
    try {
      const { data: progress, error } = await supabase
        .from('user_episode_progress')
        .select(
          `
          status,
          episode_rating,
          episodes!inner (
            runtime
          )
        `
        )
        .eq('user_id', userId);

      if (error) throw error;

      const stats = {
        totalEpisodes: progress?.length || 0,
        watchedEpisodes: progress?.filter((p) => p.status === 'watched').length || 0,
        currentlyWatching: progress?.filter((p) => p.status === 'watching').length || 0,
        totalWatchTime: 0,
        averageEpisodeRating: 0,
      };

      // Calculate total watch time
      const watchedWithRuntime =
        progress?.filter((p) => p.status === 'watched' && p.episodes.runtime) || [];

      stats.totalWatchTime = watchedWithRuntime.reduce(
        (total, p) => total + (p.episodes.runtime || 0),
        0
      );

      // Calculate average rating
      const validRatings = progress?.filter((p) => p.episode_rating !== null) || [];
      if (validRatings.length > 0) {
        stats.averageEpisodeRating =
          validRatings.reduce((sum, p) => sum + (p.episode_rating || 0), 0) / validRatings.length;
        stats.averageEpisodeRating = Math.round(stats.averageEpisodeRating * 10) / 10;
      }

      return stats;
    } catch (error) {
      console.error('Failed to get user watch stats:', error);
      return {
        totalEpisodes: 0,
        watchedEpisodes: 0,
        currentlyWatching: 0,
        totalWatchTime: 0,
        averageEpisodeRating: 0,
      };
    }
  }

  /**
   * Schedule auto-completion for an episode
   */
  private async scheduleAutoComplete(userId: string, episodeId: string): Promise<void> {
    try {
      // Get episode runtime
      const { data: episode, error } = await supabase
        .from('episodes')
        .select('runtime')
        .eq('id', episodeId)
        .single();

      if (error || !episode?.runtime) {
        // Default to 45 minutes if no runtime available
        episode.runtime = 45;
      }

      // Schedule auto-complete for runtime + 30 minutes buffer
      const delayMs = (episode.runtime + 30) * 60 * 1000; // Convert to milliseconds

      // Cancel any existing timer
      this.cancelAutoComplete(userId, episodeId);

      // Set new timer
      const timeoutId = setTimeout(async () => {
        console.log(`Auto-completing episode ${episodeId} for user ${userId}`);
        await this.markEpisodeWatched(userId, episodeId);
        this.autoCompletionTimers.delete(`${userId}:${episodeId}`);
      }, delayMs);

      // Store timer reference
      this.autoCompletionTimers.set(`${userId}:${episodeId}`, {
        userId,
        episodeId,
        timeoutId,
      });
    } catch (error) {
      console.error('Failed to schedule auto-completion:', error);
    }
  }

  /**
   * Cancel auto-completion for an episode
   */
  private cancelAutoComplete(userId: string, episodeId: string): void {
    const key = `${userId}:${episodeId}`;
    const timer = this.autoCompletionTimers.get(key);

    if (timer) {
      clearTimeout(timer.timeoutId);
      this.autoCompletionTimers.delete(key);
    }
  }

  /**
   * Update the last watched episode for a show
   */
  private async updateLastWatchedEpisode(userId: string, episodeId: string): Promise<void> {
    try {
      // Get the show ID for this episode
      const { data: episode, error: episodeError } = await supabase
        .from('episodes')
        .select(
          `
          seasons!inner (
            show_id
          )
        `
        )
        .eq('id', episodeId)
        .single();

      if (episodeError || !episode) {
        return;
      }

      const showId = episode.seasons.show_id;

      // Update user_shows with last watched episode
      await supabase
        .from('user_shows')
        .update({
          last_episode_watched_id: episodeId,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('show_id', showId);
    } catch (error) {
      console.error('Failed to update last watched episode:', error);
    }
  }
}

// Export singleton instance
export const episodeProgressService = new EpisodeProgressService();
