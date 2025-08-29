import type { EpisodeMetadata, ReleasePattern, ReleasePatternAnalysis, PatternDiagnostic } from '../types';

export class ReleasePatternService {
  /**
   * Analyzes episode release dates to determine the release pattern
   */
  analyzeReleasePattern(episodes: EpisodeMetadata[]): ReleasePatternAnalysis {
    if (!episodes.length) {
      return { 
        pattern: 'unknown', 
        confidence: 0,
        diagnostics: {
          intervals: [],
          avgInterval: 0,
          stdDev: 0,
          maxInterval: 0,
          minInterval: 0,
          reasoning: 'No episodes provided'
        }
      };
    }

    // Sort episodes by air date
    const sortedEpisodes = [...episodes].sort((a, b) => 
      new Date(a.airDate).getTime() - new Date(b.airDate).getTime()
    );

    // Get season info
    const seasonStart = sortedEpisodes[0].airDate;
    const seasonEnd = sortedEpisodes[sortedEpisodes.length - 1].airDate;
    const totalEpisodes = sortedEpisodes.length;

    // Single episode
    if (totalEpisodes === 1) {
      return {
        pattern: 'unknown',
        confidence: 0.5,
        seasonStart,
        seasonEnd,
        totalEpisodes,
        diagnostics: {
          intervals: [],
          avgInterval: 0,
          stdDev: 0,
          maxInterval: 0,
          minInterval: 0,
          reasoning: 'Single episode - insufficient data for pattern detection'
        }
      };
    }

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

    // Calculate statistics
    const avgInterval = intervals.reduce((sum, int) => sum + int, 0) / intervals.length;
    const variance = intervals.reduce((sum, int) => sum + Math.pow(int - avgInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    const maxInterval = Math.max(...intervals);
    const minInterval = Math.min(...intervals);

    // Check for premiere pattern detection
    const hasPremierePattern = this.detectPremierePattern(sortedEpisodes);
    const hasMultiWeeklyPattern = this.detectMultiWeeklyPattern(intervals);
    const premiereEpisodes = this.countPremiereEpisodes(sortedEpisodes);

    const diagnostics: PatternDiagnostic = {
      intervals,
      avgInterval,
      stdDev,
      maxInterval,
      minInterval,
      reasoning: '',
      premiereEpisodes,
      hasPremierePattern,
      hasMultiWeeklyPattern
    };

    // Pattern detection logic with enhanced rules
    const result = this.detectPattern(episodes, intervals, avgInterval, stdDev, maxInterval, minInterval, hasPremierePattern, hasMultiWeeklyPattern, totalEpisodes);
    
    return {
      pattern: result.pattern,
      confidence: result.confidence,
      episodeInterval: result.pattern !== 'binge' ? Math.round(avgInterval) : undefined,
      seasonStart,
      seasonEnd,
      totalEpisodes,
      diagnostics: {
        ...diagnostics,
        reasoning: result.reasoning
      }
    };
  }

  private detectPattern(
    episodes: EpisodeMetadata[],
    intervals: number[], 
    avgInterval: number, 
    stdDev: number, 
    maxInterval: number, 
    minInterval: number,
    hasPremierePattern: boolean,
    hasMultiWeeklyPattern: boolean,
    totalEpisodes: number
  ): { pattern: ReleasePattern; confidence: number; reasoning: string } {
    
    // Binge: All episodes ≤1 day apart
    if (intervals.every(int => int <= 1)) {
      return {
        pattern: 'binge',
        confidence: 0.95,
        reasoning: 'All episodes released within 1 day of each other'
      };
    }

    // Premiere Weekly: 2+ episodes day 1, then 6-8 day intervals
    if (hasPremierePattern) {
      return {
        pattern: 'premiere_weekly',
        confidence: 0.9,
        reasoning: 'Multiple episodes released on premiere date, followed by weekly schedule'
      };
    }

    // Weekly: 6-8 days average, low variance (<2 days std dev)
    if (avgInterval >= 6 && avgInterval <= 8 && stdDev < 2) {
      return {
        pattern: 'weekly',
        confidence: 0.85,
        reasoning: `Consistent weekly pattern: ${avgInterval.toFixed(1)} day average with ${stdDev.toFixed(1)} day standard deviation`
      };
    }

    // Multi-weekly: Multiple episodes every ~7 days consistently
    if (hasMultiWeeklyPattern) {
      return {
        pattern: 'multi_weekly',
        confidence: 0.8,
        reasoning: 'Multiple episodes released consistently every ~7 days'
      };
    }

    // Multi episodes per week: Check for weekly clusters of episodes
    const clusterPattern = this.detectWeeklyEpisodeClusters(episodes);
    if (clusterPattern.isClusterPattern) {
      return {
        pattern: 'multi_episodes_per_week' as ReleasePattern,
        confidence: clusterPattern.confidence,
        reasoning: clusterPattern.reasoning
      };
    }

    // Mixed: Irregular but identifiable pattern (premieres + gaps)
    if (avgInterval >= 3 && avgInterval <= 14 && stdDev < 5 && totalEpisodes >= 4) {
      return {
        pattern: 'mixed',
        confidence: 0.7,
        reasoning: `Mixed pattern with ${avgInterval.toFixed(1)} day average interval and moderate variance (${stdDev.toFixed(1)} days)`
      };
    }

    // Unknown: Truly irregular or insufficient data
    return {
      pattern: 'unknown',
      confidence: 0.5,
      reasoning: `Irregular pattern: ${avgInterval.toFixed(1)} day average with high variance (${stdDev.toFixed(1)} days) or insufficient episodes`
    };
  }

  private detectPremierePattern(episodes: EpisodeMetadata[]): boolean {
    if (episodes.length < 3) return false;
    
    // Check if first two episodes are on the same day
    const firstEpisodeDate = new Date(episodes[0].airDate).toDateString();
    const secondEpisodeDate = new Date(episodes[1].airDate).toDateString();
    
    if (firstEpisodeDate !== secondEpisodeDate) return false;

    // Check if subsequent episodes follow roughly weekly pattern
    const remainingIntervals = [];
    for (let i = 2; i < episodes.length; i++) {
      const interval = Math.round(
        (new Date(episodes[i].airDate).getTime() - new Date(episodes[i-1].airDate).getTime()) / 
        (1000 * 60 * 60 * 24)
      );
      remainingIntervals.push(interval);
    }

    const avgRemainingInterval = remainingIntervals.reduce((sum, int) => sum + int, 0) / remainingIntervals.length;
    return avgRemainingInterval >= 5 && avgRemainingInterval <= 9;
  }

  private detectMultiWeeklyPattern(intervals: number[]): boolean {
    if (intervals.length < 2) return false;
    
    // Look for pattern where multiple episodes are released with ~7 day gaps
    const weeklyIntervals = intervals.filter(int => int >= 6 && int <= 8);
    return weeklyIntervals.length >= intervals.length * 0.7; // 70% of intervals should be weekly
  }

  private detectWeeklyEpisodeClusters(episodes: EpisodeMetadata[]): { 
    isClusterPattern: boolean; 
    confidence: number; 
    reasoning: string 
  } {
    if (episodes.length < 6) {
      return { isClusterPattern: false, confidence: 0, reasoning: 'Not enough episodes to detect cluster pattern' };
    }

    // Group episodes into weeks based on air dates
    const weekGroups: EpisodeMetadata[][] = [];
    let currentWeek: EpisodeMetadata[] = [episodes[0]];
    
    for (let i = 1; i < episodes.length; i++) {
      const currentDate = new Date(episodes[i].airDate);
      const lastDate = new Date(currentWeek[currentWeek.length - 1].airDate);
      const daysDiff = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // If gap is more than 3 days, start a new week
      if (daysDiff > 3) {
        weekGroups.push([...currentWeek]);
        currentWeek = [episodes[i]];
      } else {
        currentWeek.push(episodes[i]);
      }
    }
    weekGroups.push(currentWeek);

    // Analyze cluster patterns
    if (weekGroups.length < 3) {
      return { isClusterPattern: false, confidence: 0, reasoning: 'Not enough weeks to establish pattern' };
    }

    // Check for consistent multi-episode weeks
    const multiEpisodeWeeks = weekGroups.filter(week => week.length > 1);
    const multiEpisodeRatio = multiEpisodeWeeks.length / weekGroups.length;
    
    if (multiEpisodeRatio < 0.6) {
      return { isClusterPattern: false, confidence: 0, reasoning: 'Not enough multi-episode weeks' };
    }

    // Check consistency of episodes per week
    const episodesPerWeek = weekGroups.map(week => week.length);
    const mostCommonCount = this.getMostCommonValue(episodesPerWeek);
    const consistentWeeks = episodesPerWeek.filter(count => count === mostCommonCount).length;
    const consistency = consistentWeeks / weekGroups.length;

    if (consistency < 0.7 || mostCommonCount < 2) {
      return { isClusterPattern: false, confidence: 0, reasoning: 'Inconsistent episode count per week' };
    }

    // Check intervals between week starts (should be roughly weekly)
    const weekStartDates = weekGroups.map(week => new Date(week[0].airDate));
    const weekIntervals = [];
    for (let i = 1; i < weekStartDates.length; i++) {
      const days = Math.floor((weekStartDates[i].getTime() - weekStartDates[i-1].getTime()) / (1000 * 60 * 60 * 24));
      weekIntervals.push(days);
    }

    // const avgWeekInterval = weekIntervals.reduce((sum, interval) => sum + interval, 0) / weekIntervals.length;
    const weeklyConsistency = weekIntervals.filter(interval => interval >= 5 && interval <= 9).length / weekIntervals.length;

    if (weeklyConsistency < 0.7) {
      return { isClusterPattern: false, confidence: 0, reasoning: 'Weeks not consistently spaced' };
    }

    // Calculate confidence based on consistency metrics
    const confidence = Math.min(0.9, (consistency + weeklyConsistency + multiEpisodeRatio) / 3);
    
    // Generate descriptive reasoning
    const daysOfWeek = this.getCommonDaysOfWeek(weekGroups);
    const reasoning = `${mostCommonCount} episodes per week pattern${daysOfWeek ? `: ${daysOfWeek} schedule` : ''} repeated weekly (${(consistency * 100).toFixed(0)}% consistent)`;

    return {
      isClusterPattern: true,
      confidence,
      reasoning
    };
  }

  private getMostCommonValue(arr: number[]): number {
    const counts: { [key: number]: number } = {};
    arr.forEach(val => counts[val] = (counts[val] || 0) + 1);
    return parseInt(Object.keys(counts).reduce((a, b) => counts[parseInt(a)] > counts[parseInt(b)] ? a : b));
  }

  private getCommonDaysOfWeek(weekGroups: EpisodeMetadata[][]): string | null {
    if (weekGroups.length < 2) return null;
    
    // Get day patterns from first few weeks
    const dayPatterns = weekGroups.slice(0, 3).map(week => {
      return week.map(ep => {
        const date = new Date(ep.airDate);
        return date.toLocaleDateString('en-US', { weekday: 'long' });
      }).sort();
    });
    
    // Check if patterns are consistent
    const firstPattern = dayPatterns[0];
    const isConsistent = dayPatterns.every(pattern => 
      pattern.length === firstPattern.length && 
      pattern.every((day, index) => day === firstPattern[index])
    );
    
    if (isConsistent && firstPattern.length > 1) {
      return firstPattern.join('-');
    }
    
    return null;
  }

  private countPremiereEpisodes(episodes: EpisodeMetadata[]): number {
    if (episodes.length === 0) return 0;
    
    const firstDate = new Date(episodes[0].airDate).toDateString();
    return episodes.filter(ep => new Date(ep.airDate).toDateString() === firstDate).length;
  }

  /**
   * Discover current shows for pattern analysis testing
   */
  async discoverCurrentShows(): Promise<{ airingToday: any[], onTheAir: any[], popular: any[] }> {
    const TMDB_READ_TOKEN = process.env.TMDB_API_READ_TOKEN;
    if (!TMDB_READ_TOKEN) {
      throw new Error('TMDB_API_READ_TOKEN not configured');
    }

    const headers = {
      'Authorization': `Bearer ${TMDB_READ_TOKEN}`,
      'Accept': 'application/json'
    };

    try {
      // Fetch current shows from multiple endpoints
      const [airingTodayResponse, onTheAirResponse, popularResponse] = await Promise.all([
        fetch('https://api.themoviedb.org/3/tv/airing_today?language=en-US&page=1', { headers }),
        fetch('https://api.themoviedb.org/3/tv/on_the_air?language=en-US&page=1', { headers }),
        fetch('https://api.themoviedb.org/3/tv/popular?language=en-US&page=1', { headers })
      ]);

      const [airingToday, onTheAir, popular] = await Promise.all([
        airingTodayResponse.json(),
        onTheAirResponse.json(),
        popularResponse.json()
      ]);

      return {
        airingToday: airingToday.results || [],
        onTheAir: onTheAir.results || [],
        popular: popular.results || []
      };
    } catch (error) {
      console.error('Error discovering current shows:', error);
      return { airingToday: [], onTheAir: [], popular: [] };
    }
  }

  /**
   * Analyze a specific show's release pattern using TMDB data
   */
  async analyzeShowPattern(tmdbId: number, seasonNumber: number = 1): Promise<ReleasePatternAnalysis | null> {
    const TMDB_READ_TOKEN = process.env.TMDB_API_READ_TOKEN;
    if (!TMDB_READ_TOKEN) {
      throw new Error('TMDB_API_READ_TOKEN not configured');
    }

    const headers = {
      'Authorization': `Bearer ${TMDB_READ_TOKEN}`,
      'Accept': 'application/json'
    };

    try {
      // Fetch season details
      const response = await fetch(
        `https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNumber}?language=en-US`, 
        { headers }
      );
      
      if (!response.ok) {
        console.error(`Failed to fetch season ${seasonNumber} for show ${tmdbId}: ${response.statusText}`);
        return null;
      }

      const seasonData = await response.json();
      
      // Convert TMDB episode data to our format
      const episodes: EpisodeMetadata[] = seasonData.episodes
        .filter((ep: any) => ep.air_date) // Only episodes with air dates
        .map((ep: any) => ({
          id: `${tmdbId}_s${seasonNumber}_e${ep.episode_number}`,
          seasonNumber: seasonNumber,
          episodeNumber: ep.episode_number,
          airDate: new Date(ep.air_date).toISOString(),
          title: ep.name || `Episode ${ep.episode_number}`
        }));

      if (!episodes.length) {
        return null;
      }

      return this.analyzeReleasePattern(episodes);
    } catch (error) {
      console.error(`Error analyzing pattern for show ${tmdbId}:`, error);
      return null;
    }
  }

  /**
   * Generate comprehensive pattern report for discovered shows
   */
  async generatePatternReport(sampleSize: number = 20): Promise<{
    totalAnalyzed: number;
    patternDistribution: Record<ReleasePattern, number>;
    confidenceStats: { avg: number; min: number; max: number };
    examples: Array<{
      tmdbId: number;
      title: string;
      pattern: ReleasePattern;
      confidence: number;
      reasoning: string;
    }>;
    errors: number;
  }> {
    console.log('🔍 Discovering current shows...');
    const discoveredShows = await this.discoverCurrentShows();
    
    // Combine and deduplicate shows
    const allShows = new Map();
    [...discoveredShows.airingToday, ...discoveredShows.onTheAir, ...discoveredShows.popular]
      .forEach(show => allShows.set(show.id, show));
    
    const showList = Array.from(allShows.values()).slice(0, sampleSize);
    
    console.log(`📊 Analyzing patterns for ${showList.length} shows...`);
    
    const results = {
      totalAnalyzed: 0,
      patternDistribution: {
        'binge': 0,
        'weekly': 0,
        'premiere_weekly': 0,
        'multi_weekly': 0,
        'mixed': 0,
        'unknown': 0
      } as Record<ReleasePattern, number>,
      confidenceStats: { avg: 0, min: 1, max: 0 },
      examples: [] as Array<{
        tmdbId: number;
        title: string;
        pattern: ReleasePattern;
        confidence: number;
        reasoning: string;
      }>,
      errors: 0
    };

    const confidences: number[] = [];

    // Analyze each show with rate limiting
    for (const [index, show] of showList.entries()) {
      try {
        // Rate limiting - wait between requests
        if (index > 0) {
          await new Promise(resolve => setTimeout(resolve, 250)); // 250ms delay
        }

        const analysis = await this.analyzeShowPattern(show.id);
        
        if (analysis) {
          results.totalAnalyzed++;
          results.patternDistribution[analysis.pattern]++;
          confidences.push(analysis.confidence);
          
          results.examples.push({
            tmdbId: show.id,
            title: show.name,
            pattern: analysis.pattern,
            confidence: analysis.confidence,
            reasoning: analysis.diagnostics?.reasoning || 'No reasoning provided'
          });

          console.log(`✅ ${show.name}: ${analysis.pattern} (confidence: ${analysis.confidence})`);
        } else {
          results.errors++;
          console.log(`❌ Failed to analyze: ${show.name}`);
        }
      } catch (error) {
        results.errors++;
        console.error(`❌ Error analyzing ${show.name}:`, error);
      }
    }

    // Calculate confidence statistics
    if (confidences.length > 0) {
      results.confidenceStats.avg = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
      results.confidenceStats.min = Math.min(...confidences);
      results.confidenceStats.max = Math.max(...confidences);
    }

    return results;
  }

  /**
   * Validate pattern detection against known shows
   */
  async validatePatternDetection(): Promise<{
    validationResults: Array<{
      title: string;
      expected: ReleasePattern;
      detected: ReleasePattern;
      match: boolean;
      confidence: number;
    }>;
    accuracy: number;
  }> {
    // Known test cases for validation
    const knownPatterns = [
      { title: "Stranger Things", tmdbId: 66732, expected: 'binge' as ReleasePattern },
      { title: "The Boys", tmdbId: 76479, expected: 'weekly' as ReleasePattern },
      { title: "House of the Dragon", tmdbId: 94997, expected: 'weekly' as ReleasePattern }
    ];

    const validationResults = [];
    let correctPredictions = 0;

    for (const testCase of knownPatterns) {
      try {
        await new Promise(resolve => setTimeout(resolve, 250)); // Rate limiting
        
        const analysis = await this.analyzeShowPattern(testCase.tmdbId);
        
        if (analysis) {
          const match = analysis.pattern === testCase.expected;
          if (match) correctPredictions++;

          validationResults.push({
            title: testCase.title,
            expected: testCase.expected,
            detected: analysis.pattern,
            match,
            confidence: analysis.confidence
          });

          console.log(`🧪 ${testCase.title}: Expected ${testCase.expected}, Got ${analysis.pattern} ${match ? '✅' : '❌'}`);
        }
      } catch (error) {
        console.error(`❌ Validation error for ${testCase.title}:`, error);
      }
    }

    const accuracy = validationResults.length > 0 ? correctPredictions / validationResults.length : 0;

    return {
      validationResults,
      accuracy
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
