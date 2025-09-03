import type { ServiceWindow, SavingsEstimate } from '@tally/types';

// Re-export streaming availability client and types
export { 
  StreamingAvailabilityClient, 
  StreamingAvailabilityError,
  type StreamingAvailability,
  type StreamingService as StreamingAPIService,
  type StreamingOption as StreamingAPIOption,
  type SearchResult,
  type Episode
} from './external/streaming-availability.js';

// Re-export TMDB client and types
export {
  TMDBClient,
  TMDBError,
  type TMDBTVShow,
  type TMDBSeason,
  type TMDBEpisode,
  type TMDBSearchResult,
  type TMDBWatchProvider,
  type TMDBWatchProviderData
} from './external/tmdb.js';

// Export types for release pattern detection
export type { 
  EpisodeMetadata,
  ReleasePattern,
  ReleasePatternAnalysis 
} from './types';

// Export release pattern service
export { releasePatternService } from './services/release-pattern';

// Mock streaming services data
export const STREAMING_SERVICES = {
  netflix: { id: 'netflix', name: 'Netflix', monthlyPrice: 15.49 },
  hulu: { id: 'hulu', name: 'Hulu', monthlyPrice: 17.99 },
  disney: { id: 'disney', name: 'Disney+', monthlyPrice: 13.99 },
  hbo: { id: 'hbo', name: 'HBO Max', monthlyPrice: 15.99 },
  apple: { id: 'apple', name: 'Apple TV+', monthlyPrice: 6.99 },
  amazon: { id: 'amazon', name: 'Prime Video', monthlyPrice: 8.99 },
} as const;

// Mock content data
export const MOCK_TITLES = [
  { id: '1', title: 'Stranger Things', serviceId: 'netflix' },
  { id: '2', title: 'The Mandalorian', serviceId: 'disney' },
  { id: '3', title: 'The Last of Us', serviceId: 'hbo' },
  { id: '4', title: 'Ted Lasso', serviceId: 'apple' },
  { id: '5', title: 'The Handmaid\'s Tale', serviceId: 'hulu' },
] as const;

/**
 * Generates mock activation windows for streaming services.
 * In a real implementation, this would analyze user's watchlist and show release dates,
 * seasonal patterns, etc. to determine optimal subscription windows.
 */
export function generateActivationWindows(): ServiceWindow[] {
  const now = new Date();
  const windows: ServiceWindow[] = [];

  // Netflix: Stranger Things season coming in 3 months
  windows.push({
    serviceId: 'netflix',
    serviceName: 'Netflix',
    start: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    end: new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000).toISOString(),
    reason: 'Stranger Things Season 5 releases',
  });

  // Disney+: Marvel content in 6 months
  windows.push({
    serviceId: 'disney',
    serviceName: 'Disney+',
    start: new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString(),
    end: new Date(now.getTime() + 210 * 24 * 60 * 60 * 1000).toISOString(),
    reason: 'The Mandalorian Season 4 releases',
  });

  return windows;
}

/**
 * Calculates estimated savings based on planned service usage.
 * In a real implementation, this would factor in:
 * - Current subscriptions vs planned usage
 * - Historical usage patterns
 * - Service pricing changes
 * - Bundle optimizations
 */
export function calculateSavingsEstimate(): SavingsEstimate {
  // Mock calculation: assume user currently pays for all services year-round
  // but with smart planning only needs 6 months of subscriptions
  const allServicesMonthly = Object.values(STREAMING_SERVICES)
    .reduce((sum, service) => sum + service.monthlyPrice, 0);
  
  const optimizedMonthly = allServicesMonthly * 0.5; // 50% of the year subscribed
  const monthlySavings = allServicesMonthly - optimizedMonthly;
  
  return {
    monthly: Math.round(monthlySavings * 100) / 100,
    yearToDate: Math.round(monthlySavings * 12 * 100) / 100,
  };
}

/**
 * Validates if a streaming service exists in our mock data
 */
export function isValidStreamingService(serviceId: string): boolean {
  return serviceId in STREAMING_SERVICES;
}

/**
 * Gets streaming service info by ID
 */
export function getStreamingService(serviceId: string) {
  return STREAMING_SERVICES[serviceId as keyof typeof STREAMING_SERVICES];
}

/**
 * Detect release pattern for a TV show using TMDB API
 */
export async function detectReleasePatternFromTMDB(
  showTitle: string, 
  tmdbApiKey: string
): Promise<{ pattern: 'weekly' | 'binge' | 'unknown' | 'premiere_weekly'; tmdbId?: number } | null> {
  const { TMDBClient } = await import('./external/tmdb.js');
  const tmdbClient = new TMDBClient(tmdbApiKey);
  return tmdbClient.detectReleasePatternFromTitle(showTitle);
}

/**
 * Get watch providers for a TV show using TMDB API
 */
export async function getWatchProvidersFromTMDB(
  showId: number,
  tmdbApiKey: string,
  country: string = 'US'
): Promise<import('./external/tmdb.js').TMDBWatchProvider[]> {
  const { TMDBClient } = await import('./external/tmdb.js');
  const tmdbClient = new TMDBClient(tmdbApiKey);
  return tmdbClient.getWatchProvidersForCountry(showId, country);
}