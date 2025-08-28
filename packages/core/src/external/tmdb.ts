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
    
    // Add API key and default language
    params.api_key = this.apiKey;
    params.language = params.language || 'en-US';
    
    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString());

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
  }

  /**
   * Search for TV shows by title
   */
  async searchTV(query: string, page: number = 1): Promise<TMDBSearchResult> {
    return this.makeRequest<TMDBSearchResult>('/search/tv', {
      query,
      page: page.toString(),
    });
  }

  /**
   * Get detailed TV show information by ID
   */
  async getTVShow(tvId: number): Promise<TMDBTVShow> {
    return this.makeRequest<TMDBTVShow>(`/tv/${tvId}`);
  }

  /**
   * Get season details with episode information
   */
  async getSeason(tvId: number, seasonNumber: number): Promise<TMDBSeason> {
    return this.makeRequest<TMDBSeason>(`/tv/${tvId}/season/${seasonNumber}`);
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
  async getLatestSeasonEpisodes(tvId: number): Promise<import('../types.js').EpisodeMetadata[]> {
    // Get TV show details first to find the latest season
    const tvShow = await this.getTVShow(tvId);
    const latestSeasonNumber = tvShow.number_of_seasons;
    
    // Get the latest season's episodes
    const season = await this.getSeason(tvId, latestSeasonNumber);
    
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
        return { pattern: 'unknown', tmdbId: show.id };
      }
      
      // Use existing release pattern service to analyze
      const { releasePatternService } = await import('../services/release-pattern.js');
      const analysis = releasePatternService.analyzeReleasePattern(episodes);
      
      return {
        pattern: analysis.pattern,
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
}

export default TMDBClient;