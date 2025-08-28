import React, { useState, useEffect } from 'react';

interface StreamingProvider {
  providerId: number;
  name: string;
  logo: string;
  type: string;
  deepLink?: string;
}

interface StreamingProvidersProps {
  showId: number | null;
  country: string;
  showTitle?: string;
}

const StreamingProviders: React.FC<StreamingProvidersProps> = ({ showId, country, showTitle }) => {
  const [providers, setProviders] = useState<StreamingProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProviders = async () => {
      if (!showId) {
        setProviders([]);
        return;
      }

      try {
        setLoading(true);
        setError('');
        
        const response = await fetch(`/api/tmdb/show/${showId}/providers?country=${encodeURIComponent(country)}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch providers');
        }

        setProviders(data.providers || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch providers');
        setProviders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProviders();
  }, [showId, country]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Streaming Providers</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-600">Loading providers...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Streaming Providers</h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!showId) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Streaming Providers</h2>
        <p className="text-gray-500 text-center py-8">
          Select a show to see where it's available
        </p>
      </div>
    );
  }

  const groupedProviders = providers.reduce((acc, provider) => {
    if (!acc[provider.type]) {
      acc[provider.type] = [];
    }
    acc[provider.type]!.push(provider);
    return acc;
  }, {} as Record<string, StreamingProvider[]>);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'subscription': return 'bg-green-50 border-green-200';
      case 'rent': return 'bg-blue-50 border-blue-200';
      case 'buy': return 'bg-purple-50 border-purple-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'subscription':
        return (
          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'rent':
        return (
          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
            <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
          </svg>
        );
      case 'buy':
        return (
          <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Streaming Providers</h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">in</span>
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded">
            {country}
          </span>
        </div>
      </div>

      {showTitle && (
        <p className="text-sm text-gray-600 mb-4">
          Available options for <span className="font-medium">"{showTitle}"</span>
        </p>
      )}

      {providers.length === 0 ? (
        <div className="text-center py-8">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 110 2h-1v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6H3a1 1 0 110-2h4z" />
          </svg>
          <p className="text-gray-500">No streaming providers available in {country}</p>
          <p className="text-sm text-gray-400 mt-1">Try changing the country or checking back later</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedProviders).map(([type, typeProviders]) => (
            <div key={type}>
              <div className="flex items-center space-x-2 mb-3">
                {getTypeIcon(type)}
                <h3 className="font-medium text-gray-900 capitalize">
                  {type === 'subscription' ? 'Stream' : type}
                </h3>
                <span className="text-sm text-gray-500">({typeProviders.length})</span>
              </div>
              
              <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 rounded-lg border-2 border-dashed ${getTypeColor(type)}`}>
                {typeProviders.map((provider) => (
                  <div
                    key={provider.providerId}
                    className="flex items-center space-x-3 p-3 bg-white rounded-lg border hover:shadow-sm transition-shadow"
                  >
                    {provider.logo && (
                      <img
                        src={provider.logo}
                        alt={provider.name}
                        className="w-10 h-10 rounded object-cover flex-shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {provider.name}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {type}
                      </p>
                    </div>
                    {provider.deepLink && (
                      <a
                        href={provider.deepLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        title={`Watch on ${provider.name}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          <div className="bg-gray-50 rounded-lg p-4 mt-6">
            <div className="flex items-start space-x-2">
              <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="text-sm text-gray-600">
                <p className="font-medium mb-1">About Provider Data</p>
                <p>
                  Provider information is sourced from TMDB and may not reflect real-time availability. 
                  Prices and availability can vary by region and may change frequently.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StreamingProviders;