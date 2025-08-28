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
    expiresOn?: number;
    availableSince?: number;
    link: string;
}
export interface Episode {
    id: string;
    title: string;
    seasonNumber: number;
    episodeNumber: number;
    airDate: string; // ISO date string
}

/**
 * Helper types for release pattern detection
 */
export interface EpisodeMetadata {
    id: string;
    seasonNumber: number;
    episodeNumber: number;
    airDate: string;
    title: string;
}

export type ReleasePattern = 'weekly' | 'binge' | 'unknown';

export interface ReleasePatternAnalysis {
    pattern: ReleasePattern;
    confidence: number;
    episodeInterval?: number;
    seasonStart?: string;
    seasonEnd?: string;
    totalEpisodes?: number;
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
    episodes?: EpisodeMetadata[];
}
export interface SearchResult {
    shows: StreamingAvailability[];
    hasMore: boolean;
    nextCursor?: string;
}
export declare class StreamingAvailabilityError extends Error {
    statusCode?: number | undefined;
    rateLimitReset?: number | undefined;
    constructor(message: string, statusCode?: number | undefined, rateLimitReset?: number | undefined);
}
export declare class StreamingAvailabilityClient {
    private baseUrl;
    private apiKey;
    private rateLimitDelay;
    constructor(apiKey: string);
    private makeRequest;
    /**
     * Search for shows/movies by title
     */
    search(title: string, country?: string, showType?: 'movie' | 'series', limit?: number): Promise<SearchResult>;
    /**
     * Get detailed information about a specific show/movie by ID
     */
    getShow(id: string, country?: string): Promise<StreamingAvailability>;
    /**
     * Get shows that are leaving streaming services soon
     */
    getLeavingSoon(country?: string, service?: string, limit?: number): Promise<StreamingAvailability[]>;
    /**
     * Get shows that are newly available on streaming services
     */
    getNewlyAdded(country?: string, service?: string, limit?: number): Promise<StreamingAvailability[]>;
    /**
     * Get available streaming services for a country
     */
    getServices(country?: string): Promise<StreamingService[]>;
    /**
     * Get episodes for a TV series
     */
    getShowEpisodes(id: string, country?: string): Promise<Episode[]>;
    /**
     * Helper method to check if content is available on specific service
     */
    isAvailableOnService(availability: StreamingAvailability, serviceId: string, country?: string): StreamingOption | null;
    /**
     * Helper method to get expiration date for content on a service
     */
    getExpirationDate(availability: StreamingAvailability, serviceId: string, country?: string): Date | null;
    /**
     * Helper method to check if content is leaving soon (within days)
     */
    isLeavingSoon(availability: StreamingAvailability, serviceId: string, days?: number, country?: string): boolean;
}
export default StreamingAvailabilityClient;
//# sourceMappingURL=streaming-availability.d.ts.map