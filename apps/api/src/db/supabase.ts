/**
 * Supabase Database Client
 * 
 * Provides the main Supabase client instance for database operations
 * with connection validation and error handling.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL environment variable');
}

if (!supabaseKey) {
  throw new Error('Missing SUPABASE_SERVICE_KEY environment variable');
}

// Create the Supabase client
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false // API doesn't need session persistence
  }
});

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
        error: connectionTest.error
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
      if (result.status === 'fulfilled' && result.value.count !== null) {
        tables[tableName] = result.value.count;
      } else {
        tables[tableName] = -1; // Error indicator
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