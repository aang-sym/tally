/**
 * Subscriptions Page
 *
 * Manage streaming service subscriptions and preferences.
 * Powers recommendation relevance and the calendar view.
 */

import React, { useState, useEffect } from 'react';
import { UserManager } from '../services/UserManager';
import { API_ENDPOINTS, apiRequest } from '../config/api';

/** Price tier returned by the RPC (/api/streaming-services?country=XX) */
interface PriceTier {
  tier: string;
  amount: number | null;
  currency: string | null;
  billing_frequency?: string | null;
  active?: boolean | null;
  notes?: string | null;
  provider_name?: string | null;
}

interface StreamingService {
  id: string;
  name: string;
  logo_path?: string;
  homepage?: string;
  country_code?: string;
  tmdb_provider_id?: number;
  /** Legacy single-price shape (kept for backward-compat) */
  price?: { amount: number; currency: string } | null;
  /** From RPC (optional): preferred/default tier for the country */
  default_price?: PriceTier | null;
  /** From RPC (optional): all tiers for the country */
  prices?: PriceTier[];
}

interface UserSubscription {
  id: string;
  service_id: string;
  monthly_cost: number;
  is_active: boolean;
  started_date: string;
  ended_date?: string;
  tier?: string | null; // <-- store user's chosen tier
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

const Subscriptions: React.FC = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [availableServices, setAvailableServices] = useState<StreamingService[]>([]);
  const [userSubscriptions, setUserSubscriptions] = useState<UserSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingSubscription, setSavingSubscription] = useState<string | null>(null);
  const [suggestedServiceIds, setSuggestedServiceIds] = useState<Set<string>>(new Set());
  const [addingAll, setAddingAll] = useState(false);

  // Per-service selected tier (when adding a new subscription)
  const [selectedTierByService, setSelectedTierByService] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      await loadUserData();
      await loadAvailableServices();
      await loadUserSubscriptions();
      await computeSuggestions();
    })();
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
      const token = localStorage.getItem('authToken') || undefined;
      const country = UserManager.getCountry?.() || 'US';
      const data = await apiRequest(
        `${API_ENDPOINTS.streamingServices}?country=${country}`,
        {},
        token
      );
      const services: StreamingService[] = data.data.services || [];
      setAvailableServices(services);

      // Default the selected tier for each service using the RPC's default_price if present
      const defaults: Record<string, string> = {};
      for (const svc of services) {
        if (svc.default_price?.tier) {
          defaults[svc.id] = svc.default_price.tier;
        }
      }
      if (Object.keys(defaults).length) setSelectedTierByService(defaults);

      // If subscriptions already loaded, compute suggestions now
      try {
        await computeSuggestions(services);
      } catch {
        // Ignore suggestion computation errors
      }
    } catch (err) {
      console.error('Failed to load streaming services:', err);
    }
  };

  const loadUserSubscriptions = async () => {
    try {
      setLoading(true);
      const userId = UserManager.getCurrentUserId();
      const token = localStorage.getItem('authToken') || undefined;
      const country = UserManager.getCountry?.() || 'US';
      const data = await apiRequest(
        `${API_ENDPOINTS.users.subscriptions(userId)}?country=${country}`,
        {},
        token
      );
      setUserSubscriptions(data.data.subscriptions || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load user subscriptions:', err);
      setError('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const computeSuggestions = async (servicesArg?: StreamingService[]) => {
    const services = servicesArg || availableServices;
    if (!services || services.length === 0) return;

    try {
      const token = localStorage.getItem('authToken') || undefined;
      const wl = await apiRequest(API_ENDPOINTS.watchlist.v2, {}, token);
      const shows: any[] = wl?.data?.shows || wl?.data?.data?.shows || [];

      // collect TMDB provider ids referenced by the user's shows
      const tmdbIds = new Set<number>();
      for (const s of shows) {
        const p = s.streaming_provider || s.provider || null;
        if (p && typeof p.id === 'number') tmdbIds.add(p.id);
      }

      // map TMDB provider ids to our service ids (if tmdb_provider_id is provided by API)
      const idMap = new Set<string>();
      for (const svc of services) {
        if (svc.tmdb_provider_id && tmdbIds.has(svc.tmdb_provider_id)) {
          idMap.add(svc.id);
        }
      }

      // exclude ones already subscribed
      for (const sub of userSubscriptions) {
        if (sub.is_active) idMap.delete(sub.service_id);
      }

      setSuggestedServiceIds(idMap);
    } catch (e) {
      console.warn('Failed to compute suggestions from watchlist', e);
      setSuggestedServiceIds(new Set());
    }
  };

  const toggleSubscription = async (service: StreamingService, isActive: boolean) => {
    try {
      setSavingSubscription(service.id);
      const userId = UserManager.getCurrentUserId();
      const token = localStorage.getItem('authToken') || undefined;

      if (isActive) {
        // Add subscription (use selected tier if available)
        await apiRequest(
          API_ENDPOINTS.users.subscriptions(userId),
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              service_id: service.id,
              monthly_cost: (() => {
                const chosenTier =
                  selectedTierByService[service.id] || service.default_price?.tier || null;
                const tierPrice = (service.prices || []).find((p) => p.tier === chosenTier);
                const amount =
                  tierPrice?.amount ?? service.default_price?.amount ?? service.price?.amount;
                return amount ?? getDefaultMonthlyCost(service.name);
              })(),
              tier: selectedTierByService[service.id] || service.default_price?.tier || null,
              is_active: true,
            }),
          },
          token
        );
      } else {
        // Remove subscription
        const subscription = userSubscriptions.find((sub) => sub.service_id === service.id);
        if (subscription) {
          await apiRequest(
            `${API_ENDPOINTS.users.subscriptions(userId)}/${subscription.id}`,
            {
              method: 'DELETE',
            },
            token
          );
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

  const updateSubscriptionTier = async (subscriptionId: string, newTier: string) => {
    try {
      const userId = UserManager.getCurrentUserId();
      const token = localStorage.getItem('authToken') || undefined;
      await apiRequest(
        `${API_ENDPOINTS.users.subscriptions(userId)}/${subscriptionId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tier: newTier }),
        },
        token
      );
      await loadUserSubscriptions();
    } catch (err) {
      console.error('Failed to update tier:', err);
      alert('Failed to update tier');
    }
  };

  const updateMonthlyCost = async (subscriptionId: string, newCost: number) => {
    try {
      const userId = UserManager.getCurrentUserId();
      const token = localStorage.getItem('authToken') || undefined;
      await apiRequest(
        `${API_ENDPOINTS.users.subscriptions(userId)}/${subscriptionId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            monthly_cost: newCost,
          }),
        },
        token
      );

      await loadUserSubscriptions();
    } catch (err) {
      console.error('Failed to update monthly cost:', err);
      alert('Failed to update monthly cost');
    }
  };

  const getDefaultMonthlyCost = (serviceName: string): number => {
    const costs: Record<string, number> = {
      Netflix: 15.99,
      Hulu: 12.99,
      'HBO Max': 14.99,
      'Disney Plus': 12.99,
      'Amazon Prime Video': 8.99,
      'Apple TV+': 6.99,
      'Paramount+': 9.99,
      Peacock: 4.99,
    };
    return costs[serviceName] || 9.99;
  };

  const isSubscribed = (serviceId: string): boolean => {
    return userSubscriptions.some((sub) => sub.service_id === serviceId && sub.is_active);
  };

  const getSubscription = (serviceId: string): UserSubscription | undefined => {
    return userSubscriptions.find((sub) => sub.service_id === serviceId && sub.is_active);
  };

  const getTotalMonthlyCost = (): number => {
    return userSubscriptions
      .filter((sub) => sub.is_active)
      .reduce((total, sub) => total + sub.monthly_cost, 0);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Subscriptions</h1>
          <p className="text-gray-600 mt-2">
            Manage the streaming services you pay for and keep your costs up to date
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
                  {userSubscriptions.filter((sub) => sub.is_active).length}
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
              <h2 className="text-xl font-semibold text-gray-900">Your Streaming Services</h2>
              <p className="text-gray-600 mt-1">
                Select the streaming services you're subscribed to. This helps us show you relevant
                content and calculate your savings.
              </p>
              {suggestedServiceIds.size > 0 && (
                <div className="mt-3">
                  <button
                    type="button"
                    disabled={addingAll}
                    onClick={async () => {
                      try {
                        setAddingAll(true);
                        for (const id of Array.from(suggestedServiceIds)) {
                          const svc = availableServices.find((s) => s.id === id);
                          if (!svc) continue;
                          if (!isSubscribed(svc.id)) {
                            await toggleSubscription(svc, true);
                          }
                        }
                      } finally {
                        setAddingAll(false);
                      }
                    }}
                    className="px-3 py-1.5 text-sm font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {addingAll ? 'Adding…' : `Add ${suggestedServiceIds.size} suggested`}
                  </button>
                </div>
              )}
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

                    // Compute a chosen tier (for display) and price
                    const chosenTier =
                      selectedTierByService[service.id] || service.default_price?.tier || null;
                    const tierPrice = (service.prices || []).find((p) => p.tier === chosenTier);
                    const displayAmount =
                      tierPrice?.amount ?? service.default_price?.amount ?? service.price?.amount;
                    const displayCurrency =
                      tierPrice?.currency ??
                      service.default_price?.currency ??
                      service.price?.currency;

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
                            {service.logo_path ? (
                              <img
                                src={service.logo_path}
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

                            {/* Suggested badge */}
                            {suggestedServiceIds.has(service.id) && !subscribed && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                Suggested
                              </span>
                            )}

                            {/* Subscribed tier badge */}
                            {subscribed && subscription?.tier && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                {subscription.tier}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center">
                            {/* Tier-aware price display */}
                            {displayAmount != null && (
                              <div className="mr-3 text-sm text-gray-600">
                                {displayCurrency || '$'}
                                {displayAmount.toFixed(2)}/mo
                              </div>
                            )}

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
                        </div>

                        {/* Tier selector when NOT subscribed and tiers are available */}
                        {!subscribed &&
                          (service.prices?.length ? (
                            <div className="mb-3">
                              <label className="block text-xs text-gray-500 mb-1">Tier</label>
                              <select
                                className="border rounded px-2 py-1 text-sm"
                                value={
                                  selectedTierByService[service.id] ||
                                  service.default_price?.tier ||
                                  ''
                                }
                                onChange={(e) =>
                                  setSelectedTierByService((prev) => ({
                                    ...prev,
                                    [service.id]: e.target.value,
                                  }))
                                }
                              >
                                {(service.prices || [])
                                  .filter((t) => t.active !== false)
                                  .map((t) => (
                                    <option key={t.tier} value={t.tier}>
                                      {t.tier}
                                      {t.amount != null
                                        ? ` — ${t.currency ?? ''}${t.amount.toFixed(2)}/mo`
                                        : ''}
                                    </option>
                                  ))}
                              </select>
                            </div>
                          ) : null)}

                        {subscribed && subscription && (
                          <div className="mt-3">
                            {service.prices && service.prices.length > 0 && (
                              <div className="mb-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Tier
                                </label>
                                <select
                                  className="border rounded px-2 py-1 text-sm"
                                  value={subscription.tier || service.default_price?.tier || ''}
                                  onChange={(e) =>
                                    updateSubscriptionTier(subscription.id, e.target.value)
                                  }
                                >
                                  {service.prices
                                    .filter((t) => t.active !== false)
                                    .map((t) => (
                                      <option key={t.tier} value={t.tier}>
                                        {t.tier}
                                        {t.amount != null
                                          ? ` — ${t.currency ?? ''}${t.amount.toFixed(2)}/mo`
                                          : ''}
                                      </option>
                                    ))}
                                </select>
                              </div>
                            )}

                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Monthly Cost
                            </label>
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-500">$</span>
                              <input
                                type="number"
                                min="0"
                                max="1000"
                                step="0.01"
                                value={subscription.monthly_cost}
                                onChange={(e) => {
                                  const newCost = parseFloat(e.target.value) || 0;
                                  updateMonthlyCost(subscription.id, newCost);
                                }}
                                className="block w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
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

export default Subscriptions;
