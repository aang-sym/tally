import React, { useState, useEffect } from 'react';
import CalendarView, { CalendarDay } from './CalendarView';
import { UserManager } from '../../services/UserManager';
import { API_ENDPOINTS, apiRequest } from '../../config/api';

interface UserSubscription {
  id: string;
  service_id: string;
  monthly_cost: number;
  is_active: boolean;
  service: {
    id: string;
    name: string;
    logo_path?: string;
  };
}

interface UserShow {
  id: string;
  show_id: string;
  status: 'watchlist' | 'watching' | 'completed' | 'dropped';
  show: {
    title: string;
    tmdb_id: number;
  };
}

interface OverviewCalendarProps {
  useUserData?: boolean;
  userSubscriptions?: UserSubscription[] | undefined;
  userShows?: UserShow[] | undefined;
}

interface ShowEpisodeData {
  tmdbId: number;
  episodes: Array<{
    seasonNumber: number;
    episodeNumber: number;
    airDate: string;
    title: string;
  }>;
  lastAirDate: Date;
}

interface EpisodeDataCache {
  [tmdbId: number]: ShowEpisodeData;
}

// API base URL

const OverviewCalendar: React.FC<OverviewCalendarProps> = ({
  useUserData = false,
  userSubscriptions = [],
  userShows = [],
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [userProviders, setUserProviders] = useState<{ serviceName: string; color: string }[]>([]);
  const [episodeDataCache, setEpisodeDataCache] = useState<EpisodeDataCache>({});
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Load persisted episode cache on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem('episode_data_cache_v1');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') {
          // Convert string dates back to Date objects
          const processedCache: EpisodeDataCache = {};
          Object.keys(parsed).forEach((tmdbId) => {
            const data = parsed[tmdbId];
            if (data && data.lastAirDate) {
              processedCache[parseInt(tmdbId)] = {
                ...data,
                lastAirDate: new Date(data.lastAirDate),
              };
            }
          });
          setEpisodeDataCache(processedCache);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchCalendarData();
  }, [currentDate, useUserData, userSubscriptions, userShows]);

  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (selectedDay) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [selectedDay]);

  // Fetch episode data for a show
  const fetchEpisodeData = async (tmdbId: number): Promise<ShowEpisodeData | null> => {
    // Check cache first
    if (episodeDataCache[tmdbId]) {
      return episodeDataCache[tmdbId];
    }

    try {
      const token = localStorage.getItem('authToken') || undefined;
      const data = await apiRequest(`${API_ENDPOINTS.tmdb.base}/show/${tmdbId}/analyze`, {}, token);
      const episodes = data.analysis?.diagnostics?.episodeDetails || [];

      if (episodes.length === 0) {
        return null;
      }

      // Find the latest air date
      const sortedEpisodes = episodes
        .filter((ep: any) => ep.airDate)
        .sort((a: any, b: any) => new Date(b.airDate).getTime() - new Date(a.airDate).getTime());

      const lastAirDate =
        sortedEpisodes.length > 0 ? new Date(sortedEpisodes[0].airDate) : new Date();

      const episodeData: ShowEpisodeData = {
        tmdbId,
        episodes,
        lastAirDate,
      };

      // Cache the data (memory + localStorage)
      setEpisodeDataCache((prev) => {
        const next = { ...prev, [tmdbId]: episodeData } as EpisodeDataCache;
        try {
          localStorage.setItem('episode_data_cache_v1', JSON.stringify(next));
        } catch {}
        return next;
      });

      return episodeData;
    } catch (error) {
      console.error(`Error fetching episode data for show ${tmdbId}:`, error);
      return null;
    }
  };

  // Cache helpers for calendar view
  const CAL_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
  const calendarCacheKey = (userId: string, year: number, month: number) =>
    `overview_cal_${userId}_${year}_${month}_v1`;
  const computeShowsSignature = () => {
    try {
      const compact = (userShows || []).map((s) => ({
        id: s.id,
        t: s.show.tmdb_id,
        st: s.status,
        p: (s as any).streaming_provider?.name || null,
        a: (s as any).added_at || null,
      }));
      // Stable ordering
      compact.sort((a, b) => a.t - b.t || a.id.localeCompare(b.id));
      return JSON.stringify(compact);
    } catch {
      return `${(userShows || []).length}`;
    }
  };

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      const userId = UserManager.getCurrentUserId();
      const cacheKey = calendarCacheKey(userId, currentDate.getFullYear(), currentDate.getMonth());
      const signature = computeShowsSignature();

      // Try cache first
      try {
        const raw = localStorage.getItem(cacheKey);
        if (raw) {
          const cached = JSON.parse(raw);
          if (
            cached &&
            cached.signature === signature &&
            Date.now() - cached.createdAt < CAL_CACHE_TTL_MS
          ) {
            setCalendarData(cached.calendarData || []);
            setUserProviders(cached.providersLegend || []);
            setLoading(false);
            return; // Fresh cache hit
          }
        }
      } catch {}

      if ((userShows?.length || 0) === 0) {
        // No shows available, show empty state
        setCalendarData([]);
        setLoading(false);
        return;
      }

      // Generate calendar data directly from user's shows
      const { calendarData, providersLegend } = await generateUserBasedCalendarData();
      setCalendarData(calendarData);
      setUserProviders(providersLegend);

      // Persist to cache
      try {
        const payload = {
          createdAt: Date.now(),
          signature,
          calendarData,
          providersLegend,
        };
        localStorage.setItem(cacheKey, JSON.stringify(payload));
      } catch {}
    } catch (error) {
      console.error('OverviewCalendar - Failed to generate calendar data:', error);
      setCalendarData([]);
    } finally {
      setLoading(false);
    }
  };

  const generateCalendarData = (apiData: any[]): CalendarDay[] => {
    const data: CalendarDay[] = [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const today = new Date();

      // Find relevant month data from API
      const monthData = apiData.find((m) => {
        const monthDate = new Date(m.month);
        return monthDate.getMonth() === month && monthDate.getFullYear() === year;
      });

      const activeServices =
        monthData?.recommendations.map((rec: any) => ({
          serviceId: rec.service.toLowerCase().replace(' ', '-'),
          serviceName: rec.service,
          intensity: rec.action === 'keep' ? 0.8 : rec.action === 'subscribe' ? 0.6 : 0.2,
          userShows: rec.shows || [],
          allShows: rec.shows || [],
          cost: rec.cost || 0,
        })) || [];

      data.push({
        date: dateStr,
        day,
        isCurrentMonth: true,
        isToday: dateStr === today.toISOString().split('T')[0],
        activeServices,
        savings: monthData?.savings || 0,
      });
    }

    return data;
  };

  const generateUserBasedCalendarData = async (): Promise<{
    calendarData: CalendarDay[];
    providersLegend: { serviceName: string; color: string }[];
  }> => {
    const data: CalendarDay[] = [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Get watching shows with streaming providers
    const watchingShows = userShows?.filter((show) => show.status === 'watching') || [];

    // Pre-fetch episode data for all shows to avoid repeated API calls
    const showDateCache = new Map<string, { startDate: Date; endDate: Date }>();

    for (const show of watchingShows) {
      try {
        const showStartDate = await getShowStartDate(show);
        const showEndDate = await getShowEndDate(show.show.tmdb_id);
        showDateCache.set(show.id, { startDate: showStartDate, endDate: showEndDate });
      } catch (error) {
        console.warn(`Failed to fetch dates for show ${show.show.title}:`, error);
        // Use fallback dates if API calls fail
        const fallbackStart = new Date((show as any).added_at || Date.now());
        const fallbackEnd = new Date();
        fallbackEnd.setMonth(fallbackEnd.getMonth() + 6);
        showDateCache.set(show.id, { startDate: fallbackStart, endDate: fallbackEnd });
      }
    }

    // Create a map of unique streaming providers from watching shows
    const activeProviders = new Map<string, any>();
    watchingShows.forEach((show) => {
      const providerName = getProviderNameFromShow(show);
      const providerLogoUrl = getProviderLogoFromShow(show);
      if (providerName) {
        activeProviders.set(providerName.toLowerCase().replace(/\s+/g, '-'), {
          serviceId: providerName.toLowerCase().replace(/\s+/g, '-'),
          serviceName: providerName,
          intensity: 0.7, // Medium usage for watching shows
          userShows: watchingShows
            .filter((s) => getProviderNameFromShow(s) === providerName)
            .map((s) => ({ title: s.show.title, tmdbId: s.show.tmdb_id })),
          allShows: watchingShows
            .filter((s) => getProviderNameFromShow(s) === providerName)
            .map((s) => s.show.title),
          cost: getProviderCost(providerName),
          logoUrl: providerLogoUrl,
          shows: watchingShows.filter((s) => getProviderNameFromShow(s) === providerName),
        });
      }
    });

    // Generate legend data for providers
    const providersLegend = Array.from(activeProviders.values()).map((provider) => ({
      serviceName: provider.serviceName,
      color: getProviderLegendColor(provider.serviceName),
    }));

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const currentDay = new Date(year, month, day);
      const today = new Date();

      // Filter active services based on show end dates - treat each show separately
      const activeServicesForDay: any[] = [];

      // Check each provider synchronously using cached data
      for (const provider of activeProviders.values()) {
        // Check if ANY show for this provider is still active on this day
        const activeShowsForProvider: any[] = [];
        let barLeftCap = false;
        let barRightCap = false;
        let isStartFlag = false;
        let isEndFlag = false;
        let isEndingSoonFlag = false;

        for (const show of provider.shows) {
          const cachedDates = showDateCache.get(show.id);
          if (!cachedDates) continue;

          const { startDate, endDate } = cachedDates;
          const oneWeekAfterEnd = new Date(endDate);
          oneWeekAfterEnd.setDate(oneWeekAfterEnd.getDate() + 7);

          // Check what should be displayed on this day
          const displayType = getDateDisplayType(currentDay, startDate, oneWeekAfterEnd);

          if (displayType !== 'none') {
            const isStart = currentDay.toDateString() === startDate.toDateString();
            const isEnd = currentDay.toDateString() === endDate.toDateString();
            const diffDays = Math.ceil(
              (endDate.getTime() - currentDay.getTime()) / (1000 * 60 * 60 * 24)
            );
            const isEndingSoon = diffDays > 0 && diffDays <= 7;

            if (isStart) {
              barLeftCap = true;
              isStartFlag = true;
            }
            if (isEnd) {
              barRightCap = true;
              isEndFlag = true;
            }
            if (isEndingSoon) {
              isEndingSoonFlag = true;
            }

            activeShowsForProvider.push({
              ...show,
              displayType, // Add display type to show object
              isStart,
              isEnd,
              isEndingSoon,
            });
          }
        }

        // Only show provider if at least one show is still active
        if (activeShowsForProvider.length > 0) {
          // Determine the overall display type for this provider on this day
          const hasLogo = activeShowsForProvider.some((show: any) => show.displayType === 'logo');
          const providerDisplayType = hasLogo ? 'logo' : 'bar';

          // Update the provider data to only include active shows
          const updatedProvider = {
            ...provider,
            userShows: activeShowsForProvider.map((show: any) => ({
              title: show.show.title,
              tmdbId: show.show.tmdb_id,
            })),
            allShows: activeShowsForProvider.map((show: any) => show.show.title),
            shows: activeShowsForProvider,
            displayType: providerDisplayType,
            barLeftCap,
            barRightCap,
            isStart: isStartFlag,
            isEnd: isEndFlag,
            isEndingSoon: isEndingSoonFlag,
          };
          activeServicesForDay.push(updatedProvider);
        }
      }

      data.push({
        date: dateStr,
        day,
        isCurrentMonth: true,
        isToday: dateStr === today.toISOString().split('T')[0],
        activeServices: activeServicesForDay,
        savings: 0, // No savings calculation for now
      });
    }

    return { calendarData: data, providersLegend };
  };

  // Helper function to determine what should be displayed on a specific day
  const getDateDisplayType = (
    currentDay: Date,
    showStartDate: Date,
    showEndDate: Date
  ): 'logo' | 'bar' | 'none' => {
    // Normalize dates to compare only the date part (ignore time)
    const current = new Date(currentDay.getFullYear(), currentDay.getMonth(), currentDay.getDate());
    const start = new Date(
      showStartDate.getFullYear(),
      showStartDate.getMonth(),
      showStartDate.getDate()
    );
    const end = new Date(showEndDate.getFullYear(), showEndDate.getMonth(), showEndDate.getDate());

    // Outside the date range
    if (current < start || current > end) {
      return 'none';
    }

    // Key dates that should show logos:
    // 1. First air date of the show
    if (current.getTime() === start.getTime()) {
      return 'logo';
    }

    // 2. Last end date (+ 1 week buffer)
    if (current.getTime() === end.getTime()) {
      return 'logo';
    }

    // 3. First day of months between first air date and last end date
    if (current.getDate() === 1) {
      return 'logo';
    }

    // 4. Last day of months between first air date and last end date
    const lastDayOfMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
    if (current.getDate() === lastDayOfMonth) {
      return 'logo';
    }

    // 5. All other days between start and end show connecting bars
    return 'bar';
  };

  // Helper function to get show start date (when user added it or first episode aired)
  const getShowStartDate = async (show: any): Promise<Date> => {
    // Try to get the first episode air date
    const episodeData = await fetchEpisodeData(show.show.tmdb_id);

    if (episodeData?.episodes && episodeData.episodes.length > 0) {
      // Find the earliest episode air date
      const sortedEpisodes = episodeData.episodes
        .filter((ep: any) => ep.airDate)
        .sort((a: any, b: any) => new Date(a.airDate).getTime() - new Date(b.airDate).getTime());

      if (sortedEpisodes.length > 0) {
        return new Date(sortedEpisodes[0].airDate);
      }
    }

    // Fallback to when user added the show
    return new Date((show as any).added_at || Date.now());
  };

  // Helper function to get show end date dynamically from episode data
  const getShowEndDate = async (tmdbId: number): Promise<Date> => {
    const episodeData = await fetchEpisodeData(tmdbId);

    if (episodeData && episodeData.lastAirDate) {
      // Ensure lastAirDate is a Date object (it might be a string from cache)
      const endDate =
        episodeData.lastAirDate instanceof Date
          ? episodeData.lastAirDate
          : new Date(episodeData.lastAirDate);

      // Validate the date is valid
      if (!isNaN(endDate.getTime())) {
        return endDate;
      }
    }

    // Fallback: assume show runs for 6 months from today (for shows without known end dates)
    const fallbackDate = new Date();
    fallbackDate.setMonth(fallbackDate.getMonth() + 6);
    return fallbackDate;
  };

  // Helper function to extract provider name from show
  const getProviderNameFromShow = (show: any): string | null => {
    // This will depend on the show data structure
    // For now, let's check if streaming_provider exists
    if (show.streaming_provider?.name) {
      return show.streaming_provider.name;
    }
    return null;
  };

  // Helper function to extract provider logo URL from show
  const getProviderLogoFromShow = (show: any): string | null => {
    if (show.streaming_provider?.logo_path) {
      return upgradeTmdbLogoUrl(show.streaming_provider.logo_path);
    }
    return null;
  };

  // Prefer highest-quality TMDB images if URL is from TMDB
  const upgradeTmdbLogoUrl = (url: string | null): string | null => {
    if (!url) return url;
    try {
      const u = new URL(url, window.location.origin);
      if (u.hostname.includes('image.tmdb.org') && u.pathname.includes('/t/p/')) {
        // Replace size segment (e.g., /w92/, /w185/) with /original/
        const parts = u.pathname.split('/');
        const idx = parts.findIndex((p) => /^w\d+$/.test(p));
        if (idx !== -1) {
          parts[idx] = 'original';
          u.pathname = parts.join('/');
          return u.toString();
        }
      }
    } catch (_) {
      /* ignore malformed URL */
    }
    return url;
  };

  // Helper function to get estimated provider cost
  const getProviderCost = (providerName: string): number => {
    const costs: Record<string, number> = {
      Netflix: 15.99,
      'HBO Max': 14.99,
      'Disney Plus': 12.99,
      'Disney+': 12.99,
      Hulu: 11.99,
      'Amazon Prime Video': 8.99,
      'Prime Video': 8.99,
      'Apple TV Plus': 6.99,
      'Apple TV+': 6.99,
      'Paramount+ with Showtime': 11.99,
      'Paramount+': 8.99,
    };
    return costs[providerName] || 9.99;
  };

  // Helper function to get provider legend color
  const getProviderLegendColor = (providerName: string): string => {
    const colors: Record<string, string> = {
      Netflix: 'bg-red-500',
      'HBO Max': 'bg-purple-500',
      'Disney Plus': 'bg-blue-500',
      'Disney+': 'bg-blue-500',
      Hulu: 'bg-green-500',
      'Amazon Prime Video': 'bg-indigo-500',
      'Prime Video': 'bg-indigo-500',
      'Apple TV Plus': 'bg-gray-500',
      'Apple TV+': 'bg-gray-500',
      'Paramount+ with Showtime': 'bg-orange-500',
      'Paramount+': 'bg-orange-500',
    };
    return colors[providerName] || 'bg-gray-400';
  };

  const generateMockCalendarData = (): CalendarDay[] => {
    const data: CalendarDay[] = [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const today = new Date();

      // Mock streaming service activity
      const activeServices = [];

      // Netflix - active most days
      if (Math.random() > 0.3) {
        activeServices.push({
          serviceId: 'netflix',
          serviceName: 'Netflix',
          intensity: 0.6 + Math.random() * 0.4,
          userShows: ['Stranger Things', 'The Crown'],
          allShows: ['Stranger Things', 'The Crown', 'Ozark'],
          cost: 15.99,
        });
      }

      // HBO Max - active some days
      if (Math.random() > 0.6) {
        activeServices.push({
          serviceId: 'hbo-max',
          serviceName: 'HBO Max',
          intensity: 0.4 + Math.random() * 0.6,
          userShows: ['House of the Dragon'],
          allShows: ['House of the Dragon', 'The Last of Us'],
          cost: 14.99,
        });
      }

      // Disney+ - active occasionally
      if (Math.random() > 0.8) {
        activeServices.push({
          serviceId: 'disney-plus',
          serviceName: 'Disney Plus',
          intensity: 0.3 + Math.random() * 0.4,
          userShows: ['The Mandalorian'],
          allShows: ['The Mandalorian', 'Loki'],
          cost: 12.99,
        });
      }

      data.push({
        date: dateStr,
        day,
        isCurrentMonth: true,
        isToday: dateStr === today.toISOString().split('T')[0],
        activeServices,
        savings: Math.random() > 0.7 ? Math.random() * 30 : 0,
        recommendations:
          Math.random() > 0.9
            ? [{ type: 'optimization', message: 'Consider pausing service' }]
            : [],
      });
    }

    return data;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const handleDateClick = (day: CalendarDay) => {
    setSelectedDay(day);
    setSelectedDate(day.date);
  };

  // Monthly spend must be declared as a hook before any conditional return
  const monthlySpend = React.useMemo(() => {
    const unique = new Map<string, number>();
    calendarData.forEach((d) => {
      if (!d.isCurrentMonth) return;
      d.activeServices.forEach((s) => {
        if (!unique.has(s.serviceId)) unique.set(s.serviceId, s.cost || 0);
      });
    });
    return Array.from(unique.values()).reduce((a, b) => a + b, 0);
  }, [calendarData, currentDate]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Loading calendar...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Calendar Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Subscription Overview</h2>
          <p className="text-gray-600 mt-1">
            Visual overview of your streaming services usage and optimization opportunities
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
            aria-label="Previous month"
          >
            ←
          </button>
          <div className="text-lg font-semibold text-gray-900">
            {currentDate.toLocaleString('default', { month: 'long' })}, {currentDate.getFullYear()}
            <span className="ml-2 text-sm font-normal text-gray-500">
              ${monthlySpend.toFixed(2)} monthly spend
            </span>
          </div>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
            aria-label="Next month"
          >
            →
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="ml-2 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Today
          </button>
        </div>
      </div>

      {/* Legend: provider pips only */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
        {userProviders && userProviders.length > 0 ? (
          <>
            {userProviders.slice(0, 8).map((p) => (
              <div key={p.serviceName} className="flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full ${p.color}`}></span>
                <span>{p.serviceName}</span>
              </div>
            ))}
            {userProviders.length > 8 && (
              <div className="flex items-center gap-1 text-gray-500">
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 border border-gray-200">
                  +{userProviders.length - 8}
                </span>
                <span>more</span>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-gray-400"></span>
            <span>Ongoing pips (color = provider)</span>
          </div>
        )}
      </div>

      {/* Main Calendar */}
      <CalendarView
        year={currentDate.getFullYear()}
        month={currentDate.getMonth()}
        data={calendarData}
        onDateClick={handleDateClick}
        mode="overview"
        userProviders={userProviders}
        selectedDate={selectedDate}
        showHeader={false}
      />

      {/* Day Detail Modal */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {new Date(selectedDay.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </h3>
              <button
                onClick={() => setSelectedDay(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Active Services */}
              {selectedDay.activeServices.length > 0 ? (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Active Services</h4>
                  <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 overflow-hidden">
                    {selectedDay.activeServices.slice(0, 10).map((service) => (
                      <div
                        key={service.serviceId}
                        className="flex items-center justify-between p-3 bg-white"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden ring-1 ring-gray-300 shadow">
                            {service.logoUrl ? (
                              <img
                                src={service.logoUrl}
                                alt={service.serviceName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div
                                className={`w-full h-full ${getProviderLegendColor(service.serviceName)}`}
                              />
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{service.serviceName}</div>
                            <div className="text-xs text-gray-600">
                              {service.userShows.length} show
                              {service.userShows.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-sm font-medium">
                          ${service.cost.toFixed(2)}
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-between p-3 bg-gray-50">
                      <div className="text-xs font-semibold text-gray-700 tracking-wide">TOTAL</div>
                      <div className="text-sm font-semibold">
                        $
                        {selectedDay.activeServices
                          .reduce((sum, s) => sum + (s.cost || 0), 0)
                          .toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <p>No active services on this day</p>
                </div>
              )}

              {/* Savings */}
              {selectedDay.savings && selectedDay.savings > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center">
                    <span className="text-green-600 mr-2">💰</span>
                    <span className="font-medium text-green-800">
                      Potential savings: ${selectedDay.savings.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {selectedDay.recommendations && selectedDay.recommendations.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center">
                    <span className="text-blue-600 mr-2">💡</span>
                    <span className="font-medium text-blue-800">Optimization available</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-green-600">
            ${calendarData.reduce((sum, day) => sum + (day.savings || 0), 0).toFixed(2)}
          </div>
          <div className="text-sm text-gray-600">Potential Monthly Savings</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-blue-600">
            {Math.round(
              (calendarData.filter((day) => day.activeServices.length > 0).length /
                calendarData.length) *
                100
            )}
            %
          </div>
          <div className="text-sm text-gray-600">Service Utilization</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-purple-600">
            {
              new Set(calendarData.flatMap((day) => day.activeServices.map((s) => s.serviceId)))
                .size
            }
          </div>
          <div className="text-sm text-gray-600">Active Services</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-orange-600">
            {
              calendarData.filter((day) => day.recommendations && day.recommendations.length > 0)
                .length
            }
          </div>
          <div className="text-sm text-gray-600">Optimization Days</div>
        </div>
      </div>
    </div>
  );
};

export default OverviewCalendar;
