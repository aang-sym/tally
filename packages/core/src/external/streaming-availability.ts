/**
 * Streaming Availability API Client
 *
 * Integrates with RapidAPI's Streaming Availability service to get real-time
 * data about content availability across streaming platforms.
 */

export interface StreamingService {
  id: string;
  name: string;
  homePage: string;
  themeColorCode: string;
}

export interface StreamingOption {
  service: StreamingService;
  type: 'subscription' | 'rent' | 'buy';
  price?: {
    amount: number;
    currency: string;
  };
  expiresSoon: boolean;
  expiresOn?: number; // Unix timestamp
  availableSince?: number; // Unix timestamp
  link: string;
}

export interface Episode {
  id: string;
  title: string;
  overview?: string;
  air_date?: string;
  episode_number: number;
  season_number: number;
  streamingOptions?: {
    [country: string]: StreamingOption[];
  };
}

export interface Season {
  id: string;
  name?: string;
  season_number: number;
  episodes?: Episode[];
}

export interface StreamingAvailability {
  id: string;
  title: string;
  year?: number;
  type: 'movie' | 'series';
  imdbId?: string;
  tmdbId?: string;
  streamingOptions: {
    [country: string]: StreamingOption[];
  };
  seasons?: Season[];
  episodes?: Episode[];
}

export interface SearchResult {
  shows: StreamingAvailability[];
  hasMore: boolean;
  nextCursor?: string;
}

export class StreamingAvailabilityError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public rateLimitReset?: number
  ) {
    super(message);
    this.name = 'StreamingAvailabilityError';
  }
}

export class StreamingAvailabilityClient {
  private baseUrl = 'https://streaming-availability.p.rapidapi.com';
  private apiKey: string;
  private rateLimitDelay = 1000; // 1 second between requests

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Streaming Availability API key is required');
    }
    this.apiKey = apiKey;
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString(), {
      headers: {
        'X-RapidAPI-Key': this.apiKey,
        'X-RapidAPI-Host': 'streaming-availability.p.rapidapi.com',
      },
    });

    // Handle rate limiting
    if (response.status === 429) {
      const resetTime = response.headers.get('X-RateLimit-Reset');
      const resetMs = resetTime ? parseInt(resetTime) * 1000 - Date.now() : this.rateLimitDelay;

      throw new StreamingAvailabilityError('Rate limit exceeded', 429, resetMs);
    }

    if (!response.ok) {
      throw new StreamingAvailabilityError(
        `API request failed: ${response.statusText}`,
        response.status
      );
    }

    return response.json();
  }

  /**
   * Search for shows/movies by title
   */
  async search(
    title: string,
    country: string = 'us',
    showType?: 'movie' | 'series',
    limit: number = 20
  ): Promise<SearchResult> {
    const params: Record<string, string> = {
      title: title,
      country,
      output_language: 'en',
    };

    if (showType) {
      params.show_type = showType;
    }

    if (limit) {
      params.limit = limit.toString();
    }

    return this.makeRequest<SearchResult>('/shows/search/title', params);
  }

  /**
   * Get detailed information about a specific show/movie by ID
   */
  async getShow(
    id: string,
    country: string = 'us',
    includeEpisodes: boolean = false
  ): Promise<StreamingAvailability> {
    const params: Record<string, string> = {
      country,
      output_language: 'en',
    };

    // Request episode-level granularity for TV series
    if (includeEpisodes) {
      params.series_granularity = 'episode';
    }

    return this.makeRequest<StreamingAvailability>(`/shows/${id}`, params);
  }

  /**
   * Get shows that are leaving streaming services soon
   */
  async getLeavingSoon(
    country: string = 'us',
    service?: string,
    limit: number = 50
  ): Promise<StreamingAvailability[]> {
    const params: Record<string, string> = {
      country,
      output_language: 'en',
    };

    if (service) {
      params.service = service;
    }

    if (limit) {
      params.limit = limit.toString();
    }

    const result = await this.makeRequest<{ shows: StreamingAvailability[] }>(
      '/changes/leaving',
      params
    );

    return result.shows;
  }

  /**
   * Get shows that are newly available on streaming services
   */
  async getNewlyAdded(
    country: string = 'us',
    service?: string,
    limit: number = 50
  ): Promise<StreamingAvailability[]> {
    const params: Record<string, string> = {
      country,
      output_language: 'en',
    };

    if (service) {
      params.service = service;
    }

    if (limit) {
      params.limit = limit.toString();
    }

    const result = await this.makeRequest<{ shows: StreamingAvailability[] }>(
      '/changes/added',
      params
    );

    return result.shows;
  }

  /**
   * Get available streaming services for a country
   */
  async getServices(country: string = 'us'): Promise<StreamingService[]> {
    const result = await this.makeRequest<StreamingService[]>('/services', {
      country,
    });

    return result;
  }

  /**
   * Helper method to check if content is available on specific service
   */
  isAvailableOnService(
    availability: StreamingAvailability,
    serviceId: string,
    country: string = 'us'
  ): StreamingOption | null {
    const countryOptions = availability.streamingOptions[country] || [];
    return countryOptions.find((option) => option.service.id === serviceId) || null;
  }

  /**
   * Helper method to get expiration date for content on a service
   */
  getExpirationDate(
    availability: StreamingAvailability,
    serviceId: string,
    country: string = 'us'
  ): Date | null {
    const option = this.isAvailableOnService(availability, serviceId, country);
    return option?.expiresOn ? new Date(option.expiresOn * 1000) : null;
  }

  /**
   * Helper method to check if content is leaving soon (within days)
   */
  isLeavingSoon(
    availability: StreamingAvailability,
    serviceId: string,
    days: number = 30,
    country: string = 'us'
  ): boolean {
    const expirationDate = this.getExpirationDate(availability, serviceId, country);
    if (!expirationDate) return false;

    const daysUntilExpiration = (expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysUntilExpiration <= days && daysUntilExpiration > 0;
  }

  /**
   * Get episodes for a TV series with full metadata
   */
  async getShowEpisodes(id: string, country: string = 'us'): Promise<Episode[]> {
    const show = await this.getShow(id, country, true);

    // Return episodes if available directly on the show
    if (show.episodes?.length) {
      return show.episodes;
    }

    // Otherwise extract from seasons
    if (show.seasons?.length) {
      return show.seasons.flatMap((season) => season.episodes || []);
    }

    return [];
  }

  /**
   * Convert API episode data to internal EpisodeMetadata format
   */
  convertToEpisodeMetadata(episodes: Episode[]): import('../types.js').EpisodeMetadata[] {
    return episodes
      .filter((ep) => ep.air_date) // Only include episodes with air dates
      .map((episode) => ({
        id: episode.id,
        seasonNumber: episode.season_number,
        episodeNumber: episode.episode_number,
        airDate: episode.air_date!,
        title: episode.title,
      }));
  }
}

export default StreamingAvailabilityClient;
