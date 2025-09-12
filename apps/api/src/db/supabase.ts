/**
 * Supabase Database Client
 *
 * Provides the main Supabase client instance for database operations
 * with connection validation and error handling.
 */

import { createClient, SupabaseClient, SupabaseClientOptions } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), 'apps/api/.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
// We consistently use SUPABASE_API_KEY as the anon/public key
const supabaseApiKey = process.env.SUPABASE_API_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL environment variable');
}

if (!supabaseApiKey) {
  throw new Error('Missing SUPABASE_API_KEY environment variable');
}

if (!supabaseServiceKey) {
  throw new Error('Missing SUPABASE_SERVICE_KEY environment variable');
}

/**
 * Extract a Supabase access token (JWT) from typical header shapes.
 * Supports:
 *  - 'x-supabase-access-token': '<jwt>'
 *  - 'authorization': 'Bearer <jwt>'
 */
export function getUserJwtFromHeaders(
  headers: Record<string, string | string[] | undefined>
): string | undefined {
  // Normalize header keys to lowercase
  const lower: Record<string, string | string[] | undefined> = {};
  for (const [k, v] of Object.entries(headers || {})) lower[k.toLowerCase()] = v;

  const direct = lower['x-supabase-access-token'];
  if (typeof direct === 'string' && direct.trim()) return direct.trim();

  const auth = lower['authorization'];
  const authStr = Array.isArray(auth) ? auth[0] : auth;
  if (typeof authStr === 'string') {
    const m = authStr.match(/^Bearer\s+(.+)$/i);
    if (m) return m[1];
  }
  return undefined;
}

/**
 * Create a Supabase client that forwards a specific user JWT via Authorization header,
 * so Row-Level Security uses that identity.
 */
export function getSupabaseForToken(userJwtToken?: string): SupabaseClient {
  const opts: SupabaseClientOptions<'public'> = {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    ...(userJwtToken
      ? {
          global: {
            headers: { Authorization: `Bearer ${userJwtToken}` } as Record<string, string>,
          },
        }
      : {}),
  };
  return createClient(supabaseUrl, supabaseApiKey, opts);
}

/**
 * Convenience: build a per-request client from raw request headers.
 */
export function getSupabaseForRequestHeaders(
  headers: Record<string, string | string[] | undefined>
): SupabaseClient {
  const jwt = getUserJwtFromHeaders(headers);
  return getSupabaseForToken(jwt);
}

// Create the default Supabase client using anon key (respects RLS)
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseApiKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

// Create a service role client (bypasses RLS for admin operations like user creation)
export const serviceSupabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

/**
 * Create a Supabase client with a specific JWT token for RLS enforcement
 * This should be used in routes where user authentication is required
 */
export const createUserClient = (userJwtToken: string): SupabaseClient => {
  return getSupabaseForToken(userJwtToken);
};

/**
 * Test the Supabase connection
 */
export async function testConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get database health status
 */
export async function getDatabaseHealth(): Promise<{
  connected: boolean;
  tables: Record<string, number>;
  error?: string;
}> {
  try {
    // Test connection first
    const connectionTest = await testConnection();
    if (!connectionTest.success) {
      return {
        connected: false,
        tables: {},
        error: connectionTest.error || 'Connection failed',
      };
    }

    // Get table counts
    const tableQueries = await Promise.allSettled([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('shows').select('*', { count: 'exact', head: true }),
      supabase.from('seasons').select('*', { count: 'exact', head: true }),
      supabase.from('episodes').select('*', { count: 'exact', head: true }),
      supabase.from('user_shows').select('*', { count: 'exact', head: true }),
      supabase.from('user_episode_progress').select('*', { count: 'exact', head: true }),
      supabase.from('streaming_services').select('*', { count: 'exact', head: true }),
      supabase.from('show_availability').select('*', { count: 'exact', head: true }),
    ]);

    const tableNames = [
      'users',
      'shows',
      'seasons',
      'episodes',
      'user_shows',
      'user_episode_progress',
      'streaming_services',
      'show_availability',
    ];
    const tables: Record<string, number> = {};

    tableQueries.forEach((result, index) => {
      const tableName = tableNames[index];
      if (tableName) {
        if (result.status === 'fulfilled' && result.value.count !== null) {
          tables[tableName] = result.value.count;
        } else {
          tables[tableName] = -1; // Error indicator
        }
      }
    });

    return {
      connected: true,
      tables,
    };
  } catch (error) {
    return {
      connected: false,
      tables: {},
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
