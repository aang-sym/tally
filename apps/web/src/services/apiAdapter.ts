// apps/web/src/services/apiAdapter.ts
import { api } from './apiClient';
import type {
  ApiWatchlistTmdbIdProgressPutRequest as GeneratedProgressRequest,
  SelectedProvider,
} from '@tally/api-client';

// Local friendly aliases that map to generated types
export type ProgressUpdatePayload = GeneratedProgressRequest;

export type SubscriptionCreateRequest = any; // TODO: replace with generated type when available
export type SubscriptionUpdateRequest = any; // TODO: replace with generated type when available
export type UserSubscription = any; // TODO: replace with generated type when available

// Local request type to avoid generator name churn
export type ListUserSubsArgs = { id: string; country?: string };

// WATCHLIST
export async function fetchWatchlist(params?: { country?: string }) {
  const res = await api.apiWatchlistGet(undefined, {
    params: { country: params?.country },
  });
  // Keep returning what the app expects
  return res.data?.data ?? [];
}

export async function getShowProgress(tmdbId: number) {
  const res = await api.apiWatchlistTmdbIdProgressGet(tmdbId);
  return res.data?.data ?? null;
}
 
export async function updateShowProgress(tmdbId: number, payload: ProgressUpdatePayload) {
  // Directly forward to generated client
  const res = await api.apiWatchlistTmdbIdProgressPut(tmdbId, payload);
  return res.data?.data ?? null;
}

export async function updateSelectedProvider(userShowId: string, providerId: string | null) {
  // Construct a SelectedProvider object with minimal required fields
  const provider: SelectedProvider | null = providerId
    ? { id: Number(providerId), name: '', logo_path: '' }
    : null;
  const res = await api.apiWatchlistIdProviderPut(userShowId, {
    provider,
  });
  return res.data?.data ?? null;
}

// STREAMING SERVICES
export async function listStreamingServices(country?: string) {
  const res = await api.apiStreamingServicesGet(country);
  return res.data?.data?.services ?? [];
}

export async function getStreamingService(id: string, country?: string) {
  const config = country ? { params: { country } } : undefined;
  const res = await api.apiStreamingServicesIdGet(id, config);
  return res.data?.data?.service ?? null;
}

// USER SUBSCRIPTIONS
export async function listUserSubscriptions(args: ListUserSubsArgs) {
  const res = await api.apiUsersIdSubscriptionsGet(args.id, args.country);
  return res.data?.data?.subscriptions ?? [];
}

export async function createSubscription(userId: string, body: SubscriptionCreateRequest) {
  const res = await api.apiUsersIdSubscriptionsPost(userId, body);
  // Some generators type data as UserSubscription directly; normalize to object shape
  return (
    (res.data?.data as { subscription?: UserSubscription })?.subscription ??
    (res.data?.data as unknown as UserSubscription) ??
    null
  );
}

export async function updateSubscription(
  userId: string,
  subscriptionId: string,
  body: SubscriptionUpdateRequest
) {
  const res = await api.apiUsersIdSubscriptionsSubscriptionIdPut(userId, subscriptionId, body);
  return (
    (res.data?.data as { subscription?: UserSubscription })?.subscription ??
    (res.data?.data as unknown as UserSubscription) ??
    null
  );
}

export async function deleteSubscription(userId: string, subscriptionId: string) {
  // Generated delete often returns void; treat 2xx as success
  await api.apiUsersIdSubscriptionsSubscriptionIdDelete(userId, subscriptionId);
  return true;
}
