export interface Episode {
  id: string;
  title: string;
  seasonNumber: number;
  episodeNumber: number;
  airDate: string;
}

export interface EpisodeMetadata {
  id: string;
  seasonNumber: number;
  episodeNumber: number;
  airDate: string;
  title: string;
}

export type ReleasePattern = 'weekly' | 'binge' | 'unknown';

export interface ReleasePatternAnalysis {
  pattern: ReleasePattern;
  confidence: number;
  episodeInterval?: number;
  seasonStart?: string;
  seasonEnd?: string;
  totalEpisodes?: number;
}
