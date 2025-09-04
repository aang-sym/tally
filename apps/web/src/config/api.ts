/**
 * API Configuration
 * 
 * Centralized configuration for API endpoints and settings.
 * Uses environment variables when available, with sensible defaults.
 */

// Get API base URL from environment variable or use default
export const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001';

// API endpoints
export const API_ENDPOINTS = {
  // Authentication
  auth: {
    login: `${API_BASE_URL}/api/users/login`,
    signup: `${API_BASE_URL}/api/users/signup`,
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
    v2: `${API_BASE_URL}/api/watchlist-v2`,
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
    // @ts-ignore
    headers.Authorization = `Bearer ${token}`;
  }
  
  return headers;
};

/**
 * Helper function for making authenticated API requests
 */
export const apiRequest = async (
  url: string, 
  options: RequestInit = {},
  token?: string
) => {
  const config: RequestInit = {
    ...options,
    headers: {
      ...getAuthHeaders(token),
      ...options.headers,
    },
  };

  const response = await fetch(url, config);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ 
      error: `HTTP ${response.status}: ${response.statusText}` 
    }));
    throw new Error(error.error || error.message || 'API request failed');
  }

  return response.json();
};

export default {
  API_BASE_URL,
  API_ENDPOINTS,
  DEFAULT_HEADERS,
  getAuthHeaders,
  apiRequest,
};