/**
 * TMDB Integration Service
 *
 * Service layer that wraps TMDB API functionality and provides
 * enhanced integration for watchlist items.
 */

import { TMDBClient, TMDBError } from '@tally/core';
import type { ReleasePattern } from '@tally/types';
import { config } from '../config/index.js';
import { providerNormalizer, type ProviderVariant } from './provider-normalizer.js';

// Local fallback type to avoid dependency on build artifacts from @tally/types
// Matches TMDBWatchProviderSchema shape
interface TMDBWatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priority: number;
}

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
   * Get basic show details + providers without episode analysis
   */
  async getBasicShow(showId: number, country: string = 'US'): Promise<any | null> {
    if (!this.client) return null;
    try {
      const languageMap: Record<string, string> = {
        US: 'en-US',
        GB: 'en-GB',
        AU: 'en-AU',
        CA: 'en-CA',
      };
      const language = languageMap[(country || 'US').toUpperCase()] || 'en-US';
      const showDetails = await this.client.getTVShow(showId, language);
      if (!showDetails) return null;
      let providers: any[] = [];
      try {
        providers = await this.getWatchProviders(showId, country);
      } catch {
        providers = [];
      }
      return {
        showDetails: {
          id: showId,
          title: showDetails.name,
          overview: showDetails.overview,
          status: showDetails.status,
          firstAirDate: showDetails.first_air_date,
          lastAirDate: showDetails.last_air_date,
          poster: showDetails.poster_path
            ? `https://image.tmdb.org/t/p/w500${showDetails.poster_path}`
            : undefined,
        },
        pattern: 'unknown',
        confidence: 0.5,
        episodeCount: 0,
        seasonInfo: (showDetails.seasons || [])
          .filter((s: any) => s.season_number >= 1)
          .map((s: any) => ({
            seasonNumber: s.season_number,
            episodeCount: s.episode_count,
            airDate: s.air_date,
          })),
        reasoning: 'Basic show info (no episodes available)',
        diagnostics: {
          intervals: [],
          avgInterval: 0,
          stdDev: 0,
          reasoning: 'No diagnostics',
          episodeDetails: [],
        },
        watchProviders: this.normalizeWatchProviders(providers),
        analyzedSeason: (showDetails.seasons || []).filter((s: any) => s.season_number >= 1).pop()
          ?.season_number,
        country,
      };
    } catch (e) {
      return null;
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
      // Ensure detectedReleasePattern is a structured object (not a plain string)
      enhancement.detectedReleasePattern =
        typeof (patternResult as any).pattern === 'string'
          ? { pattern: (patternResult as any).pattern, confidence: 0.5 }
          : (patternResult as any).pattern;

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
    } catch (error: any) {
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
      const result = await this.client.detectReleasePatternFromTitle(title);
      if (!result) return null;

      const pattern: ReleasePattern =
        typeof (result as any).pattern === 'string'
          ? { pattern: (result as any).pattern, confidence: 0.5 }
          : (result as any).pattern;

      return { pattern, tmdbId: (result as any).tmdbId };
    } catch (error) {
      console.warn(`Failed to get release pattern for "${title}":`, error);
      return null;
    }
  }

  /**
   * Get watch providers for a show by TMDB ID
   */
  async getWatchProviders(tmdbId: number, country: string = 'US'): Promise<TMDBWatchProvider[]> {
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
        await new Promise((resolve) => setTimeout(resolve, 250));
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
      const languageMap: Record<string, string> = {
        US: 'en-US',
        GB: 'en-GB',
        AU: 'en-AU',
        CA: 'en-CA',
      };
      const language = languageMap[(country || 'US').toUpperCase()] || 'en-US';
      const searchResults = await this.client.searchTV(query, 1, language);

      // Convert to our format for web interface
      return searchResults.results.map((show: any) => ({
        id: show.id,
        title: show.name,
        year: show.first_air_date ? new Date(show.first_air_date).getFullYear() : undefined,
        poster: show.poster_path ? `https://image.tmdb.org/t/p/w500${show.poster_path}` : undefined,
        overview: show.overview || '',
        firstAirDate: show.first_air_date,
        popularity: show.popularity,
      }));
    } catch (error) {
      console.error('Error searching TV shows:', error);
      return [];
    }
  }

  /**
   * Comprehensive show analysis for web interface
   */
  async analyzeShow(
    showId: number,
    country: string = 'US',
    seasonNumber?: number
  ): Promise<any | null> {
    if (!this.client) {
      return null;
    }

    try {
      // Get show details (use language mapped from country)
      const languageMap: Record<string, string> = {
        US: 'en-US',
        GB: 'en-GB',
        AU: 'en-AU',
        CA: 'en-CA',
      };
      const language = languageMap[(country || 'US').toUpperCase()] || 'en-US';
      const showDetails = await this.client.getTVShow(showId, language);
      if (!showDetails) return null;

      // Determine which season to analyze
      const realSeasons = showDetails.seasons?.filter((s: any) => s.season_number >= 1) || [];
      // Ensure seasons are sorted by season_number ascending
      realSeasons.sort((a: any, b: any) => a.season_number - b.season_number);
      if (realSeasons.length === 0) return null;

      let targetSeason = seasonNumber || realSeasons[realSeasons.length - 1]?.season_number;

      // Get season episodes (robust: search backwards to find a season with dated episodes)
      let episodes: any[] = [];
      const fetchSeasonEpisodes = async (sNum: number) => {
        const seasonData = await this.client!.getSeason(showId, sNum, language);
        return (seasonData.episodes || [])
          .filter((ep: any) => !!ep.air_date)
          .map((ep: any) => ({
            id: `${showId}_s${sNum}_e${ep.episode_number}`,
            seasonNumber: sNum,
            episodeNumber: ep.episode_number,
            airDate: new Date(ep.air_date).toISOString(),
            title: ep.name || `Episode ${ep.episode_number}`,
          }));
      };
      try {
        if (seasonNumber) {
          episodes = await fetchSeasonEpisodes(seasonNumber);
        } else {
          // Try latest season, then walk back until we find dated episodes
          for (let i = realSeasons.length - 1; i >= 0; i--) {
            const seasonEntry = realSeasons[i];
            if (!seasonEntry) continue;
            const sNum = seasonEntry.season_number;
            const eps = await fetchSeasonEpisodes(sNum);
            if (eps.length > 0) {
              episodes = eps;
              targetSeason = sNum;
              break;
            }
          }
        }
      } catch (e) {
        console.error(
          `[analyzeShow] getSeason failed for id=${showId} season=${seasonNumber ?? 'auto'}:`,
          e
        );
        episodes = [];
      }

      // Dev diagnostics
      if (process.env.NODE_ENV !== 'production') {
        const first = episodes[0];
        console.log(
          `[analyzeShow] id=${showId} country=${country} lang=${language} seasonParam=${seasonNumber ?? 'auto'} analyzedSeason=${targetSeason} eps=${episodes.length}` +
            (first ? ` first=S${first.seasonNumber}E${first.episodeNumber}@${first.airDate}` : '')
        );
      }
      if (!episodes.length) {
        // Graceful fallback: return show details without episodes so UI still has posters/overview.
        const providers = await this.getWatchProviders(showId, country);
        const seasonInfo = realSeasons.map((season: any) => ({
          seasonNumber: season.season_number,
          episodeCount: season.episode_count,
          airDate: season.air_date,
        }));
        return {
          showDetails: {
            id: showId,
            title: showDetails.name,
            overview: showDetails.overview,
            status: showDetails.status,
            firstAirDate: showDetails.first_air_date,
            lastAirDate: showDetails.last_air_date,
            poster: showDetails.poster_path
              ? `https://image.tmdb.org/t/p/w500${showDetails.poster_path}`
              : undefined,
          },
          pattern: 'unknown',
          confidence: 0.5,
          episodeCount: 0,
          seasonInfo,
          reasoning: 'No episode schedule available for analysis',
          diagnostics: {
            intervals: [],
            avgInterval: 0,
            stdDev: 0,
            reasoning: 'No diagnostics',
            episodeDetails: [],
          },
          watchProviders: this.normalizeWatchProviders(providers),
          analyzedSeason: targetSeason,
          country,
        };
      }

      // Analyze pattern when we have dated episodes
      const { releasePatternService } = await import('@tally/core');
      const patternAnalysis = episodes.length
        ? releasePatternService.analyzeEpisodes(episodes)
        : ({ pattern: 'unknown', confidence: 0.5 } as any);

      const finalPattern = patternAnalysis.pattern;
      const finalConfidence = patternAnalysis.confidence;

      // Build diagnostics (intervals, stats) for UI timeline
      const sortedEpisodes = [...episodes].sort(
        (a, b) => new Date(a.airDate).getTime() - new Date(b.airDate).getTime()
      );
      const intervals: number[] = [];
      for (let i = 1; i < sortedEpisodes.length; i++) {
        const prev = new Date(sortedEpisodes[i - 1].airDate);
        const curr = new Date(sortedEpisodes[i].airDate);
        const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
        intervals.push(diffDays);
      }
      const avgInterval = intervals.length
        ? intervals.reduce((s, d) => s + d, 0) / intervals.length
        : 0;
      const stdDev = intervals.length
        ? Math.sqrt(
            intervals.reduce((s, d) => s + Math.pow(d - avgInterval, 2), 0) / intervals.length
          )
        : 0;
      const reasoning =
        finalPattern === 'weekly'
          ? `Detected weekly cadence (~${Math.round(avgInterval)} days)`
          : finalPattern === 'premiere_weekly'
            ? `Detected premiere-weekly pattern: multiple episodes premiered, then weekly releases`
            : finalPattern === 'binge'
              ? 'Episodes released together or within 1 day'
              : 'Insufficient signal for a clear pattern';

      // Get watch providers
      let providers: any[] = [];
      try {
        providers = await this.getWatchProviders(showId, country);
      } catch {
        providers = [];
      }

      // Build season info
      const latestSeasonNumber = realSeasons[realSeasons.length - 1]?.season_number;
      const seasonInfo = realSeasons.map((season: any) => {
        const isLatestSeason = season.season_number === latestSeasonNumber;
        const isAnalyzedSeason = season.season_number === targetSeason;

        // For older seasons (not the latest), mark as 'binge' since they're fully released
        let seasonPattern = 'unknown';
        let seasonConfidence = 0.5;

        if (isAnalyzedSeason) {
          seasonPattern = finalPattern;
          seasonConfidence = finalConfidence;
        } else if (!isLatestSeason && season.air_date) {
          // Older seasons are considered 'binge' since the entire season is already out
          const seasonDate = new Date(season.air_date);
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

          if (seasonDate < oneYearAgo) {
            seasonPattern = 'binge';
            seasonConfidence = 0.9;
          }
        }

        return {
          seasonNumber: season.season_number,
          episodeCount: season.episode_count,
          airDate: season.air_date,
          ...(seasonPattern !== 'unknown' && {
            pattern: seasonPattern,
            confidence: seasonConfidence,
          }),
        };
      });

      return {
        showDetails: {
          id: showId,
          title: showDetails.name,
          overview: showDetails.overview,
          status: showDetails.status,
          firstAirDate: showDetails.first_air_date,
          lastAirDate: showDetails.last_air_date,
          poster: showDetails.poster_path
            ? `https://image.tmdb.org/t/p/w500${showDetails.poster_path}`
            : undefined,
        },
        pattern: finalPattern,
        confidence: finalConfidence,
        episodeCount: episodes.length,
        seasonInfo,
        reasoning: reasoning,
        diagnostics: {
          intervals,
          avgInterval,
          stdDev,
          reasoning,
          episodeDetails: sortedEpisodes.map((ep) => ({
            number: ep.episodeNumber,
            airDate: ep.airDate,
            title: ep.title,
          })),
        },
        watchProviders: this.normalizeWatchProviders(providers),
        analyzedSeason: targetSeason,
        country,
      };
    } catch (error) {
      console.error(`Error analyzing show ${showId}:`, error);
      return null;
    }
  }

  /**
   * Debug helper: return raw TMDB season payload and quick counts
   */
  async getSeasonRaw(showId: number, seasonNumber: number, country: string = 'US') {
    if (!this.client) return { error: 'TMDB client unavailable' } as any;
    const languageMap: Record<string, string> = {
      US: 'en-US',
      GB: 'en-GB',
      AU: 'en-AU',
      CA: 'en-CA',
    };
    const language = languageMap[(country || 'US').toUpperCase()] || 'en-US';
    const season = await this.client.getSeason(showId, seasonNumber, language);
    const episodes = season.episodes || [];
    const dated = episodes.filter((ep: any) => !!ep.air_date);
    return {
      language,
      seasonNumber,
      episodeCount: episodes.length,
      datedCount: dated.length,
      sample: dated
        .slice(0, 2)
        .map((ep: any) => ({ n: ep.episode_number, date: ep.air_date, title: ep.name })),
      season,
    };
  }

  /**
   * Normalize watch providers by consolidating variants
   */
  private normalizeWatchProviders(providers: TMDBWatchProvider[]): any[] {
    // Convert TMDB providers to our format
    const providerVariants: ProviderVariant[] = providers.map((provider) => ({
      id: provider.provider_id,
      name: provider.provider_name,
      logo: provider.logo_path ? `https://image.tmdb.org/t/p/w92${provider.logo_path}` : '',
      type: 'subscription', // Simplified for now, could be enhanced based on TMDB data
    }));

    // Normalize using the provider normalizer
    const normalizedProviders = providerNormalizer.normalizeProviders(providerVariants);

    // Convert to simplified API format - just the consolidated providers
    return normalizedProviders.map((normalized) => ({
      providerId: normalized.parentId,
      name: normalized.parentName,
      logo: normalized.logo,
      type: normalized.type,
      deepLink: undefined, // TMDB doesn't provide deep links directly
    }));
  }

  /**
   * Get comprehensive provider data for multiple regions
   */
  async getAllProviders(regions: string[] = ['US']): Promise<{
    providers: any[];
    regions: string[];
    total: number;
  }> {
    if (!this.client) {
      return { providers: [], regions, total: 0 };
    }

    return await this.client.getAllProviders(regions);
  }

  /**
   * Get list of available streaming providers for TV shows in a specific region
   */
  async getWatchProvidersList(region: string = 'US'): Promise<any[]> {
    if (!this.client) {
      return [];
    }

    return await this.client.getWatchProvidersList(region);
  }

  /**
   * Get list of available regions for watch providers
   */
  async getWatchProviderRegions(): Promise<any[]> {
    if (!this.client) {
      return [];
    }

    return await this.client.getWatchProviderRegions();
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
          await new Promise((resolve) => setTimeout(resolve, 250));
        }

        console.log(`[${index + 1}/${showIds.length}] Analyzing show ${showId}...`);

        const analysis = await this.analyzeShow(showId, country);

        results.push({
          showId,
          success: !!analysis,
          analysis,
        });
      } catch (error) {
        console.error(`Error in batch analysis for show ${showId}:`, error);
        results.push({
          showId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }
}

// Export singleton instance
export const tmdbService = new TMDBService();
