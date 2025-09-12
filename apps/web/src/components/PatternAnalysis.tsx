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
    pattern: {
      pattern: string;
      confidence: number;
    };
    confidence: number;
    episodeCount: number;
    seasonInfo: Array<{
      seasonNumber: number;
      episodeCount: number;
      airDate: string;
      pattern?: {
        pattern: string;
        confidence: number;
      };
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
  onEpisodeClick?: (episode: {
    number: number;
    airDate: string;
    title: string;
    seasonNumber: number;
  }) => void;
  showInteractiveEpisodes?: boolean;
  watchedEpisodes?: Set<string>;
}

// Simple Provider Card Component
const ProviderCard: React.FC<{
  provider: {
    providerId: number;
    name: string;
    logo: string;
    type: string;
    deepLink?: string;
  };
}> = ({ provider }) => {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      {/* Logo centered at top */}
      <div className="flex justify-center mb-2">
        {provider.logo && (
          <img src={provider.logo} alt={provider.name} className="w-10 h-10 rounded object-cover" />
        )}
      </div>

      {/* Provider name - full text, no truncation */}
      <div className="text-center mb-1">
        <p className="text-sm font-medium text-gray-900 leading-tight">{provider.name}</p>
      </div>

      {/* Service type */}
      <div className="text-center">
        <p className="text-xs text-gray-500 capitalize">{provider.type}</p>
      </div>
    </div>
  );
};

const PatternAnalysis: React.FC<PatternAnalysisProps> = ({
  analysis,
  loading,
  error,
  onEpisodeClick,
  showInteractiveEpisodes = false,
  watchedEpisodes = new Set(),
}) => {
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
        <p className="text-gray-500 text-center py-8">Select a show to see pattern analysis</p>
      </div>
    );
  }

  const getPatternColor = (pattern: string) => {
    switch (pattern) {
      case 'binge':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'weekly':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'premiere_weekly':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'multi_weekly':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'multi_episodes_per_week':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'mixed':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
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

  // Helper function to determine episode state for interactive episodes
  const getEpisodeState = (
    episode: { airDate: string; number: number },
    index: number,
    episodes: Array<{ airDate: string }>,
    seasonNumber: number
  ) => {
    const episodeKey = `S${seasonNumber}E${episode.number}`;
    const isWatched = watchedEpisodes.has(episodeKey);

    if (isWatched) {
      return 'watched';
    }

    const now = new Date();
    const episodeDate = new Date(episode.airDate);

    if (episodeDate > now) {
      // Future episode
      const nextUnaired = episodes.findIndex((ep) => new Date(ep.airDate) > now);
      return index === nextUnaired ? 'next' : 'future';
    }
    return 'aired';
  };

  const getEpisodeStyles = (state: string, isClickable: boolean) => {
    const baseStyles = 'flex items-center justify-between py-2 px-3 rounded border transition-all';
    const clickableStyles = isClickable ? 'cursor-pointer hover:shadow-md' : '';

    switch (state) {
      case 'watched':
        return `${baseStyles} ${clickableStyles} bg-green-50 border-green-200 text-green-800`;
      case 'next':
        return `${baseStyles} ${clickableStyles} bg-blue-50 border-blue-200 ring-2 ring-blue-100`;
      case 'future':
        return `${baseStyles} ${clickableStyles} bg-gray-100 border-gray-200 opacity-60`;
      case 'aired':
      default:
        return `${baseStyles} ${clickableStyles} bg-white border-gray-200 hover:bg-gray-50`;
    }
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
          <h2 className="text-xl font-bold text-gray-900 mb-2">{analysis.showDetails.title}</h2>
          <p className="text-sm text-gray-600 mb-3 line-clamp-3">{analysis.showDetails.overview}</p>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>
              Status: <span className="font-medium">{analysis.showDetails.status}</span>
            </span>
            <span>
              Analyzed Season: <span className="font-medium">{analysis.analyzedSeason}</span>
            </span>
            <span>
              Episodes: <span className="font-medium">{analysis.episodeCount}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Pattern Detection Result */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-3">Pattern Detection</h3>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium border ${getPatternColor(analysis.pattern.pattern)}`}
            >
              {analysis.pattern.pattern.replace('_', ' ').toUpperCase()}
            </span>
            <span className={`font-medium ${getConfidenceColor(analysis.pattern.confidence)}`}>
              {Math.round(analysis.pattern.confidence * 100)}% confidence
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
          <h3 className="font-medium text-gray-900 mb-3">
            Episode Timeline
            {showInteractiveEpisodes && (
              <span className="ml-2 text-xs text-gray-500">(Click episode to set progress)</span>
            )}
          </h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid gap-2 max-h-64 overflow-y-auto">
              {analysis.diagnostics.episodeDetails.map((episode, index) => {
                const interval = index > 0 ? analysis.diagnostics.intervals[index - 1] : 0;
                const episodeState = showInteractiveEpisodes
                  ? getEpisodeState(
                      episode,
                      index,
                      analysis.diagnostics.episodeDetails,
                      analysis.analyzedSeason
                    )
                  : 'aired';
                const isClickable = showInteractiveEpisodes && !!onEpisodeClick;

                return (
                  <div
                    key={episode.number}
                    className={getEpisodeStyles(episodeState, isClickable)}
                    onClick={() => {
                      if (isClickable && onEpisodeClick) {
                        onEpisodeClick({
                          ...episode,
                          seasonNumber: analysis.analyzedSeason,
                        });
                      }
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <span
                        className={`w-6 h-6 rounded-full text-xs font-medium flex items-center justify-center ${
                          episodeState === 'watched'
                            ? 'bg-green-200 text-green-800'
                            : episodeState === 'next'
                              ? 'bg-blue-200 text-blue-800'
                              : episodeState === 'future'
                                ? 'bg-gray-300 text-gray-600'
                                : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {episodeState === 'watched' ? '✓' : episode.number}
                      </span>
                      <span
                        className={`text-sm font-medium truncate ${
                          episodeState === 'future' ? 'text-gray-500' : 'text-gray-900'
                        }`}
                      >
                        {episode.title}
                        {episodeState === 'next' && showInteractiveEpisodes && (
                          <span className="ml-2 text-xs text-blue-600">(Next airing)</span>
                        )}
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
              <div
                key={season.seasonNumber}
                className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded"
              >
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
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getPatternColor(season.pattern.pattern)}`}
                    >
                      {season.pattern.pattern}
                    </span>
                    {season.pattern.confidence && (
                      <span className={`text-xs ${getConfidenceColor(season.pattern.confidence)}`}>
                        {Math.round(season.pattern.confidence * 100)}%
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
          <h3 className="font-medium text-gray-900 mb-3">Available on ({analysis.country})</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-3">
            {analysis.watchProviders.map((provider) => (
              <ProviderCard key={provider.providerId} provider={provider} />
            ))}
          </div>

          {/* JustWatch Attribution */}
          <div className="text-xs text-gray-500 bg-gray-50 rounded p-2 border-l-2 border-blue-200">
            <div className="flex items-center space-x-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <span>
                Provider data powered by{' '}
                <a
                  href="https://www.justwatch.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  JustWatch
                </a>
                . Availability may vary by region and change frequently.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatternAnalysis;
