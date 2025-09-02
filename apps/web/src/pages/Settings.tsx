/**
 * User Settings Page
 * 
 * Allows users to manage their streaming service subscriptions and preferences.
 * This helps the system provide personalized recommendations and calendar data.
 */

import React, { useState, useEffect } from 'react';
import { UserManager } from '../components/UserSwitcher';

interface StreamingService {
  id: string;
  name: string;
  logo_url?: string;
  base_url: string;
  country_code: string;
}

interface UserSubscription {
  id: string;
  service_id: string;
  monthly_cost: number;
  is_active: boolean;
  started_date: string;
  ended_date?: string;
  service: StreamingService;
}

interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  is_test_user: boolean;
  created_at: string;
}

const API_BASE = 'http://localhost:3001';

const Settings: React.FC = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [availableServices, setAvailableServices] = useState<StreamingService[]>([]);
  const [userSubscriptions, setUserSubscriptions] = useState<UserSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingSubscription, setSavingSubscription] = useState<string | null>(null);

  useEffect(() => {
    loadUserData();
    loadAvailableServices();
    loadUserSubscriptions();
  }, []);

  const loadUserData = async () => {
    try {
      const user = await UserManager.getCurrentUser();
      setUserProfile(user);
    } catch (err) {
      console.error('Failed to load user profile:', err);
      setError('Failed to load user profile');
    }
  };

  const loadAvailableServices = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/streaming-services`);
      if (response.ok) {
        const data = await response.json();
        setAvailableServices(data.data.services || []);
      }
    } catch (err) {
      console.error('Failed to load streaming services:', err);
    }
  };

  const loadUserSubscriptions = async () => {
    try {
      setLoading(true);
      const userId = UserManager.getCurrentUserId();
      const response = await fetch(`${API_BASE}/api/users/${userId}/subscriptions`, {
        headers: {
          'x-user-id': userId
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUserSubscriptions(data.data.subscriptions || []);
      }
      setError(null);
    } catch (err) {
      console.error('Failed to load user subscriptions:', err);
      setError('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const toggleSubscription = async (service: StreamingService, isActive: boolean) => {
    try {
      setSavingSubscription(service.id);
      const userId = UserManager.getCurrentUserId();

      if (isActive) {
        // Add subscription
        const response = await fetch(`${API_BASE}/api/users/${userId}/subscriptions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId
          },
          body: JSON.stringify({
            service_id: service.id,
            monthly_cost: getDefaultMonthlyCost(service.name),
            is_active: true
          })
        });

        if (!response.ok) {
          throw new Error('Failed to add subscription');
        }
      } else {
        // Remove subscription
        const subscription = userSubscriptions.find(sub => sub.service_id === service.id);
        if (subscription) {
          const response = await fetch(`${API_BASE}/api/users/${userId}/subscriptions/${subscription.id}`, {
            method: 'DELETE',
            headers: {
              'x-user-id': userId
            }
          });

          if (!response.ok) {
            throw new Error('Failed to remove subscription');
          }
        }
      }

      await loadUserSubscriptions();
    } catch (err) {
      console.error('Failed to update subscription:', err);
      alert(`Failed to ${isActive ? 'add' : 'remove'} ${service.name} subscription`);
    } finally {
      setSavingSubscription(null);
    }
  };

  const updateMonthlyCost = async (subscriptionId: string, newCost: number) => {
    try {
      const userId = UserManager.getCurrentUserId();
      const response = await fetch(`${API_BASE}/api/users/${userId}/subscriptions/${subscriptionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          monthly_cost: newCost
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update cost');
      }

      await loadUserSubscriptions();
    } catch (err) {
      console.error('Failed to update monthly cost:', err);
      alert('Failed to update monthly cost');
    }
  };

  const getDefaultMonthlyCost = (serviceName: string): number => {
    const costs: Record<string, number> = {
      'Netflix': 15.99,
      'Hulu': 12.99,
      'HBO Max': 14.99,
      'Disney Plus': 12.99,
      'Amazon Prime Video': 8.99,
      'Apple TV+': 6.99,
      'Paramount+': 9.99,
      'Peacock': 4.99
    };
    return costs[serviceName] || 9.99;
  };

  const isSubscribed = (serviceId: string): boolean => {
    return userSubscriptions.some(sub => sub.service_id === serviceId && sub.is_active);
  };

  const getSubscription = (serviceId: string): UserSubscription | undefined => {
    return userSubscriptions.find(sub => sub.service_id === serviceId && sub.is_active);
  };

  const getTotalMonthlyCost = (): number => {
    return userSubscriptions
      .filter(sub => sub.is_active)
      .reduce((total, sub) => total + sub.monthly_cost, 0);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">
            Manage your streaming subscriptions and preferences
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <p className="text-red-800">{error}</p>
            <button 
              onClick={() => {
                loadUserData();
                loadUserSubscriptions();
                setError(null);
              }}
              className="mt-2 px-3 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-800 rounded transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        <div className="space-y-8">
          {/* User Profile Section */}
          {userProfile && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile</h2>
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl font-medium">
                  {userProfile.display_name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{userProfile.display_name}</h3>
                  <p className="text-gray-500">{userProfile.email}</p>
                  {userProfile.is_test_user && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
                      Test User
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Subscription Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Subscription Summary</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {userSubscriptions.filter(sub => sub.is_active).length}
                </div>
                <div className="text-sm text-gray-500">Active Services</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  ${getTotalMonthlyCost().toFixed(2)}
                </div>
                <div className="text-sm text-gray-500">Monthly Cost</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  ${(getTotalMonthlyCost() * 12).toFixed(2)}
                </div>
                <div className="text-sm text-gray-500">Yearly Cost</div>
              </div>
            </div>
          </div>

          {/* Streaming Services */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Streaming Services</h2>
              <p className="text-gray-600 mt-1">
                Select the streaming services you're subscribed to. This helps us show you relevant content and calculate your savings.
              </p>
            </div>

            {loading ? (
              <div className="p-6">
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-3 text-gray-600">Loading services...</span>
                </div>
              </div>
            ) : (
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {availableServices.map((service) => {
                    const subscribed = isSubscribed(service.id);
                    const subscription = getSubscription(service.id);

                    return (
                      <div
                        key={service.id}
                        className={`p-4 border-2 rounded-lg transition-all ${
                          subscribed 
                            ? 'border-green-200 bg-green-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            {service.logo_url ? (
                              <img
                                src={service.logo_url}
                                alt={`${service.name} logo`}
                                className="w-8 h-8 object-contain"
                              />
                            ) : (
                              <div className="w-8 h-8 bg-gray-300 rounded flex items-center justify-center">
                                <span className="text-xs font-bold text-gray-600">
                                  {service.name.charAt(0)}
                                </span>
                              </div>
                            )}
                            <h3 className="font-medium text-gray-900">{service.name}</h3>
                          </div>
                          
                          <button
                            onClick={() => toggleSubscription(service, !subscribed)}
                            disabled={savingSubscription === service.id}
                            className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                              subscribed
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {savingSubscription === service.id ? (
                              <span className="flex items-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                                Saving...
                              </span>
                            ) : subscribed ? (
                              'Remove'
                            ) : (
                              'Add'
                            )}
                          </button>
                        </div>

                        {subscribed && subscription && (
                          <div className="mt-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Monthly Cost
                            </label>
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-500">$</span>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={subscription.monthly_cost}
                                onChange={(e) => {
                                  const newCost = parseFloat(e.target.value) || 0;
                                  updateMonthlyCost(subscription.id, newCost);
                                }}
                                className="block w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                              />
                              <span className="text-sm text-gray-500">per month</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Added {new Date(subscription.started_date).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {availableServices.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No streaming services available</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;