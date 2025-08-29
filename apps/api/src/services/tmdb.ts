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
    if (!config.tmdbDevMode && config.tmdbApiReadToken !== 'tmdb-dev-key-placeholder') {
      this.client = new TMDBClient(config.tmdbApiReadToken);
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

  /**
   * Search TV shows for web interface
   */
  async searchTVShows(query: string, country: string = 'US'): Promise<any[]> {
    if (!this.client) {
      return [];
    }

    try {
      const searchResults = await this.client.searchTV(query);
      
      // Convert to our format for web interface
      return searchResults.results.map((show: any) => ({
        id: show.id,
        title: show.name,
        year: show.first_air_date ? new Date(show.first_air_date).getFullYear() : undefined,
        poster: show.poster_path ? `https://image.tmdb.org/t/p/w500${show.poster_path}` : undefined,
        overview: show.overview || '',
        firstAirDate: show.first_air_date,
        popularity: show.popularity
      }));
    } catch (error) {
      console.error('Error searching TV shows:', error);
      return [];
    }
  }

  /**
   * Comprehensive show analysis for web interface
   */
  async analyzeShow(showId: number, country: string = 'US', seasonNumber?: number): Promise<any | null> {
    if (!this.client) {
      return null;
    }

    try {
      // Get show details
      const showDetails = await this.client.getTVShow(showId);
      if (!showDetails) return null;

      // Determine which season to analyze
      const realSeasons = showDetails.seasons?.filter((s: any) => s.season_number >= 1) || [];
      if (realSeasons.length === 0) return null;

      const targetSeason = seasonNumber || realSeasons[realSeasons.length - 1]?.season_number;
      
      // Get season episodes (use existing method that gets latest season, but we'll need to modify it)
      let episodes;
      if (seasonNumber) {
        // For specific season, we need to get season data directly
        const seasonData = await this.client.getSeason(showId, seasonNumber);
        episodes = seasonData.episodes?.filter((ep: any) => ep.air_date)?.map((ep: any) => ({
          id: `${showId}_s${seasonNumber}_e${ep.episode_number}`,
          seasonNumber: seasonNumber,
          episodeNumber: ep.episode_number,
          airDate: new Date(ep.air_date).toISOString(),
          title: ep.name || `Episode ${ep.episode_number}`
        })) || [];
      } else {
        // Use existing method for latest season
        episodes = await this.client.getLatestSeasonEpisodes(showId);
      }
      if (!episodes.length) return null;

      // Analyze pattern
      const { releasePatternService } = await import('@tally/core');
      const patternAnalysis = releasePatternService.analyzeReleasePattern(episodes);

      // Get watch providers
      const providers = await this.getWatchProviders(showId, country);

      // Build season info
      const seasonInfo = realSeasons.map((season: any) => ({
        seasonNumber: season.season_number,
        episodeCount: season.episode_count,
        airDate: season.air_date,
        ...(season.season_number === targetSeason && {
          pattern: patternAnalysis.pattern,
          confidence: patternAnalysis.confidence
        })
      }));

      return {
        showDetails: {
          id: showId,
          title: showDetails.name,
          overview: showDetails.overview,
          status: showDetails.status,
          firstAirDate: showDetails.first_air_date,
          lastAirDate: showDetails.last_air_date,
          poster: showDetails.poster_path ? `https://image.tmdb.org/t/p/w500${showDetails.poster_path}` : undefined
        },
        pattern: patternAnalysis.pattern,
        confidence: patternAnalysis.confidence,
        episodeCount: episodes.length,
        seasonInfo,
        reasoning: patternAnalysis.diagnostics?.reasoning || 'No reasoning available',
        diagnostics: {
          intervals: patternAnalysis.diagnostics?.intervals || [],
          avgInterval: patternAnalysis.diagnostics?.avgInterval || 0,
          stdDev: patternAnalysis.diagnostics?.stdDev || 0,
          reasoning: patternAnalysis.diagnostics?.reasoning || 'No diagnostics',
          episodeDetails: episodes.map(ep => ({
            number: ep.episodeNumber,
            airDate: ep.airDate,
            title: ep.title
          }))
        },
        watchProviders: providers.map(provider => ({
          providerId: provider.provider_id,
          name: provider.provider_name,
          logo: provider.logo_path ? `https://image.tmdb.org/t/p/w92${provider.logo_path}` : '',
          type: 'subscription' as const, // Simplified for now
          deepLink: undefined // TMDB doesn't provide deep links directly
        })),
        analyzedSeason: targetSeason,
        country
      };
    } catch (error) {
      console.error(`Error analyzing show ${showId}:`, error);
      return null;
    }
  }

  /**
   * Batch analyze multiple shows
   */
  async batchAnalyze(showIds: number[], country: string = 'US'): Promise<any[]> {
    const results = [];

    for (const [index, showId] of showIds.entries()) {
      try {
        // Rate limiting - wait between requests
        if (index > 0) {
          await new Promise(resolve => setTimeout(resolve, 250));
        }

        console.log(`[${index + 1}/${showIds.length}] Analyzing show ${showId}...`);
        
        const analysis = await this.analyzeShow(showId, country);
        
        results.push({
          showId,
          success: !!analysis,
          analysis
        });
      } catch (error) {
        console.error(`Error in batch analysis for show ${showId}:`, error);
        results.push({
          showId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }
}

// Export singleton instance
export const tmdbService = new TMDBService();