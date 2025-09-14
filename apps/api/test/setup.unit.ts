// Test environment setup for unit tests

// Ensure test env
process.env.NODE_ENV = 'test';

// Provide default env vars to satisfy config and services
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
process.env.SUPABASE_API_KEY = process.env.SUPABASE_API_KEY || 'test-supabase-key';

process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

process.env.STREAMING_AVAILABILITY_API_KEY =
  process.env.STREAMING_AVAILABILITY_API_KEY || 'test-streaming-api-key';

process.env.TMDB_API_KEY = process.env.TMDB_API_KEY || 'tmdb-dev-key-placeholder';
process.env.TMDB_API_READ_TOKEN = process.env.TMDB_API_READ_TOKEN || 'tmdb-dev-key-placeholder';

// Quota/dev flags: keep tests isolated from external API behavior
process.env.STREAMING_API_DEV_MODE = process.env.STREAMING_API_DEV_MODE || 'true';
process.env.TMDB_DEV_MODE = process.env.TMDB_DEV_MODE || 'true';
process.env.STREAMING_API_MONTHLY_LIMIT = process.env.STREAMING_API_MONTHLY_LIMIT || '1000000';

// Optional: reduce noisy logs during tests
const originalWarn = console.warn;
const originalLog = console.log;

if (!process.env.VERBOSE_TEST_LOGS) {
  console.warn = (...args: unknown[]) => {
    // Silence specific known noisy warnings from config on missing TMDB tokens
    const text = String(args[0] ?? '');
    if (text.includes('TMDB read token does not appear to be in JWT format')) return;
    if (text.includes('Get a proper read token')) return;
    originalWarn(...args);
  };
  console.log = (...args: unknown[]) => {
    const text = String(args[0] ?? '');
    if (text.includes('TMDB API token not configured')) return;
    originalLog(...args);
  };
}

export {};
