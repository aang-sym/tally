/**
 * Show Service
 * 
 * Handles show data with intelligent TMDB caching, TTL logic, and background refresh.
 * Optimizes API calls by caching show data and refreshing based on show status and popularity.
 */

import { supabase, serviceSupabase } from '../db/supabase.js';
import { tmdbService } from './tmdb.js';

export interface Show {
  id: string;
  tmdb_id: number;
  title: string;
  overview?: string;
  poster_path?: string;
  first_air_date?: string;
  last_air_date?: string;
  status: 'Airing' | 'Ended' | 'Cancelled' | 'In Production' | 'Planned' | 'Pilot';
  total_seasons?: number;
  total_episodes?: number;
  release_pattern?: any;
  tmdb_last_updated: string;
  is_popular: boolean;
  created_at: string;
  updated_at: string;
}

export interface Season {
  id: string;
  show_id: string;
  tmdb_season_id: number;
  season_number: number;
  name?: string;
  overview?: string;
  air_date?: string;
  episode_count?: number;
  poster_path?: string;
}

export interface Episode {
  id: string;
  season_id: string;
  tmdb_episode_id: number;
  episode_number: number;
  name?: string;
  overview?: string;
  air_date?: string;
  runtime?: number;
}

export class ShowService {
  /**
   * Get or create a show from TMDB data with caching
   */
  async getOrCreateShow(tmdbId: number): Promise<Show | null> {
    try {
      // First, try to get existing show
      const { data: existingShow, error: fetchError } = await supabase
        .from('shows')
        .select('*')
        .eq('tmdb_id', tmdbId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found
        throw fetchError;
      }

      // If show exists and doesn't need refresh, return it
      if (existingShow && !this.shouldRefreshShow(existingShow)) {
        return existingShow;
      }

      // Get fresh data from TMDB
      if (!tmdbService.isAvailable) {
        console.warn('TMDB service not available, returning cached data if exists');
        return existingShow || null;
      }

      const tmdbShow = await this.fetchTMDBShowData(tmdbId);
      if (!tmdbShow) {
        return existingShow || null;
      }

      // Create or update the show
      const showData = {
        tmdb_id: tmdbId,
        title: tmdbShow.name,
        overview: tmdbShow.overview,
        poster_path: tmdbShow.poster_path,
        first_air_date: tmdbShow.first_air_date,
        last_air_date: tmdbShow.last_air_date,
        status: this.mapTMDBStatus(tmdbShow.status),
        total_seasons: tmdbShow.number_of_seasons,
        total_episodes: tmdbShow.number_of_episodes,
        release_pattern: tmdbShow.release_pattern || null,
        tmdb_last_updated: new Date().toISOString(),
        is_popular: existingShow?.is_popular || false,
        updated_at: new Date().toISOString()
      };

      if (existingShow) {
        // Update existing show - use service role for system operations
        const { data: updatedShow, error: updateError } = await serviceSupabase
          .from('shows')
          .update(showData)
          .eq('id', existingShow.id)
          .select()
          .single();

        if (updateError) throw updateError;

        // Update seasons and episodes
        await this.updateSeasonsAndEpisodes(updatedShow.id, tmdbShow);

        return updatedShow;
      } else {
        // Create new show - use service role for system operations
        const { data: newShow, error: createError } = await serviceSupabase
          .from('shows')
          .insert([showData])
          .select()
          .single();

        if (createError) throw createError;

        // Create seasons and episodes
        await this.createSeasonsAndEpisodes(newShow.id, tmdbShow);

        return newShow;
      }
    } catch (error) {
      console.error(`Failed to get or create show ${tmdbId}:`, error);
      return null;
    }
  }

  /**
   * Determine if a show needs to be refreshed based on TTL logic
   */
  shouldRefreshShow(show: Show): boolean {
    const now = new Date();
    const lastUpdate = new Date(show.tmdb_last_updated);
    const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);

    // Refresh ended shows every 7 days (168 hours)
    if (show.status === 'Ended' || show.status === 'Cancelled') {
      return hoursSinceUpdate > 168;
    }

    // Refresh airing shows every 6 hours
    if (show.status === 'Airing') {
      return hoursSinceUpdate > 6;
    }

    // Refresh popular shows daily (24 hours)
    if (show.is_popular) {
      return hoursSinceUpdate > 24;
    }

