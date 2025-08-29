/**
 * Rating Service
 * 
 * Handles comprehensive rating system for shows, seasons, and episodes.
 * Provides aggregate ratings, statistics, and rating-based recommendations.
 */

import { supabase } from '../db/supabase.js';

export interface UserSeasonRating {
  id: string;
  user_id: string;
  season_id: string;
  rating: number;
  created_at: string;
}

export interface AggregateRating {
  averageRating: number;
  totalRatings: number;
  ratingDistribution: Record<string, number>; // e.g., {"8.5": 3, "9.0": 5}
}

export interface UserRatingStats {
  totalRatings: number;
  averageRating: number;
  showRatings: number;
  seasonRatings: number;
  episodeRatings: number;
  ratingsByScore: Record<string, number>;
}

export class RatingService {
  /**
   * Rate a show (updates user_shows table)
   */
  async rateShow(userId: string, userShowId: string, rating: number): Promise<boolean> {
    try {
      this.validateRating(rating);

      const { error } = await supabase
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
   * Rate a season
   */
  async rateSeason(userId: string, seasonId: string, rating: number): Promise<UserSeasonRating | null> {
    try {
      this.validateRating(rating);

      // Check if user already rated this season
      const { data: existing, error: fetchError } = await supabase
        .from('user_season_ratings')
        .select('*')
        .eq('user_id', userId)
        .eq('season_id', seasonId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existing) {
        // Update existing rating
        const { data: updated, error: updateError } = await supabase
          .from('user_season_ratings')
          .update({ rating })
          .eq('id', existing.id)
          .select()
          .single();

        if (updateError) throw updateError;
        return updated;
      } else {
        // Create new rating
        const { data: created, error: createError } = await supabase
          .from('user_season_ratings')
          .insert([{
            user_id: userId,
            season_id: seasonId,
            rating,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (createError) throw createError;
        return created;
      }
    } catch (error) {
      console.error('Failed to rate season:', error);
      return null;
    }
  }

  /**
   * Rate an episode (uses EpisodeProgressService)
   */
  async rateEpisode(userId: string, episodeId: string, rating: number): Promise<boolean> {
    try {
      this.validateRating(rating);

      // Get or create episode progress record
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
        // Update existing progress with rating
        const { error: updateError } = await supabase
          .from('user_episode_progress')
          .update({ episode_rating: rating })
          .eq('id', existing.id);

        if (updateError) throw updateError;
      } else {
        // Create new progress record with rating
        const { error: createError } = await supabase
          .from('user_episode_progress')
          .insert([{
            user_id: userId,
            episode_id: episodeId,
            status: 'unwatched',
            episode_rating: rating
          }]);

        if (createError) throw createError;
      }

      return true;
    } catch (error) {
      console.error('Failed to rate episode:', error);
      return false;
    }
  }

  /**
   * Get aggregate rating for a show
   */
  async getShowAggregateRating(showId: string): Promise<AggregateRating> {
    try {
      const { data: ratings, error } = await supabase
        .from('user_shows')
        .select('show_rating')
        .eq('show_id', showId)
        .not('show_rating', 'is', null);

      if (error) throw error;

      return this.calculateAggregateRating(
        ratings?.map(r => r.show_rating).filter(r => r !== null) || []
      );
    } catch (error) {
      console.error(`Failed to get show aggregate rating for ${showId}:`, error);
      return { averageRating: 0, totalRatings: 0, ratingDistribution: {} };
    }
  }

  /**
   * Get aggregate rating for a season
   */
  async getSeasonAggregateRating(seasonId: string): Promise<AggregateRating> {
    try {
      const { data: ratings, error } = await supabase
        .from('user_season_ratings')
        .select('rating')
        .eq('season_id', seasonId);

      if (error) throw error;

      return this.calculateAggregateRating(
        ratings?.map(r => r.rating) || []
      );
    } catch (error) {
      console.error(`Failed to get season aggregate rating for ${seasonId}:`, error);
      return { averageRating: 0, totalRatings: 0, ratingDistribution: {} };
    }
  }

  /**
   * Get aggregate rating for an episode
   */
  async getEpisodeAggregateRating(episodeId: string): Promise<AggregateRating> {
    try {
      const { data: ratings, error } = await supabase
        .from('user_episode_progress')
        .select('episode_rating')
        .eq('episode_id', episodeId)
        .not('episode_rating', 'is', null);

      if (error) throw error;

      return this.calculateAggregateRating(
        ratings?.map(r => r.episode_rating).filter(r => r !== null) || []
      );
    } catch (error) {
      console.error(`Failed to get episode aggregate rating for ${episodeId}:`, error);
      return { averageRating: 0, totalRatings: 0, ratingDistribution: {} };
    }
  }

  /**
   * Get user's rating statistics
   */
  async getUserRatingStats(userId: string): Promise<UserRatingStats> {
    try {
      // Get show ratings
      const { data: showRatings, error: showError } = await supabase
        .from('user_shows')
        .select('show_rating')
        .eq('user_id', userId)
        .not('show_rating', 'is', null);

      if (showError) throw showError;

      // Get season ratings
      const { data: seasonRatings, error: seasonError } = await supabase
        .from('user_season_ratings')
        .select('rating')
        .eq('user_id', userId);

      if (seasonError) throw seasonError;

      // Get episode ratings
      const { data: episodeRatings, error: episodeError } = await supabase
        .from('user_episode_progress')
        .select('episode_rating')
        .eq('user_id', userId)
        .not('episode_rating', 'is', null);

      if (episodeError) throw episodeError;

      // Combine all ratings
      const allRatings = [
        ...(showRatings?.map(r => r.show_rating).filter(r => r !== null) || []),
        ...(seasonRatings?.map(r => r.rating) || []),
        ...(episodeRatings?.map(r => r.episode_rating).filter(r => r !== null) || [])
      ];

      // Calculate statistics
      const totalRatings = allRatings.length;
      const averageRating = totalRatings > 0 
        ? Math.round((allRatings.reduce((sum, rating) => sum + rating, 0) / totalRatings) * 10) / 10
        : 0;

      // Rating distribution by score
      const ratingsByScore: Record<string, number> = {};
      allRatings.forEach(rating => {
        const scoreKey = Math.floor(rating).toString();
        ratingsByScore[scoreKey] = (ratingsByScore[scoreKey] || 0) + 1;
      });

      return {
        totalRatings,
        averageRating,
        showRatings: showRatings?.length || 0,
        seasonRatings: seasonRatings?.length || 0,
        episodeRatings: episodeRatings?.length || 0,
        ratingsByScore
      };
    } catch (error) {
      console.error('Failed to get user rating stats:', error);
      return {
        totalRatings: 0,
        averageRating: 0,
        showRatings: 0,
        seasonRatings: 0,
        episodeRatings: 0,
        ratingsByScore: {}
      };
    }
  }

  /**
   * Get top-rated shows globally
   */
  async getTopRatedShows(limit: number = 10): Promise<Array<{
    show: any;
    averageRating: number;
    totalRatings: number;
  }>> {
    try {
      // This is a simplified version - in production you'd want proper aggregation
      const { data: showsWithRatings, error } = await supabase
        .from('user_shows')
        .select(`
          show_id,
          show_rating,
          shows (
            id,
            title,
            poster_path,
            overview
          )
        `)
        .not('show_rating', 'is', null)
        .order('show_rating', { ascending: false })
        .limit(limit * 5); // Get more to calculate proper averages

      if (error) throw error;

      // Group by show and calculate averages
      const showRatingsMap = new Map<string, {
        show: any;
        ratings: number[];
      }>();

      showsWithRatings?.forEach(item => {
        const showId = item.show_id;
        if (!showRatingsMap.has(showId)) {
          showRatingsMap.set(showId, {
            show: item.shows,
            ratings: []
          });
        }
        showRatingsMap.get(showId)!.ratings.push(item.show_rating);
      });

      // Calculate averages and sort
      const topRatedShows = Array.from(showRatingsMap.values())
        .map(({ show, ratings }) => ({
          show,
          averageRating: Math.round((ratings.reduce((sum, r) => sum + r, 0) / ratings.length) * 10) / 10,
          totalRatings: ratings.length
        }))
        .filter(item => item.totalRatings >= 2) // Minimum 2 ratings
        .sort((a, b) => {
          // Sort by average rating, then by number of ratings
          if (Math.abs(a.averageRating - b.averageRating) < 0.1) {
            return b.totalRatings - a.totalRatings;
          }
          return b.averageRating - a.averageRating;
        })
        .slice(0, limit);

      return topRatedShows;
    } catch (error) {
      console.error('Failed to get top-rated shows:', error);
      return [];
    }
  }

  /**
   * Get user's rating preferences for recommendations
   */
  async getUserRatingPreferences(userId: string): Promise<{
    favoriteGenres: string[];
    averageRatingThreshold: number;
    ratingTrends: {
      isGenerousRater: boolean;
      consistencyScore: number;
    };
  }> {
    try {
      // Get user's show ratings with show genres
      const { data: showRatings, error } = await supabase
        .from('user_shows')
        .select(`
          show_rating,
          shows (
            title,
            overview
          )
        `)
        .eq('user_id', userId)
        .not('show_rating', 'is', null)
        .gte('show_rating', 7); // Focus on shows they liked

      if (error) throw error;

      const ratings = showRatings?.map(r => r.show_rating) || [];
      const averageRating = ratings.length > 0 
        ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length 
        : 0;

      // Calculate consistency (how much ratings vary)
      const variance = ratings.length > 1 
        ? ratings.reduce((sum, r) => sum + Math.pow(r - averageRating, 2), 0) / ratings.length
        : 0;
      const consistencyScore = Math.max(0, 100 - (variance * 10)); // Scale to 0-100

      return {
        favoriteGenres: [], // Would need genre data from TMDB integration
        averageRatingThreshold: Math.max(6.0, averageRating - 1.0), // Shows they might like
        ratingTrends: {
          isGenerousRater: averageRating > 7.5,
          consistencyScore: Math.round(consistencyScore)
        }
      };
    } catch (error) {
      console.error('Failed to get user rating preferences:', error);
      return {
        favoriteGenres: [],
        averageRatingThreshold: 6.0,
        ratingTrends: {
          isGenerousRater: false,
          consistencyScore: 0
        }
      };
    }
  }

  /**
   * Private: Validate rating is in valid range
   */
  private validateRating(rating: number): void {
    if (rating < 0 || rating > 10) {
      throw new Error('Rating must be between 0.0 and 10.0');
    }
  }

  /**
   * Private: Calculate aggregate rating statistics
   */
  private calculateAggregateRating(ratings: number[]): AggregateRating {
    if (ratings.length === 0) {
      return {
        averageRating: 0,
        totalRatings: 0,
        ratingDistribution: {}
      };
    }

    const averageRating = Math.round(
      (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 10
    ) / 10;

    // Create rating distribution (rounded to 0.5 intervals)
    const ratingDistribution: Record<string, number> = {};
    ratings.forEach(rating => {
      const rounded = Math.round(rating * 2) / 2; // Round to nearest 0.5
      const key = rounded.toString();
      ratingDistribution[key] = (ratingDistribution[key] || 0) + 1;
    });

    return {
      averageRating,
      totalRatings: ratings.length,
      ratingDistribution
    };
  }
}

// Export singleton instance
export const ratingService = new RatingService();