import React, { useState, useEffect } from 'react';

interface UsageStats {
  service: string;
  today: {
    total: number;
    successful: number;
    failed: number;
    avgResponseTime: number;
  };
  month: {
    total: number;
    successful: number;
    failed: number;
  };
  lastUpdated: string;
}

interface APIUsageData {
  tmdb: UsageStats;
  streamingAvailability: UsageStats;
  quotas: {
    tmdb: {
      dailyLimit: number;
      monthlyLimit: number;
    };
    streamingAvailability: {
      dailyLimit: number;
      monthlyLimit: number;
    };
  };
}

const APIUsageWidget: React.FC = () => {
  const [usageData, setUsageData] = useState<APIUsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchUsageData = async () => {
    try {
      setError('');
      const response = await fetch('/api/usage-stats');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch usage stats');
      }

      setUsageData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch usage stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsageData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchUsageData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getUsagePercentage = (used: number, limit: number) => {
    return Math.min(100, (used / limit) * 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 bg-red-100';
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-sm text-gray-600">Loading usage stats...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4">
        <div className="text-red-600 text-sm">
          <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </div>
      </div>
    );
  }

  if (!usageData) return null;

  const tmdbMonthPercentage = getUsagePercentage(
    usageData.tmdb.month.total,
    usageData.quotas.tmdb.monthlyLimit
  );
  const streamingMonthPercentage = getUsagePercentage(
    usageData.streamingAvailability.month.total,
    usageData.quotas.streamingAvailability.monthlyLimit
  );

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div
        className="p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <svg
              className="w-5 h-5 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <h3 className="font-medium text-gray-900">API Usage</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                fetchUsageData();
              }}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="Refresh"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>

        {/* Compact view */}
        <div className="mt-2 flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-1">
            <span className="text-gray-600">TMDB:</span>
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${getUsageColor(tmdbMonthPercentage)}`}
            >
              {usageData.tmdb.month.total}/{usageData.quotas.tmdb.monthlyLimit}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-gray-600">Streaming:</span>
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${getUsageColor(streamingMonthPercentage)}`}
            >
              {usageData.streamingAvailability.month.total}/
              {usageData.quotas.streamingAvailability.monthlyLimit}
            </span>
          </div>
        </div>
      </div>

      {/* Expanded view */}
      {isExpanded && (
        <div className="p-4 space-y-6">
          {/* TMDB Stats */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">TMDB API</h4>
              <span className="text-xs text-gray-500">
                Avg: {usageData.tmdb.today.avgResponseTime}ms
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-3">
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">{usageData.tmdb.today.total}</div>
                <div className="text-xs text-gray-500">Calls Today</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">{usageData.tmdb.month.total}</div>
                <div className="text-xs text-gray-500">This Month</div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(tmdbMonthPercentage)}`}
                style={{ width: `${Math.min(100, tmdbMonthPercentage)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{tmdbMonthPercentage.toFixed(1)}% used</span>
              <span>
                {usageData.quotas.tmdb.monthlyLimit - usageData.tmdb.month.total} remaining
              </span>
            </div>
          </div>

          {/* Streaming Availability Stats */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">Streaming Availability API</h4>
              <span className="text-xs text-gray-500">
                Avg: {usageData.streamingAvailability.today.avgResponseTime}ms
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-3">
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">
                  {usageData.streamingAvailability.today.total}
                </div>
                <div className="text-xs text-gray-500">Calls Today</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">
                  {usageData.streamingAvailability.month.total}
                </div>
                <div className="text-xs text-gray-500">This Month</div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(streamingMonthPercentage)}`}
                style={{ width: `${Math.min(100, streamingMonthPercentage)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{streamingMonthPercentage.toFixed(1)}% used</span>
              <span>
                {usageData.quotas.streamingAvailability.monthlyLimit -
                  usageData.streamingAvailability.month.total}{' '}
                remaining
              </span>
            </div>
          </div>

          {/* Last updated */}
          <div className="text-xs text-gray-400 text-center border-t pt-2">
            Last updated: {new Date(usageData.tmdb.lastUpdated).toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
};

export default APIUsageWidget;
