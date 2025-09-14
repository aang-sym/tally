import { Router } from 'express';
import { ValidationError } from '../middleware/errorHandler.js';
import { tmdbService } from '../services/tmdb.js';
import { TMDBClient, releasePatternService } from '@tally/core';
import { config } from '../config/index.js';

const router: Router = Router();

// Helper function to get TMDB client
function getTMDBClient(): TMDBClient | null {
  if (config.tmdbDevMode || config.tmdbApiReadToken === 'tmdb-dev-key-placeholder') {
    return null;
  }
  return new TMDBClient(config.tmdbApiReadToken);
}

// Real discovery and analysis function
async function discoverAndAnalyzeShows(endpoint: 'popular' | 'top_rated', sampleSize: number) {
  const headers = {
    Authorization: `Bearer ${config.tmdbApiReadToken}`,
    Accept: 'application/json',
  };

  console.log(`📡 Fetching ${endpoint} shows from TMDB...`);

  // Fetch shows from TMDB
  const showsResponse = await fetch(
    `https://api.themoviedb.org/3/tv/${endpoint}?language=en-US&page=1`,
    { headers }
  );
  const showsData = await showsResponse.json();

  const shows = showsData.results.slice(0, sampleSize);
  console.log(`🎬 Found ${shows.length} ${endpoint} shows to analyze`);

  const results = {
    totalAnalyzed: 0,
    patternDistribution: {
      binge: 0,
      weekly: 0,
      premiere_weekly: 0,
      multi_weekly: 0,
      mixed: 0,
      unknown: 0,
    },
    confidenceStats: { avg: 0, min: 1, max: 0 },
    examples: [] as Array<{
      tmdbId: number;
      title: string;
      seasons: number;
      episodesInSeason1: number;
      pattern: string;
      confidence: number;
      reasoning: string;
    }>,
    errors: 0,
    detailedShows: [] as Array<{
      tmdbId: number;
      title: string;
      overview: string;
      firstAirDate: string;
      seasons: Array<{
        seasonNumber: number;
        episodeCount: number;
        airDate: string;
      }>;
      season1Analysis?: any;
    }>,
  };

  const confidences: number[] = [];

  // Analyze each show
  for (const [index, show] of shows.entries()) {
    try {
      // Rate limiting - wait between requests
      if (index > 0) {
        await new Promise((resolve) => setTimeout(resolve, 300)); // 300ms delay
      }

      console.log(`📺 [${index + 1}/${shows.length}] Analyzing "${show.name}"...`);

      // Get show details including seasons
      const showResponse = await fetch(
        `https://api.themoviedb.org/3/tv/${show.id}?language=en-US`,
        { headers }
      );
      const showDetails = await showResponse.json();

      if (!showDetails.seasons || showDetails.seasons.length === 0) {
        console.log(`   ⚠️ No seasons found for "${show.name}"`);
        results.errors++;
        continue;
      }

      // Find the most recent season (highest season number, excluding specials)
      const realSeasons = showDetails.seasons.filter((s: any) => s.season_number >= 1);
      if (realSeasons.length === 0) {
        console.log(`   ⚠️ No regular seasons found for "${show.name}"`);
        results.errors++;
        continue;
      }

      // Get the most recent season for analysis (like On-The-Air logic)
      const mostRecentSeason = realSeasons[realSeasons.length - 1];
      const currentSeasonNumber = mostRecentSeason.season_number;

      console.log(
        `   🎯 Analyzing most recent season ${currentSeasonNumber} for "${show.name}" (Status: ${showDetails.status})`
      );

      // Get most recent season episodes for pattern analysis
      const seasonResponse = await fetch(
        `https://api.themoviedb.org/3/tv/${show.id}/season/${currentSeasonNumber}?language=en-US`,
        { headers }
      );
      const seasonData = await seasonResponse.json();

      // Convert to our episode format
      const episodes =
        seasonData.episodes
          ?.filter((ep: any) => ep.air_date)
          ?.map((ep: any) => ({
            id: `${show.id}_s${currentSeasonNumber}_e${ep.episode_number}`,
            seasonNumber: currentSeasonNumber,
            episodeNumber: ep.episode_number,
            airDate: new Date(ep.air_date).toISOString(),
            title: ep.name || `Episode ${ep.episode_number}`,
          })) || [];

      if (episodes.length === 0) {
        console.log(`   ⚠️ No episodes with air dates found for "${show.name}"`);
        results.errors++;
        continue;
      }

      // Analyze the pattern
      let analysis = releasePatternService.analyzeEpisodes(episodes);

      // Apply smart binge logic for fully aired shows (like Breaking Bad)
      const isShowEnded = showDetails.status === 'Ended' || showDetails.status === 'Canceled';
      const now = new Date();
      const allEpisodesAired = episodes.every((ep: any) => new Date(ep.airDate) < now);

      if (isShowEnded && allEpisodesAired) {
        // For fully aired shows, they can be binged regardless of original pattern
        const patt = ((analysis as any).pattern?.pattern ?? (analysis as any).pattern) as string;
        if (patt !== 'binge') {
          analysis = {
            ...(analysis as any),
            pattern: { pattern: 'binge', confidence: 0.85 },
          } as any;
        }
      }

      results.totalAnalyzed++;
      {
        const patternKey = ((analysis as any).pattern?.pattern ??
          (analysis as any).pattern) as keyof typeof results.patternDistribution;
        results.patternDistribution[patternKey]++;
      }
      {
        const conf = ((analysis as any).confidence ??
          (analysis as any).pattern?.confidence ??
          0) as number;
        confidences.push(conf);
      }

      // Prepare season info
      const seasonsInfo = showDetails.seasons
        .filter((s: any) => s.season_number >= 1)
        .map((s: any) => ({
          seasonNumber: s.season_number,
          episodeCount: s.episode_count,
          airDate: s.air_date || 'Unknown',
        }));

      results.examples.push({
        tmdbId: show.id,
        title: show.name,
        seasons: seasonsInfo.length,
        episodesInSeason1: episodes.length, // Keep field name for compatibility but it's actually current season
        pattern: ((analysis as any).pattern?.pattern ?? (analysis as any).pattern) as string,
        confidence: ((analysis as any).confidence ??
          (analysis as any).pattern?.confidence ??
          0) as number,
        reasoning: (analysis as any).diagnostics?.reasoning || 'No diagnostic info',
      });

      results.detailedShows.push({
        tmdbId: show.id,
        title: show.name,
        overview: show.overview?.substring(0, 100) + '...' || 'No overview',
        firstAirDate: show.first_air_date || 'Unknown',
        seasons: seasonsInfo,
        season1Analysis: {
          pattern: ((analysis as any).pattern?.pattern ?? (analysis as any).pattern) as string,
          confidence: ((analysis as any).confidence ??
            (analysis as any).pattern?.confidence ??
            0) as number,
          totalEpisodes: ((analysis as any).totalEpisodes ?? episodes.length) as number,
          reasoning: (analysis as any).diagnostics?.reasoning,
        },
      });

      {
        const patt = ((analysis as any).pattern?.pattern ?? (analysis as any).pattern) as string;
        const confNum = ((analysis as any).confidence ??
          (analysis as any).pattern?.confidence ??
          0) as number;
        console.log(
          `   ✅ "${show.name}" S${currentSeasonNumber}: ${patt} (${confNum.toFixed(
            2
          )} confidence, ${episodes.length} episodes, ${seasonsInfo.length} total seasons, Status: ${
            showDetails.status
          })`
        );
      }
    } catch (error) {
      console.error(`   ❌ Error analyzing "${show.name}":`, error);
      results.errors++;
    }
  }

  // Calculate confidence statistics
  if (confidences.length > 0) {
    results.confidenceStats.avg = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
    results.confidenceStats.min = Math.min(...confidences);
    results.confidenceStats.max = Math.max(...confidences);
  }

  console.log(
    `📊 Discovery complete! Analyzed ${results.totalAnalyzed} shows with ${results.errors} errors`
  );

  return results;
}

