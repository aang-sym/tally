import React, { useState, useEffect } from 'react';
import { RecommendationCard } from '../components/RecommendationCard';

// API base URL
const API_BASE = 'http://localhost:3001';

// Mock user ID (would come from authentication)
const USER_ID = 'user-1';

const Recommendations: React.FC = () => {
  const [cancellationRecommendations, setCancellationRecommendations] = useState<any[]>([]);
  const [subscriptionRecommendations, setSubscriptionRecommendations] = useState<any[]>([]);
  const [optimizationRecommendation, setOptimizationRecommendation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      
      // Fetch all recommendation types
      const [cancelResponse, subscribeResponse, optimizationResponse] = await Promise.allSettled([
        fetch(`${API_BASE}/api/recommendations/cancel`, {
          headers: { 'x-user-id': USER_ID }
        }),
        fetch(`${API_BASE}/api/recommendations/subscribe`, {
          headers: { 'x-user-id': USER_ID }
        }),
        fetch(`${API_BASE}/api/recommendations/optimization`, {
          headers: { 'x-user-id': USER_ID }
        })
      ]);

      // Handle cancellation recommendations
      if (cancelResponse.status === 'fulfilled' && cancelResponse.value.ok) {
        const cancelData = await cancelResponse.value.json();
        setCancellationRecommendations(cancelData.data.recommendations || []);
      }

      // Handle subscription recommendations
      if (subscribeResponse.status === 'fulfilled' && subscribeResponse.value.ok) {
        const subscribeData = await subscribeResponse.value.json();
        setSubscriptionRecommendations(subscribeData.data.recommendations || []);
      }

      // Handle optimization recommendations
      if (optimizationResponse.status === 'fulfilled' && optimizationResponse.value.ok) {
        const optimizationData = await optimizationResponse.value.json();
        setOptimizationRecommendation(optimizationData.data);
      }

      setError(null);
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
      setError('Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleRecommendationFeedback = async (recommendationId: string, action: 'accepted' | 'rejected') => {
    try {
      await fetch(`${API_BASE}/api/recommendations/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': USER_ID
        },
        body: JSON.stringify({
          recommendationId,
          action
        })
      });

      // Refresh recommendations after feedback
      fetchRecommendations();
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    }
  };

  const totalRecommendations = cancellationRecommendations.length + subscriptionRecommendations.length + (optimizationRecommendation ? 1 : 0);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Analyzing your subscriptions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Recommendations</h1>
        <p className="text-gray-600 mt-2">
          Smart suggestions to optimize your streaming subscriptions and save money
        </p>
        {totalRecommendations > 0 && (
          <div className="mt-4 bg-blue-100 border-l-4 border-blue-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-blue-400 text-xl">💡</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  We found {totalRecommendations} optimization opportunity{totalRecommendations !== 1 ? 'ies' : 'y'} for you!
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {error ? (
        <div className="text-center py-12">
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => fetchRecommendations()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      ) : totalRecommendations === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎯</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No recommendations yet</h3>
          <p className="text-gray-500 mb-6">
            Add shows to your watchlist and we'll analyze your subscriptions to find savings opportunities
          </p>
          <button
            onClick={() => window.location.href = '/my-shows'}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
          >
            Manage My Shows
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Optimization Plan (if available) */}
          {optimizationRecommendation && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">🎯 Optimization Plan</h2>
              <RecommendationCard
                type="optimization"
                recommendation={optimizationRecommendation}
                onViewDetails={() => {
                  // Would open detailed optimization modal
                  console.log('View optimization details');
                }}
              />
            </div>
          )}

          {/* Cancellation Opportunities */}
          {cancellationRecommendations.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">❌ Cancellation Opportunities</h2>
              <div className="space-y-4">
                {cancellationRecommendations.map((recommendation, index) => (
                  <RecommendationCard
                    key={`cancel-${index}`}
                    type="cancellation"
                    recommendation={recommendation}
                    onAccept={() => handleRecommendationFeedback(`cancel-${index}`, 'accepted')}
                    onReject={() => handleRecommendationFeedback(`cancel-${index}`, 'rejected')}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Subscription Recommendations */}
          {subscriptionRecommendations.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">➕ Subscription Recommendations</h2>
              <div className="space-y-4">
                {subscriptionRecommendations.map((recommendation, index) => (
                  <RecommendationCard
                    key={`subscribe-${index}`}
                    type="subscription"
                    recommendation={recommendation}
                    onAccept={() => handleRecommendationFeedback(`subscribe-${index}`, 'accepted')}
                    onReject={() => handleRecommendationFeedback(`subscribe-${index}`, 'rejected')}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Stats */}
      {totalRecommendations > 0 && (
        <div className="mt-8 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6">
          <div className="flex items-center">
            <div className="text-3xl mr-4">📊</div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Potential Savings</h3>
              <p className="text-sm text-gray-600 mt-1">
                Following our recommendations could save you up to{' '}
                <strong className="text-green-600">
                  ${optimizationRecommendation?.optimizedPlan?.estimatedAnnualSavings?.toFixed(2) || '0.00'}/year
                </strong>{' '}
                on streaming subscriptions
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Recommendations;