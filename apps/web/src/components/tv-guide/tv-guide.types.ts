import { TVGuideShow, TVGuideEpisode, UserProgress, StreamingService } from '../../types/api';

// Re-export API types for convenience
export type { TVGuideShow, TVGuideEpisode, UserProgress, StreamingService };

// Local types with Date objects (API returns strings)
export interface EpisodeSchedule extends Omit<TVGuideEpisode, 'airDate'> {
  airDate: Date;
}

/**
 * ShowSchedule adapts string date fields from TVGuideShow into concrete Date instances for UI.
 * Important: also omit 'activeWindow' to avoid string vs Date type mismatch.
 */
export interface ShowSchedule
  extends Omit<TVGuideShow, 'nextEpisodeDate' | 'upcomingEpisodes' | 'activeWindow'> {
  nextEpisodeDate?: Date;
  upcomingEpisodes: EpisodeSchedule[];
  activeWindow?: { start: Date; end: Date };
  bufferDays?: number;
}

export interface DateChunk {
  id: string;
  startDate: Date;
  endDate: Date;
  dates: Date[];
  isLoaded: boolean;
  isLoading: boolean;
  shows: ShowSchedule[];
}

export interface TVGuideService {
  id: string | number;
  name: string;
  logo: string;
  color: string;
  textColor: string;
  shows: ShowSchedule[];
}

export interface ViewportRange {
  startIndex: number;
  endIndex: number;
  startDate: Date;
  endDate: Date;
}

export interface ScrollState {
  scrollLeft: number;
  containerWidth: number;
  columnWidth: number;
  visibleColumns: number;
}

export const STREAMING_SERVICE_THEMES = {
  Netflix: { bg: '#E50914', text: '#FFFFFF' },
  'HBO Max': { bg: '#9B59B6', text: '#FFFFFF' },
  'Disney+': { bg: '#113CCF', text: '#FFFFFF' },
  'Paramount+': { bg: '#0064FF', text: '#FFFFFF' },
  'Amazon Prime Video': { bg: '#00A8E1', text: '#FFFFFF' },
  'Apple TV+': { bg: '#000000', text: '#FFFFFF' },
  Hulu: { bg: '#1CE783', text: '#000000' },
  Peacock: { bg: '#F74C4C', text: '#FFFFFF' },
  default: { bg: '#6B7280', text: '#FFFFFF' },
} as const;

export const TV_GUIDE_CONSTANTS = {
  COLUMN_WIDTH: 120,
  SERVICE_ROW_HEIGHT: 80,
  HEADER_HEIGHT: 60,
  CHUNK_SIZE_DAYS: 30,
  BUFFER_COLUMNS: 5,
  VISIBLE_COLUMNS_DESKTOP: 7,
  VISIBLE_COLUMNS_TABLET: 5,
  VISIBLE_COLUMNS_MOBILE: 3,
} as const;
