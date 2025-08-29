import React from 'react';

interface PatternAnalysisProps {
  analysis: {
    showDetails: {
      id: number;
      title: string;
      overview: string;
      status: string;
      firstAirDate: string;
      lastAirDate: string;
      poster?: string;
    };
    pattern: string;
    confidence: number;
    episodeCount: number;
    seasonInfo: Array<{
      seasonNumber: number;
      episodeCount: number;
      airDate: string;
      pattern?: string;
      confidence?: number;
    }>;
    reasoning: string;
    diagnostics: {
      intervals: number[];
      avgInterval: number;
      stdDev: number;
      reasoning: string;
      episodeDetails: Array<{
        number: number;
        airDate: string;
        title: string;
      }>;
    };
    watchProviders: Array<{
      providerId: number;
      name: string;
      logo: string;
      type: string;
      deepLink?: string;
    }>;
    analyzedSeason: number;
    country: string;
  } | null;
  loading?: boolean;
  error?: string;
}

const PatternAnalysis: React.FC<PatternAnalysisProps> = ({ analysis, loading, error }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Analyzing pattern...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">Analysis Failed</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <p className="text-gray-500 text-center py-8">
          Select a show to see pattern analysis
        </p>
      </div>
    );
  }

  const getPatternColor = (pattern: string) => {
    switch (pattern) {
      case 'binge': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'weekly': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'premiere_weekly': return 'bg-green-100 text-green-800 border-green-200';
      case 'multi_weekly': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'mixed': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatInterval = (days: number) => {
    if (days === 0) return 'Same day';
    if (days === 1) return '1 day';
    if (days < 7) return `${days} days`;
    const weeks = Math.round(days / 7);
    return weeks === 1 ? '1 week' : `${weeks} weeks`;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
      {/* Show Header */}
      <div className="flex items-start space-x-4">
        {analysis.showDetails.poster && (
          <img
            src={analysis.showDetails.poster}
            alt={`${analysis.showDetails.title} poster`}
            className="w-20 h-30 object-cover rounded-lg flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {analysis.showDetails.title}
          </h2>
          <p className="text-sm text-gray-600 mb-3 line-clamp-3">
            {analysis.showDetails.overview}
          </p>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>Status: <span className="font-medium">{analysis.showDetails.status}</span></span>
            <span>Analyzed Season: <span className="font-medium">{analysis.analyzedSeason}</span></span>
            <span>Episodes: <span className="font-medium">{analysis.episodeCount}</span></span>
          </div>
        </div>
      </div>

      {/* Pattern Detection Result */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-3">Pattern Detection</h3>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getPatternColor(analysis.pattern)}`}>
              {analysis.pattern.replace('_', ' ').toUpperCase()}
            </span>
            <span className={`font-medium ${getConfidenceColor(analysis.confidence)}`}>
              {Math.round(analysis.confidence * 100)}% confidence
            </span>
          </div>
        </div>
        <p className="text-sm text-gray-700 bg-white rounded p-3 border-l-4 border-blue-200">
          {analysis.reasoning}
        </p>
      </div>

      {/* Episode Timeline */}
      {analysis.diagnostics.episodeDetails.length > 0 && (
        <div>
          <h3 className="font-medium text-gray-900 mb-3">Episode Timeline</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid gap-2 max-h-64 overflow-y-auto">
              {analysis.diagnostics.episodeDetails.map((episode, index) => {
                const interval = index > 0 ? analysis.diagnostics.intervals[index - 1] : 0;
                return (
                  <div key={episode.number} className="flex items-center justify-between py-2 px-3 bg-white rounded border">
                    <div className="flex items-center space-x-3">
                      <span className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full text-xs font-medium flex items-center justify-center">
                        {episode.number}
                      </span>
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {episode.title}
                      </span>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <div>{new Date(episode.airDate).toLocaleDateString()}</div>
                      {index > 0 && (
                        <div className="text-xs text-gray-400">
                          +{formatInterval(interval || 0)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Pattern Diagnostics */}
      <div>
        <h3 className="font-medium text-gray-900 mb-3">Pattern Diagnostics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-gray-900">
              {formatInterval(analysis.diagnostics.avgInterval)}
            </div>
            <div className="text-xs text-gray-500">Average Interval</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-gray-900">
              ±{analysis.diagnostics.stdDev.toFixed(1)} days
            </div>
            <div className="text-xs text-gray-500">Standard Deviation</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-gray-900">
              {analysis.diagnostics.intervals.length}
            </div>
            <div className="text-xs text-gray-500">Intervals Analyzed</div>
          </div>
        </div>
        <p className="text-sm text-gray-600 bg-gray-50 rounded p-3">
          {analysis.diagnostics.reasoning}
        </p>
      </div>

      {/* Season Information */}
      {analysis.seasonInfo.length > 0 && (
        <div>
          <h3 className="font-medium text-gray-900 mb-3">Season Information</h3>
          <div className="grid gap-2">
            {analysis.seasonInfo.map((season) => (
              <div key={season.seasonNumber} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                <div className="flex items-center space-x-3">
                  <span className="font-medium text-gray-900">Season {season.seasonNumber}</span>
                  <span className="text-sm text-gray-600">{season.episodeCount} episodes</span>
                  {season.airDate && (
                    <span className="text-xs text-gray-500">
                      {new Date(season.airDate).getFullYear()}
                    </span>
                  )}
                </div>
                {season.pattern && (
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getPatternColor(season.pattern)}`}>
                      {season.pattern}
                    </span>
                    {season.confidence && (
                      <span className={`text-xs ${getConfidenceColor(season.confidence)}`}>
                        {Math.round(season.confidence * 100)}%
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Streaming Providers */}
      {analysis.watchProviders.length > 0 && (
        <div>
          <h3 className="font-medium text-gray-900 mb-3">
            Available on ({analysis.country})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {analysis.watchProviders.map((provider) => (
              <div
                key={provider.providerId}
                className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {provider.logo && (
                  <img
                    src={provider.logo}
                    alt={provider.name}
                    className="w-8 h-8 rounded object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-900 truncate">
                    {provider.name}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {provider.type}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PatternAnalysis;