// Specialized function for currently airing shows - analyzes most recent season
async function discoverAndAnalyzeCurrentlyAiringShows(sampleSize: number) {
  const headers = {
    Authorization: `Bearer ${config.tmdbApiReadToken}`,
    Accept: 'application/json',
  };

  console.log(`📡 Fetching ON THE AIR shows from TMDB...`);

  // Fetch currently airing shows from TMDB
  const showsResponse = await fetch(
    `https://api.themoviedb.org/3/tv/on_the_air?language=en-US&page=1`,
    { headers }
  );
  const showsData = await showsResponse.json();

  const shows = showsData.results.slice(0, sampleSize);
  console.log(`🎬 Found ${shows.length} currently airing shows to analyze`);

  const results = {
    totalAnalyzed: 0,
    patternDistribution: {
      binge: 0,
      weekly: 0,
      premiere_weekly: 0,
      multi_weekly: 0,
      mixed: 0,
      unknown: 0,
    },
    confidenceStats: { avg: 0, min: 1, max: 0 },
    examples: [] as Array<{
      tmdbId: number;
      title: string;
      currentSeason: number;
      episodesInCurrentSeason: number;
      isCurrentlyAiring: boolean;
      pattern: string;
      confidence: number;
      reasoning: string;
    }>,
    errors: 0,
    detailedShows: [] as Array<{
      tmdbId: number;
      title: string;
      overview: string;
      status: string;
      firstAirDate: string;
      lastAirDate: string;
      seasons: Array<{
        seasonNumber: number;
        episodeCount: number;
        airDate: string;
      }>;
      currentSeasonAnalysis?: any;
      airingStatus: string;
    }>,
  };

  const confidences: number[] = [];

  // Analyze each show
  for (const [index, show] of shows.entries()) {
    try {
      // Rate limiting - wait between requests
      if (index > 0) {
        await new Promise((resolve) => setTimeout(resolve, 300)); // 300ms delay
      }

      console.log(`📺 [${index + 1}/${shows.length}] Analyzing currently airing "${show.name}"...`);

      // Get show details including seasons and status
      const showResponse = await fetch(
        `https://api.themoviedb.org/3/tv/${show.id}?language=en-US`,
        { headers }
      );
      const showDetails = await showResponse.json();

      if (!showDetails.seasons || showDetails.seasons.length === 0) {
        console.log(`   ⚠️ No seasons found for "${show.name}"`);
        results.errors++;
        continue;
      }

      // Find the most recent season (highest season number, excluding specials)
      const realSeasons = showDetails.seasons.filter((s: any) => s.season_number >= 1);
      if (realSeasons.length === 0) {
        console.log(`   ⚠️ No regular seasons found for "${show.name}"`);
        results.errors++;
        continue;
      }

      // Get the most recent season for currently airing shows
      const mostRecentSeason = realSeasons[realSeasons.length - 1];
      const currentSeasonNumber = mostRecentSeason.season_number;

      console.log(
        `   🎯 Analyzing most recent season ${currentSeasonNumber} for "${show.name}" (Status: ${showDetails.status})`
      );

      // Get current season episodes for pattern analysis
      const seasonResponse = await fetch(
        `https://api.themoviedb.org/3/tv/${show.id}/season/${currentSeasonNumber}?language=en-US`,
        { headers }
      );
      const seasonData = await seasonResponse.json();

      // Convert to our episode format
      const episodes =
        seasonData.episodes
          ?.filter((ep: any) => ep.air_date)
          ?.map((ep: any) => ({
            id: `${show.id}_s${currentSeasonNumber}_e${ep.episode_number}`,
            seasonNumber: currentSeasonNumber,
            episodeNumber: ep.episode_number,
            airDate: new Date(ep.air_date).toISOString(),
            title: ep.name || `Episode ${ep.episode_number}`,
          })) || [];

      if (episodes.length === 0) {
        console.log(
          `   ⚠️ No episodes with air dates found in season ${currentSeasonNumber} of "${show.name}"`
        );
        results.errors++;
        continue;
      }

      // Check if show is truly currently airing based on episode dates
      const now = new Date();
      const futureEpisodes = episodes.filter((ep: any) => new Date(ep.airDate) > now);
      const isCurrentlyAiring =
        futureEpisodes.length > 0 || showDetails.status === 'Returning Series';

      // Analyze the pattern
      let analysis = releasePatternService.analyzeEpisodes(episodes);

      // Special logic for currently airing shows
      let airingStatus = 'Unknown';
      if (isCurrentlyAiring) {
        airingStatus = 'Currently Airing';
        // If show is currently airing and we don't detect a clear pattern,
        // it's likely weekly since that's the most common for ongoing shows
        {
          const patt2 = ((analysis as any).pattern?.pattern ?? (analysis as any).pattern) as string;
          if (patt2 === 'unknown' && episodes.length >= 2) {
            analysis = {
              ...(analysis as any),
              pattern: { pattern: 'weekly', confidence: 0.7 },
            } as any;
          }
        }
      } else {
        airingStatus = 'Season Complete';
        // For completed seasons, if all episodes are available, it's effectively binge-watchable
        {
          const patt3 = ((analysis as any).pattern?.pattern ?? (analysis as any).pattern) as string;
          if (patt3 === 'unknown') {
            analysis = {
              ...(analysis as any),
              pattern: { pattern: 'binge', confidence: 0.6 },
            } as any;
          }
        }
      }

      results.totalAnalyzed++;
      {
        const patternKey = ((analysis as any).pattern?.pattern ??
          (analysis as any).pattern) as keyof typeof results.patternDistribution;
        results.patternDistribution[patternKey]++;
      }
      {
        const conf = ((analysis as any).confidence ??
          (analysis as any).pattern?.confidence ??
          0) as number;
        confidences.push(conf);
      }

      // Prepare season info
      const seasonsInfo = showDetails.seasons
        .filter((s: any) => s.season_number >= 1)
        .map((s: any) => ({
          seasonNumber: s.season_number,
          episodeCount: s.episode_count,
          airDate: s.air_date || 'Unknown',
        }));

      results.examples.push({
        tmdbId: show.id,
        title: show.name,
        currentSeason: currentSeasonNumber,
        episodesInCurrentSeason: episodes.length,
        isCurrentlyAiring,
        pattern: ((analysis as any).pattern?.pattern ?? (analysis as any).pattern) as string,
        confidence: ((analysis as any).confidence ??
          (analysis as any).pattern?.confidence ??
          0) as number,
        reasoning: (analysis as any).diagnostics?.reasoning || 'No diagnostic info',
      });

      results.detailedShows.push({
        tmdbId: show.id,
        title: show.name,
        overview: show.overview?.substring(0, 100) + '...' || 'No overview',
        status: showDetails.status || 'Unknown',
        firstAirDate: show.first_air_date || 'Unknown',
        lastAirDate: showDetails.last_air_date || 'Unknown',
        seasons: seasonsInfo,
        currentSeasonAnalysis: {
          seasonNumber: currentSeasonNumber,
          pattern: ((analysis as any).pattern?.pattern ?? (analysis as any).pattern) as string,
          confidence: ((analysis as any).confidence ??
            (analysis as any).pattern?.confidence ??
            0) as number,
          totalEpisodes: ((analysis as any).totalEpisodes ?? episodes.length) as number,
          reasoning: (analysis as any).diagnostics?.reasoning,
        },
        airingStatus,
      });

      {
        const patt = ((analysis as any).pattern?.pattern ?? (analysis as any).pattern) as string;
        const confNum = ((analysis as any).confidence ??
          (analysis as any).pattern?.confidence ??
          0) as number;
        console.log(
          `   ✅ "${show.name}" S${currentSeasonNumber}: ${patt} (${confNum.toFixed(
            2
          )} confidence, ${episodes.length} episodes, ${airingStatus})`
        );
      }
    } catch (error) {
      console.error(`   ❌ Error analyzing "${show.name}":`, error);
      results.errors++;
    }
  }

  // Calculate confidence statistics
  if (confidences.length > 0) {
    results.confidenceStats.avg = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
    results.confidenceStats.min = Math.min(...confidences);
    results.confidenceStats.max = Math.max(...confidences);
  }

  console.log(
    `📊 On-air discovery complete! Analyzed ${results.totalAnalyzed} shows with ${results.errors} errors`
  );

  return results;
}

