/**
 * Supabase Database Client
 * 
 * Provides the main Supabase client instance for database operations
 * with connection validation and error handling.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), 'apps/api/.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_API_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing SUPABASE_API_KEY environment variable');
}

if (!supabaseServiceKey) {
  throw new Error('Missing SUPABASE_SERVICE_KEY environment variable');
}

// Create the default Supabase client using anon key (respects RLS)
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

// Create a service role client (bypasses RLS for admin operations like user creation)
export const serviceSupabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

/**
 * Create a Supabase client with a specific JWT token for RLS enforcement
 * This should be used in routes where user authentication is required
 */
export const createUserClient = (userJwtToken: string): SupabaseClient => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${userJwtToken}`
      }
    }
  });
};

/**
 * Test the Supabase connection
 */
export async function testConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
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
        error: connectionTest.error || 'Connection failed'
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
      supabase.from('show_availability').select('*', { count: 'exact', head: true })
    ]);

    const tableNames = ['users', 'shows', 'seasons', 'episodes', 'user_shows', 'user_episode_progress', 'streaming_services', 'show_availability'];
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
      tables
    };
  } catch (error) {
    return {
      connected: false,
      tables: {},
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}