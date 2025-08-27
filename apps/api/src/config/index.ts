/**
 * API Configuration
 * 
 * Centralized configuration management for environment variables,
 * API keys, and other settings.
 */

export interface ApiConfig {
  port: number;
  frontendUrl: string;
  streamingAvailabilityApiKey: string;
  tmdbApiKey: string;
  nodeEnv: 'development' | 'production' | 'test';
  // API Quota Management
  streamingApiMonthlyLimit: number;
  streamingApiDevMode: boolean;
  tmdbDevMode: boolean;
}

function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name];
  if (!value && defaultValue === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value || defaultValue!;
}

function getOptionalEnvVar(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

export const config: ApiConfig = {
  port: parseInt(getOptionalEnvVar('PORT', '3001'), 10),
  frontendUrl: getOptionalEnvVar('FRONTEND_URL', 'http://localhost:3000'),
  nodeEnv: (process.env.NODE_ENV as ApiConfig['nodeEnv']) || 'development',
  
  // API Keys - required for production, optional for development
  streamingAvailabilityApiKey: process.env.NODE_ENV === 'production' 
    ? getEnvVar('STREAMING_AVAILABILITY_API_KEY')
    : getOptionalEnvVar('STREAMING_AVAILABILITY_API_KEY', 'dev-key-placeholder'),
  
  tmdbApiKey: process.env.NODE_ENV === 'production'
    ? getEnvVar('TMDB_API_READ_TOKEN')
    : getOptionalEnvVar('TMDB_API_READ_TOKEN', 'tmdb-dev-key-placeholder'),

  // API Quota Management
  streamingApiMonthlyLimit: parseInt(getOptionalEnvVar('STREAMING_API_MONTHLY_LIMIT', '950'), 10),
  streamingApiDevMode: getOptionalEnvVar('STREAMING_API_DEV_MODE', 'false').toLowerCase() === 'true',
  tmdbDevMode: getOptionalEnvVar('TMDB_DEV_MODE', 'false').toLowerCase() === 'true',
};

export default config;