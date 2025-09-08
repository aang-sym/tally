import type { EpisodeMetadata, ReleasePattern, ReleasePatternAnalysis } from '../types';

export class ReleasePatternService {
  /**
   * Analyze episodes to determine release pattern
   */
  analyzeEpisodes(episodes: EpisodeMetadata[]): ReleasePatternAnalysis {
    if (episodes.length < 2) {
      return {
        pattern: { pattern: 'unknown', confidence: 0 },
        episodes,
        diagnostics: { avgInterval: 0, stdDev: 0, intervals: [] }
      };
    }

    // Calculate intervals between episodes
    const intervals = [];
    for (let i = 1; i < episodes.length; i++) {
      const prev = new Date(episodes[i - 1].airDate).getTime();
      const curr = new Date(episodes[i].airDate).getTime();
      intervals.push((curr - prev) / (1000 * 60 * 60 * 24)); // days
    }

    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    // Determine pattern based on intervals
    let pattern: 'weekly' | 'binge' | 'unknown' = 'unknown';
    let confidence = 0;

    if (avgInterval <= 1 && stdDev < 2) {
      // All episodes released within 1-2 days
      pattern = 'binge';
      confidence = Math.max(0, 1 - stdDev / 7);
    } else if (avgInterval >= 6 && avgInterval <= 8 && stdDev < 3) {
      // Weekly releases (6-8 days apart)
      pattern = 'weekly';
      confidence = Math.max(0, 1 - Math.abs(7 - avgInterval) / 7);
    }

    return {
      pattern: { pattern, confidence },
      episodes,
      diagnostics: { avgInterval, stdDev, intervals }
    };
  }

  /**
   * Determine if a pattern suggests weekly releases
   */
  isWeeklyPattern(analysis: ReleasePatternAnalysis): boolean {
    return analysis.pattern.pattern === 'weekly' && analysis.pattern.confidence > 0.7;
  }

  /**
   * Determine if a pattern suggests binge releases
   */
  isBingePattern(analysis: ReleasePatternAnalysis): boolean {
    return analysis.pattern.pattern === 'binge' && analysis.pattern.confidence > 0.7;
  }
}

export const releasePatternService = new ReleasePatternService();