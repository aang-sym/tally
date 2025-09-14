/**
 * API Configuration
 *
 * Centralized configuration for API endpoints and settings.
 * Uses environment variables when available, with sensible defaults.
 */

// Get API base URL from environment variable or use default
export const API_BASE_URL =
  (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:4000';

// API endpoints
export const API_ENDPOINTS = {
  // Authentication
  auth: {
    login: `${API_BASE_URL}/api/auth/login`,
    signup: `${API_BASE_URL}/api/auth/register`,
  },

  // Users
  users: {
    base: `${API_BASE_URL}/api/users`,
    profile: (userId: string) => `${API_BASE_URL}/api/users/${userId}/profile`,
    subscriptions: (userId: string) => `${API_BASE_URL}/api/users/${userId}/subscriptions`,
  },

  // Watchlist
  watchlist: {
    v1: `${API_BASE_URL}/api/watchlist`,
    v2: `${API_BASE_URL}/api/watchlist`,
  },

  // Shows and Content
  shows: {
    base: `${API_BASE_URL}/api/shows`,
    search: `${API_BASE_URL}/api/shows/search`,
    discover: `${API_BASE_URL}/api/shows/discover`,
    onAir: `${API_BASE_URL}/api/shows/on-the-air`,
  },

  // TMDB
  tmdb: {
    base: `${API_BASE_URL}/api/tmdb`,
    search: `${API_BASE_URL}/api/tmdb/search`,
  },

  // TV Guide
  tvGuide: `${API_BASE_URL}/api/tv-guide`,

  // Calendar
  calendar: `${API_BASE_URL}/api/calendar`,

  // Recommendations
  recommendations: `${API_BASE_URL}/api/recommendations`,

  // Progress tracking
  progress: `${API_BASE_URL}/api/progress`,

  // Ratings
  ratings: `${API_BASE_URL}/api/ratings`,

  // Streaming services
  streamingServices: `${API_BASE_URL}/api/streaming-services`,

  // Admin
  admin: {
    dbStatus: `${API_BASE_URL}/api/admin/db-status`,
    health: `${API_BASE_URL}/api/health`,
  },

  // Statistics
  stats: {
    usage: `${API_BASE_URL}/api/usage-stats`,
    quota: `${API_BASE_URL}/api/streaming-quota`,
  },
} as const;

/**
 * Default headers for API requests
 */
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
} as const;

/**
 * Helper function to get authorization header with JWT token
 */
export const getAuthHeaders = (token?: string) => {
  const headers = { ...DEFAULT_HEADERS };

  if (token) {
    // @ts-expect-error - headers is a mutable object
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

/**
 * Helper function for making authenticated API requests
 */
export const apiRequest = async (url: string, options: RequestInit = {}, token?: string) => {
  // Debug logging
  const storedToken = localStorage.getItem('authToken');
  console.log('[API DEBUG] Making request to:', url);
  console.log('[API DEBUG] Token parameter:', token ? `${token.substring(0, 20)}...` : 'undefined');
  console.log(
    '[API DEBUG] Stored token:',
    storedToken ? `${storedToken.substring(0, 20)}...` : 'none'
  );

  const config: RequestInit = {
    ...options,
    headers: {
      ...getAuthHeaders(token),
      ...options.headers,
    },
  };

  // Log outgoing headers (masked for security)
  const headers = config.headers as Record<string, string>;
  console.log('[API DEBUG] Request headers:', {
    ...headers,
    Authorization: headers.Authorization
      ? `Bearer ${headers.Authorization.substring(7, 27)}...`
      : 'none',
  });

  const response = await fetch(url, config);

  console.log('[API DEBUG] Response status:', response.status, response.statusText);

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: `HTTP ${response.status}: ${response.statusText}`,
    }));
    console.log('[API DEBUG] Error response:', error);
    throw new Error(error.error || error.message || 'API request failed');
  }

  const result = await response.json();
  console.log('[API DEBUG] Success response keys:', Object.keys(result));
  return result;
};

export default {
  API_BASE_URL,
  API_ENDPOINTS,
  DEFAULT_HEADERS,
  getAuthHeaders,
  apiRequest,
};
