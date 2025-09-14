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

const supabaseUrl =
  process.env.SUPABASE_URL || (process.env.NODE_ENV === 'test' ? 'http://test-supabase-url' : '');
// We consistently use SUPABASE_API_KEY as the anon/public key
const supabaseApiKey =
  process.env.SUPABASE_API_KEY || (process.env.NODE_ENV === 'test' ? 'test-supabase-key' : '');
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_KEY || (process.env.NODE_ENV === 'test' ? 'test-service-key' : '');

if (!supabaseUrl && process.env.NODE_ENV !== 'test') {
  throw new Error('Missing SUPABASE_URL environment variable');
}

if (!supabaseApiKey && process.env.NODE_ENV !== 'test') {
  throw new Error('Missing SUPABASE_API_KEY environment variable');
}

if (!supabaseServiceKey && process.env.NODE_ENV !== 'test') {
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
  if (process.env.NODE_ENV === 'test') {
    return createTestMockClient();
  }

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
export const supabase: SupabaseClient =
  process.env.NODE_ENV === 'test'
    ? createTestMockClient()
    : createClient(supabaseUrl, supabaseApiKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });

// Create a service role client (bypasses RLS for admin operations like user creation)
export const serviceSupabase: SupabaseClient =
  process.env.NODE_ENV === 'test'
    ? createTestMockClient()
    : createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });

