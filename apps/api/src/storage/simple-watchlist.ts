/**
 * Simple in-memory watchlist storage
 * Shared between TMDB router and watchlist router
 */

export interface WatchlistItem {
  id: string;
  tmdbId: number;
  title: string;
  status: 'watchlist' | 'watching' | 'completed' | 'dropped';
  addedAt: string;
  streamingProvider?: {
    id: number;
    name: string;
    logo_path: string;
  };
  bufferDays?: number; // optional per-show buffer extension (UI hint)
  country?: string;    // user's selected country for this show (e.g., 'US','AU')
}

export interface EpisodeProgress {
  showId: string;
  tmdbId: number;
  seasonNumber: number;
  episodeNumber: number;
  status: 'watched' | 'watching' | 'unwatched';
  watchedAt?: string;
  rating?: number;
}

export interface UserProgress {
  userId: string;
  episodes: EpisodeProgress[];
}

// Simple in-memory storage (in production this would be a database)
export const watchlistStorage = new Map<string, WatchlistItem[]>();
export const episodeProgressStorage = new Map<string, EpisodeProgress[]>();

// Add some test data to match the user's screenshot 
const testWatchingShows: WatchlistItem[] = [
  {
    id: 'user-1-peacemaker-test',
    tmdbId: 110492, // Fixed: Correct TMDB ID for Peacemaker (2022)
    title: 'Peacemaker',
    status: 'watching',
    addedAt: new Date('2024-01-20').toISOString(),
    streamingProvider: {
      id: 1899,
      name: 'HBO Max',
      logo_path: 'https://image.tmdb.org/t/p/w45/jbe4gVSfRlbPTdESXhEKpornsfu.jpg'
    }
  },
  {
    id: 'user-1-dexter-test',
    tmdbId: 259909, // Fixed: Correct TMDB ID for Dexter: Resurrection
    title: 'Dexter: Resurrection',
    status: 'watching',
    addedAt: new Date('2024-02-10').toISOString(),
    streamingProvider: {
      id: 4888,
      name: 'Paramount+ with Showtime',
      logo_path: 'https://image.tmdb.org/t/p/w45/h5DcR0J2EESLitnhR8xLG1QymTE.jpg'
    }
  }
];

// Initialize user-1 with test watching shows
watchlistStorage.set('user-1', testWatchingShows);

export const watchlistStorageService = {
  // Get user's watchlist
  getUserWatchlist(userId: string): WatchlistItem[] {
    return watchlistStorage.get(userId) || [];
  },

  // Add item to watchlist
  addItem(userId: string, item: Omit<WatchlistItem, 'id'>): WatchlistItem {
    const userWatchlist = this.getUserWatchlist(userId);
    
    // Check if already exists
    const existing = userWatchlist.find(existing => existing.tmdbId === item.tmdbId);
    if (existing) {
      // Update status if different
      if (existing.status !== item.status) {
        existing.status = item.status;
      }
      return existing;
    }

    // Create new item
    const newItem: WatchlistItem = {
      ...item,
      id: `${userId}-${item.tmdbId}-${Date.now()}`
    };

    userWatchlist.push(newItem);
    watchlistStorage.set(userId, userWatchlist);
    
    return newItem;
  },

  // Update item status
  updateItemStatus(userId: string, itemId: string, status: WatchlistItem['status']): WatchlistItem | null {
    const userWatchlist = this.getUserWatchlist(userId);
    const item = userWatchlist.find(item => item.id === itemId);
    
    if (item) {
      item.status = status;
      watchlistStorage.set(userId, userWatchlist);
    }
    
    return item || null;
  },

  // Remove item
  removeItem(userId: string, itemId: string): boolean {
    const userWatchlist = this.getUserWatchlist(userId);
    const itemIndex = userWatchlist.findIndex(item => item.id === itemId);
    
    if (itemIndex >= 0) {
      userWatchlist.splice(itemIndex, 1);
      watchlistStorage.set(userId, userWatchlist);
      return true;
    }
    
    return false;
  },

  // Get stats
  getStats(userId: string) {
    const userWatchlist = this.getUserWatchlist(userId);
    
    return {
      totalShows: userWatchlist.length,
      byStatus: {
        watchlist: userWatchlist.filter(item => item.status === 'watchlist').length,
        watching: userWatchlist.filter(item => item.status === 'watching').length,
        completed: userWatchlist.filter(item => item.status === 'completed').length,
        dropped: userWatchlist.filter(item => item.status === 'dropped').length
      },
      averageRating: 0 // Not implemented in simple version
    };
  },

  // Episode Progress Methods

  // Get user's episode progress
  getUserEpisodeProgress(userId: string): EpisodeProgress[] {
    return episodeProgressStorage.get(userId) || [];
  },

  // Mark episode as watched (and optionally all previous episodes in season)
  markEpisodeWatched(userId: string, tmdbId: number, seasonNumber: number, episodeNumber: number, markPrevious: boolean = true): EpisodeProgress[] {
    const userProgress = this.getUserEpisodeProgress(userId);
    const showId = `tmdb-${tmdbId}`;
    const watchedAt = new Date().toISOString();
    
    if (markPrevious) {
      // Mark all episodes up to this one as watched
      for (let ep = 1; ep <= episodeNumber; ep++) {
        const existingIndex = userProgress.findIndex(p => 
          p.tmdbId === tmdbId && p.seasonNumber === seasonNumber && p.episodeNumber === ep
        );
        
        if (existingIndex >= 0) {
          // Update existing
          userProgress[existingIndex].status = 'watched';
          userProgress[existingIndex].watchedAt = watchedAt;
        } else {
          // Create new
          userProgress.push({
            showId,
            tmdbId,
            seasonNumber,
            episodeNumber: ep,
            status: 'watched',
            watchedAt
          });
        }
      }
    } else {
      // Mark only this specific episode
      const existingIndex = userProgress.findIndex(p => 
        p.tmdbId === tmdbId && p.seasonNumber === seasonNumber && p.episodeNumber === episodeNumber
      );
      
      if (existingIndex >= 0) {
        userProgress[existingIndex].status = 'watched';
        userProgress[existingIndex].watchedAt = watchedAt;
      } else {
        userProgress.push({
          showId,
          tmdbId,
          seasonNumber,
          episodeNumber,
          status: 'watched',
          watchedAt
        });
      }
    }
    
    episodeProgressStorage.set(userId, userProgress);
    return userProgress;
  },

  // Get progress for a specific show
  getShowProgress(userId: string, tmdbId: number): EpisodeProgress[] {
    const userProgress = this.getUserEpisodeProgress(userId);
    return userProgress.filter(p => p.tmdbId === tmdbId);
  },

  // Get progress statistics for a show
  getShowProgressStats(userId: string, tmdbId: number, totalEpisodes?: number) {
    const showProgress = this.getShowProgress(userId, tmdbId);
    const watchedEpisodes = showProgress.filter(p => p.status === 'watched').length;
    
    return {
      totalEpisodes: totalEpisodes || 0,
      watchedEpisodes,
      progressPercentage: totalEpisodes ? Math.round((watchedEpisodes / totalEpisodes) * 100) : 0,
      lastWatched: showProgress
        .filter(p => p.watchedAt)
        .sort((a, b) => new Date(b.watchedAt!).getTime() - new Date(a.watchedAt!).getTime())[0]
    };
  },

  // Get progress by season for a show
  getSeasonProgress(userId: string, tmdbId: number, seasonNumber: number): EpisodeProgress[] {
    const showProgress = this.getShowProgress(userId, tmdbId);
    return showProgress.filter(p => p.seasonNumber === seasonNumber);
  },

  // Mark episode with specific status
  updateEpisodeStatus(userId: string, tmdbId: number, seasonNumber: number, episodeNumber: number, status: EpisodeProgress['status']): EpisodeProgress | null {
    const userProgress = this.getUserEpisodeProgress(userId);
    const showId = `tmdb-${tmdbId}`;
    
    const existingIndex = userProgress.findIndex(p => 
      p.tmdbId === tmdbId && p.seasonNumber === seasonNumber && p.episodeNumber === episodeNumber
    );
    
    if (existingIndex >= 0) {
      // Update existing
      userProgress[existingIndex].status = status;
      if (status === 'watched') {
        userProgress[existingIndex].watchedAt = new Date().toISOString();
      }
    } else {
      // Create new
      const newProgress: EpisodeProgress = {
        showId,
        tmdbId,
        seasonNumber,
        episodeNumber,
        status,
        ...(status === 'watched' && { watchedAt: new Date().toISOString() })
      };
      userProgress.push(newProgress);
    }
    
    episodeProgressStorage.set(userId, userProgress);
    return userProgress[existingIndex] || userProgress[userProgress.length - 1];
  },

  // Update streaming provider for a watchlist item
  updateStreamingProvider(userId: string, itemId: string, provider: { id: number; name: string; logo_path: string } | null): WatchlistItem | null {
    const userWatchlist = this.getUserWatchlist(userId);
    const item = userWatchlist.find(item => item.id === itemId);
    
    if (item) {
      item.streamingProvider = provider || undefined;
      watchlistStorage.set(userId, userWatchlist);
    }
    
    return item || null;
  },

  // Update per-show buffer days
  updateBufferDays(userId: string, itemId: string, bufferDays: number): WatchlistItem | null {
    const userWatchlist = this.getUserWatchlist(userId);
    const item = userWatchlist.find(item => item.id === itemId);
    if (item) {
      item.bufferDays = Math.max(0, Math.min(30, Math.floor(bufferDays)));
      watchlistStorage.set(userId, userWatchlist);
    }
    return item || null;
  },

  // Update per-show country override
  updateCountry(userId: string, itemId: string, countryCode: string | null): WatchlistItem | null {
    const userWatchlist = this.getUserWatchlist(userId);
    const item = userWatchlist.find(item => item.id === itemId);
    if (item) {
      item.country = countryCode || undefined;
      watchlistStorage.set(userId, userWatchlist);
    }
    return item || null;
  }
};