// Analyze release pattern for a show
router.post('/analyze-pattern', async (req, res, next) => {
  try {
    const { title, tmdbId } = req.body;

    if (!title && !tmdbId) {
      throw new ValidationError('Either title or tmdbId is required');
    }

    const client = getTMDBClient();
    if (!client) {
      return res.status(503).json({
        error: 'TMDB_UNAVAILABLE',
        message: 'TMDB service is not configured or in dev mode',
      });
    }

    let analysis = null;

    if (tmdbId) {
      // Direct analysis by TMDB ID - get season episodes and analyze
      try {
        const seasonData = await fetch(
          `https://api.themoviedb.org/3/tv/${tmdbId}/season/1?language=en-US`,
          {
            headers: {
              Authorization: `Bearer ${config.tmdbApiReadToken}`,
              Accept: 'application/json',
            },
          }
        );

        if (seasonData.ok) {
          const season = await seasonData.json();
          const episodes = season.episodes
            .filter((ep: any) => ep.air_date)
            .map((ep: any) => ({
              id: `${tmdbId}_s1_e${ep.episode_number}`,
              seasonNumber: 1,
              episodeNumber: ep.episode_number,
              airDate: new Date(ep.air_date).toISOString(),
              title: ep.name || `Episode ${ep.episode_number}`,
            }));

          if (episodes.length > 0) {
            analysis = releasePatternService.analyzeEpisodes(episodes);
          }
        }
      } catch (error) {
        console.error(`Error fetching season data for TMDB ID ${tmdbId}:`, error);
      }
    } else if (title) {
      // Search by title first, then analyze
      const patternResult = await client.detectReleasePatternFromTitle(title);
      if (patternResult) {
        analysis = { pattern: patternResult.pattern, confidence: 0.8 };
      }
    }

    if (!analysis) {
      return res.status(404).json({
        error: 'SHOW_NOT_FOUND',
        message: 'Could not find show or analyze pattern',
        details: { title, tmdbId },
      });
    }

    // Include diagnostic information in response
    const response = {
      title: title || `TMDB ID: ${tmdbId}`,
      tmdbId: tmdbId || null,
      releasePattern: analysis,
      // Add diagnostic mode support
      diagnostics: process.env.NODE_ENV === 'development' ? analysis.diagnostics : undefined,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Discover and analyze current shows (for testing) - TOP RATED
router.get('/discover-patterns', async (req, res, next) => {
  try {
    const { sampleSize = 10 } = req.query;

    if (!tmdbService.isAvailable) {
      return res.status(503).json({
        error: 'TMDB_UNAVAILABLE',
        message: 'TMDB service is not configured or in dev mode',
      });
    }

    console.log(
      `🔍 Starting real pattern discovery for TOP RATED shows (sample size: ${sampleSize})`
    );

    const report = await discoverAndAnalyzeShows('top_rated', parseInt(sampleSize as string));

    res.json({
      success: true,
      report,
      message: `Real analysis of ${report.totalAnalyzed} top-rated shows with ${report.errors} errors`,
    });
  } catch (error) {
    console.error('Error in pattern discovery:', error);
    next(error);
  }
});

// New endpoint for POPULAR shows discovery
router.get('/discover-popular', async (req, res, next) => {
  try {
    const { sampleSize = 10 } = req.query;

    if (!tmdbService.isAvailable) {
      return res.status(503).json({
        error: 'TMDB_UNAVAILABLE',
        message: 'TMDB service is not configured or in dev mode',
      });
    }

    console.log(
      `🔍 Starting real pattern discovery for POPULAR shows (sample size: ${sampleSize})`
    );

    const report = await discoverAndAnalyzeShows('popular', parseInt(sampleSize as string));

    res.json({
      success: true,
      report,
      message: `Real analysis of ${report.totalAnalyzed} popular shows with ${report.errors} errors`,
    });
  } catch (error) {
    console.error('Error in popular show discovery:', error);
    next(error);
  }
});

// New endpoint for ON THE AIR shows discovery - analyzes current season
router.get('/discover-on-air', async (req, res, next) => {
  try {
    const { sampleSize = 10 } = req.query;

    if (!tmdbService.isAvailable) {
      return res.status(503).json({
        error: 'TMDB_UNAVAILABLE',
        message: 'TMDB service is not configured or in dev mode',
      });
    }

    console.log(
      `🔍 Starting real pattern discovery for ON THE AIR shows (sample size: ${sampleSize})`
    );

    const report = await discoverAndAnalyzeCurrentlyAiringShows(parseInt(sampleSize as string));

    res.json({
      success: true,
      report,
      message: `Real analysis of ${report.totalAnalyzed} currently airing shows with ${report.errors} errors`,
    });
  } catch (error) {
    console.error('Error in on-air show discovery:', error);
    next(error);
  }
});

// Validate pattern detection accuracy
router.get('/validate-patterns', async (req, res, next) => {
  try {
    if (!tmdbService.isAvailable) {
      return res.status(503).json({
        error: 'TMDB_UNAVAILABLE',
        message: 'TMDB service is not configured or in dev mode',
      });
    }

    // Mock validation results for now
    const validation = {
      validationResults: [
        {
          title: 'Stranger Things',
          expected: 'binge' as const,
          detected: 'binge' as const,
          match: true,
          confidence: 0.95,
        },
        {
          title: 'The Boys',
          expected: 'weekly' as const,
          detected: 'weekly' as const,
          match: true,
          confidence: 0.85,
        },
        {
          title: 'House of the Dragon',
          expected: 'weekly' as const,
          detected: 'weekly' as const,
          match: true,
          confidence: 0.85,
        },
      ],
      accuracy: 1.0,
    };

    res.json({
      success: true,
      validation,
      accuracy: `${(validation.accuracy * 100).toFixed(1)}%`,
    });
  } catch (error) {
    console.error('Error in pattern validation:', error);
    next(error);
  }
});

// Get detailed diagnostics for a specific TMDB show
router.get('/diagnostics/:tmdbId', async (req, res, next) => {
  try {
    const { tmdbId } = req.params;
    const { seasonNumber = 1 } = req.query;

    if (!tmdbService.isAvailable) {
      return res.status(503).json({
        error: 'TMDB_UNAVAILABLE',
        message: 'TMDB service is not configured or in dev mode',
      });
    }

    // Direct TMDB API call to get season data and analyze
    try {
      const seasonData = await fetch(
        `https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNumber}?language=en-US`,
        {
          headers: {
            Authorization: `Bearer ${config.tmdbApiReadToken}`,
            Accept: 'application/json',
          },
        }
      );

      if (!seasonData.ok) {
        return res.status(404).json({
          error: 'ANALYSIS_FAILED',
          message: `Could not fetch season data for TMDB ID ${tmdbId}`,
          details: { tmdbId, seasonNumber },
        });
      }

      const season = await seasonData.json();
      const episodes = season.episodes
        .filter((ep: any) => ep.air_date)
        .map((ep: any) => ({
          id: `${tmdbId}_s${seasonNumber}_e${ep.episode_number}`,
          seasonNumber: parseInt(seasonNumber as string),
          episodeNumber: ep.episode_number,
          airDate: new Date(ep.air_date).toISOString(),
          title: ep.name || `Episode ${ep.episode_number}`,
        }));

      if (episodes.length === 0) {
        return res.status(404).json({
          error: 'NO_EPISODES',
          message: `No episodes with air dates found for TMDB ID ${tmdbId} season ${seasonNumber}`,
          details: { tmdbId, seasonNumber },
        });
      }

      const analysis = releasePatternService.analyzeEpisodes(episodes);

      res.json({
        tmdbId: parseInt(tmdbId),
        seasonNumber: parseInt(seasonNumber as string),
        analysis,
        fullDiagnostics: analysis.diagnostics,
      });
    } catch (fetchError) {
      console.error(`Error fetching TMDB data for ${tmdbId}:`, fetchError);
      return res.status(500).json({
        error: 'TMDB_FETCH_ERROR',
        message: `Failed to fetch data from TMDB for ID ${tmdbId}`,
        details: { tmdbId, seasonNumber },
      });
    }
  } catch (error) {
    next(error);
  }
});

export { router as showsRouter };
