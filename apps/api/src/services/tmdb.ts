/**
 * TMDB Integration Service
 * 
 * Service layer that wraps TMDB API functionality and provides
 * enhanced integration for watchlist items.
 */

import { TMDBClient, TMDBError } from '@tally/core';
import type { ReleasePattern, TMDBWatchProvider } from '@tally/types';
import { config } from '../config/index.js';

export interface TMDBEnhancedWatchlistItem {
  tmdbShowId?: number;
  detectedReleasePattern?: ReleasePattern;
  watchProviders?: TMDBWatchProvider[];
}

export class TMDBService {
  private client?: TMDBClient;

  constructor() {
    if (!config.tmdbDevMode && config.tmdbApiKey !== 'tmdb-dev-key-placeholder') {
      this.client = new TMDBClient(config.tmdbApiKey);
    }
  }

  /**
   * Check if TMDB integration is available
   */
  get isAvailable(): boolean {
    return !!this.client;
  }

  /**
   * Enhance a watchlist item with TMDB data
   */
  async enhanceWatchlistItem(
    title: string,
    country: string = 'US'
  ): Promise<TMDBEnhancedWatchlistItem | null> {
    if (!this.client) {
      console.log('TMDB service not available (dev mode or missing API key)');
      return null;
    }

    try {
      console.log(`Enhancing watchlist item with TMDB data: "${title}"`);
      
      // Search for the show and detect release pattern
      const patternResult = await this.client.detectReleasePatternFromTitle(title);
      
      if (!patternResult) {
        console.log(`No TMDB match found for: "${title}"`);
        return null;
      }

      const enhancement: TMDBEnhancedWatchlistItem = {};
      
      if (patternResult.tmdbId) {
        enhancement.tmdbShowId = patternResult.tmdbId;
      }
      enhancement.detectedReleasePattern = patternResult.pattern;

      // Get watch providers if we have a TMDB ID
      if (patternResult.tmdbId) {
        try {
          const providers = await this.client.getWatchProvidersForCountry(
            patternResult.tmdbId,
            country
          );
          enhancement.watchProviders = providers;
        } catch (providerError) {
          console.warn(`Failed to get watch providers for "${title}":`, providerError);
          // Don't fail the whole enhancement for missing providers
        }
      }

      console.log(`Enhanced "${title}" with TMDB data:`, {
        tmdbId: enhancement.tmdbShowId,
        pattern: enhancement.detectedReleasePattern,
        providers: enhancement.watchProviders?.length || 0,
      });

      return enhancement;
    } catch (error) {
      if (error instanceof TMDBError) {
        console.warn(`TMDB API error for "${title}":`, error.message);
      } else {
        console.warn(`Unexpected error enhancing "${title}" with TMDB:`, error);
      }
      return null;
    }
  }

  /**
   * Get release pattern for a specific show title
   */
  async getShowReleasePattern(title: string): Promise<{
    pattern: ReleasePattern;
    tmdbId?: number;
  } | null> {
    if (!this.client) {
      return null;
    }

    try {
      return await this.client.detectReleasePatternFromTitle(title);
    } catch (error) {
      console.warn(`Failed to get release pattern for "${title}":`, error);
      return null;
    }
  }

  /**
   * Get watch providers for a show by TMDB ID
   */
  async getWatchProviders(
    tmdbId: number, 
    country: string = 'US'
  ): Promise<TMDBWatchProvider[]> {
    if (!this.client) {
      return [];
    }

    try {
      return await this.client.getWatchProvidersForCountry(tmdbId, country);
    } catch (error) {
      console.warn(`Failed to get watch providers for TMDB ID ${tmdbId}:`, error);
      return [];
    }
  }

  /**
   * Batch enhance multiple watchlist items
   */
  async enhanceWatchlistItems(
    titles: string[],
    country: string = 'US'
  ): Promise<Map<string, TMDBEnhancedWatchlistItem>> {
    const results = new Map<string, TMDBEnhancedWatchlistItem>();

    if (!this.client || titles.length === 0) {
      return results;
    }

    console.log(`Batch enhancing ${titles.length} items with TMDB data`);

    // Process items with delay to respect rate limits
    for (const title of titles) {
      try {
        const enhancement = await this.enhanceWatchlistItem(title, country);
        if (enhancement) {
          results.set(title, enhancement);
        }
        
        // Small delay between requests to respect TMDB rate limits
        await new Promise(resolve => setTimeout(resolve, 250));
      } catch (error) {
        console.warn(`Failed to enhance "${title}":`, error);
        continue;
      }
    }

    console.log(`Successfully enhanced ${results.size}/${titles.length} items`);
    return results;
  }
}

// Export singleton instance
export const tmdbService = new TMDBService();