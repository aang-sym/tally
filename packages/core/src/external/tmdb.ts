/**
 * TMDB (The Movie Database) API Client
 * 
 * Integrates with TMDB API to get TV show data, episode release dates,
 * and watch provider information for release pattern detection.
 */

export interface TMDBEpisode {
  id: number;
  name: string;
  overview?: string;
  air_date?: string;
  episode_number: number;
  season_number: number;
  vote_average?: number;
  vote_count?: number;
}

export interface TMDBSeason {
  id: number;
  name?: string;
  overview?: string;
  season_number: number;
  episode_count: number;
  air_date?: string;
  episodes?: TMDBEpisode[];
}

export interface TMDBTVShow {
  id: number;
  name: string;
  original_name?: string;
  overview?: string;
  first_air_date?: string;
  last_air_date?: string;
  number_of_seasons: number;
  number_of_episodes: number;
  status: string;
  type: string;
  poster_path?: string;
  seasons?: TMDBSeason[];
}

export interface TMDBSearchResult {
  page: number;
  results: TMDBTVShow[];
  total_pages: number;
  total_results: number;
}

export interface TMDBWatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priority: number;
}

export interface TMDBWatchProviderData {
  id: number;
  results: {
    [countryCode: string]: {
      link?: string;
      flatrate?: TMDBWatchProvider[];
      buy?: TMDBWatchProvider[];
      rent?: TMDBWatchProvider[];
    };
  };
}

export interface TMDBProviderListItem {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priorities: {
    [countryCode: string]: number;
  };
}

export interface TMDBProviderListResponse {
  results: TMDBProviderListItem[];
}

export interface TMDBRegion {
  iso_3166_1: string;
  english_name: string;
  native_name: string;
}

export class TMDBError extends Error {
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'TMDBError';
  }
}

