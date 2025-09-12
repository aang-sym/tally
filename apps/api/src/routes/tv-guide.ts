import express from 'express';
import { format, addDays, parseISO } from 'date-fns';
import { watchlistStorageService } from '../storage/simple-watchlist.js';
import { supabase } from '../db/supabase.js';
import { tmdbService } from '../services/tmdb.js';

const router: express.Router = express.Router();

// Helper: color map for known services
function getServiceColor(serviceName: string): string {
  const colorMap: Record<string, string> = {
    Netflix: '#E50914',
    'HBO Max': '#9B59B6',
    'Disney+': '#113CCF',
    'Amazon Prime Video': '#00A8E1',
    'Apple TV+': '#000000',
    'Paramount+': '#0064FF',
    Hulu: '#1CE783',
    Peacock: '#F74C4C',
  };
  return colorMap[serviceName] || '#6B7280';
}

interface TVGuideEpisode {
  episodeNumber: number;
  seasonNumber: number;
  airDate: string;
  title: string;
  overview?: string;
  isWatched: boolean;
  tmdbId: number;
}

interface TVGuideShow {
  tmdbId: number;
  title: string;
  poster?: string;
  overview?: string;
  status?: string;
  streamingServices: Array<{
    id: number;
    name: string;
    logo?: string;
    color?: string;
    textColor?: string;
  }>;
  nextEpisodeDate?: string;
  activeWindow?: { start: string; end: string };
  upcomingEpisodes: TVGuideEpisode[];
  userProgress?: {
    currentSeason: number;
    currentEpisode: number;
    watchedEpisodes: string[];
  };
  pattern?: string;
  confidence?: number;
  bufferDays?: number;
  country?: string;
}

interface TVGuideResponse {
  services: Array<{
    service: {
      id: number;
      name: string;
      logo: string;
      color: string;
      textColor: string;
    };
    shows: TVGuideShow[];
  }>;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  totalShows: number;
  totalEpisodes: number;
}

// Utility: compute active window and upcoming from TMDB analysis
async function buildShowFromTMDB(
  tmdbId: number,
  title: string,
  provider: any,
  start: Date,
  end: Date,
  country = 'US',
  bufferDays?: number
): Promise<TVGuideShow | null> {
  if (!tmdbService.isAvailable) return null;
  try {
    const analysis = await tmdbService.analyzeShow(tmdbId, country);
    const episodes = (analysis?.diagnostics?.episodeDetails || [])
      .filter((ep: any) => ep.airDate)
      .map((ep: any) => ({
        episodeNumber: ep.episodeNumber,
        seasonNumber: ep.seasonNumber,
        airDate: ep.airDate,
        title: ep.title || `Episode ${ep.episodeNumber}`,
        overview: ep.overview || undefined,
        isWatched: false,
        tmdbId,
      })) as TVGuideEpisode[];

    if (!episodes.length) return null;

    // Ensure episodes are sorted by air date
    episodes.sort((a, b) => new Date(a.airDate).getTime() - new Date(b.airDate).getTime());
    const firstEp = episodes[0]!;
    const lastEp = episodes[episodes.length - 1]!;
    const firstAir = new Date(firstEp.airDate);
    const lastAir = new Date(lastEp.airDate);

    // Filter upcoming episodes within requested range
    const upcoming = episodes.filter((ep) => {
      const d = new Date(ep.airDate);
      return d >= start && d <= end;
    });

    // Poster from analysis.showDetails.poster
    const poster = analysis?.showDetails?.poster || undefined;

    // Prefer the first upcoming episode inside requested window for the bar start
    const barStart = upcoming[0] ? new Date(upcoming[0]!.airDate) : firstAir;

    const base: TVGuideShow = {
      tmdbId,
      title,
      poster,
      overview: analysis?.showDetails?.overview || undefined,
      status: analysis?.showDetails?.status || undefined,
      streamingServices: provider
        ? [
            {
              id: provider.id,
              name: provider.name,
              logo: provider.logo_path,
              color: getServiceColor(provider.name),
              textColor: '#FFFFFF',
            },
          ]
        : [],
      activeWindow: { start: format(barStart, 'yyyy-MM-dd'), end: format(lastAir, 'yyyy-MM-dd') },
      upcomingEpisodes: upcoming,
      country,
    };

    // exactOptionalPropertyTypes: only include optional fields if defined
    const maybeNext =
      upcoming[0]?.airDate !== undefined ? { nextEpisodeDate: upcoming[0]!.airDate } : {};
    const maybeBuffer = bufferDays !== undefined ? { bufferDays } : {};

    return {
      ...base,
      ...maybeNext,
      ...maybeBuffer,
    };
  } catch (e) {
    console.error('TMDB analyze failed for', tmdbId, e);
    return null;
  }
}

/**
 * GET /api/tv-guide
 * Get TV guide data for a specific date range using real user data
 */
router.get('/', async (req, res) => {
  try {
    const {
      startDate = format(new Date(), 'yyyy-MM-dd'),
      endDate = format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    } = req.query;
    const headerUser = (req.headers['x-user-id'] as string) || '';
    const userId = headerUser || (req.query.userId as string) || 'user-1';

    const start = parseISO(startDate as string);
    const end = parseISO(endDate as string);

    // Prefer Supabase data if userId looks like a UUID; else fall back to simple storage
    const isUUID = /^[0-9a-fA-F-]{36}$/.test(userId);

    // If Supabase: fetch user default country and shows
    if (isUUID) {
      const { data: userRow } = await supabase
        .from('users')
        .select('country_code')
        .eq('id', userId)
        .single();

      const defaultCountry = (userRow?.country_code as string) || 'US';

      const { data: userShows } = await supabase
        .from('user_shows')
        .select(
          `
          id, status, buffer_days, country_code, selected_service_id,
          shows:show_id ( tmdb_id, title ),
          service:selected_service_id ( name, logo_path )
        `
        )
        .eq('user_id', userId)
        .in('status', ['watching', 'watchlist']);

      const tvGuideShows: TVGuideShow[] = [];
      for (const row of userShows || []) {
        const showsRel = Array.isArray((row as any).shows) ? (row as any).shows[0] : (row as any).shows;
        const serviceRel = Array.isArray((row as any).service) ? (row as any).service[0] : (row as any).service;

        const tmdbId = showsRel?.tmdb_id as number | undefined;
        const title = (showsRel?.title as string) || '';
        const provider = serviceRel
          ? {
              id: row.selected_service_id,
              name: serviceRel.name,
              logo_path: serviceRel.logo_path
                ? `https://image.tmdb.org/t/p/w92${serviceRel.logo_path}`
                : '',
            }
          : null;
        const country = (row as any).country_code || defaultCountry;
        const bufferDays = (row as any).buffer_days || 0;
        if (tmdbId) {
          const show = await buildShowFromTMDB(
            tmdbId,
            title,
            provider,
            start,
            end,
            country,
            bufferDays
          );
          if (show) tvGuideShows.push(show);
        }
      }

      const serviceShowMap = new Map<string, { service: any; shows: TVGuideShow[] }>();
      tvGuideShows.forEach((show) => {
        show.streamingServices.forEach((service) => {
          const key = `${service.id}-${service.name}`;
          if (!serviceShowMap.has(key)) serviceShowMap.set(key, { service, shows: [] });
          serviceShowMap.get(key)!.shows.push(show);
        });
      });

      const response: TVGuideResponse = {
        services: Array.from(serviceShowMap.values()),
        dateRange: { startDate: startDate as string, endDate: endDate as string },
        totalShows: tvGuideShows.length,
        totalEpisodes: tvGuideShows.reduce((t, s) => t + s.upcomingEpisodes.length, 0),
      };

      return res.json({ success: true, data: response });
    }

    // Fallback to simple in-memory watchlist
    const userWatchlist = await watchlistStorageService.getUserWatchlist(userId as string);
    if (!userWatchlist || userWatchlist.length === 0) {
      return res.json({
        success: true,
        data: {
          services: [],
          dateRange: {
            startDate: startDate as string,
            endDate: endDate as string,
          },
          totalShows: 0,
          totalEpisodes: 0,
        },
      });
    }
    // Build TV guide from real TMDB analysis for each watchlist item
    const tvGuideShows: TVGuideShow[] = [];
    const country = (req.query.country as string) || 'US';

    for (const item of userWatchlist) {
      const provider = item.streamingProvider || null;
      const show = await buildShowFromTMDB(
        item.tmdbId,
        item.title,
        provider,
        start,
        end,
        item.country || country,
        item.bufferDays
      );
      if (show) tvGuideShows.push(show);
    }

    // Group by selected provider per show
    const serviceShowMap = new Map<string, { service: any; shows: TVGuideShow[] }>();

    tvGuideShows.forEach((show) => {
      show.streamingServices.forEach((service) => {
        const key = `${service.id}-${service.name}`;
        if (!serviceShowMap.has(key)) {
          serviceShowMap.set(key, {
            service,
            shows: [],
          });
        }
        serviceShowMap.get(key)!.shows.push(show);
      });
    });

    const response: TVGuideResponse = {
      services: Array.from(serviceShowMap.values()),
      dateRange: {
        startDate: startDate as string,
        endDate: endDate as string,
      },
      totalShows: tvGuideShows.length,
      totalEpisodes: tvGuideShows.reduce((total, show) => total + show.upcomingEpisodes.length, 0),
    };

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('TV Guide API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load TV guide data',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/tv-guide/user/:userId
 * Get personalized TV guide for a specific user
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      startDate = format(new Date(), 'yyyy-MM-dd'),
      endDate = format(addDays(new Date(), 30), 'yyyy-MM-dd'),
      country = 'US',
    } = req.query as any;

    const start = parseISO(startDate as string);
    const end = parseISO(endDate as string);

    const watchlist = watchlistStorageService.getUserWatchlist(userId);
    const shows: TVGuideShow[] = [];
    for (const item of watchlist) {
      const show = await buildShowFromTMDB(
        item.tmdbId,
        item.title,
        item.streamingProvider,
        start,
        end,
        country
      );
      if (show) shows.push(show);
    }

    const serviceShowMap = new Map<string, { service: any; shows: TVGuideShow[] }>();
    shows.forEach((show) => {
      show.streamingServices.forEach((service) => {
        const key = `${service.id}-${service.name}`;
        if (!serviceShowMap.has(key)) serviceShowMap.set(key, { service, shows: [] });
        serviceShowMap.get(key)!.shows.push(show);
      });
    });

    const response: TVGuideResponse = {
      services: Array.from(serviceShowMap.values()),
      dateRange: { startDate: startDate as string, endDate: endDate as string },
      totalShows: shows.length,
      totalEpisodes: shows.reduce((t, s) => t + s.upcomingEpisodes.length, 0),
    };

    res.json({ success: true, data: response });
  } catch (error) {
    console.error('User TV Guide API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load user TV guide data',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
