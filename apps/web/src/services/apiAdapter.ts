// apps/web/src/services/apiAdapter.ts
import { api } from './apiClient';
import type {
  ApiWatchlistTmdbIdProgressPutRequest,
  SubscriptionCreateRequest,
  SubscriptionUpdateRequest,
  UsersApiApiUsersIdSubscriptionsGetRequest
} from '../../../packages/api-client';

// WATCHLIST
export async function fetchWatchlist(params?: { country?: string }) {
  const res = await api.apiWatchlistGet(params?.country);
  return res.data.data; // keep returning what the app expects
}

export async function getShowProgress(tmdbId: number) {
  const res = await api.apiWatchlistTmdbIdProgressGet(tmdbId);
  return res.data.data;
}

export async function updateShowProgress(payload: ApiWatchlistTmdbIdProgressPutRequest) {
  const res = await api.apiWatchlistTmdbIdProgressPut(payload.tmdbId, payload);
  return res.data.data;
}

export async function updateSelectedProvider(userShowId: string, providerId: string | null) {
  const res = await api.apiWatchlistIdProviderPut(userShowId, { provider_id: providerId });
  return res.data.data;
}

// STREAMING SERVICES
export async function listStreamingServices(country?: string) {
  const res = await api.apiStreamingServicesGet(country);
  return res.data.data.services;
}

export async function getStreamingService(id: string, country?: string) {
  const res = await api.apiStreamingServicesIdGet(id, country);
  return res.data.data.service;
}

// USER SUBSCRIPTIONS
export async function listUserSubscriptions(args: UsersApiApiUsersIdSubscriptionsGetRequest) {
  const res = await api.apiUsersIdSubscriptionsGet(args.id, args.country);
  return res.data.data.subscriptions;
}

export async function createSubscription(userId: string, body: SubscriptionCreateRequest) {
  const res = await api.apiUsersIdSubscriptionsPost(userId, body);
  return res.data.data.subscription;
}

export async function updateSubscription(userId: string, subscriptionId: string, body: SubscriptionUpdateRequest) {
  const res = await api.apiUsersIdSubscriptionsSubscriptionIdPut(userId, subscriptionId, body);
  return res.data.data.subscription;
}

export async function deleteSubscription(userId: string, subscriptionId: string) {
  const res = await api.apiUsersIdSubscriptionsSubscriptionIdDelete(userId, subscriptionId);
  return res.data.data?.deleted ?? true;
}