// Shared API types for the Tally application

export interface TMDBShow {
  id: number;
  title: string;
  overview?: string;
  poster?: string;
  firstAirDate?: string;
  lastAirDate?: string;
  status?: string;
  voteAverage?: number;
  popularity?: number;
  genres?: Array<{ id: number; name: string }>;
}

export interface StreamingProvider {
  id: number;
  name: string;
  logo_url: string;
}

export interface Show {
  id: string;
  tmdb_id: number;
  title: string;
  overview?: string;
  poster_path?: string;
  status: string;
  total_episodes?: number;
}

export interface Episode {
  id: number;
  episodeNumber: number;
  seasonNumber: number;
  name: string;
  overview?: string;
  airDate?: string;
  stillPath?: string;
  voteAverage?: number;
  runtime?: number;
}

export interface Season {
  id: number;
  seasonNumber: number;
  name: string;
  overview?: string;
  posterPath?: string;
  airDate?: string;
  episodeCount: number;
  episodes?: Episode[];
}

export interface StoredEpisodeProgress {
  episodeNumber: number;
  status: 'watched' | 'unwatched';
}

export interface ShowProgressData {
  seasons: {
    [seasonNumber: number]: StoredEpisodeProgress[];
  };
}

export interface StreamingService {
  id: number;
  name: string;
  logo?: string;
  color?: string;
  textColor?: string;
  type?: 'subscription' | 'rent' | 'buy' | 'ads';
  deepLink?: string;
}

export interface UserShow {
  id?: string;
  tmdbId: number;
  title: string;
  user_id: string;
  show_id: string;
  status: 'watchlist' | 'watching' | 'completed' | 'dropped';
  added_at: string;
  show_rating?: number;
  notes?: string;
  streaming_provider?: StreamingProvider | null;
  streaming_provider_id?: number | null; // New field
  buffer_days?: number; // New field
  country_code?: string | null; // New field
  show: Show;
  progress?: {
    totalEpisodes: number;
    watchedEpisodes: number;
    currentEpisode?: {
      season_number: number;
      episode_number: number;
      name?: string;
    };
    // New structure for detailed progress
    data?: ShowProgressData;
  };
}

export interface TVGuideEpisode {
  episodeNumber: number;
  seasonNumber: number;
  airDate: string;
  title: string;
  overview?: string;
  isWatched: boolean;
  tmdbId: number;
}

export interface TVGuideShow {
  tmdbId: number;
  title: string;
  poster?: string;
  overview?: string;
  status?: string;
  streamingServices: StreamingService[];
  nextEpisodeDate?: string;
  activeWindow?: { start: string; end: string };
  upcomingEpisodes: TVGuideEpisode[];
  userProgress?: UserProgress;
  pattern?: string;
  confidence?: number;
  bufferDays?: number;
  country?: string;
}

export interface TVGuideData {
  services: Array<{
    service: StreamingService;
    shows: TVGuideShow[];
  }>;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  totalShows: number;
  totalEpisodes: number;
}

// API Request/Response types
export interface WatchlistAddRequest {
  tmdbId: number;
  title: string;
  poster?: string;
  streamingServices?: StreamingService[];
}

export interface TVGuideRequest {
  userId?: string;
  startDate: string;
  endDate: string;
  services?: string[];
}

export interface TVGuideResponse {
  data: TVGuideData;
  success: boolean;
  error?: string;
}

export interface UserSubscription {
  id: string;
  service_id: string;
  monthly_cost: number;
  is_active: boolean;
  service: {
    id: string;
    name: string;
    logo_url?: string;
  };
}

// Pattern Analysis types (existing)
export interface PatternAnalysis {
  showDetails: TMDBShow;
  pattern: string;
  confidence: number;
  episodeCount: number;
  seasonInfo: Array<{
    seasonNumber: number;
    episodeCount: number;
    airDate: string;
    pattern?: string;
    confidence?: number;
  }>;
  reasoning: string;
  diagnostics: {
    intervals: number[];
    avgInterval: number;
    stdDev: number;
    reasoning: string;
    episodeDetails: Array<{
      number: number;
      airDate: string;
      title: string;
    }>;
  };
  watchProviders: StreamingService[];
  analyzedSeason: number;
  country: string;
}

export type ApiError = {
  error: string;
  message?: string;
  statusCode?: number;
};
