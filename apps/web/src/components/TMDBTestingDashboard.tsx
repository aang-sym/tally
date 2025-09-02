import React, { useState, useEffect } from 'react';
import TMDBSearch from './TMDBSearch';
import PatternAnalysis from './PatternAnalysis';
import APIUsageWidget from './APIUsageWidget';

interface TMDBShow {
  id: number;
  title: string;
  year?: number;
  poster?: string;
  overview: string;
  firstAirDate?: string;
  popularity: number;
}

// JSON Debug Section Component
const JSONDebugSection: React.FC<{ data: any }> = ({ data }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div 
        className="p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900">Raw API Data</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopy();
              }}
              className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
            >
              {copied ? 'Copied!' : 'Copy JSON'}
            </button>
            <svg 
              className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="p-4 bg-gray-50">
          <pre className="text-xs text-gray-800 overflow-x-auto whitespace-pre-wrap bg-white p-3 rounded border max-h-96 overflow-y-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

const TMDBTestingDashboard: React.FC = () => {
  const [selectedShow, setSelectedShow] = useState<TMDBShow | null>(null);
  const [country, setCountry] = useState('US');
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [selectedSeason, setSelectedSeason] = useState<number | undefined>(undefined);

  const countries = [
    { code: 'US', name: 'United States' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'CA', name: 'Canada' },
    { code: 'AU', name: 'Australia' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'JP', name: 'Japan' },
    { code: 'KR', name: 'South Korea' },
    { code: 'IN', name: 'India' },
    { code: 'BR', name: 'Brazil' },
  ];

  const handleShowSelect = async (show: TMDBShow) => {
    setSelectedShow(show);
    setAnalysisData(null);
    setAnalysisError('');
    setSelectedSeason(undefined);
    
    // Auto-analyze the selected show
    await analyzeShow(show.id);
  };

  const analyzeShow = async (showId: number, seasonNumber?: number) => {
    try {
      setAnalysisLoading(true);
      setAnalysisError('');
      
      const params = new URLSearchParams({ country });
      if (seasonNumber) {
        params.append('season', seasonNumber.toString());
      }
      
      const response = await fetch(`/api/tmdb/show/${showId}/analyze?${params}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Analysis failed');
      }
      
      setAnalysisData(data.analysis);
      setSelectedSeason(seasonNumber);
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Analysis failed');
      setAnalysisData(null);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleSeasonChange = async (seasonNumber?: number) => {
    if (selectedShow) {
      setSelectedSeason(seasonNumber);
      await analyzeShow(selectedShow.id, seasonNumber);
    }
  };

  // Auto-refresh when country changes
  useEffect(() => {
    if (selectedShow) {
      analyzeShow(selectedShow.id, selectedSeason);
    }
  }, [country]); // Only depend on country, not selectedShow or selectedSeason to avoid infinite loops

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            TMDB Testing Dashboard
          </h1>
          <p className="text-gray-600">
            Search TV shows, analyze release patterns, and explore streaming availability
          </p>
        </div>

        {/* Country Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Country/Region
          </label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="block w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Search */}
          <div className="space-y-6">
            <TMDBSearch
              onSelectShow={handleShowSelect}
              selectedShowId={selectedShow?.id}
            />
            
            {/* Season Selector */}
            {analysisData?.seasonInfo && analysisData.seasonInfo.length > 1 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="font-medium text-gray-900 mb-3">Season Analysis</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => handleSeasonChange(undefined)}
                    className={`px-3 py-2 text-sm rounded border transition-colors ${
                      selectedSeason === undefined
                        ? 'bg-blue-100 text-blue-800 border-blue-200'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    Latest Season
                  </button>
                  {analysisData.seasonInfo
                    .filter((s: any) => s.seasonNumber >= 1)
                    .map((season: any) => (
                      <button
                        key={season.seasonNumber}
                        onClick={() => handleSeasonChange(season.seasonNumber)}
                        className={`px-3 py-2 text-sm rounded border transition-colors ${
                          selectedSeason === season.seasonNumber
                            ? 'bg-blue-100 text-blue-800 border-blue-200'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        Season {season.seasonNumber}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Analysis Results */}
          <div className="space-y-6">
            <PatternAnalysis
              analysis={analysisData}
              loading={analysisLoading}
              error={analysisError}
            />
            
            {/* JSON Debug Section */}
            {analysisData && (
              <JSONDebugSection data={analysisData} />
            )}
          </div>
        </div>


        {/* Stats Footer */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Dashboard Statistics */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="font-medium text-gray-900 mb-4">Dashboard Statistics</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {selectedShow ? '1' : '0'}
                </div>
                <div className="text-sm text-gray-500">Shows Selected</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {analysisData ? '1' : '0'}
                </div>
                <div className="text-sm text-gray-500">Patterns Analyzed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {country}
                </div>
                <div className="text-sm text-gray-500">Active Region</div>
              </div>
            </div>
          </div>
          
          {/* API Usage Widget */}
          <APIUsageWidget />
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => handleShowSelect({ id: 1399, title: 'Game of Thrones', overview: 'Popular HBO series', popularity: 100 })}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Test: Game of Thrones
            </button>
            <button
              onClick={() => handleShowSelect({ id: 194766, title: 'The Summer I Turned Pretty', overview: 'Amazon Prime series', popularity: 85 })}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Test: Summer I Turned Pretty
            </button>
            <button
              onClick={() => handleShowSelect({ id: 1396, title: 'Breaking Bad', overview: 'AMC crime drama', popularity: 95 })}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Test: Breaking Bad
            </button>
            <button
              onClick={() => handleShowSelect({ id: 85552, title: 'Euphoria', overview: 'HBO teen drama', popularity: 90 })}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Test: Euphoria
            </button>
          </div>
        </div>

        {/* Debug Info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-800 mb-2">Debug Information</h4>
            <div className="text-sm text-yellow-700 space-y-1">
              <div>Selected Show ID: {selectedShow?.id || 'None'}</div>
              <div>Country: {country}</div>
              <div>Analysis Loading: {analysisLoading ? 'Yes' : 'No'}</div>
              <div>Has Analysis Data: {analysisData ? 'Yes' : 'No'}</div>
              <div>Selected Season: {selectedSeason || 'Latest'}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TMDBTestingDashboard;