// Mock client for test environment
function createTestMockClient(): SupabaseClient {
  interface ChainableMock {
    select: (...args: string[]) => ChainableMock;
    insert: (data: Record<string, unknown>) => ChainableMock;
    upsert: (
      data: Record<string, unknown> | Record<string, unknown>[],
      options?: Record<string, unknown>
    ) => ChainableMock;
    update: () => ChainableMock;
    delete: () => ChainableMock;
    eq: () => ChainableMock;
    neq: () => ChainableMock;
    gt: () => ChainableMock;
    gte: () => ChainableMock;
    lt: () => ChainableMock;
    lte: () => ChainableMock;
    like: () => ChainableMock;
    ilike: () => ChainableMock;
    is: () => ChainableMock;
    in: () => ChainableMock;
    contains: () => ChainableMock;
    containedBy: () => ChainableMock;
    rangeGt: () => ChainableMock;
    rangeGte: () => ChainableMock;
    rangeLt: () => ChainableMock;
    rangeLte: () => ChainableMock;
    rangeAdjacent: () => ChainableMock;
    overlaps: () => ChainableMock;
    textSearch: () => ChainableMock;
    match: () => ChainableMock;
    not: () => ChainableMock;
    or: () => ChainableMock;
    filter: () => ChainableMock;
    order: () => ChainableMock;
    limit: () => ChainableMock;
    range: () => ChainableMock;
    single: () => Promise<{ data: unknown; error: unknown }>;
    maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
    then: <TResult1 = { data: unknown; error: unknown }, TResult2 = never>(
      onfullfilled?:
        | ((value: { data: unknown; error: unknown }) => TResult1 | PromiseLike<TResult1>)
        | undefined
        | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | undefined | null
    ) => Promise<TResult1 | TResult2>;
  }

  const createChainableMock = (): ChainableMock => {
    let hasInsert = false;
    let hasUpsert = false;
    let hasSelect = false;
    let selectFields: string | undefined = undefined;

    const chainable = {
      select: (...args: string[]) => {
        hasSelect = true;
        selectFields = args[0];
        return chainable;
      },
      insert: (_data: Record<string, unknown>) => {
        hasInsert = true;
        return chainable;
      },
      upsert: (
        _data: Record<string, unknown> | Record<string, unknown>[],
        _options?: Record<string, unknown>
      ) => {
        hasInsert = true;
        hasUpsert = true;
        return chainable;
      },
      update: () => chainable,
      delete: () => chainable,
      eq: () => chainable,
      neq: () => chainable,
      gt: () => chainable,
      gte: () => chainable,
      lt: () => chainable,
      lte: () => chainable,
      like: () => chainable,
      ilike: () => chainable,
      is: () => chainable,
      in: () => chainable,
      contains: () => chainable,
      containedBy: () => chainable,
      rangeGt: () => chainable,
      rangeGte: () => chainable,
      rangeLt: () => chainable,
      rangeLte: () => chainable,
      rangeAdjacent: () => chainable,
      overlaps: () => chainable,
      textSearch: () => chainable,
      match: () => chainable,
      not: () => chainable,
      or: () => chainable,
      filter: () => chainable,
      order: () => chainable,
      limit: () => chainable,
      range: () => chainable,
      single: () => {
        // If this is an upsert operation with select (show creation), return show data
        if (hasUpsert && hasSelect) {
          return Promise.resolve({
            data: {
              id: 'test-show-id',
              tmdb_id: 999999,
              title: 'Test Show',
              overview: 'Test show for RLS testing',
              status: 'Airing',
              is_popular: false,
              created_at: new Date().toISOString(),
            },
            error: null,
          });
        }
        // If this is an insert operation with select (user creation), return user data
        if (hasInsert && hasSelect && !hasUpsert) {
          return Promise.resolve({
            data: {
              id: 'test-user-id',
              email: 'test@example.com',
              display_name: 'Test User',
              avatar_url: null,
              is_test_user: true,
              created_at: new Date().toISOString(),
            },
            error: null,
          });
        }
        // If this is a select with full user profile fields (for profile lookup), return user data
        if (hasSelect && selectFields && selectFields.includes('display_name')) {
          return Promise.resolve({
            data: {
              id: 'test-user-id',
              email: 'test@example.com',
              display_name: 'Test User',
              avatar_url: null,
              is_test_user: true,
              created_at: new Date().toISOString(),
            },
            error: null,
          });
        }
        // If this is a select on user_shows table, return user show data
        if (hasSelect && !hasInsert && !hasUpsert) {
          return Promise.resolve({
            data: {
              id: 'test-user-show-id',
              user_id: '11111111-1111-1111-1111-111111111111',
              show_id: 'test-show-id',
              status: 'watchlist',
              added_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            },
            error: null,
          });
        }
        // Otherwise return null (for existence checks like "select id")
        return Promise.resolve({
          data: null,
          error: null,
        });
      },
      maybeSingle: () =>
        Promise.resolve({
          data: {
            id: 'test-user-id',
            email: 'test@example.com',
            display_name: 'Test User',
          },
          error: null,
        }),
      then: <TResult1 = { data: unknown; error: unknown }, TResult2 = never>(
        onfullfilled?:
          | ((value: { data: unknown; error: unknown }) => TResult1 | PromiseLike<TResult1>)
          | undefined
          | null,
        _onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | undefined | null
      ): Promise<TResult1 | TResult2> => {
        let result: { data: unknown; error: unknown };

        // For regular queries without single(), return an array (for watchlist stats)
        if (hasSelect && !hasInsert && selectFields === 'status') {
          result = {
            data: [{ status: 'watchlist' }, { status: 'watching' }, { status: 'completed' }],
            error: null,
          };
        }
        // For upsert operations (show creation), return show data
        else if (hasUpsert) {
          result = {
            data: {
              id: 'test-show-id',
              tmdb_id: 999999,
              title: 'Test Show',
              overview: 'Test show for RLS testing',
              status: 'Airing',
              is_popular: false,
              created_at: new Date().toISOString(),
            },
            error: null,
          };
        }
        // For insert operations on user_shows, return user show data
        else if (hasInsert) {
          result = {
            data: {
              id: 'test-user-show-id',
              user_id: '11111111-1111-1111-1111-111111111111',
              show_id: 'test-show-id',
              status: 'watchlist',
              added_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            },
            error: null,
          };
        }
        // Default to empty array for other queries
        else {
          result = { data: [], error: null };
        }

        if (onfullfilled) {
          return Promise.resolve(onfullfilled(result));
        }
        return Promise.resolve(result as TResult1);
      },
    };
    return chainable;
  };

  const mockClient = {
    from: () => createChainableMock(),
    rpc: () => createChainableMock(),
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: null, error: null }),
      signUp: () => Promise.resolve({ data: null, error: null }),
      signOut: () => Promise.resolve({ error: null }),
    },
  } as unknown as SupabaseClient;
  return mockClient;
}

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
    const { error } = await supabase.from('users').select('count').limit(1);

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