export class TMDBClient {
  private baseUrl = 'https://api.themoviedb.org/3';
  private apiKey: string;
  private rateLimitDelay = 250; // TMDB allows 40 requests per 10 seconds

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('TMDB API key is required');
    }
    this.apiKey = apiKey;
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    // Add default language
    params.language = params.language || 'en-US';
    
    // Add query parameters (no longer adding api_key here)
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const startTime = Date.now();
    let success = false;
    
    try {
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      const responseTime = Date.now() - startTime;
      success = response.ok;

      if (response.status === 429) {
        throw new TMDBError('Rate limit exceeded', 429);
      }

      if (!response.ok) {
        throw new TMDBError(
          `TMDB API request failed: ${response.statusText}`,
          response.status
        );
      }

      return response.json();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Search for TV shows by title
   */
  async searchTV(query: string, page: number = 1, language: string = 'en-US'): Promise<TMDBSearchResult> {
    return this.makeRequest<TMDBSearchResult>('/search/tv', {
      query,
      page: page.toString(),
      language
    });
  }

  /**
   * Get detailed TV show information by ID
   */
  async getTVShow(tvId: number, language: string = 'en-US'): Promise<TMDBTVShow> {
    return this.makeRequest<TMDBTVShow>(`/tv/${tvId}`, { language });
  }

  /**
   * Get season details with episode information
   */
  async getSeason(tvId: number, seasonNumber: number, language: string = 'en-US'): Promise<TMDBSeason> {
    return this.makeRequest<TMDBSeason>(`/tv/${tvId}/season/${seasonNumber}`, { language });
  }

  /**
   * Get watch providers for a TV show by country
   */
  async getWatchProviders(tvId: number): Promise<TMDBWatchProviderData> {
    return this.makeRequest<TMDBWatchProviderData>(`/tv/${tvId}/watch/providers`);
  }

  /**
   * Convert TMDB episode data to internal EpisodeMetadata format
   */
  convertToEpisodeMetadata(episodes: TMDBEpisode[]): import('../types.js').EpisodeMetadata[] {
    return episodes
      .filter(ep => ep.air_date) // Only include episodes with air dates
      .map(episode => ({
        id: episode.id.toString(),
        seasonNumber: episode.season_number,
        episodeNumber: episode.episode_number,
        airDate: episode.air_date!,
        title: episode.name,
      }));
  }

  /**
   * Get the latest season's episodes for release pattern detection
   */
  async getLatestSeasonEpisodes(tvId: number, language: string = 'en-US'): Promise<import('../types.js').EpisodeMetadata[]> {
    // Get TV show details first to find the latest season
    const tvShow = await this.getTVShow(tvId, language);
    const latestSeasonNumber = tvShow.number_of_seasons;
    
    // Get the latest season's episodes
    const season = await this.getSeason(tvId, latestSeasonNumber, language);
    
    return this.convertToEpisodeMetadata(season.episodes || []);
  }

  /**
   * Search for a show and detect its release pattern
   */
  async detectReleasePatternFromTitle(
    showTitle: string
  ): Promise<{ pattern: import('../types.js').ReleasePattern; tmdbId?: number } | null> {
    try {
      // Search for the show
      const searchResults = await this.searchTV(showTitle);
      
      if (!searchResults.results.length) {
        return null;
      }
      
      // Take the first (most relevant) result
      const show = searchResults.results[0];
      
      // Get latest season episodes
      const episodes = await this.getLatestSeasonEpisodes(show.id);
      
      if (!episodes.length) {
        return { pattern: 'unknown' as const, tmdbId: show.id };
      }
      
      // Use existing release pattern service to analyze
      const { releasePatternService } = await import('../services/release-pattern.js');
      const analysis = releasePatternService.analyzeEpisodes(episodes);
      
      return {
        pattern: analysis.pattern.pattern,
        tmdbId: show.id
      };
    } catch (error) {
      console.error('Error detecting release pattern from TMDB:', error);
      return null;
    }
  }

  /**
   * Get watch providers for a specific country
   */
  async getWatchProvidersForCountry(
    tvId: number, 
    countryCode: string = 'US'
  ): Promise<TMDBWatchProvider[]> {
    try {
      const watchData = await this.getWatchProviders(tvId);
      const countryData = watchData.results[countryCode];
      
      if (!countryData) {
        return [];
      }
      
      // Return flatrate (subscription) providers primarily
      return countryData.flatrate || [];
    } catch (error) {
      console.error('Error getting watch providers from TMDB:', error);
      return [];
    }
  }

  /**
   * Get list of available streaming providers for TV shows in a specific region
   */
  async getWatchProvidersList(region: string = 'US'): Promise<TMDBProviderListItem[]> {
    try {
      const response = await this.makeRequest<TMDBProviderListResponse>(`/watch/providers/tv?watch_region=${region}`);
      return response.results || [];
    } catch (error) {
      console.error('Error getting watch providers list from TMDB:', error);
      return [];
    }
  }

  /**
   * Get list of available regions for watch providers
   */
  async getWatchProviderRegions(): Promise<TMDBRegion[]> {
    try {
      const response = await this.makeRequest<{ results: TMDBRegion[] }>('/watch/providers/regions');
      return response.results || [];
    } catch (error) {
      console.error('Error getting watch provider regions from TMDB:', error);
      return [];
    }
  }

  /**
   * Get comprehensive provider data for multiple regions
   */
  async getAllProviders(regions: string[] = ['US', 'GB', 'CA', 'AU']): Promise<{
    providers: TMDBProviderListItem[];
    regions: string[];
    total: number;
  }> {
    try {
      const allProviders = new Map<number, TMDBProviderListItem>();
      
      for (const region of regions) {
        const regionProviders = await this.getWatchProvidersList(region);
        for (const provider of regionProviders) {
          if (!allProviders.has(provider.provider_id)) {
            allProviders.set(provider.provider_id, provider);
          } else {
            // Merge display priorities from multiple regions
            const existing = allProviders.get(provider.provider_id)!;
            existing.display_priorities = {
              ...existing.display_priorities,
              ...provider.display_priorities
            };
          }
        }
      }

      const providers = Array.from(allProviders.values()).sort((a, b) => 
        a.provider_name.localeCompare(b.provider_name)
      );

      return {
        providers,
        regions,
        total: providers.length
      };
    } catch (error) {
      console.error('Error getting all providers from TMDB:', error);
      return {
        providers: [],
        regions,
        total: 0
      };
    }
  }
}

export default TMDBClient;
