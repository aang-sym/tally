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
  tmdbApiReadToken: string;
  nodeEnv: 'development' | 'production' | 'test';
  // API Quota Management
  streamingApiMonthlyLimit: number;
  streamingApiDevMode: boolean;
  tmdbDevMode: boolean;
  // Supabase Configuration
  supabaseUrl: string;
  supabaseApiKey: string;
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

function validateTmdbToken(token: string | undefined): string {
  if (!token || token === 'tmdb-dev-key-placeholder') {
    return 'tmdb-dev-key-placeholder';
  }
  
  // TMDB read tokens should be JWT format starting with "eyJ"
  if (token.startsWith('eyJ') && token.includes('.')) {
    return token;
  }
  
  console.warn('⚠️ TMDB read token does not appear to be in JWT format (should start with "eyJ")');
  console.warn('   Get a proper read token from: https://www.themoviedb.org/settings/api');
  return token; // Return it anyway, let TMDB API validate
}

function logConfigWarnings() {
  const isDev = process.env.NODE_ENV !== 'production';
  const tmdbToken = process.env.TMDB_API_READ_TOKEN;
  
  if (isDev && (!tmdbToken || tmdbToken === 'your_tmdb_read_token_here')) {
    console.log('ℹ️ TMDB API token not configured - pattern detection will be limited to mocked data');
    console.log('   Set TMDB_API_READ_TOKEN in .env for full functionality');
    console.log('   Get your token from: https://www.themoviedb.org/settings/api');
  }
}

// Initialize configuration and log warnings
logConfigWarnings();

export const config: ApiConfig = {
  port: parseInt(getOptionalEnvVar('PORT', '4000'), 10),
  frontendUrl: getOptionalEnvVar('FRONTEND_URL', 'http://localhost:3000'),
  nodeEnv: (process.env.NODE_ENV as ApiConfig['nodeEnv']) || 'development',
  
  // API Keys - required for production, optional for development
  streamingAvailabilityApiKey: process.env.NODE_ENV === 'production' 
    ? getEnvVar('STREAMING_AVAILABILITY_API_KEY')
    : getOptionalEnvVar('STREAMING_AVAILABILITY_API_KEY', 'dev-key-placeholder'),
  
  // TMDB API Keys - validate format and provide helpful feedback
  tmdbApiKey: process.env.NODE_ENV === 'production'
    ? getEnvVar('TMDB_API_KEY')
    : getOptionalEnvVar('TMDB_API_KEY', 'tmdb-dev-key-placeholder'),
  
  tmdbApiReadToken: validateTmdbToken(
    process.env.NODE_ENV === 'production'
      ? getEnvVar('TMDB_API_READ_TOKEN')
      : process.env.TMDB_API_READ_TOKEN
  ) || 'tmdb-dev-key-placeholder',

  // API Quota Management
  streamingApiMonthlyLimit: parseInt(getOptionalEnvVar('STREAMING_API_MONTHLY_LIMIT', '950'), 10),
  streamingApiDevMode: getOptionalEnvVar('STREAMING_API_DEV_MODE', 'false').toLowerCase() === 'true',
  tmdbDevMode: getOptionalEnvVar('TMDB_DEV_MODE', 'false').toLowerCase() === 'true',
  
  // Supabase Configuration - required for database operations
  supabaseUrl: getEnvVar('SUPABASE_URL'),
  supabaseApiKey: getEnvVar('SUPABASE_API_KEY'),
};

export default config;