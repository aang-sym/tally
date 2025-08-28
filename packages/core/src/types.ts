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

export type ReleasePattern = 'weekly' | 'binge' | 'premiere_weekly' | 'multi_weekly' | 'mixed' | 'unknown';

export interface PatternDiagnostic {
  intervals: number[];
  avgInterval: number;
  stdDev: number;
  maxInterval: number;
  minInterval: number;
  reasoning: string;
  premiereEpisodes?: number;
  hasPremierePattern?: boolean;
  hasMultiWeeklyPattern?: boolean;
}

export interface ReleasePatternAnalysis {
  pattern: ReleasePattern;
  confidence: number;
  episodeInterval?: number;
  seasonStart?: string;
  seasonEnd?: string;
  totalEpisodes?: number;
  diagnostics?: PatternDiagnostic;
}
