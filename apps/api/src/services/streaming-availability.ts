/**
 * Streaming Availability Service
 *
 * Service layer wrapper around the Streaming Availability API client
 * with caching, rate limiting, and error handling specific to our API.
 */

import {
  StreamingAvailabilityClient,
  StreamingAvailabilityError,
  type StreamingAvailability,
} from '@tally/core';
import { config } from '../config/index.js';
import { quotaTracker } from './quota-tracker.js';

interface CacheEntry {
  data: any;
  expiresAt: number;
}

class StreamingAvailabilityService {
  private client: StreamingAvailabilityClient | null = null;
  private cache = new Map<string, CacheEntry>();
  private lastRequestTime = 0;
  private rateLimitDelay = 1000; // 1 second between requests

  constructor() {
    // Only initialize client if we have an API key and not in dev mode
    if (
      config.streamingAvailabilityApiKey &&
      config.streamingAvailabilityApiKey !== 'dev-key-placeholder' &&
      !config.streamingApiDevMode
    ) {
      this.client = new StreamingAvailabilityClient(config.streamingAvailabilityApiKey);
    }
  }

  private isEnabled(): boolean {
    return this.client !== null;
  }

  private getCacheKey(method: string, params: Record<string, any>): string {
    return `${method}:${JSON.stringify(params)}`;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  private setCache<T>(key: string, data: T, ttlMinutes: number = 1440): void {
    // Default 24 hours
    const expiresAt = Date.now() + ttlMinutes * 60 * 1000;
    this.cache.set(key, { data, expiresAt });
  }

  private async withRateLimit<T>(operation: () => Promise<T>, endpoint: string): Promise<T> {
    if (!this.isEnabled()) {
      throw new Error(
        'Streaming Availability service is not configured. Please set STREAMING_AVAILABILITY_API_KEY environment variable.'
      );
    }

    // Check quota before making the call
    const canMakeCall = await quotaTracker.canMakeCall();
    if (!canMakeCall) {
      const stats = await quotaTracker.getUsageStats();
      throw new Error(
        `Monthly API quota exhausted. Used ${stats.callsUsed}/${stats.limit} calls this month.`
      );
    }

    // Check if quota is running low and warn
    const shouldWarn = await quotaTracker.shouldWarnLowQuota();
    if (shouldWarn && endpoint !== 'quota-check') {
      // Avoid infinite loops
      const stats = await quotaTracker.getUsageStats();
      console.warn(
        `⚠️  API quota running low: ${stats.callsRemaining}/${stats.limit} calls remaining. Consider enabling dev mode.`
      );
    }

    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.rateLimitDelay) {
      const delay = this.rateLimitDelay - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    try {
      const result = await operation();
      this.lastRequestTime = Date.now();

      return result;
    } catch (error: any) {
      this.lastRequestTime = Date.now();

      if (error instanceof StreamingAvailabilityError && error.statusCode === 429) {
        // If we hit rate limit, wait before the next request
        const resetDelay = error.rateLimitReset || this.rateLimitDelay * 2;
        this.rateLimitDelay = Math.min(resetDelay, 30000); // Max 30 seconds
      }

      throw error;
    }
  }

  /**
   * Search for shows/movies by title with caching
   */
  async searchShows(
    title: string,
    country: string = 'us',
    showType?: 'movie' | 'series'
  ): Promise<StreamingAvailability[]> {
    const cacheKey = this.getCacheKey('search', { title, country, showType });
    const cached = this.getFromCache<StreamingAvailability[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const result = await this.withRateLimit(
      () => this.client!.search(title, country, showType, 10),
      'search'
    );
    await quotaTracker.recordCall('search', true);

    console.log(`🔍 Search results for "${title}":`, JSON.stringify(result, null, 2));
    this.setCache(cacheKey, result.shows, 1440); // Cache for 24 hours
    return result.shows;
  }

  /**
   * Get detailed show information with caching
   */
  async getShowDetails(id: string, country: string = 'us'): Promise<StreamingAvailability | null> {
    const cacheKey = this.getCacheKey('getShow', { id, country });
    const cached = this.getFromCache<StreamingAvailability>(cacheKey);

    if (cached) {
      console.log(`♻️ Using cached details for ID "${id}"`);
      return cached;
    }

    try {
      const result = await this.withRateLimit(() => this.client!.getShow(id, country), 'getShow');

      // Only record successful API calls
      await quotaTracker.recordCall('getShow', true);

      console.log(`📺 Show details for ID "${id}":`, JSON.stringify(result, null, 2));
      this.setCache(cacheKey, result, 1440);
      return result;
    } catch (error: any) {
      console.log(
        `❌ Failed to get show details for ID "${id}":`,
        error instanceof StreamingAvailabilityError ? error.message : error
      );
      if (error instanceof StreamingAvailabilityError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get shows leaving streaming services soon
   */
  async getShowsLeavingSoon(
    country: string = 'us',
    service?: string
  ): Promise<StreamingAvailability[]> {
    const cacheKey = this.getCacheKey('leavingSoon', { country, service });
    const cached = this.getFromCache<StreamingAvailability[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const result = (await this.withRateLimit(
      () => this.client!.getLeavingSoon(country, service, 50),
      'getLeavingSoon'
    )) as StreamingAvailability[];

    this.setCache(cacheKey, result, 360); // Cache for 6 hours
    return result;
  }

  /**
   * Get newly added shows
   */
  async getNewlyAddedShows(
    country: string = 'us',
    service?: string
  ): Promise<StreamingAvailability[]> {
    const cacheKey = this.getCacheKey('newlyAdded', { country, service });
    const cached = this.getFromCache<StreamingAvailability[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const result = (await this.withRateLimit(
      () => this.client!.getNewlyAdded(country, service, 50),
      'getNewlyAdded'
    )) as StreamingAvailability[];

    this.setCache(cacheKey, result, 720); // Cache for 12 hours
    return result;
  }

  /**
   * Check if content is available and get expiration info
   */
  async getContentAvailability(
    showId: string,
    serviceId: string,
    country: string = 'us'
  ): Promise<{ available: boolean; expiresOn?: string; leavingSoon: boolean }> {
    const show = await this.getShowDetails(showId, country);

    if (!show) {
      return { available: false, leavingSoon: false };
    }

    const option = this.client!.isAvailableOnService(show, serviceId, country);

    if (!option) {
      return { available: false, leavingSoon: false };
    }

    const expiresOn = this.client!.getExpirationDate(show, serviceId, country);
    const leavingSoon = this.client!.isLeavingSoon(show, serviceId, 30, country);

    return {
      available: true,
      ...(expiresOn && { expiresOn: expiresOn.toISOString() }),
      leavingSoon,
    };
  }

  /**
   * Get quota status without making API calls
   */
  async getQuotaStatus(): Promise<{
    canMakeCall: boolean;
    isLowQuota: boolean;
    remaining: number;
    devMode: boolean;
  }> {
    const canMakeCall = await quotaTracker.canMakeCall();
    const isLowQuota = await quotaTracker.shouldWarnLowQuota();
    const remaining = await quotaTracker.getRemainingCalls();

    return {
      canMakeCall,
      isLowQuota,
      remaining,
      devMode: config.streamingApiDevMode,
    };
  }

  /**
   * Clear the cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instance
export const streamingAvailabilityService = new StreamingAvailabilityService();

export default streamingAvailabilityService;
