import React, { useState, useEffect, useCallback } from 'react';
import { debounce } from 'lodash-es';

interface TMDBShow {
  id: number;
  title: string;
  year?: number;
  poster?: string;
  overview: string;
  firstAirDate?: string;
  popularity: number;
}

interface TMDBSearchProps {
  onSelectShow: (show: TMDBShow) => void;
  selectedShowId?: number | undefined;
}

const TMDBSearch: React.FC<TMDBSearchProps> = ({ onSelectShow, selectedShowId }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TMDBShow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');

        const response = await fetch(`/api/tmdb/search?query=${encodeURIComponent(searchQuery)}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Search failed');
        }

        setResults(data.results || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  // Effect to trigger search when query changes
  useEffect(() => {
    debouncedSearch(query);

    // Cleanup function to cancel debounced calls
    return () => {
      debouncedSearch.cancel();
    };
  }, [query, debouncedSearch]);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent, show: TMDBShow) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelectShow(show);
    }
  };

  return (
    <div className="search-container">
      <div className="mb-4">
        <label htmlFor="show-search" className="block text-sm font-medium text-gray-700 mb-2">
          Search TV Shows
        </label>
        <input
          id="show-search"
          type="text"
          placeholder="Search TV shows..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-600">Searching...</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* No results */}
      {!loading && !error && query && results.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No shows found for "{query}"</p>
          <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
        </div>
      )}

      {/* Results grid */}
      {results.length > 0 && (
        <div className="results-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
          {results.map((show) => (
            <ShowCard
              key={show.id}
              show={show}
              isSelected={selectedShowId === show.id}
              onClick={() => onSelectShow(show)}
              onKeyDown={(e) => handleKeyDown(e, show)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Show Card Component
interface ShowCardProps {
  show: TMDBShow;
  isSelected: boolean;
  onClick: () => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
}

const ShowCard: React.FC<ShowCardProps> = ({ show, isSelected, onClick, onKeyDown }) => {
  return (
    <div
      className={`show-card cursor-pointer rounded-lg border transition-all duration-200 hover:shadow-lg ${
        isSelected
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onClick}
      onKeyDown={onKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Select ${show.title}${show.year ? ` (${show.year})` : ''}`}
    >
      <div className="flex p-3">
        {/* Poster */}
        <div className="flex-shrink-0">
          {show.poster ? (
            <img
              src={show.poster}
              alt={`${show.title} poster`}
              className="w-16 h-24 object-cover rounded-md"
              loading="lazy"
            />
          ) : (
            <div className="w-16 h-24 bg-gray-200 rounded-md flex items-center justify-center">
              <svg
                className="w-6 h-6 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 110 2h-1v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6H3a1 1 0 110-2h4zM9 6h6v12H9V6z"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="ml-3 flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 truncate">{show.title}</h3>
          {show.year && <p className="text-xs text-gray-500 mt-1">{show.year}</p>}
          <p className="text-xs text-gray-600 mt-2 line-clamp-3">
            {show.overview || 'No description available'}
          </p>
          {show.firstAirDate && (
            <p className="text-xs text-gray-400 mt-1">
              First aired: {new Date(show.firstAirDate).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Selection indicator */}
        {isSelected && (
          <div className="ml-2 flex-shrink-0">
            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TMDBSearch;
