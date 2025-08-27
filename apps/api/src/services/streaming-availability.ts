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
  type SearchResult,
  releasePatternService
} from '@tally/core';
import type { ReleasePatternAnalysis } from '@tally/types';
import { config } from '../config/index.js';
import { quotaTracker } from './quota-tracker.js';

export class StreamingAvailabilityService {
  private client: StreamingAvailabilityClient;

  constructor() {
    this.client = new StreamingAvailabilityClient(config.streamingAvailabilityApiKey);
  }

  /**
   * Get show details with release pattern analysis
   */
  async getShowDetails(id: string, country = 'US'): Promise<StreamingAvailability & { releasePattern?: ReleasePatternAnalysis }> {
    try {
      // Record API call first
      quotaTracker.recordCall('getShow', true);

      // Get show details with episodes for series
      const show = await this.client.getShow(id, country, true);

      // For series, get episodes and analyze release pattern
      if (show.type === 'series') {
        try {
          // Get episode metadata and analyze pattern
          const episodes = await this.client.getShowEpisodes(id, country);
          if (episodes.length > 0) {
            const episodeMetadata = this.client.convertToEpisodeMetadata(episodes);
            const pattern = releasePatternService.analyzeReleasePattern(episodeMetadata);
            return { ...show, releasePattern: pattern };
          }
        } catch (episodeError) {
          console.error(`Failed to get episodes for show ${id}:`, episodeError);
          // Continue without release pattern data
        }
      }

      return show;
    } catch (error) {
      quotaTracker.recordCall('getShow', false);
      if (error instanceof StreamingAvailabilityError) {
        throw error;
      }
      throw new Error('Failed to fetch show details');
    }
  }

  /**
   * Search for shows with optional release pattern analysis
   */
  async search(title: string, country = 'US'): Promise<SearchResult & { shows: Array<StreamingAvailability & { releasePattern?: ReleasePatternAnalysis }> }> {
    try {
      quotaTracker.recordCall('search', true);
      const result = await this.client.search(title, country, 'series');

      // Get episodes and analyze patterns for all series
      const showsWithPatterns = await Promise.all(
        result.shows.map(async (show) => {
          if (show.type === 'series') {
            try {
              // Get episodes for this series
              const episodes = await this.client.getShowEpisodes(show.id, country);
              quotaTracker.recordCall('getShow', true);
              
              if (episodes.length > 0) {
                const episodeMetadata = this.client.convertToEpisodeMetadata(episodes);
                const pattern = releasePatternService.analyzeReleasePattern(episodeMetadata);
                return { ...show, releasePattern: pattern };
              }
            } catch (error) {
              console.error(`Failed to get episodes for ${show.id}:`, error);
              quotaTracker.recordCall('getShow', false);
            }
          }
          return show;
        })
      );

      return { ...result, shows: showsWithPatterns };
    } catch (error) {
      quotaTracker.recordCall('search', false);
      if (error instanceof StreamingAvailabilityError) {
        throw error;
      }
      throw new Error('Failed to search shows');
    }
  }

  /**
   * Alias for search method to match expected interface
   */
  async searchShows(
    title: string,
    country = 'US',
    type?: 'movie' | 'series'
  ): Promise<StreamingAvailability[]> {
    const result = await this.search(title, country);
    return result.shows.filter(show => !type || show.type === type);
  }

  /**
   * Get content availability for a specific service
   */
  async getContentAvailability(
    showId: string,
    serviceId: string,
    country = 'US'
  ): Promise<{ available: boolean; expiresOn?: string; leavingSoon: boolean; streamingOptions?: any[] }> {
    try {
      const show = await this.getShowDetails(showId, country);
      const countryOptions = show.streamingOptions[country.toLowerCase()] || [];
      const serviceOption = countryOptions.find(option => option.service.id === serviceId);

      if (serviceOption) {
        const result: { available: boolean; expiresOn?: string; leavingSoon: boolean; streamingOptions?: any[] } = {
          available: true,
          leavingSoon: serviceOption.expiresSoon,
          streamingOptions: [serviceOption],
        };
        
        if (serviceOption.expiresOn) {
          result.expiresOn = new Date(serviceOption.expiresOn * 1000).toISOString();
        }
        
        return result;
      }

      return {
        available: false,
        leavingSoon: false,
      };
    } catch (error) {
      console.error(`Failed to get availability for ${showId} on ${serviceId}:`, error);
      return {
        available: false,
        leavingSoon: false,
      };
    }
  }

  /**
   * Get quota status for API usage tracking
   */
  async getQuotaStatus() {
    const stats = await quotaTracker.getUsageStats();
    const canMakeCall = await quotaTracker.canMakeCall();
    const isLowQuota = await quotaTracker.shouldWarnLowQuota();
    
    return {
      ...stats,
      canMakeCall,
      isLowQuota,
      remaining: stats.callsRemaining,
    };
  }

  /**
   * Get cache statistics (placeholder for interface compatibility)
   */
  getCacheStats() {
    return {
      size: 0,
      hits: 0,
      misses: 0,
    };
  }

  /**
   * Clear cache (placeholder for interface compatibility)
   */
  clearCache() {
    // No-op for now
    return Promise.resolve();
  }
}

// Export singleton instance
export const streamingAvailabilityService = new StreamingAvailabilityService();

export default streamingAvailabilityService;
