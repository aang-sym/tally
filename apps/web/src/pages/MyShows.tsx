/**
 * My Shows Page
 * 
 * Comprehensive watchlist management interface with tabbed navigation,
 * progress tracking, and quick actions.
 */

import React, { useState, useEffect } from 'react';

// Types
interface Show {
  id: string;
  tmdb_id: number;
  title: string;
  overview?: string;
  poster_path?: string;
  status: string;
  total_episodes?: number;
}

interface UserShow {
  id: string;
  user_id: string;
  show_id: string;
  status: 'watchlist' | 'watching' | 'completed' | 'dropped';
  added_at: string;
  show_rating?: number;
  notes?: string;
  show: Show;
  progress?: {
    totalEpisodes: number;
    watchedEpisodes: number;
    currentEpisode?: {
      season_number: number;
      episode_number: number;
      name?: string;
    };
  };
}

interface WatchlistStats {
  totalShows: number;
  byStatus: Record<'watchlist' | 'watching' | 'completed' | 'dropped', number>;
  averageRating: number;
}

// API base URL
const API_BASE = 'http://localhost:3001';

// Mock user ID (would come from authentication)
const USER_ID = 'user-1';

const MyShows: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'watchlist' | 'watching' | 'completed'>('all');
  const [shows, setShows] = useState<UserShow[]>([]);
  const [stats, setStats] = useState<WatchlistStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch watchlist data
  useEffect(() => {
    fetchWatchlist();
    fetchStats();
  }, [activeTab]);

  const fetchWatchlist = async () => {
    try {
      setLoading(true);
      const statusParam = activeTab !== 'all' ? `?status=${activeTab}` : '';
      const response = await fetch(`${API_BASE}/api/watchlist-v2${statusParam}`, {
        headers: {
          'x-user-id': USER_ID
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch watchlist');
      }

      const data = await response.json();
      setShows(data.data.shows);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch watchlist:', err);
      setError('Failed to load your shows');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/watchlist-v2/stats`, {
        headers: {
          'x-user-id': USER_ID
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (err) {
      console.warn('Failed to fetch stats:', err);
    }
  };

  // Update show status
  const updateShowStatus = async (userShowId: string, newStatus: UserShow['status']) => {
    try {
      const response = await fetch(`${API_BASE}/api/watchlist-v2/${userShowId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': USER_ID
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      // Refresh the list
      fetchWatchlist();
      fetchStats();
    } catch (err) {
      console.error('Failed to update show status:', err);
      alert('Failed to update show status');
    }
  };

  // Rate a show
  const rateShow = async (userShowId: string, rating: number) => {
    try {
      const response = await fetch(`${API_BASE}/api/watchlist-v2/${userShowId}/rating`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': USER_ID
        },
        body: JSON.stringify({ rating })
      });

      if (!response.ok) {
        throw new Error('Failed to rate show');
      }

      // Update local state
      setShows(prevShows => 
        prevShows.map(show => 
          show.id === userShowId 
            ? { ...show, show_rating: rating }
            : show
        )
      );

      fetchStats();
    } catch (err) {
      console.error('Failed to rate show:', err);
      alert('Failed to rate show');
    }
  };

  // Remove show from watchlist
  const removeShow = async (userShowId: string) => {
    if (!confirm('Are you sure you want to remove this show from your watchlist?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/watchlist-v2/${userShowId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': USER_ID
        }
      });

      if (!response.ok) {
        throw new Error('Failed to remove show');
      }

      // Remove from local state
      setShows(prevShows => prevShows.filter(show => show.id !== userShowId));
      fetchStats();
    } catch (err) {
      console.error('Failed to remove show:', err);
      alert('Failed to remove show');
    }
  };

  const getProgressPercentage = (show: UserShow): number => {
    if (!show.progress || show.progress.totalEpisodes === 0) return 0;
    return Math.round((show.progress.watchedEpisodes / show.progress.totalEpisodes) * 100);
  };

  const getStatusBadgeColor = (status: UserShow['status']): string => {
    switch (status) {
      case 'watchlist': return 'bg-blue-100 text-blue-800';
      case 'watching': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-purple-100 text-purple-800';
      case 'dropped': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const tabs = [
    { key: 'all' as const, label: 'All Shows', count: stats?.totalShows || 0 },
    { key: 'watchlist' as const, label: 'Watchlist', count: stats?.byStatus.watchlist || 0 },
    { key: 'watching' as const, label: 'Watching', count: stats?.byStatus.watching || 0 },
    { key: 'completed' as const, label: 'Completed', count: stats?.byStatus.completed || 0 },
  ];

  const StarRating: React.FC<{ 
    rating?: number | undefined; 
    onRating?: (rating: number) => void;
    readonly?: boolean;
  }> = ({ rating, onRating, readonly = false }) => {
    const [hoveredRating, setHoveredRating] = useState<number | null>(null);

    return (
      <div className="flex items-center space-x-1">
        {[...Array(10)].map((_, i) => {
          const starRating = i + 1;
          const isActive = (hoveredRating || rating || 0) >= starRating;

          return (
            <button
              key={i}
              type="button"
              className={`text-sm ${
                readonly 
                  ? 'cursor-default' 
                  : 'cursor-pointer hover:scale-110 transition-transform'
              } ${
                isActive ? 'text-yellow-400' : 'text-gray-300'
              }`}
              onClick={() => !readonly && onRating?.(starRating)}
              onMouseEnter={() => !readonly && setHoveredRating(starRating)}
              onMouseLeave={() => !readonly && setHoveredRating(null)}
              disabled={readonly}
            >
              ★
            </button>
          );
        })}
        {rating && (
          <span className="text-xs text-gray-500 ml-2">
            {rating.toFixed(1)}/10
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Shows</h1>
          <p className="text-gray-600 mt-2">
            Track your favorite shows and manage your watching progress
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Total Shows</h3>
              <p className="text-3xl font-bold text-gray-900">{stats.totalShows}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Currently Watching</h3>
              <p className="text-3xl font-bold text-green-600">{stats.byStatus.watching}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Completed</h3>
              <p className="text-3xl font-bold text-purple-600">{stats.byStatus.completed}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Average Rating</h3>
              <p className="text-3xl font-bold text-yellow-600">
                {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '-'}
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                  <span className={`ml-2 py-1 px-2 rounded-full text-xs ${
                    activeTab === tab.key
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          {/* Show List */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-3 text-gray-600">Loading your shows...</span>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-600">{error}</p>
                <button 
                  onClick={() => fetchWatchlist()}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Retry
                </button>
              </div>
            ) : shows.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No shows found</p>
                <p className="text-gray-400 mt-2">
                  Start adding shows to your {activeTab === 'all' ? 'watchlist' : activeTab}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {shows.map((userShow) => (
                  <div key={userShow.id} className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex space-x-4">
                      {/* Poster */}
                      <div className="flex-shrink-0">
                        {userShow.show.poster_path ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w200${userShow.show.poster_path}`}
                            alt={`${userShow.show.title} poster`}
                            className="w-16 h-24 object-cover rounded"
                          />
                        ) : (
                          <div className="w-16 h-24 bg-gray-300 rounded flex items-center justify-center">
                            <span className="text-gray-500 text-xs">No Image</span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {userShow.show.title}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(userShow.status)}`}>
                            {userShow.status}
                          </span>
                        </div>

                        {/* Progress */}
                        {userShow.progress && (
                          <div className="mb-3">
                            <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                              <span>Progress</span>
                              <span>{userShow.progress.watchedEpisodes}/{userShow.progress.totalEpisodes} episodes</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${getProgressPercentage(userShow)}%` }}
                              ></div>
                            </div>
                            {userShow.progress.currentEpisode && (
                              <p className="text-xs text-gray-500 mt-1">
                                Next: S{userShow.progress.currentEpisode.season_number}E{userShow.progress.currentEpisode.episode_number}
                                {userShow.progress.currentEpisode.name && ` - ${userShow.progress.currentEpisode.name}`}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Rating */}
                        <div className="mb-3">
                          <StarRating
                            rating={userShow.show_rating}
                            onRating={(rating) => rateShow(userShow.id, rating)}
                          />
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2">
                          {userShow.status === 'watchlist' && (
                            <button
                              onClick={() => updateShowStatus(userShow.id, 'watching')}
                              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                            >
                              Start Watching
                            </button>
                          )}

                          {userShow.status === 'watching' && (
                            <button
                              onClick={() => updateShowStatus(userShow.id, 'completed')}
                              className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                            >
                              Mark Completed
                            </button>
                          )}

                          <button
                            onClick={() => removeShow(userShow.id)}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                          >
                            Remove
                          </button>
                        </div>

                        {/* Notes */}
                        {userShow.notes && (
                          <p className="text-sm text-gray-600 mt-2 italic">
                            "{userShow.notes}"
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyShows;