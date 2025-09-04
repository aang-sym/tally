import React, { useState, useEffect } from 'react';
import OverviewCalendar from '../components/calendar/OverviewCalendar';
import SavingsCalendar from '../components/calendar/SavingsCalendar';
import { UserManager } from '../services/UserManager';
import { API_ENDPOINTS, apiRequest } from '../config/api';
import ErrorBoundary from '../components/ErrorBoundary';

type CalendarView = 'overview' | 'savings' | 'provider' | 'personal';

interface UserSubscription {
  id: string;
  service_id: string;
  monthly_cost: number;
  is_active: boolean;
  service: {
    id: string;
    name: string;
    logo_url?: string;
  };
}

interface UserShow {
  id: string;
  show_id: string;
  status: 'watchlist' | 'watching' | 'completed' | 'dropped';
  streaming_provider?: {
    id: number;
    name: string;
    logo_url: string;
  } | null;
  show: {
    title: string;
    tmdb_id: number;
  };
}

const Calendar: React.FC = () => {
  const [currentView, setCurrentView] = useState<CalendarView>('overview');
  const [userSubscriptions, setUserSubscriptions] = useState<UserSubscription[]>([]);
  const [userShows, setUserShows] = useState<UserShow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      setError(null);
      const userId = UserManager.getCurrentUserId();
      const token = localStorage.getItem('authToken') || undefined;

      // Load user subscriptions
      const subscriptionsData = await apiRequest(API_ENDPOINTS.users.subscriptions(userId), {}, token);
      setUserSubscriptions(subscriptionsData.data.subscriptions || []);

      // Load user shows
      const showsData = await apiRequest(API_ENDPOINTS.watchlist.v2, {}, token);
      setUserShows(showsData.data.shows || []);

    } catch (err) {
      console.error('Failed to load user data:', err);
      setError('Failed to load your data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const hasUserData = () => {
    return userSubscriptions.length > 0 || userShows.length > 0;
  };

  const views = [
    { id: 'overview' as const, name: 'Overview', icon: '📊', description: 'Multi-service overview' },
    { id: 'savings' as const, name: 'Savings', icon: '💰', description: 'Financial optimization' },
    { id: 'provider' as const, name: 'Provider', icon: '📺', description: 'Single service detailed view' },
    { id: 'personal' as const, name: 'Personal', icon: '👤', description: 'Your shows timeline' }
  ];

  const renderCurrentView = () => {
    const viewProps = {
      useUserData: hasUserData(),
      userSubscriptions: userSubscriptions,
      userShows: userShows
    };

    switch (currentView) {
      case 'overview':
        return <OverviewCalendar {...viewProps} />;
      case 'savings':
        return <SavingsCalendar {...viewProps} />;
      case 'provider':
        return (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-6xl mb-4">📺</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Provider Calendar</h3>
            <p className="text-gray-500">
              Detailed view for individual streaming services coming soon
            </p>
          </div>
        );
      case 'personal':
        return userShows.length > 0 ? (
          <div className="bg-white rounded-lg shadow p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Your Shows Timeline</h3>
            <div className="space-y-3">
              {userShows.slice(0, 10).map((userShow) => (
                <div key={userShow.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <span className="font-medium">{userShow.show.title}</span>
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${
                      userShow.status === 'watching' ? 'bg-green-100 text-green-800' :
                      userShow.status === 'completed' ? 'bg-purple-100 text-purple-800' :
                      userShow.status === 'watchlist' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {userShow.status}
                    </span>
                  </div>
                </div>
              ))}
              {userShows.length > 10 && (
                <p className="text-sm text-gray-500 text-center">
                  And {userShows.length - 10} more shows...
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-6xl mb-4">👤</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Personal Schedule</h3>
            <p className="text-gray-500">
              Add shows to your watchlist to see your personalized timeline
            </p>
          </div>
        );
      default:
        return <OverviewCalendar {...viewProps} />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header and View Selector */}
      <div className="mb-8">
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
              <p className="text-gray-600 mt-2">
                View your subscription calendar and optimize your streaming costs
              </p>
            </div>
            
            {/* View Tabs */}
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              {views.map((view) => (
                <button
                  key={view.id}
                  onClick={() => setCurrentView(view.id)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentView === view.id
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title={view.description}
                >
                  <span className="mr-2">{view.icon}</span>
                  {view.name}
                </button>
              ))}
            </div>
          </div>
          
          {/* User Data Status */}
          <div className="flex items-center justify-end">
            <div className="text-sm">
              <div className="flex items-center space-x-4 text-gray-600">
                <span>{userSubscriptions.filter(s => s.is_active).length} active subscriptions</span>
                <span>{userShows.length} shows</span>
                {loading && <span className="ml-2">⏳ Loading...</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-yellow-400 text-xl">⚠️</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* View Description removed per request */}
      </div>

      {/* Current View Content */}
      <ErrorBoundary>
        {renderCurrentView()}
      </ErrorBoundary>

      {/* Quick Actions */}
      <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => window.location.href = '/recommendations'}
            className="flex items-center p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <span className="text-2xl mr-3">💡</span>
            <div className="text-left">
              <div className="font-medium text-gray-900">Get Recommendations</div>
              <div className="text-sm text-gray-600">View optimization suggestions</div>
            </div>
          </button>
          
          <button
            onClick={() => window.location.href = '/my-shows'}
            className="flex items-center p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <span className="text-2xl mr-3">📺</span>
            <div className="text-left">
              <div className="font-medium text-gray-900">Manage Shows</div>
              <div className="text-sm text-gray-600">Update your watchlist</div>
            </div>
          </button>
          
          <button
            className="flex items-center p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <span className="text-2xl mr-3">📱</span>
            <div className="text-left">
              <div className="font-medium text-gray-900">Export Calendar</div>
              <div className="text-sm text-gray-600">Add to your calendar app</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
