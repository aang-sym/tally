/**
 * My Shows Page
 *
 * Comprehensive watchlist management interface with tabbed navigation,
 * progress tracking, and quick actions.
 */

import React, { useState, useEffect } from 'react';
import { UserManager } from '../services/UserManager';
import { API_ENDPOINTS, apiRequest } from '../config/api';
import { UserShow, StreamingProvider, StoredEpisodeProgress } from '../types/api';
import { useAuth } from '../context/AuthContext';

// Shared, accessible progress bar component
const ProgressBar: React.FC<{
  value: number;
  total: number;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}> = ({ value, total, label, size = 'md', className }) => {
  const denom = Math.max(0, total);
  const numer = Math.min(Math.max(0, value), denom);
  const pct = denom ? Math.round((numer / denom) * 100) : 0;
  return (
    <div className={className}>
      {label && (
        <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
          <span>{label}</span>
          <span>
            {numer}/{denom} episodes
          </span>
        </div>
      )}
      <div
        className={
          size === 'sm'
            ? 'w-full bg-gray-200 rounded-full h-1.5'
            : 'w-full bg-gray-200 rounded-full h-2'
        }
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'progress'}
      >
        <div
          className="bg-blue-600 h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

// Episode Progress Display Component
interface DisplayEpisode {
  number: number;
  airDate: string;
  title: string;
  watched?: boolean;
}

const EpisodeProgressDisplay: React.FC<{
  seasonNumber: number;
  episodeNumber: number;
  episodeName?: string | undefined; // Explicitly allow undefined
  tmdbId: number;
}> = ({ seasonNumber, episodeNumber, episodeName, tmdbId }) => {
  const [actualEpisodeTitle, setActualEpisodeTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchEpisodeTitle = async () => {
      // Only fetch if the current name is generic like "Episode X"
      if (!episodeName || episodeName.match(/^Episode \d+$/)) {
        setLoading(true);
        try {
          const country = UserManager.getCountry();
          const response = await fetch(
            `${API_ENDPOINTS.tmdb.base}/show/${tmdbId}/season/${seasonNumber}/raw?country=${country}`
          );
          if (response.ok) {
            const data = await response.json();
            const season = data.raw?.season || data.raw;
            const ep = (season?.episodes || []).find(
              (e: any) => e.episode_number === episodeNumber
            );
            if (ep && ep.name) setActualEpisodeTitle(ep.name);
          }
        } catch (error) {
          console.error('Failed to fetch episode title:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchEpisodeTitle();
  }, [episodeName, episodeNumber, tmdbId]);

  const displayTitle =
    actualEpisodeTitle || (episodeName && !episodeName.match(/^Episode \d+$/))
      ? actualEpisodeTitle || episodeName
      : '';

  return (
    <p className="text-xs text-gray-500 mt-1">
      Next: S{seasonNumber}E{episodeNumber}
      {loading && <span className="ml-1 text-gray-400">(loading title...)</span>}
      {!loading && displayTitle && ` - ${displayTitle}`}
    </p>
  );
};

interface WatchlistStats {
  totalShows: number;
  byStatus: Record<'watchlist' | 'watching' | 'completed' | 'dropped', number>;
  averageRating: number;
}

// Derive stats on the client as a reliable fallback (and to keep counts live)
const deriveStats = (items: UserShow[]): WatchlistStats => {
  const byStatus = {
    watchlist: 0,
    watching: 0,
    completed: 0,
    dropped: 0,
  } as WatchlistStats['byStatus'];
  let ratingSum = 0;
  let ratingCount = 0;
  for (const s of items) {
    const key = s.status as keyof typeof byStatus;
    if (key in byStatus) {
      byStatus[key] += 1;
    }
    if (typeof s.show_rating === 'number') {
      ratingSum += s.show_rating;
      ratingCount += 1;
    }
  }
  return {
    totalShows: items.length,
    byStatus,
    averageRating: ratingCount > 0 ? ratingSum / ratingCount : 0,
  };
};

// API base URL
// API_BASE removed - using centralized API_ENDPOINTS

const MyShows: React.FC = () => {
  const auth = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'watchlist' | 'watching' | 'completed'>('all');
  const [shows, setShows] = useState<UserShow[]>([]);
  // Cache watchlist per tab to avoid full reloads when switching
  const [watchlistCache, setWatchlistCache] = useState<{
    all?: UserShow[];
    watchlist?: UserShow[];
    watching?: UserShow[];
    completed?: UserShow[];
  }>({});
  const [isBackgroundLoading, setIsBackgroundLoading] = useState(false);
  const [stats, setStats] = useState<WatchlistStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingStats, setLoadingStats] = useState(true); // New loading state for stats
  const [statsError, setStatsError] = useState<string | null>(null); // New error state for stats
  // Series-wide progress prefetch (keyed by tmdbId)
  const [seriesProgress, setSeriesProgress] = useState<{
    [tmdbId: number]: { total: number; watched: number };
  }>({});

  // Expandable show details state
  const [expandedShow, setExpandedShow] = useState<string | null>(null);
  const [showAnalysis, setShowAnalysis] = useState<{ [showId: string]: any }>({});
  const [selectedSeasons, setSelectedSeasons] = useState<{ [showId: string]: number }>({});
  const [episodeData, setEpisodeData] = useState<{
    [showId: string]: { [season: number]: DisplayEpisode[] };
  }>({});
  const [loadingAnalysis, setLoadingAnalysis] = useState<{ [showId: string]: boolean }>({});
  const [showProviders, setShowProviders] = useState<{ [showId: string]: StreamingProvider[] }>({});
  const [country, setCountry] = useState<string>(UserManager.getCountry());
  const [posterOverrides, setPosterOverrides] = useState<{ [tmdbId: number]: string | undefined }>(
    {}
  );

  // Persist user's country to profile so API routes can fall back to users.country_code
  const persistUserCountry = async (code: string) => {
    try {
      const userId = UserManager.getCurrentUserId();
      const token = localStorage.getItem('authToken') || undefined;
      await apiRequest(
        `${API_ENDPOINTS.users.base}/${userId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ countryCode: code }),
        },
        token
      );
    } catch (e) {
      console.warn('Failed to persist user country; keeping local override only', e);
    }
  };

  // Clear all cached data when user changes
  useEffect(() => {
    if (auth.user) {
      console.log('[MY SHOWS DEBUG] User changed, clearing cache and refetching data');
      console.log('[MY SHOWS DEBUG] New user:', auth.user.id, auth.user.email);

      // Clear all caches
      setWatchlistCache({});
      setShows([]);
      setStats(null);
      setSeriesProgress({});
      setShowAnalysis({});
      setSelectedSeasons({});
      setEpisodeData({});
      setShowProviders({});
      setPosterOverrides({});

      // Reset to "all" tab and refetch
      setActiveTab('all');
      fetchWatchlist('all', false);
      fetchStats();
    }
  }, [auth.user?.id]); // Depend on user ID to trigger when user switches

  // Fetch watchlist data
  useEffect(() => {
    // Skip if we don't have an authenticated user yet
    if (!auth.user) {
      console.log('[MY SHOWS DEBUG] No authenticated user, skipping watchlist fetch');
      return;
    }

    console.log('[MY SHOWS DEBUG] Fetching watchlist for tab:', activeTab);
    console.log('[MY SHOWS DEBUG] Current user:', auth.user.id, auth.user.email);

    // If we have cached data for this tab, show it immediately without flicker
    const cached = watchlistCache[activeTab];
    if (cached) {
      setShows(cached);
      setStats(deriveStats(cached));
      setLoading(false);
    }
    // Always refresh the list in the background; stats are global and fetched separately
    fetchWatchlist(activeTab, !!cached);
  }, [activeTab, auth.user?.id]); // Also depend on user ID

  useEffect(() => {
    // Skip if we don't have an authenticated user yet
    if (!auth.user) {
      return;
    }

    // Initial stats fetch on mount; subsequent updates come from mutations or background refresh
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.user?.id]); // Depend on user ID

  // When country changes, persist and refresh provider lists
  useEffect(() => {
    UserManager.setCountry(country);
    persistUserCountry(country);
    setShowProviders({});
    // Re-fetch providers for current shows
    if (shows.length > 0) {
      shows.forEach((s) => fetchShowProviders(s.show.tmdb_id));
    }
  }, [country]);

  // Keep dashboard counts in sync with the list without waiting for server stats
  useEffect(() => {
    if (shows) {
      const computed = deriveStats(shows);
      setStats(computed);
      setLoadingStats(false);
      setStatsError(null);
    }
  }, [shows]);

  const fetchWatchlist = async (
    tab: 'all' | 'watchlist' | 'watching' | 'completed' = activeTab,
    useBackground = false
  ) => {
    try {
      if (!useBackground) setLoading(true);
      setIsBackgroundLoading(useBackground);
      const token = localStorage.getItem('authToken') || undefined;
      const statusParam = tab !== 'all' ? tab : undefined;

      console.log('[MY SHOWS DEBUG] Fetching watchlist for tab:', tab);
      console.log('[MY SHOWS DEBUG] Auth context user:', auth.user?.id, auth.user?.email);
      console.log('[MY SHOWS DEBUG] Using token:', token ? `${token.substring(0, 20)}...` : 'none');

      // Use apiRequest helper to fetch watchlist, tolerant of both array and object shapes
      const qs = statusParam ? `?status=${encodeURIComponent(statusParam)}` : '';
      const url = `${API_ENDPOINTS.watchlist.v2}${qs}`;
      const raw = await apiRequest(url, {}, token);
      const payload = raw?.data ?? raw; // backend may wrap in { data } or return directly
      const showsArray = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.shows)
          ? payload.shows
          : [];
      const showsList: UserShow[] = showsArray as UserShow[];

      // Cache by tab to avoid flicker on subsequent switches
      setWatchlistCache((prev) => ({ ...prev, [tab]: showsList }));

      setShows(showsList);
      setStats(deriveStats(showsList));
      setLoadingStats(false);
      setStatsError(null);
      setError(null);

      // Prefetch overall progress so header bars are populated on initial load
      if (showsList.length > 0) {
        showsList.forEach(async (it: UserShow) => {
          const prog = await fetchShowProgress(it.show.tmdb_id);
          if (prog) {
            setSeriesProgress((prev) => ({
              ...prev,
              [it.show.tmdb_id]: { total: prog.total, watched: prog.watched },
            }));
          }
        });
      }

      // Fetch providers and posters for shows that are missing them
      if (showsList.length > 0) {
        showsList.forEach((show: UserShow) => {
          const tmdb = show.show.tmdb_id;
          if (!showProviders[tmdb]) {
            fetchShowProviders(tmdb);
          }
          if (!show.show.poster_path && !posterOverrides[tmdb]) {
            fetchShowPoster(tmdb);
          }
        });
      }
    } catch (err) {
      console.error('Failed to fetch watchlist:', err);
      setError('Failed to load your shows');
    } finally {
      if (!useBackground) setLoading(false);
      setIsBackgroundLoading(false);
    }
  };

  const fetchStats = async () => {
    setLoadingStats(true);
    setStatsError(null);
    try {
      const token = localStorage.getItem('authToken') || undefined;

      const raw = await apiRequest(`${API_ENDPOINTS.watchlist.v2}/stats`, {}, token);
      const payload = (raw?.data ?? raw) as any;

      const isValid =
        payload &&
        typeof payload.totalShows === 'number' &&
        payload.byStatus &&
        ['watchlist', 'watching', 'completed', 'dropped'].every(
          (k) => typeof payload.byStatus?.[k] === 'number'
        ) &&
        typeof payload.averageRating === 'number';

      if (isValid) {
        setStats(payload as WatchlistStats);
      } else {
        setStats(deriveStats(shows));
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      setStatsError('Failed to load show statistics.');
      setStats(deriveStats(shows));
    } finally {
      setLoadingStats(false);
    }
  };

  // Update show status
  const updateShowStatus = async (userShowId: string, newStatus: UserShow['status']) => {
    try {
      const token = localStorage.getItem('authToken') || undefined;
      await apiRequest(
        `${API_ENDPOINTS.watchlist.v2}/${userShowId}/status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: newStatus }),
        },
        token
      );

      // Refresh the list
      fetchWatchlist();
      fetchStats();
    } catch (err) {
      console.error('Failed to update show status:', err);
      alert('Failed to update show status');
    }
  };

  // Rate a show
  const rateShow = async (userShowId: string, rating: number) => {
    try {
      const token = localStorage.getItem('authToken') || undefined;
      await apiRequest(
        `${API_ENDPOINTS.watchlist.v2}/${userShowId}/rating`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ rating }),
        },
        token
      );

      // Update local state
      setShows((prevShows) =>
        prevShows.map((show) =>
          (show as any).user_show_id === userShowId || show.id === userShowId
            ? { ...show, show_rating: rating }
            : show
        )
      );

      fetchStats();
    } catch (err) {
      console.error('Failed to rate show:', err);
      alert('Failed to rate show');
    }
  };

  // Update streaming provider for a show
  const updateStreamingProvider = async (
    userShowId: string,
    provider: { id: number; name: string; logo_path: string } | null
  ) => {
    try {
      const token = localStorage.getItem('authToken') || undefined;
      await apiRequest(
        `${API_ENDPOINTS.watchlist.v2}/${userShowId}/provider`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ provider }),
        },
        token
      );

      // Update local state immediately without full refresh
      setShows((prevShows) =>
        prevShows.map((show) =>
          (show as any).user_show_id === userShowId || show.id === userShowId
            ? { ...show, streaming_provider: provider }
            : show
        )
      );

      // Show success message
      const providerName = provider ? provider.name : 'None';
      console.log(`Streaming provider updated to: ${providerName}`);
    } catch (err) {
      console.error('Failed to update streaming provider:', err);
      alert('Failed to update streaming provider');
    }
  };

  // Remove show from watchlist
  const removeShow = async (userShowId: string) => {
    if (!confirm('Are you sure you want to remove this show from your watchlist?')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken') || undefined;
      await apiRequest(
        `${API_ENDPOINTS.watchlist.v2}/${userShowId}`,
        {
          method: 'DELETE',
        },
        token
      );

      // Remove from local state
      setShows((prevShows) => prevShows.filter((show) => show.id !== userShowId));
      fetchStats();
    } catch (err) {
      console.error('Failed to remove show:', err);
      alert('Failed to remove show');
    }
  };

  // Handle show expansion
  const toggleShowExpansion = async (userShow: UserShow) => {
    const isExpanding = expandedShow !== userShow.id;
    setExpandedShow(isExpanding ? userShow.id || null : null); // Handle userShow.id being undefined

    if (isExpanding && !showAnalysis[userShow.show.tmdb_id]) {
      await fetchShowAnalysis(userShow.show.tmdb_id);
    }
  };

  // Fetch detailed show analysis
  const fetchShowAnalysis = async (tmdbId: number) => {
    try {
      setLoadingAnalysis((prev) => ({ ...prev, [tmdbId]: true }));

      const country = UserManager.getCountry();
      const response = await fetch(
        `${API_ENDPOINTS.tmdb.base}/show/${tmdbId}/analyze?country=${country}`
      );
      if (!response.ok) throw new Error('Failed to fetch analysis');

      const data = await response.json();
      setShowAnalysis((prev) => ({ ...prev, [tmdbId]: data.analysis }));

      // Seed series-wide total from analysis (includes future episodes)
      try {
        const totalFromAnalysis = (data.analysis?.seasonInfo || []).reduce(
          (sum: number, s: any) => sum + (s.episodeCount || 0),
          0
        );
        if (totalFromAnalysis > 0) {
          setSeriesProgress((prev) => ({
            ...prev,
            [tmdbId]: {
              total: Math.max(prev[tmdbId]?.total || 0, totalFromAnalysis),
              watched: prev[tmdbId]?.watched || 0,
            },
          }));
        }
      } catch {
        // Ignore episode count errors
      }

      // Set default selected season to latest
      if (data.analysis?.seasonInfo?.length > 0) {
        const latestSeason = Math.max(...data.analysis.seasonInfo.map((s: any) => s.seasonNumber));
        console.log(`Setting default season to ${latestSeason} for show ${tmdbId}`);
        setSelectedSeasons((prev) => ({ ...prev, [tmdbId]: latestSeason }));

        // Automatically fetch episodes for the default season from raw season endpoint
        fetchSeasonEpisodes(tmdbId, latestSeason);
      }
    } catch (err) {
      console.error('Failed to fetch show analysis:', err);
    } finally {
      setLoadingAnalysis((prev) => ({ ...prev, [tmdbId]: false }));
    }
  };

  // Fetch season episodes
  const fetchSeasonEpisodes = async (tmdbId: number, seasonNumber: number) => {
    try {
      const userId = UserManager.getCurrentUserId();
      console.log(`Fetching episodes for show ${tmdbId}, season ${seasonNumber}, user ${userId}`);

      // Fetch episode details from TMDB RAW season endpoint (source of truth for episodes)
      const country = UserManager.getCountry();
      const rawUrl = `${API_ENDPOINTS.tmdb.base}/show/${tmdbId}/season/${seasonNumber}/raw?country=${country}`;
      console.log(`Fetching from TMDB RAW: ${rawUrl}`);

      const response = await fetch(rawUrl);
      if (!response.ok)
        throw new Error(`Failed to fetch season episodes (raw): ${response.status}`);

      const data = await response.json();
      const season = data.raw?.season || data.raw;
      const episodes = (season?.episodes || []).map((ep: any) => ({
        number: ep.episode_number,
        airDate: ep.air_date ? new Date(ep.air_date).toISOString() : undefined,
        title: ep.name || `Episode ${ep.episode_number}`,
      }));
      console.log(`Got ${episodes.length} episodes from RAW for season ${seasonNumber}`);

      // Fetch stored progress for this show
      const progressUrl = `${API_ENDPOINTS.watchlist.v2}/${tmdbId}/progress`;
      console.log(`Fetching progress from: ${progressUrl}`);

      const token = localStorage.getItem('authToken') || undefined;
      const progressResponse = await fetch(progressUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      let storedProgress: any[] = [];
      if (progressResponse.ok) {
        const progressData = await progressResponse.json();
        // Add type guards for progressData.data.seasons
        if (progressData && progressData.data && progressData.data.seasons) {
          storedProgress = progressData.data.seasons[seasonNumber] || [];
          console.log(
            `Got ${storedProgress.length} stored progress entries for season ${seasonNumber}`
          );
        } else {
          console.log('Progress data or seasons not found in response.');
        }
      } else {
        console.log(`No stored progress found (${progressResponse.status})`);
      }

      // Combine TMDB episode data with stored progress
      const combinedEpisodes = episodes.map((ep: DisplayEpisode) => {
        // Explicitly type ep
        const storedEp = storedProgress.find(
          (progress: StoredEpisodeProgress) => progress.episodeNumber === ep.number
        ); // Explicitly type progress
        return {
          number: ep.number,
          airDate: ep.airDate,
          title: ep.title,
          watched: storedEp?.status === 'watched' || false,
        };
      });

      console.log(`Combined episodes for season ${seasonNumber}:`, combinedEpisodes);

      setEpisodeData((prev) => ({
        ...prev,
        [tmdbId]: {
          ...prev[tmdbId],
          [seasonNumber]: combinedEpisodes,
        },
      }));

      console.log(`Episode data updated for show ${tmdbId}, season ${seasonNumber}`);
    } catch (err) {
      console.error('Failed to fetch season episodes:', err);
    }
  };

  // Fetch overall progress for a show (series-wide) so header has progress on initial load
  const fetchShowProgress = async (tmdbId: number) => {
    try {
      const token = localStorage.getItem('authToken') || undefined;

      // 1) Get total planned episodes across all seasons from analyze (country filter)
      let total = 0;
      try {
        const ctry = UserManager.getCountry();
        const analyzeResp = await fetch(
          `${API_ENDPOINTS.tmdb.base}/show/${tmdbId}/analyze?country=${ctry}`
        );
        if (analyzeResp.ok) {
          const analyze = await analyzeResp.json();
          const seasonInfo = analyze?.analysis?.seasonInfo || [];
          total = seasonInfo.reduce((sum: number, s: any) => sum + (s.episodeCount || 0), 0);
        }
      } catch (e) {
        console.warn('analyze fetch failed for total episodes; will fall back if needed', e);
      }

      // 2) Get watched count from stored progress
      let watched = 0;
      try {
        const progressResp = await fetch(`${API_ENDPOINTS.watchlist.v2}/${tmdbId}/progress`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (progressResp.ok) {
          const json = await progressResp.json();
          const seasons = json?.data?.seasons || {};
          for (const key of Object.keys(seasons)) {
            const eps = seasons[key] || [];
            watched += eps.filter((e: StoredEpisodeProgress) => e.status === 'watched').length;
          }
        }
      } catch (e) {
        console.warn('progress fetch failed for watched episodes; defaulting to 0', e);
      }

      // 3) Fallback: derive total from analysis cache if API gave none
      if (total === 0 && showAnalysis[tmdbId]?.seasonInfo) {
        total = showAnalysis[tmdbId].seasonInfo.reduce(
          (sum: number, s: any) => sum + (s.episodeCount || 0),
          0
        );
      }

      return { total, watched };
    } catch (e) {
      console.warn('fetchShowProgress failed for', tmdbId, e);
      return null;
    }
  };

  // Handle season selection
  const handleSeasonChange = (tmdbId: number, seasonNumber: number) => {
    console.log(`Season changed to ${seasonNumber} for show ${tmdbId}`);
    setSelectedSeasons((prev) => ({ ...prev, [tmdbId]: seasonNumber }));

    // Always fetch episodes for this season to ensure we have fresh data
    fetchSeasonEpisodes(tmdbId, seasonNumber);
  };

  // Handle episode click - toggle watched/unwatched status
  const markEpisodeWatched = async (
    tmdbId: number,
    seasonNumber: number,
    episodeNumber: number
  ) => {
    try {
      const userId = UserManager.getCurrentUserId();

      // Check current episode status to determine toggle action
      const currentEpisodes = episodeData[tmdbId]?.[seasonNumber] || [];
      const currentEpisode = currentEpisodes.find((ep) => ep.number === episodeNumber);
      const isCurrentlyWatched = currentEpisode?.watched || false;

      // Toggle status: if watched, mark as unwatched; if unwatched, mark as watched
      const newStatus = isCurrentlyWatched ? 'unwatched' : 'watched';
      const actionVerb = newStatus === 'watched' ? 'marking' : 'unmarking';
      console.log(
        `User ${userId} ${actionVerb} episode ${episodeNumber} of season ${seasonNumber} for show ${tmdbId}`
      );

      // Make API call to persist the progress
      const token = localStorage.getItem('authToken') || undefined;
      await apiRequest(
        `${API_ENDPOINTS.watchlist.v2}/${tmdbId}/progress`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            seasonNumber,
            episodeNumber,
            status: newStatus,
          }),
        },
        token
      );

      // Update local UI state to reflect the change
      setEpisodeData((prev) => ({
        ...prev,
        [tmdbId]: {
          ...prev[tmdbId],
          [seasonNumber]: (prev[tmdbId]?.[seasonNumber] || []).map((ep: DisplayEpisode) => ({
            ...ep,
            watched:
              newStatus === 'watched'
                ? ep.number <= episodeNumber
                  ? true
                  : ep.watched // Mark this and previous episodes as watched
                : ep.number === episodeNumber
                  ? false
                  : ep.watched, // Only unmark this specific episode
          })),
        },
      }));

      // Update progress in local state with correct counting
      setShows((prevShows) =>
        prevShows.map((show) => {
          if (show.show.tmdb_id === tmdbId) {
            const currentProgress = show.progress || { totalEpisodes: 0, watchedEpisodes: 0 };

            // Count the actual watched episodes from the episode data
            const allSeasonData = episodeData[tmdbId] || {};
            let totalWatchedEpisodes = 0;
            Object.values(allSeasonData).forEach((seasonEpisodes: any[]) => {
              totalWatchedEpisodes += seasonEpisodes.filter((ep) => ep.watched).length;
            });

            // Adjust count based on the current toggle action
            if (newStatus === 'watched' && !isCurrentlyWatched) {
              totalWatchedEpisodes += episodeNumber; // Add episodes 1 through episodeNumber
            } else if (newStatus === 'unwatched' && isCurrentlyWatched) {
              totalWatchedEpisodes -= 1; // Remove just this episode
            }

            return {
              ...show,
              progress: {
                ...currentProgress,
                watchedEpisodes: Math.max(0, totalWatchedEpisodes),
              },
            };
          }
          return show;
        })
      );

      console.log(
        `Successfully ${newStatus === 'watched' ? 'marked' : 'unmarked'} episode ${episodeNumber} of season ${seasonNumber} for show ${tmdbId}`
      );
    } catch (error) {
      console.error('Failed to save episode progress:', error);
      alert('Failed to save episode progress. Please try again.');
    }
  };

  // Fetch poster from TMDB API
  const fetchShowPoster = async (tmdbId: number) => {
    try {
      const country = UserManager.getCountry();
      // Try to get poster from the show details API first
      const response = await fetch(
        `${API_ENDPOINTS.tmdb.base}/show/${tmdbId}/analyze?country=${country}`
      );
      if (!response.ok) {
        console.warn(`Failed to fetch show analysis for poster: ${response.status}`);
        return null;
      }

      const data = await response.json();
      const posterPath = data.analysis?.showDetails?.poster;

      if (posterPath) {
        setPosterOverrides((prev) => ({
          ...prev,
          [tmdbId]: posterPath,
        }));
        return posterPath;
      }

      // Fallback: try the raw season endpoint as mentioned in the issue
      const latestSeasonNumber =
        data.analysis?.seasonInfo?.[data.analysis.seasonInfo.length - 1]?.seasonNumber || 1;
      const seasonResponse = await fetch(
        `${API_ENDPOINTS.tmdb.base}/show/${tmdbId}/season/${latestSeasonNumber}/raw?country=${country}`
      );
      if (seasonResponse.ok) {
        const seasonData = await seasonResponse.json();
        const seasonPosterPath = seasonData.raw?.poster_path;
        if (seasonPosterPath) {
          const fullPosterUrl = `https://image.tmdb.org/t/p/w500${seasonPosterPath}`;
          setPosterOverrides((prev) => ({
            ...prev,
            [tmdbId]: fullPosterUrl,
          }));
          return fullPosterUrl;
        }
      }

      return null;
    } catch (error) {
      console.error(`Failed to fetch poster for show ${tmdbId}:`, error);
      return null;
    }
  };

  // Fetch streaming providers for a show from TMDB
  const fetchShowProviders = async (tmdbId: number) => {
    try {
      const country = UserManager.getCountry();
      const response = await fetch(
        `${API_ENDPOINTS.tmdb.base}/show/${tmdbId}/providers?country=${country}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch providers');
      }

      const data = await response.json();
      const providers = data.providers.map((provider: any) => ({
        id: provider.provider_id,
        name: provider.provider_name,
        logo_path: `https://image.tmdb.org/t/p/w45${provider.logo_path}`,
      }));

      setShowProviders((prev) => ({
        ...prev,
        [tmdbId]: providers,
      }));

      return providers;
    } catch (error) {
      console.error(`Failed to fetch providers for show ${tmdbId}:`, error);
      return [];
    }
  };

  const getStatusBadgeColor = (status: UserShow['status']): string => {
    switch (status) {
      case 'watchlist':
        return 'bg-blue-100 text-blue-800';
      case 'watching':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-purple-100 text-purple-800';
      case 'dropped':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const tabs = [
    { key: 'all' as const, label: 'All Shows', count: stats ? stats.totalShows : '...' },
    {
      key: 'watchlist' as const,
      label: 'Watchlist',
      count: stats ? stats.byStatus.watchlist : '...',
    },
    { key: 'watching' as const, label: 'Watching', count: stats ? stats.byStatus.watching : '...' },
    {
      key: 'completed' as const,
      label: 'Completed',
      count: stats ? stats.byStatus.completed : '...',
    },
  ];

  const StarRating: React.FC<{
    rating?: number | undefined;
    onRating?: (rating: number) => void;
    readonly?: boolean;
  }> = ({ rating, onRating, readonly = false }) => {
    const [hoveredRating, setHoveredRating] = useState<number | null>(null);

    return (
      <div className="flex items-center space-x-1">
        {[...Array(10)].map((_, i) => {
          const starIndex = i + 1;
          const currentRating = hoveredRating || rating || 0;

          // Determine star display state
          const isFull = currentRating >= starIndex;
          const isHalf = currentRating >= starIndex - 0.5 && currentRating < starIndex;

          return (
            <div key={i} className="relative inline-block">
              <button
                type="button"
                className={`text-sm transition-transform relative ${
                  readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
                }`}
                style={{ width: '16px', height: '16px' }}
                disabled={readonly}
              >
                {/* Base star (empty) */}
                <span className="absolute inset-0 text-gray-300">☆</span>

                {/* Half star overlay */}
                {isHalf && (
                  <span
                    className="absolute inset-0 text-yellow-400 overflow-hidden"
                    style={{ clipPath: 'inset(0 50% 0 0)' }}
                  >
                    ★
                  </span>
                )}

                {/* Full star overlay */}
                {isFull && <span className="absolute inset-0 text-yellow-400">★</span>}

                {/* Clickable areas for half and full ratings */}
                {!readonly && (
                  <>
                    {/* Left half - half star */}
                    <div
                      className="absolute inset-0 w-1/2 h-full cursor-pointer z-10"
                      onClick={() => onRating?.(starIndex - 0.5)}
                      onMouseEnter={() => setHoveredRating(starIndex - 0.5)}
                      onMouseLeave={() => setHoveredRating(null)}
                    />
                    {/* Right half - full star */}
                    <div
                      className="absolute inset-0 w-1/2 h-full cursor-pointer z-10 left-1/2"
                      onClick={() => onRating?.(starIndex)}
                      onMouseEnter={() => setHoveredRating(starIndex)}
                      onMouseLeave={() => setHoveredRating(null)}
                    />
                  </>
                )}
              </button>
            </div>
          );
        })}
        {rating !== undefined && rating > 0 && (
          <span className="text-xs text-gray-500 ml-2">
            {rating % 1 === 0 ? rating.toFixed(0) : rating.toFixed(1)}/10
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Shows</h1>
            <p className="text-gray-600 mt-2">
              Track your favorite shows and manage your watching progress
            </p>
          </div>
          <div className="shrink-0">
            <label className="block text-xs font-medium text-gray-600 mb-1">Country/Region</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              {['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'JP', 'KR', 'IN', 'BR'].map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats Cards */}
        {loadingStats ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-600">Loading stats...</span>
            </div>
          </div>
        ) : statsError ? (
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-8"
            role="alert"
          >
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline"> {statsError}</span>
          </div>
        ) : (
          stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500">Total Shows</h3>
                <p className="text-3xl font-bold text-gray-900">{stats.totalShows}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500">Currently Watching</h3>
                <p className="text-3xl font-bold text-green-600">{stats.byStatus.watching}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500">Completed</h3>
                <p className="text-3xl font-bold text-purple-600">{stats.byStatus.completed}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500">Average Rating</h3>
                <p className="text-3xl font-bold text-yellow-600">
                  {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '-'}
                </p>
              </div>
            </div>
          )
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                  <span
                    className={`ml-2 py-1 px-2 rounded-full text-xs ${
                      activeTab === tab.key
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                  {activeTab === tab.key && isBackgroundLoading && (
                    <span
                      className="ml-2 inline-block h-3 w-3 rounded-full bg-blue-200 animate-pulse"
                      aria-hidden="true"
                    />
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Show List */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-3 text-gray-600">Loading your shows...</span>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-600">{error}</p>
                <button
                  onClick={() => fetchWatchlist()}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Retry
                </button>
              </div>
            ) : shows.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No shows found</p>
                <p className="text-gray-400 mt-2">
                  Start adding shows to your {activeTab === 'all' ? 'watchlist' : activeTab}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {shows.map((userShow) => {
                  const isExpanded = expandedShow === userShow.id;
                  const analysis = showAnalysis[userShow.show.tmdb_id];
                  const selectedSeason = selectedSeasons[userShow.show.tmdb_id];
                  const episodes =
                    selectedSeason !== undefined
                      ? episodeData[userShow.show.tmdb_id]?.[selectedSeason]
                      : undefined;

                  return (
                    <div
                      key={userShow.id}
                      className={`bg-gray-50 rounded-lg p-4 hover:shadow-md transition-all relative ${isExpanded ? 'lg:col-span-2 xl:col-span-3' : ''}`}
                    >
                      {/* Main show info - clickable */}
                      <div className="cursor-pointer" onClick={() => toggleShowExpansion(userShow)}>
                        <div className="flex space-x-4">
                          {/* Poster */}
                          <div className="flex-shrink-0">
                            {userShow.show.poster_path || posterOverrides[userShow.show.tmdb_id] ? (
                              <img
                                src={
                                  userShow.show.poster_path ||
                                  posterOverrides[userShow.show.tmdb_id]!
                                }
                                alt={`${userShow.show.title} poster`}
                                className="w-16 h-24 object-cover rounded"
                              />
                            ) : (
                              <div className="w-16 h-24 bg-gray-300 rounded flex items-center justify-center">
                                <span className="text-gray-500 text-xs">No Image</span>
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <h3 className="font-semibold text-gray-900 truncate">
                                  {userShow.show.title}
                                </h3>
                                <button className="text-gray-400 hover:text-gray-600">
                                  {isExpanded ? '−' : '+'}
                                </button>
                              </div>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(userShow.status)}`}
                              >
                                {userShow.status}
                              </span>
                            </div>

                            {/* Progress */}
                            <div className="mb-3">
                              {(() => {
                                const tmdbId = userShow.show.tmdb_id;
                                const seasonNumber = selectedSeasons[tmdbId];
                                const seasonEpisodes =
                                  seasonNumber !== undefined
                                    ? episodeData[tmdbId]?.[seasonNumber]
                                    : undefined;

                                const overall = seriesProgress[tmdbId]; // { total, watched } from prefetch
                                const denom = seasonEpisodes
                                  ? seasonEpisodes.length
                                  : overall?.total || 0;
                                const numer = seasonEpisodes
                                  ? seasonEpisodes.filter((ep) => ep.watched).length
                                  : overall?.watched || 0;

                                return (
                                  <>
                                    <ProgressBar
                                      value={numer}
                                      total={denom}
                                      label="Progress"
                                      size="md"
                                    />
                                    {userShow.progress?.currentEpisode && (
                                      <EpisodeProgressDisplay
                                        seasonNumber={
                                          userShow.progress.currentEpisode.season_number
                                        }
                                        episodeNumber={
                                          userShow.progress.currentEpisode.episode_number
                                        }
                                        episodeName={
                                          userShow.progress.currentEpisode.name || undefined
                                        }
                                        tmdbId={tmdbId}
                                      />
                                    )}
                                  </>
                                );
                              })()}
                            </div>

                            {/* Rating */}
                            <div className="mb-3">
                              <StarRating
                                rating={userShow.show_rating}
                                onRating={(rating) => {
                                  const uid = (userShow as any).user_show_id ?? userShow.id;
                                  if (uid) rateShow(uid, rating);
                                }}
                              />
                            </div>

                            {/* Streaming Provider - reflect country and provider availability */}
                            {(() => {
                              const availableProviders = showProviders[userShow.show.tmdb_id] || [];
                              const hasProviders = availableProviders.length > 0;
                              const hasMultipleProviders = availableProviders.length > 1;

                              if (!hasProviders && !userShow.streaming_provider) return null;

                              return (
                                <div className="mb-3 relative">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm text-gray-600">Streaming on:</span>
                                    {userShow.streaming_provider ? (
                                      <div className="flex items-center space-x-2">
                                        <img
                                          src={userShow.streaming_provider.logo_path!}
                                          alt={userShow.streaming_provider.name || 'Provider logo'}
                                          className="w-6 h-6 rounded"
                                        />
                                        <span className="text-sm font-medium">
                                          {userShow.streaming_provider.name}
                                        </span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            userShow.id &&
                                              updateStreamingProvider(userShow.id, null);
                                          }}
                                          className="text-gray-400 hover:text-red-600 text-xs"
                                          title="Remove streaming provider"
                                        >
                                          ×
                                        </button>
                                      </div>
                                    ) : hasMultipleProviders ? (
                                      <div className="relative">
                                        <select
                                          onClick={(e) => e.stopPropagation()}
                                          onChange={(e) => {
                                            const value = e.target.value;
                                            if (value) {
                                              const [idStr, name, logo_path] = value.split('|');
                                              const uid =
                                                (userShow as any).user_show_id ?? userShow.id;
                                              if (uid && idStr) {
                                                const id = parseInt(idStr, 10);
                                                if (!isNaN(id)) {
                                                  updateStreamingProvider(uid, {
                                                    id,
                                                    name: name!,
                                                    logo_path: logo_path!,
                                                  });
                                                }
                                              }
                                            }
                                          }}
                                          className="text-sm border border-gray-300 rounded px-2 py-1 bg-white min-w-[140px] relative z-10"
                                          defaultValue=""
                                        >
                                          <option value="">Select service...</option>
                                          {availableProviders.map((provider) => (
                                            <option
                                              key={provider.id}
                                              value={`${provider.id}|${provider.name}|${provider.logo_path}`}
                                            >
                                              {provider.name}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    ) : hasProviders ? (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const p = availableProviders[0];
                                          const uid = (userShow as any).user_show_id ?? userShow.id;
                                          if (uid && p) {
                                            updateStreamingProvider(uid, {
                                              id: p.id,
                                              name: p.name,
                                              logo_path: p.logo_path,
                                            });
                                          }
                                        }}
                                        className="inline-flex items-center space-x-2 px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                                        title="Set streaming provider"
                                      >
                                        {availableProviders[0] && (
                                          <>
                                            <img
                                              src={availableProviders[0].logo_path}
                                              alt={availableProviders[0].name}
                                              className="w-5 h-5 rounded"
                                            />
                                            <span>Use {availableProviders[0].name}</span>
                                          </>
                                        )}
                                      </button>
                                    ) : null}
                                  </div>
                                </div>
                              );
                            })()}
                            {/* TV Guide settings: Buffer days and per-show country override */}
                            <div className="mt-3 flex items-end gap-6">
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">
                                  Buffer days
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  max={30}
                                  defaultValue={userShow.buffer_days || 0}
                                  onBlur={(e) => {
                                    e.stopPropagation();
                                    const v = Number(e.currentTarget.value) || 0;
                                    const uid = (userShow as any).user_show_id ?? userShow.id;
                                    if (!uid) return;
                                    apiRequest(
                                      `${API_ENDPOINTS.watchlist.v2}/${uid}/buffer`,
                                      {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ bufferDays: v }),
                                      },
                                      localStorage.getItem('authToken') || undefined
                                    ).then(() =>
                                      setShows((prev) =>
                                        prev.map((s) =>
                                          (s as any).user_show_id === uid || s.id === uid
                                            ? { ...s, buffer_days: v }
                                            : s
                                        )
                                      )
                                    );
                                  }}
                                  className="w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">
                                  Show Country
                                </label>
                                <select
                                  value={userShow.country_code || ''}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    const code = e.target.value || null;
                                    const uid = (userShow as any).user_show_id ?? userShow.id;
                                    if (!uid) return;
                                    apiRequest(
                                      `${API_ENDPOINTS.watchlist.v2}/${uid}/country`,
                                      {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ countryCode: code }),
                                      },
                                      localStorage.getItem('authToken') || undefined
                                    ).then(() =>
                                      setShows((prev) =>
                                        prev.map((s) =>
                                          (s as any).user_show_id === uid || s.id === uid
                                            ? { ...s, country_code: code || null }
                                            : s
                                        )
                                      )
                                    );
                                  }}
                                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                                >
                                  <option value="">Default ({country})</option>
                                  {['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'JP', 'KR', 'IN', 'BR'].map(
                                    (code) => (
                                      <option key={code} value={code}>
                                        {code}
                                      </option>
                                    )
                                  )}
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div
                          className="mt-6 pt-4 border-t border-gray-200"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {loadingAnalysis[userShow.show.tmdb_id] ? (
                            <div className="flex items-center justify-center py-8">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                              <span className="ml-3 text-gray-600">Loading show details...</span>
                            </div>
                          ) : analysis ? (
                            <div className="space-y-4">
                              {/* Season selector */}
                              <div className="flex items-center space-x-4">
                                <label className="text-sm font-medium text-gray-700">Season:</label>
                                <select
                                  value={selectedSeason || ''}
                                  onChange={(e) =>
                                    handleSeasonChange(
                                      userShow.show.tmdb_id,
                                      parseInt(e.target.value)
                                    )
                                  }
                                  className="px-3 py-1 border border-gray-300 rounded text-sm"
                                >
                                  {analysis.seasonInfo?.map((season: any) => (
                                    <option key={season.seasonNumber} value={season.seasonNumber}>
                                      Season {season.seasonNumber} ({season.episodeCount} episodes)
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Episode list */}
                              {episodes && selectedSeason ? (
                                <div className="space-y-2">
                                  <h4 className="font-medium text-gray-900">
                                    Season {selectedSeason} Episodes: ({episodes.length} episodes)
                                  </h4>
                                  <div className="max-h-64 overflow-y-auto space-y-1">
                                    {episodes.map((episode: DisplayEpisode) => {
                                      const airDate = new Date(episode.airDate);
                                      const today = new Date();
                                      const isFutureEpisode = airDate > today;

                                      // Find the next unaired episode (first future episode that hasn't aired yet)
                                      const futureEpisodes = episodes.filter(
                                        (ep: DisplayEpisode) => new Date(ep.airDate) > today
                                      );
                                      const nextUnaired = futureEpisodes.sort(
                                        (a: DisplayEpisode, b: DisplayEpisode) =>
                                          new Date(a.airDate).getTime() -
                                          new Date(b.airDate).getTime()
                                      )[0];
                                      const isAiringNext =
                                        isFutureEpisode && episode.number === nextUnaired?.number;

                                      return (
                                        <button
                                          key={episode.number}
                                          onClick={() =>
                                            !isFutureEpisode &&
                                            markEpisodeWatched(
                                              userShow.show.tmdb_id,
                                              selectedSeason,
                                              episode.number
                                            )
                                          }
                                          disabled={isFutureEpisode}
                                          className={`w-full text-left p-2 rounded text-sm transition-colors ${
                                            isAiringNext
                                              ? 'bg-blue-50 text-blue-700 cursor-not-allowed'
                                              : isFutureEpisode
                                                ? 'bg-gray-50 text-gray-500 cursor-not-allowed'
                                                : episode.watched
                                                  ? 'bg-green-100 text-green-800'
                                                  : 'bg-white hover:bg-gray-100'
                                          }`}
                                        >
                                          <div className="flex items-center justify-between">
                                            <span className="font-medium">
                                              {isAiringNext
                                                ? '📅'
                                                : isFutureEpisode
                                                  ? '⏳'
                                                  : episode.watched
                                                    ? '✓'
                                                    : `${episode.number}.`}{' '}
                                              {episode.title}
                                              {isAiringNext && (
                                                <span className="ml-2 text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded">
                                                  Airing Next
                                                </span>
                                              )}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                              {new Date(episode.airDate).toLocaleDateString()}
                                            </span>
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>

                                  {/* Season progress */}
                                  <div className="space-y-2">
                                    <div className="text-sm text-gray-600">
                                      {episodes.filter((ep: DisplayEpisode) => ep.watched).length}/
                                      {episodes.length} episodes watched in season {selectedSeason}
                                    </div>

                                    {/* Full show progress bar - simplified version */}
                                    <div className="space-y-1">
                                      {(() => {
                                        const tmdbId = userShow.show.tmdb_id;
                                        // Prefer API-provided overall progress if present; otherwise derive.
                                        const prefetch = seriesProgress[tmdbId];
                                        const overallTotal =
                                          prefetch?.total && prefetch.total > 0
                                            ? prefetch.total
                                            : analysis?.seasonInfo?.reduce(
                                                (sum: number, s: any) =>
                                                  sum + (s.episodeCount || 0),
                                                0
                                              ) || 0;

                                        const allSeasonData = episodeData[tmdbId] || {};
                                        const watchedDerived = Object.values(allSeasonData).reduce(
                                          (acc: number, seasonEps: any) => {
                                            const arr = (seasonEps as any[]) || [];
                                            return acc + arr.filter((ep: any) => ep.watched).length;
                                          },
                                          0
                                        );
                                        const overallWatched = Math.max(
                                          prefetch?.watched ?? 0,
                                          watchedDerived
                                        );

                                        return (
                                          <ProgressBar
                                            value={overallWatched}
                                            total={overallTotal}
                                            label="Overall series progress"
                                            size="sm"
                                          />
                                        );
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              ) : selectedSeason ? (
                                <div className="text-center py-8 text-gray-500">
                                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                                  Loading episodes for season {selectedSeason}...
                                </div>
                              ) : (
                                <div className="text-center py-4 text-gray-500">
                                  Select a season to view episodes
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-4 text-gray-500">
                              Failed to load show details
                            </div>
                          )}
                        </div>
                      )}

                      {/* Actions - always visible */}
                      <div
                        className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {userShow.status === 'watchlist' && userShow.id && (
                          <button
                            onClick={() => {
                              const uid = (userShow as any).user_show_id ?? userShow.id;
                              if (uid) updateShowStatus(uid, 'watching');
                            }}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                          >
                            Start Watching
                          </button>
                        )}

                        {userShow.status === 'watching' && userShow.id && (
                          <button
                            onClick={() => {
                              const uid = (userShow as any).user_show_id ?? userShow.id;
                              if (uid) updateShowStatus(uid, 'completed');
                            }}
                            className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                          >
                            Mark Completed
                          </button>
                        )}

                        {userShow.id && (
                          <button
                            onClick={() => {
                              const uid = (userShow as any).user_show_id ?? userShow.id;
                              if (uid) removeShow(uid);
                            }}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      {/* Notes */}
                      {userShow.notes && (
                        <p className="text-sm text-gray-600 mt-2 italic">"{userShow.notes}"</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyShows;
