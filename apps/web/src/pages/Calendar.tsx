import React, { useState } from 'react';
import OverviewCalendar from '../components/calendar/OverviewCalendar';
import SavingsCalendar from '../components/calendar/SavingsCalendar';

type CalendarView = 'overview' | 'savings' | 'provider' | 'personal';

const Calendar: React.FC = () => {
  const [currentView, setCurrentView] = useState<CalendarView>('overview');

  const views = [
    { id: 'overview' as const, name: 'Overview', icon: '📊', description: 'Multi-service overview' },
    { id: 'savings' as const, name: 'Savings', icon: '💰', description: 'Financial optimization' },
    { id: 'provider' as const, name: 'Provider', icon: '📺', description: 'Single service detailed view' },
    { id: 'personal' as const, name: 'Personal', icon: '👤', description: 'Your shows timeline' }
  ];

  const renderCurrentView = () => {
    switch (currentView) {
      case 'overview':
        return <OverviewCalendar />;
      case 'savings':
        return <SavingsCalendar />;
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
        return (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-6xl mb-4">👤</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Personal Schedule</h3>
            <p className="text-gray-500">
              Your personalized show timeline and viewing schedule coming soon
            </p>
          </div>
        );
      default:
        return <OverviewCalendar />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header and View Selector */}
      <div className="mb-8">
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

        {/* View Description */}
        <div className="mt-4">
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-blue-400 text-xl">
                  {views.find(v => v.id === currentView)?.icon}
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <strong>{views.find(v => v.id === currentView)?.name}:</strong>{' '}
                  {views.find(v => v.id === currentView)?.description}
                </p>
                {currentView === 'overview' && (
                  <p className="text-xs text-blue-600 mt-1">
                    Service logos as colored bars showing usage intensity across all your streaming services
                  </p>
                )}
                {currentView === 'savings' && (
                  <p className="text-xs text-blue-600 mt-1">
                    Green days show savings opportunities, red days show costs - compare different optimization strategies
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Current View Content */}
      {renderCurrentView()}

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