/**
 * Search Shows Page
 *
 * Browse and search TV shows from TMDB with detailed analysis and watchlist functionality.
 * Based on the TMDB testing dashboard but with integrated watchlist features.
 */

import React, { useState, useEffect } from 'react';
import { UserManager } from '../services/UserManager';
import { API_ENDPOINTS, API_BASE_URL, apiRequest } from '../config/api';
import TMDBSearch from '../components/TMDBSearch';
import PatternAnalysis from '../components/PatternAnalysis';

interface TMDBShow {
  id: number;
  title: string;
  year?: number;
  poster?: string;
  overview: string;
  firstAirDate?: string;
  popularity: number;
}

interface WatchlistAddRequest {
  tmdbId: number;
  title: string;
  status: 'watchlist' | 'watching';
}

const SearchShows: React.FC = () => {
  const [selectedShow, setSelectedShow] = useState<TMDBShow | null>(null);
  const [country, setCountry] = useState<string>(UserManager.getCountry());
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [selectedSeason, setSelectedSeason] = useState<number | undefined>(undefined);
  const [addingToWatchlist, setAddingToWatchlist] = useState<number | null>(null);
  const [settingProgress, setSettingProgress] = useState(false);
  const [watchlistStatus, setWatchlistStatus] = useState<{
    isInWatchlist: boolean;
    isWatching: boolean;
    loading: boolean;
  }>({ isInWatchlist: false, isWatching: false, loading: false });
  const [watchedEpisodes, setWatchedEpisodes] = useState<Set<string>>(new Set());

  const countries = [
    { code: 'US', name: 'United States' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'CA', name: 'Canada' },
    { code: 'AU', name: 'Australia' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'JP', name: 'Japan' },
    { code: 'KR', name: 'South Korea' },
    { code: 'IN', name: 'India' },
    { code: 'BR', name: 'Brazil' },
  ];

  // Check if show is in user's watchlist and get episode progress
  const checkWatchlistStatus = async (tmdbId: number) => {
    try {
      setWatchlistStatus((prev) => ({ ...prev, loading: true }));
      const token = localStorage.getItem('authToken') || undefined;

      const data = await apiRequest(API_ENDPOINTS.watchlist.v2, {}, token);
      const userShow = data.data?.shows?.find((show: any) => show.show.tmdb_id === tmdbId);

      setWatchlistStatus({
        isInWatchlist: !!userShow,
        isWatching: userShow?.status === 'watching',
        loading: false,
      });

      // If show is in watchlist, get episode progress
      if (userShow) {
        await fetchEpisodeProgress(tmdbId);
      } else {
        setWatchedEpisodes(new Set());
      }
    } catch (error) {
      console.error('Failed to check watchlist status:', error);
      setWatchlistStatus({ isInWatchlist: false, isWatching: false, loading: false });
      setWatchedEpisodes(new Set());
    }
  };

  // Fetch episode progress for a show
  const fetchEpisodeProgress = async (tmdbId: number) => {
    try {
      const token = localStorage.getItem('authToken') || undefined;
      const data = await apiRequest(`${API_ENDPOINTS.watchlist.v2}/${tmdbId}/progress`, {}, token);
      const watchedSet = new Set<string>();

      // Create episode keys for all watched episodes
      if (data.data?.showProgress) {
        data.data.showProgress.forEach((episode: any) => {
          if (episode.status === 'watched') {
            const episodeKey = `S${episode.seasonNumber}E${episode.episodeNumber}`;
            watchedSet.add(episodeKey);
          }
        });
      }

      setWatchedEpisodes(watchedSet);
    } catch (error) {
      console.error('Failed to fetch episode progress:', error);
    }
  };

  const handleShowSelect = async (show: TMDBShow) => {
    setSelectedShow(show);
    setAnalysisData(null);
    setAnalysisError('');
    setSelectedSeason(undefined);

    // Check watchlist status for the selected show
    await checkWatchlistStatus(show.id);

    // Auto-analyze the selected show
    await analyzeShow(show.id);
  };

  // Compute pattern from raw episode dates according to docs categories
  const computePatternFromEpisodes = (dates: Date[]) => {
    const result = {
      pattern: 'unknown',
      confidence: 0.5,
      intervals: [] as number[],
      avg: 0,
      std: 0,
      reasoning: '',
    };
    if (dates.length < 2) {
      result.reasoning = 'Insufficient data';
      return result;
    }
    const sorted = dates.slice().sort((a, b) => a.getTime() - b.getTime());
    const intervals = [] as number[];
    for (let i = 1; i < sorted.length; i++)
      intervals.push(
        Math.round((sorted[i].getTime() - sorted[i - 1].getTime()) / (1000 * 60 * 60 * 24))
      );
    const avg = intervals.reduce((s, d) => s + d, 0) / intervals.length;
    const std = Math.sqrt(
      intervals.reduce((s, d) => s + Math.pow(d - avg, 2), 0) / intervals.length
    );
    const sameDayPairs = intervals.filter((d) => d === 0).length;
    const nearWeekly = intervals.filter((d) => Math.abs(d - 7) <= 1).length;
    const nearWeeklyRatio = nearWeekly / intervals.length;
    // Categories
    if (intervals.every((d) => d <= 1)) {
      Object.assign(result, {
        pattern: 'binge',
        confidence: 0.95,
        avg,
        std,
        intervals,
        reasoning: 'All episodes within ≤1 day',
      });
      return result;
    }
    // premiere_weekly: episodes 1-2 same day (interval=0), then weekly intervals
    const hasZeroDayPremiere = intervals[0] === 0;
    if (hasZeroDayPremiere && intervals.length >= 2) {
      // Check if episodes after the premiere drop are mostly weekly
      const weeklyIntervals = intervals.slice(1).filter((d) => Math.abs(d - 7) <= 2);
      const weeklyRatio =
        intervals.length > 1 ? weeklyIntervals.length / (intervals.length - 1) : 0;

      // Require at least 70% of post-premiere intervals to be weekly
      if (weeklyRatio >= 0.7) {
        Object.assign(result, {
          pattern: 'premiere_weekly',
          confidence: 0.85 + 0.1 * weeklyRatio,
          avg,
          std,
          intervals,
          reasoning: 'Multiple episodes premiered same day, then weekly releases',
        });
        return result;
      }
    }

    // Alternative premiere_weekly: at least 1 same-day drop + mostly weekly
    const looksPremiereWeekly = sameDayPairs >= 1 && nearWeeklyRatio >= 0.6;
    if (looksPremiereWeekly && nearWeeklyRatio >= 0.7) {
      Object.assign(result, {
        pattern: 'premiere_weekly',
        confidence: 0.8,
        avg,
        std,
        intervals,
        reasoning: 'Premiere episodes same day, then weekly cadence',
      });
      return result;
    }
    // weekly
    if (avg >= 6 && avg <= 8 && std < 2) {
      Object.assign(result, {
        pattern: 'weekly',
        confidence: 0.9,
        avg,
        std,
        intervals,
        reasoning: 'Average 6–8 days with low variance',
      });
      return result;
    }
    // multi_weekly: more than one episode per 7‑day window consistently (approx by many 0–3 day gaps and weekly anchors)
    const shortGapsRatio = intervals.filter((d) => d <= 3).length / intervals.length;
    if (nearWeeklyRatio >= 0.5 && shortGapsRatio >= 0.5) {
      Object.assign(result, {
        pattern: 'multi_weekly',
        confidence: 0.75,
        avg,
        std,
        intervals,
        reasoning: 'Multiple episodes within a week consistently',
      });
      return result;
    }
    // mixed
    if (intervals.length >= 2) {
      Object.assign(result, {
        pattern: 'mixed',
        confidence: 0.6,
        avg,
        std,
        intervals,
        reasoning: 'Premieres/gaps cause irregular cadence',
      });
      return result;
    }
    return result;
  };

  const analyzeShow = async (showId: number, seasonNumber?: number) => {
    try {
      setAnalysisLoading(true);
      setAnalysisError('');

      // 1) Get show details + season list (minimal); keep using analyze for details only
      const baseRes = await fetch(
        `${API_BASE_URL}/api/tmdb/show/${showId}/analyze?country=${country}`
      );
      const base = await baseRes.json();
      if (!baseRes.ok) throw new Error(base.message || 'Failed to fetch show details');
      const seasonInfo = base.analysis?.seasonInfo || [];
      const showDetails = base.analysis?.showDetails || {
        id: showId,
        title: selectedShow?.title,
        poster: selectedShow?.poster,
      };
      // 2) Determine target season: explicit or latest
      const targetSeason =
        seasonNumber ??
        (seasonInfo.length > 0 ? Math.max(...seasonInfo.map((s: any) => s.seasonNumber)) : 1);
      // 3) Fetch RAW episodes for that season
      const rawRes = await fetch(
        `${API_BASE_URL}/api/tmdb/show/${showId}/season/${targetSeason}/raw?country=${country}`
      );
      const raw = await rawRes.json();
      if (!rawRes.ok) throw new Error('Failed to fetch raw season');
      const season = raw.raw?.season || raw.raw;
      const episodes = (season?.episodes || [])
        .filter((ep: any) => !!ep.air_date)
        .map((ep: any) => ({
          number: ep.episode_number,
          airDate: new Date(ep.air_date).toISOString(),
          title: ep.name || `Episode ${ep.episode_number}`,
        }));
      const dates = episodes.map((e: any) => new Date(e.airDate));
      const pat = computePatternFromEpisodes(dates);

      // 4) Build analysis object compatible with PatternAnalysis
      const analysis = {
        showDetails: {
          id: showId,
          title: showDetails?.title || selectedShow?.title,
          overview: base.analysis?.showDetails?.overview || '',
          status: base.analysis?.showDetails?.status || '',
          firstAirDate: base.analysis?.showDetails?.firstAirDate,
          lastAirDate: base.analysis?.showDetails?.lastAirDate,
          poster: selectedShow?.poster || showDetails?.poster,
        },
        pattern: {
          pattern: pat.pattern,
          confidence: pat.confidence,
        },
        confidence: pat.confidence,
        episodeCount: episodes.length,
        seasonInfo,
        reasoning: pat.reasoning,
        diagnostics: {
          intervals: pat.intervals,
          avgInterval: pat.avg,
          stdDev: pat.std,
          reasoning: pat.reasoning,
          episodeDetails: episodes,
        },
        watchProviders: base.analysis?.watchProviders || [],
        analyzedSeason: targetSeason,
        country,
      };

      setAnalysisData(analysis);
      setSelectedSeason(targetSeason);
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Analysis failed');
      setAnalysisData(null);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleSeasonChange = async (seasonNumber?: number) => {
    if (selectedShow) {
      setSelectedSeason(seasonNumber);
      await analyzeShow(selectedShow.id, seasonNumber);
    }
  };

  // Persist and auto-refresh when country changes
  useEffect(() => {
    UserManager.setCountry(country);
    if (selectedShow) {
      analyzeShow(selectedShow.id, selectedSeason);
    }
  }, [country]);

  // Handle episode click - add show to watchlist and set progress
  const handleEpisodeClick = async (episode: {
    number: number;
    airDate: string;
    title: string;
    seasonNumber: number;
  }) => {
    if (!selectedShow || settingProgress) return;

    try {
      setSettingProgress(true);

      // First, add show to watchlist as "watching" using the watchlist API
      const watchlistData: WatchlistAddRequest = {
        tmdbId: selectedShow.id,
        title: selectedShow.title,
        status: 'watching',
      };
      const token = localStorage.getItem('authToken') || undefined;
      const watchlistResult = await apiRequest(
        API_ENDPOINTS.watchlist.v2,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(watchlistData),
        },
        token
      );
      // The API returns the item ID directly, not nested in data.userShow
      const userShowId = watchlistResult.item?.id;

      if (!userShowId) {
        console.warn('Watchlist response structure:', watchlistResult);
        // Continue without the userShowId - we can still set progress using tmdbId
      }

      // Then set the episode progress using the watchlist API
      const progressData = await apiRequest(
        `${API_ENDPOINTS.watchlist.v2}/${selectedShow.id}/progress`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            seasonNumber: episode.seasonNumber,
            episodeNumber: episode.number,
            status: 'watched', // Mark this episode and all previous as watched
          }),
        },
        token
      );

      console.log('Progress set successfully:', progressData);
      const progressSet = true;

      // Update watchlist status after successful action
      setWatchlistStatus({
        isInWatchlist: true,
        isWatching: true,
        loading: false,
      });

      // Optimistically update watched episodes
      const newWatchedEpisodes = new Set(watchedEpisodes);
      for (let i = 1; i <= episode.number; i++) {
        const episodeKey = `S${episode.seasonNumber}E${i}`;
        newWatchedEpisodes.add(episodeKey);
      }
      setWatchedEpisodes(newWatchedEpisodes);

      // Show success message
      const toast = document.createElement('div');
      toast.className =
        'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      toast.textContent = progressSet
        ? `✓ Added "${selectedShow.title}" to watchlist and marked S${episode.seasonNumber}E${episode.number} as watched!`
        : `✓ Added "${selectedShow.title}" to watchlist`;
      document.body.appendChild(toast);

      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 5000);
    } catch (err) {
      console.error('Failed to set episode progress:', err);
      alert(
        `Failed to set progress for ${selectedShow.title}: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    } finally {
      setSettingProgress(false);
    }
  };

  // Add show to watchlist using the simple TMDB API
  const addToWatchlist = async (show: TMDBShow, status: 'watchlist' | 'watching' = 'watchlist') => {
    try {
      setAddingToWatchlist(show.id);

      const watchlistData: WatchlistAddRequest = {
        tmdbId: show.id,
        title: show.title,
        status,
      };

      const token = localStorage.getItem('authToken') || undefined;
      const result = await apiRequest(
        API_ENDPOINTS.watchlist.v2,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(watchlistData),
        },
        token
      );

      // Update watchlist status after successful action
      setWatchlistStatus({
        isInWatchlist: true,
        isWatching: status === 'watching',
        loading: false,
      });

      // Show success message
      const toast = document.createElement('div');
      toast.className =
        'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      toast.textContent = result.message || `Added ${show.title} to ${status}`;
      document.body.appendChild(toast);

      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 3000);
    } catch (err) {
      console.error('Failed to add to watchlist:', err);
      alert(
        `Failed to add ${show.title} to watchlist: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    } finally {
      setAddingToWatchlist(null);
    }
  };

  // Remove show from watchlist
  const removeFromWatchlist = async (show: TMDBShow) => {
    try {
      setWatchlistStatus((prev) => ({ ...prev, loading: true }));

      // First get the watchlist to find the item ID
      const token = localStorage.getItem('authToken') || undefined;
      const watchlistData = await apiRequest(API_ENDPOINTS.watchlist.v2, {}, token);

      const userShow = watchlistData.data?.shows?.find((s: any) => s.show.tmdb_id === show.id);

      if (userShow) {
        // Remove the show using the user show ID
        await apiRequest(
          `${API_ENDPOINTS.watchlist.v2}/${userShow.id}`,
          {
            method: 'DELETE',
          },
          token
        );

        // Update local state
        setWatchlistStatus({
          isInWatchlist: false,
          isWatching: false,
          loading: false,
        });
        setWatchedEpisodes(new Set());

        // Show success message
        const toast = document.createElement('div');
        toast.className =
          'fixed top-4 right-4 bg-yellow-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        toast.textContent = `Removed "${show.title}" from your watchlist`;
        document.body.appendChild(toast);

        setTimeout(() => {
          if (document.body.contains(toast)) {
            document.body.removeChild(toast);
          }
        }, 4000);
      } else {
        throw new Error('Show not found in watchlist');
      }
    } catch (err) {
      console.error('Failed to remove from watchlist:', err);
      setWatchlistStatus((prev) => ({ ...prev, loading: false }));
      alert(
        `Failed to remove ${show.title} from watchlist: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Discover Shows</h1>
          <p className="text-gray-600">
            Search TV shows, analyze release patterns, and add them to your watchlist
          </p>
        </div>

        {/* Country Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Country/Region</label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="block w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Search */}
          <div className="space-y-6">
            <TMDBSearch onSelectShow={handleShowSelect} selectedShowId={selectedShow?.id} />

            {/* Season Selector */}
            {analysisData?.seasonInfo && analysisData.seasonInfo.length > 1 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="font-medium text-gray-900 mb-3">Season Analysis</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => handleSeasonChange(undefined)}
                    className={`px-3 py-2 text-sm rounded border transition-colors ${
                      selectedSeason === undefined
                        ? 'bg-blue-100 text-blue-800 border-blue-200'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    Latest Season
                  </button>
                  {analysisData.seasonInfo
                    .filter((s: any) => s.seasonNumber >= 1)
                    .map((season: any) => (
                      <button
                        key={season.seasonNumber}
                        onClick={() => handleSeasonChange(season.seasonNumber)}
                        className={`px-3 py-2 text-sm rounded border transition-colors ${
                          selectedSeason === season.seasonNumber
                            ? 'bg-blue-100 text-blue-800 border-blue-200'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        Season {season.seasonNumber}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Analysis Results and Watchlist Actions */}
          <div className="space-y-6">
            {/* Pattern Analysis with Watchlist Buttons */}
            <div className="bg-white rounded-lg shadow-lg">
              <PatternAnalysis
                analysis={analysisData}
                loading={analysisLoading}
                error={analysisError}
                onEpisodeClick={handleEpisodeClick}
                showInteractiveEpisodes={true}
                watchedEpisodes={watchedEpisodes}
              />

              {/* Watchlist Action Buttons */}
              {selectedShow && !analysisLoading && (
                <div className="border-t border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Add to Your Lists</h3>
                  {!watchlistStatus.isInWatchlist && !watchlistStatus.isWatching ? (
                    <>
                      <p className="text-sm text-gray-600 mb-4">
                        💡 <strong>Quick tip:</strong> Click any episode above to instantly add the
                        show and set your progress to that episode!
                      </p>
                      <div className="flex space-x-4">
                        <button
                          onClick={() => addToWatchlist(selectedShow, 'watchlist')}
                          disabled={
                            addingToWatchlist === selectedShow.id ||
                            settingProgress ||
                            watchlistStatus.loading
                          }
                          className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                        >
                          {addingToWatchlist === selectedShow.id ? (
                            <span className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Adding...
                            </span>
                          ) : (
                            '📋 Add to Watchlist'
                          )}
                        </button>

                        <button
                          onClick={() => addToWatchlist(selectedShow, 'watching')}
                          disabled={
                            addingToWatchlist === selectedShow.id ||
                            settingProgress ||
                            watchlistStatus.loading
                          }
                          className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                        >
                          {addingToWatchlist === selectedShow.id
                            ? 'Adding...'
                            : settingProgress
                              ? 'Setting Progress...'
                              : 'Start Watching'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600 mb-4">
                        ✓ <strong>Already in your collection!</strong> Click "Watching" to remove
                        from your watchlist.
                      </p>
                      <button
                        onClick={() => removeFromWatchlist(selectedShow)}
                        disabled={
                          addingToWatchlist === selectedShow.id ||
                          settingProgress ||
                          watchlistStatus.loading
                        }
                        className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                      >
                        {watchlistStatus.loading ? (
                          <span className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Loading...
                          </span>
                        ) : (
                          '✓ Watching'
                        )}
                      </button>
                    </>
                  )}

                  {/* Show Selected Info */}
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{selectedShow.title}</p>
                        <p className="text-xs text-gray-500">
                          {analysisData
                            ? `${analysisData.pattern.pattern} release pattern`
                            : 'Ready to add to your list'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchShows;
