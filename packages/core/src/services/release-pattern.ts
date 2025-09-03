import type { EpisodeMetadata, ReleasePattern, ReleasePatternAnalysis } from '../types';

export class ReleasePatternService {
  /**
   * Analyzes episode release dates to determine the pattern (weekly vs binge)
   */
  analyzeReleasePattern(episodes: EpisodeMetadata[]): ReleasePatternAnalysis {
    if (!episodes.length) {
      return { pattern: 'unknown', confidence: 0 };
    }

    // Sort episodes by air date
    const sortedEpisodes = [...episodes].sort((a, b) => 
      new Date(a.airDate).getTime() - new Date(b.airDate).getTime()
    );

    // Get season info
    const seasonStart = sortedEpisodes[0].airDate;
    const seasonEnd = sortedEpisodes[sortedEpisodes.length - 1].airDate;
    const totalEpisodes = sortedEpisodes.length;

    // Calculate intervals between episodes
    const intervals = [];
    for (let i = 1; i < sortedEpisodes.length; i++) {
      const interval = Math.round(
        (new Date(sortedEpisodes[i].airDate).getTime() - 
         new Date(sortedEpisodes[i-1].airDate).getTime()) / 
        (1000 * 60 * 60 * 24) // Convert to days
      );
      intervals.push(interval);
    }

    // Get average interval
    const avgInterval = intervals.length ? 
      intervals.reduce((sum, int) => sum + int, 0) / intervals.length :
      0;

    // Calculate standard deviation to measure consistency
    const stdDev = Math.sqrt(
      intervals.reduce((sum, int) => sum + Math.pow(int - avgInterval, 2), 0) / 
      intervals.length
    );

    // Heuristic helpers
    const nearWeekly = intervals.filter((d) => Math.abs(d - 7) <= 2).length; // within ±2 days of weekly
    const sameDayDrops = intervals.filter((d) => d === 0).length;
    const shortGaps = intervals.filter((d) => d <= 1).length;
    const nearWeeklyRatio = intervals.length ? nearWeekly / intervals.length : 0;

    // Weekly pattern criteria (more permissive and robust):
    // - Majority of intervals near 7 days (≥ 60%)
    // - Allow a single same‑day double‑premiere at the start
    // - Standard deviation not excessive (≤ 3.5 days)
    if (
      episodes.length > 1 &&
      (
        nearWeeklyRatio >= 0.6 ||
        // Premiere double-drop then weekly (first interval 0, rest weekly-like)
        (sameDayDrops <= 1 && nearWeekly >= Math.max(1, intervals.length - 2))
      ) &&
      stdDev <= 3.5
    ) {
      const confidence = Math.min(0.6 + 0.4 * nearWeeklyRatio, 0.95);
      return {
        pattern: 'weekly',
        confidence,
        episodeInterval: Math.round(avgInterval || 7),
        seasonStart,
        seasonEnd,
        totalEpisodes
      };
    }

    // Binge pattern criteria:
    // - Most episodes released on same day
    // - Or very short intervals between episodes
    if (shortGaps / Math.max(1, intervals.length) >= 0.7 ||
        new Set(episodes.map(ep => ep.airDate)).size === 1) {
      return {
        pattern: 'binge',
        confidence: 0.95,
        seasonStart,
        seasonEnd,
        totalEpisodes
      };
    }

    // Mixed/unknown pattern
    return {
      pattern: 'unknown',
      confidence: 0.5,
      episodeInterval: Math.round(avgInterval),
      seasonStart,
      seasonEnd,
      totalEpisodes
    };
  }

  /**
   * Detect if a show has a new season coming up based on historical patterns
   */
  predictNextSeason(episodes: EpisodeMetadata[]): Date | null {
    if (!episodes.length) return null;

    const analysis = this.analyzeReleasePattern(episodes);
    if (analysis.pattern === 'unknown') return null;

    const lastEpisodeDate = new Date(analysis.seasonEnd!);
    const now = new Date();
    const monthsSinceLastEpisode = (
      now.getTime() - lastEpisodeDate.getTime()
    ) / (1000 * 60 * 60 * 24 * 30);

    // For shows that release annually, predict next season
    if (monthsSinceLastEpisode >= 9 && monthsSinceLastEpisode <= 15) {
      // Predict next season around same time as last season
      const nextSeasonDate = new Date(analysis.seasonStart!);
      nextSeasonDate.setFullYear(now.getFullYear());
      if (nextSeasonDate < now) {
        nextSeasonDate.setFullYear(now.getFullYear() + 1);
      }
      return nextSeasonDate;
    }

    return null;
  }
}

// Export singleton instance
export const releasePatternService = new ReleasePatternService();
