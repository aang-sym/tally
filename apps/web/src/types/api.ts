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
  poster?: string;
  overview?: string;
  status?: string;
  firstAirDate?: string;
  lastAirDate?: string;
  streamingServices?: StreamingService[];
  userProgress?: UserProgress;
  nextEpisodeDate?: string;
  pattern?: string;
  confidence?: number;
}

export interface UserProgress {
  currentSeason: number;
  currentEpisode: number;
  watchedEpisodes: string[];
  lastWatched?: string;
  totalEpisodes?: number;
  totalSeasons?: number;
}

export interface WatchlistItem {
  id: string;
  tmdbId: number;
  title: string;
  poster?: string;
  status: 'watching' | 'plan_to_watch' | 'completed' | 'dropped';
  addedAt: string;
  updatedAt: string;
  userProgress?: UserProgress;
  streamingServices?: StreamingService[];
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

export interface WatchlistResponse {
  items: WatchlistItem[];
  total: number;
}

export interface EpisodeProgressRequest {
  episodeNumber: number;
  seasonNumber: number;
  watched: boolean;
}

export interface EpisodeProgressResponse {
  success: boolean;
  updatedProgress: UserProgress;
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