    // Default: refresh every 2 days (48 hours)
    return hoursSinceUpdate > 48;
  }

  /**
   * Mark a show as popular for priority refreshing
   */
  async markShowAsPopular(showId: string): Promise<void> {
    try {
      await supabase
        .from('shows')
        .update({ 
          is_popular: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', showId);
    } catch (error) {
      console.error(`Failed to mark show ${showId} as popular:`, error);
    }
  }

  /**
   * Get shows that need background refresh
   */
  async getShowsForBackgroundRefresh(limit: number = 50): Promise<Show[]> {
    try {
      const { data: shows, error } = await supabase
        .from('shows')
        .select('*')
        .or('is_popular.eq.true,status.eq.Airing')
        .order('tmdb_last_updated', { ascending: true })
        .limit(limit);

      if (error) throw error;

      return shows?.filter(show => this.shouldRefreshShow(show)) || [];
    } catch (error) {
      console.error('Failed to get shows for background refresh:', error);
      return [];
    }
  }

  /**
   * Search shows and cache results
   */
  async searchShows(query: string, country: string = 'US'): Promise<any[]> {
    if (!tmdbService.isAvailable) {
      return [];
    }

    try {
      const results = await tmdbService.searchTVShows(query, country);
      
      // Mark frequently searched shows as popular (simple heuristic)
      if (results.length > 0) {
        // Could implement search frequency tracking here
        console.log(`Found ${results.length} shows for query: "${query}"`);
      }

      return results;
    } catch (error) {
      console.error('Show search failed:', error);
      return [];
    }
  }

  /**
   * Get show details with all seasons and episodes
   */
  async getShowWithDetails(showId: string): Promise<{
    show: Show;
    seasons: (Season & { episodes: Episode[] })[];
  } | null> {
    try {
      // Get show
      const { data: show, error: showError } = await supabase
        .from('shows')
        .select('*')
        .eq('id', showId)
        .single();

      if (showError) throw showError;

      // Get seasons with episodes
      const { data: seasons, error: seasonsError } = await supabase
        .from('seasons')
        .select(`
          *,
          episodes (*)
        `)
        .eq('show_id', showId)
        .order('season_number', { ascending: true });

      if (seasonsError) throw seasonsError;

      // Sort episodes within each season
      const seasonsWithEpisodes = seasons?.map(season => ({
        ...season,
        episodes: season.episodes.sort((a: Episode, b: Episode) => a.episode_number - b.episode_number)
      })) || [];

      return {
        show,
        seasons: seasonsWithEpisodes
      };
    } catch (error) {
      console.error(`Failed to get show details for ${showId}:`, error);
      return null;
    }
  }

  /**
   * Private: Fetch show data from TMDB
   */
  private async fetchTMDBShowData(tmdbId: number): Promise<any> {
    try {
      // Use the existing tmdbService to get show details
      // This is a simplified version - you may want to enhance this
      // to get more detailed data like seasons and episodes
      
      const analysis = await tmdbService.analyzeShow(tmdbId);
      return analysis?.showDetails ? {
        name: analysis.showDetails.title,
        overview: analysis.showDetails.overview,
        poster_path: analysis.showDetails.poster,
        first_air_date: analysis.showDetails.firstAirDate,
        last_air_date: analysis.showDetails.lastAirDate,
        status: analysis.showDetails.status,
        number_of_seasons: analysis.seasonInfo?.length || 0,
        number_of_episodes: analysis.episodeCount || 0,
        // Persist full analysis summary into DB JSONB field
        release_pattern: {
          pattern: analysis.pattern,
          confidence: analysis.confidence,
          avgInterval: analysis.diagnostics?.avgInterval ?? null,
          stdDev: analysis.diagnostics?.stdDev ?? null,
          intervals: analysis.diagnostics?.intervals ?? [],
          analyzedSeason: analysis.analyzedSeason
        },
        seasons: analysis.seasonInfo
      } : null;
    } catch (error) {
      console.error(`Failed to fetch TMDB data for show ${tmdbId}:`, error);
      return null;
    }
  }

  /**
   * Private: Map TMDB status to our enum
   */
  private mapTMDBStatus(tmdbStatus: string): Show['status'] {
    const statusMap: Record<string, Show['status']> = {
      'Returning Series': 'Airing',
      'Ended': 'Ended',
      'Canceled': 'Cancelled',
      'In Production': 'In Production',
      'Planned': 'Planned',
      'Pilot': 'Pilot'
    };

    return statusMap[tmdbStatus] || 'Airing';
  }

  /**
   * Private: Create seasons and episodes for a new show
   */
  private async createSeasonsAndEpisodes(showId: string, tmdbShow: any): Promise<void> {
    try {
      if (!tmdbShow.seasons || tmdbShow.seasons.length === 0) {
        return;
      }

      for (const tmdbSeason of tmdbShow.seasons) {
        // Create season - use service role for system operations
        const { data: season, error: seasonError } = await serviceSupabase
          .from('seasons')
          .insert([{
            show_id: showId,
            tmdb_season_id: tmdbSeason.seasonNumber || 0,
            season_number: tmdbSeason.seasonNumber,
            name: `Season ${tmdbSeason.seasonNumber}`,
            episode_count: tmdbSeason.episodeCount
          }])
          .select()
          .single();

        if (seasonError) {
          console.error('Failed to create season:', seasonError);
          continue;
        }

        // For now, we'll create episode stubs - episodes would be populated 
        // when we need detailed episode data
        if (tmdbSeason.episodeCount) {
          const episodeStubs = Array.from({ length: tmdbSeason.episodeCount }, (_, i) => ({
            season_id: season.id,
            tmdb_episode_id: 0, // Would be populated when fetching detailed episode data
            episode_number: i + 1,
            name: `Episode ${i + 1}`
          }));

          await serviceSupabase
            .from('episodes')
            .insert(episodeStubs);
        }
      }
    } catch (error) {
      console.error('Failed to create seasons and episodes:', error);
    }
  }

  /**
   * Private: Update seasons and episodes for an existing show
   */
  private async updateSeasonsAndEpisodes(showId: string, tmdbShow: any): Promise<void> {
    // For now, we'll skip updating seasons/episodes to avoid complexity
    // In a full implementation, you'd compare existing vs new data
    // and update accordingly
    console.log(`Skipping season/episode update for show ${showId}`);
  }
}

// Export singleton instance
export const showService = new ShowService();
