import React from 'react';
import TVGuide from '../components/tv-guide/TVGuide';

const TVGuidePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Page header */}
        <div className="bg-white shadow-sm border-b">
          <div className="px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">TV Guide</h1>
                <p className="mt-1 text-sm text-gray-600">
                  See your shows scheduled across all streaming services
                </p>
              </div>
              
              {/* Quick actions */}
              <div className="flex items-center space-x-3">
                <button className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  View Settings
                </button>
                <button className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors">
                  Add Shows
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* TV Guide Component */}
        <div className="p-4">
          <TVGuide />
        </div>

        {/* Help text */}
        <div className="px-4 pb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800 mb-1">
                  How to use the TV Guide
                </h3>
                <div className="text-sm text-blue-700 space-y-1">
                  <p>• Scroll horizontally to see future episode air dates</p>
                  <p>• Click on show blocks to view episode details</p>
                  <p>• Green dots indicate shows you're currently watching</p>
                  <p>• Yellow dots indicate new episodes available</p>
                  <p>• Use the "Today" button to jump back to current date</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TVGuidePage;