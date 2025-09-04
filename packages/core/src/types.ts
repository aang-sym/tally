export interface EpisodeMetadata {
  seasonNumber: number;
  episodeNumber: number;
  airDate: string;
  name?: string;
  runtime?: number;
}

export interface ReleasePattern {
  pattern: 'weekly' | 'binge' | 'unknown';
  confidence: number;
  avgInterval?: number;
  stdDev?: number;
  intervals?: number[];
  analyzedSeason?: number;
}

export interface ReleasePatternAnalysis {
  pattern: ReleasePattern;
  episodes: EpisodeMetadata[];
  diagnostics?: {
    avgInterval: number;
    stdDev: number;
    intervals: number[];
  };
}