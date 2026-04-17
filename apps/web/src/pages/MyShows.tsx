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

  // Onboarding search state (shown when watchlist is empty)
  const [onboardingQuery, setOnboardingQuery] = useState('');
  const [onboardingResults, setOnboardingResults] = useState<{ id: number; title: string; year?: number; poster?: string; overview: string }[]>([]);
  const [onboardingSearching, setOnboardingSearching] = useState(false);
  const [onboardingAdding, setOnboardingAdding] = useState<number | null>(null);
  const [onboardingAdded, setOnboardingAdded] = useState<Set<number>>(new Set());

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

  // Onboarding: search TMDB inline (debounced via useEffect)
  useEffect(() => {
    if (!onboardingQuery.trim()) { setOnboardingResults([]); return; }
    const timer = setTimeout(async () => {
      setOnboardingSearching(true);
      try {
        const res = await fetch(`/api/tmdb/search?query=${encodeURIComponent(onboardingQuery)}`);
        const data = await res.json();
        setOnboardingResults(data.results?.slice(0, 8) || []);
      } catch {
        setOnboardingResults([]);
      } finally {
        setOnboardingSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [onboardingQuery]);

  // Onboarding: add a show then refresh the grid
  const addShowFromOnboarding = async (show: { id: number; title: string }) => {
    setOnboardingAdding(show.id);
    try {
      const token = localStorage.getItem('authToken') || undefined;
      await apiRequest(
        API_ENDPOINTS.watchlist.v2,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tmdbId: show.id, title: show.title, status: 'watchlist' }),
        },
        token
      );
      setOnboardingAdded((prev) => new Set(prev).add(show.id));
      // Refresh watchlist so grid appears
      await fetchWatchlist('all', false);
    } catch (e) {
      console.error('Failed to add show from onboarding:', e);
    } finally {
      setOnboardingAdding(null);
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

  const [selectedShow, setSelectedShow] = useState<UserShow | null>(null);

  const openDetail = (userShow: UserShow) => {
    setSelectedShow(userShow);
    if (!showAnalysis[userShow.show.tmdb_id]) {
      fetchShowAnalysis(userShow.show.tmdb_id);
    }
  };

  const closeDetail = () => setSelectedShow(null);

  const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w342';

  const getPosterUrl = (userShow: UserShow): string | null => {
    const path = userShow.show.poster_path || posterOverrides[userShow.show.tmdb_id];
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${TMDB_IMAGE_BASE}${path}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">My Shows</h1>
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-gray-500">Region</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'JP', 'KR', 'IN', 'BR'].map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
              }`}
            >
              {tab.label}
              <span className={`text-xs ${activeTab === tab.key ? 'text-primary-200' : 'text-gray-400'}`}>
                {tab.count}
              </span>
              {activeTab === tab.key && isBackgroundLoading && (
                <span className="inline-block h-2 w-2 rounded-full bg-primary-300 animate-pulse" />
              )}
            </button>
          ))}
        </div>

        {/* Poster Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="ml-3 text-gray-500">Loading your shows...</span>
          </div>
        ) : error ? (
          <div className="text-center py-24">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => fetchWatchlist()}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              Retry
            </button>
          </div>
        ) : shows.length === 0 ? (
          /* Onboarding — shown when watchlist is empty */
          <div className="max-w-lg mx-auto py-16 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">What are you watching?</h2>
            <p className="text-gray-500 text-sm mb-6">Add your first show to get started</p>

            {/* Inline search */}
            <div className="relative mb-4">
              <input
                type="text"
                value={onboardingQuery}
                onChange={(e) => setOnboardingQuery(e.target.value)}
                placeholder="Search for a show..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent shadow-sm"
                autoFocus
              />
              {onboardingSearching && (
                <div className="absolute right-3 top-3.5">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600" />
                </div>
              )}
            </div>

            {/* Search results */}
            {onboardingResults.length > 0 && (
              <div className="text-left space-y-2 mb-6">
                {onboardingResults.map((show) => (
                  <div
                    key={show.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 bg-white hover:border-gray-200 transition-colors"
                  >
                    {show.poster ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w92${show.poster}`}
                        alt=""
                        className="w-10 h-14 rounded object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-14 rounded bg-gray-100 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">{show.title}</p>
                      {show.year && <p className="text-xs text-gray-400">{show.year}</p>}
                    </div>
                    <button
                      onClick={() => addShowFromOnboarding(show)}
                      disabled={onboardingAdding === show.id || onboardingAdded.has(show.id)}
                      className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        onboardingAdded.has(show.id)
                          ? 'bg-green-100 text-green-700 cursor-default'
                          : 'bg-primary-600 text-white hover:bg-primary-700'
                      }`}
                    >
                      {onboardingAdding === show.id
                        ? '...'
                        : onboardingAdded.has(show.id)
                        ? 'Added!'
                        : 'Add'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Fallback link */}
            <a href="/search" className="text-primary-600 hover:underline text-sm">
              Go to full search →
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
            {shows.map((userShow) => {
              const posterUrl = getPosterUrl(userShow);
              const progress = seriesProgress[userShow.show.tmdb_id];
              const pct = progress?.total ? Math.round((progress.watched / progress.total) * 100) : 0;

              return (
                <button
                  key={userShow.id}
                  onClick={() => openDetail(userShow)}
                  className="group relative flex flex-col text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-lg"
                >
                  {/* Poster image */}
                  <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden bg-gray-200 shadow-sm group-hover:shadow-md transition-shadow">
                    {posterUrl ? (
                      <img
                        src={posterUrl}
                        alt={`${userShow.show.title} poster`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-2">
                        <span className="text-gray-400 text-xs text-center leading-tight">
                          {userShow.show.title}
                        </span>
                      </div>
                    )}

                    {/* Status badge */}
                    <span
                      className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-xs font-medium ${getStatusBadgeColor(userShow.status)}`}
                    >
                      {userShow.status === 'watchlist' ? 'List' : userShow.status === 'watching' ? 'Watching' : userShow.status === 'completed' ? 'Done' : userShow.status}
                    </span>

                    {/* Progress bar at bottom of poster */}
                    {progress && progress.total > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
                        <div
                          className="h-full bg-primary-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Title below poster */}
                  <p className="mt-1.5 text-xs text-gray-700 font-medium leading-tight line-clamp-2 px-0.5">
                    {userShow.show.title}
                  </p>
                  {progress && progress.total > 0 && (
                    <p className="text-xs text-gray-400 px-0.5">
                      {progress.watched}/{progress.total} ep
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail slide-over */}
      {selectedShow && (() => {
        const userShow = selectedShow;
        const analysis = showAnalysis[userShow.show.tmdb_id];
        const selectedSeason = selectedSeasons[userShow.show.tmdb_id];
        const episodes = selectedSeason !== undefined ? episodeData[userShow.show.tmdb_id]?.[selectedSeason] : undefined;
        const posterUrl = getPosterUrl(userShow);

        return (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/40 z-40" onClick={closeDetail} />

            {/* Panel */}
            <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-50 flex flex-col overflow-hidden">
              {/* Panel header */}
              <div className="flex items-start gap-4 p-4 border-b border-gray-100">
                {posterUrl && (
                  <img src={posterUrl} alt="" className="w-14 h-20 rounded object-cover shrink-0" />
                )}
                <div className="flex-1 min-w-0 pt-1">
                  <h2 className="font-semibold text-gray-900 leading-tight">{userShow.show.title}</h2>
                  <span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(userShow.status)}`}>
                    {userShow.status}
                  </span>
                </div>
                <button onClick={closeDetail} className="text-gray-400 hover:text-gray-600 text-xl leading-none mt-1">×</button>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Rating */}
                <StarRating
                  rating={userShow.show_rating}
                  onRating={(rating) => {
                    const uid = (userShow as any).user_show_id ?? userShow.id;
                    if (uid) rateShow(uid, rating);
                  }}
                />

                {/* Status actions */}
                <div className="flex flex-wrap gap-2">
                  {userShow.status === 'watchlist' && userShow.id && (
                    <button
                      onClick={() => { const uid = (userShow as any).user_show_id ?? userShow.id; if (uid) updateShowStatus(uid, 'watching'); closeDetail(); }}
                      className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                    >
                      Start Watching
                    </button>
                  )}
                  {userShow.status === 'watching' && userShow.id && (
                    <button
                      onClick={() => { const uid = (userShow as any).user_show_id ?? userShow.id; if (uid) updateShowStatus(uid, 'completed'); closeDetail(); }}
                      className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700"
                    >
                      Mark Completed
                    </button>
                  )}
                  {userShow.id && (
                    <button
                      onClick={() => { const uid = (userShow as any).user_show_id ?? userShow.id; if (uid) removeShow(uid); closeDetail(); }}
                      className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 text-sm rounded-md hover:bg-red-100"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {/* Episodes */}
                {loadingAnalysis[userShow.show.tmdb_id] ? (
                  <div className="flex items-center gap-2 text-gray-500 py-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-500" />
                    Loading episodes...
                  </div>
                ) : analysis ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium text-gray-700">Season</label>
                      <select
                        value={selectedSeason || ''}
                        onChange={(e) => handleSeasonChange(userShow.show.tmdb_id, parseInt(e.target.value))}
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        {analysis.seasonInfo?.map((season: any) => (
                          <option key={season.seasonNumber} value={season.seasonNumber}>
                            Season {season.seasonNumber} ({season.episodeCount} ep)
                          </option>
                        ))}
                      </select>
                    </div>

                    {episodes && selectedSeason ? (
                      <div className="space-y-1">
                        {episodes.map((episode: DisplayEpisode) => {
                          const airDate = new Date(episode.airDate);
                          const today = new Date();
                          const isFuture = airDate > today;
                          const futureEps = episodes.filter((ep: DisplayEpisode) => new Date(ep.airDate) > today);
                          const nextUnaired = [...futureEps].sort((a: DisplayEpisode, b: DisplayEpisode) => new Date(a.airDate).getTime() - new Date(b.airDate).getTime())[0];
                          const isAiringNext = isFuture && episode.number === nextUnaired?.number;

                          return (
                            <button
                              key={episode.number}
                              onClick={() => !isFuture && markEpisodeWatched(userShow.show.tmdb_id, selectedSeason, episode.number)}
                              disabled={isFuture}
                              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between ${
                                isAiringNext ? 'bg-blue-50 text-blue-700' : isFuture ? 'bg-gray-50 text-gray-400' : episode.watched ? 'bg-green-50 text-green-800' : 'hover:bg-gray-50 text-gray-700'
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                <span className="text-xs w-4">{episode.watched ? '✓' : episode.number}</span>
                                <span className="truncate">{episode.title}</span>
                                {isAiringNext && <span className="text-xs bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded shrink-0">Next</span>}
                              </span>
                              <span className="text-xs text-gray-400 shrink-0 ml-2">{new Date(episode.airDate).toLocaleDateString()}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : selectedSeason ? (
                      <div className="text-center py-4 text-gray-400 text-sm">Loading episodes...</div>
                    ) : null}
                  </div>
                ) : null}

                {/* Notes */}
                {userShow.notes && (
                  <p className="text-sm text-gray-500 italic">"{userShow.notes}"</p>
                )}
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
};

export default MyShows;
