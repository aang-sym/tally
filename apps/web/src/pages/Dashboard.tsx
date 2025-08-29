import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { RecommendationCard } from '../components/RecommendationCard';

// API base URL
const API_BASE = 'http://localhost:3001';

// Mock user ID (would come from authentication)
const USER_ID = 'user-1';

interface DashboardStats {
  watchlistStats: {
    totalShows: number;
    byStatus: {
      watchlist: number;
      watching: number;
      completed: number;
      dropped: number;
    };
    averageRating: number;
  };
  savingsStats: {
    potentialMonthlySavings: number;
    potentialAnnualSavings: number;
    currentMonthlyCost: number;
    optimizedMonthlyCost: number;
  };
  topRecommendation?: any;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all dashboard data in parallel
      const [watchlistResponse, optimizationResponse] = await Promise.allSettled([
        fetch(`${API_BASE}/api/watchlist-v2/stats`, {
          headers: { 'x-user-id': USER_ID }
        }),
        fetch(`${API_BASE}/api/recommendations/optimization`, {
          headers: { 'x-user-id': USER_ID }
        })
      ]);

      const dashboardStats: DashboardStats = {
        watchlistStats: {
          totalShows: 0,
          byStatus: { watchlist: 0, watching: 0, completed: 0, dropped: 0 },
          averageRating: 0
        },
        savingsStats: {
          potentialMonthlySavings: 0,
          potentialAnnualSavings: 0,
          currentMonthlyCost: 0,
          optimizedMonthlyCost: 0
        }
      };

      // Handle watchlist stats
      if (watchlistResponse.status === 'fulfilled' && watchlistResponse.value.ok) {
        const watchlistData = await watchlistResponse.value.json();
        dashboardStats.watchlistStats = watchlistData.data;
      }

      // Handle optimization stats
      if (optimizationResponse.status === 'fulfilled' && optimizationResponse.value.ok) {
        const optimizationData = await optimizationResponse.value.json();
        const optimization = optimizationData.data;
        
        dashboardStats.savingsStats = {
          potentialMonthlySavings: optimization.currentSituation.monthlyCost - optimization.optimizedPlan.estimatedMonthlyCost,
          potentialAnnualSavings: optimization.optimizedPlan.estimatedAnnualSavings,
          currentMonthlyCost: optimization.currentSituation.monthlyCost,
          optimizedMonthlyCost: optimization.optimizedPlan.estimatedMonthlyCost
        };
        
        dashboardStats.topRecommendation = optimization;
      }

      setStats(dashboardStats);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      // Set default mock stats
      setStats({
        watchlistStats: {
          totalShows: 12,
          byStatus: { watchlist: 8, watching: 3, completed: 15, dropped: 1 },
          averageRating: 8.2
        },
        savingsStats: {
          potentialMonthlySavings: 23.98,
          potentialAnnualSavings: 287.76,
          currentMonthlyCost: 47.97,
          optimizedMonthlyCost: 23.99
        }
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Loading your dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Your personal streaming subscription optimizer and watchlist manager
        </p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-blue-600 text-xl">📺</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Shows</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.watchlistStats.totalShows || 0}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-green-600 text-xl">▶️</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Watching</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.watchlistStats.byStatus.watching || 0}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <span className="text-purple-600 text-xl">✅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.watchlistStats.byStatus.completed || 0}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <span className="text-yellow-600 text-xl">💰</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Monthly Savings</p>
              <p className="text-2xl font-bold text-gray-900">
                ${stats?.savingsStats.potentialMonthlySavings.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Optimization Insight */}
      {stats?.topRecommendation && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">💡 Top Optimization Opportunity</h2>
            <Link
              to="/recommendations"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View All Recommendations →
            </Link>
          </div>
          <RecommendationCard
            type="optimization"
            recommendation={stats.topRecommendation}
            onViewDetails={() => {
              window.location.href = '/recommendations';
            }}
          />
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Subscription Summary */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Subscription Summary</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Current Monthly Cost</span>
                <span className="font-bold text-gray-900">
                  ${stats?.savingsStats.currentMonthlyCost.toFixed(2) || '0.00'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Optimized Monthly Cost</span>
                <span className="font-bold text-green-600">
                  ${stats?.savingsStats.optimizedMonthlyCost.toFixed(2) || '0.00'}
                </span>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Annual Savings Potential</span>
                  <span className="font-bold text-green-600 text-lg">
                    ${stats?.savingsStats.potentialAnnualSavings.toFixed(2) || '0.00'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <Link
                to="/calendar"
                className="block w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center font-medium"
              >
                📅 View Savings Calendar
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6 space-y-3">
            <Link
              to="/my-shows"
              className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span className="text-2xl mr-3">📺</span>
              <div>
                <div className="font-medium text-gray-900">Manage My Shows</div>
                <div className="text-sm text-gray-600">
                  {stats?.watchlistStats.byStatus.watchlist || 0} in watchlist
                </div>
              </div>
            </Link>
            
            <Link
              to="/recommendations"
              className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span className="text-2xl mr-3">💡</span>
              <div>
                <div className="font-medium text-gray-900">Get Recommendations</div>
                <div className="text-sm text-gray-600">Optimize subscriptions</div>
              </div>
            </Link>
            
            <Link
              to="/tmdb-testing"
              className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span className="text-2xl mr-3">🔍</span>
              <div>
                <div className="font-medium text-gray-900">Search Shows</div>
                <div className="text-sm text-gray-600">Add to watchlist</div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Watchlist Quick Stats */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Viewing Stats</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {stats?.watchlistStats.byStatus.watchlist || 0}
            </div>
            <div className="text-sm text-gray-600">In Watchlist</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {stats?.watchlistStats.byStatus.watching || 0}
            </div>
            <div className="text-sm text-gray-600">Currently Watching</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {stats?.watchlistStats.byStatus.completed || 0}
            </div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {stats && stats.watchlistStats.averageRating > 0 
                ? stats.watchlistStats.averageRating.toFixed(1)
                : '-'
              }
            </div>
            <div className="text-sm text-gray-600">Avg Rating</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;