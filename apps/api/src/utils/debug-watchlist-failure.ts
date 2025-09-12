#!/usr/bin/env node
/**
 * Debug Watchlist Failure
 *
 * Step-by-step diagnostic to identify why watchlist addition is failing
 */

import { supabase, serviceSupabase, createUserClient } from '../db/supabase.js';
import { showService } from '../services/ShowService.js';
import { WatchlistService } from '../services/WatchlistService.js';

async function debugWatchlistFailure() {
  console.log('🔍 DEBUGGING WATCHLIST FAILURE...\n');

  const testToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiMzY4Njk3My1iYTYwLTQ0MDUtODUyNS1mOGQ2YjNkY2I3ZmMiLCJ1c2VySWQiOiJiMzY4Njk3My1iYTYwLTQ0MDUtODUyNS1mOGQ2YjNkY2I3ZmMiLCJlbWFpbCI6InRlc3RAdGVzdC5jb20iLCJkaXNwbGF5TmFtZSI6IlRlc3QgVXNlciIsImF1ZCI6ImF1dGhlbnRpY2F0ZWQiLCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImlhdCI6MTc1NzE0MTI0NiwiZXhwIjoxNzU3MjI3NjQ2fQ.YiMp-JwFPWrjCw9Lg7Ot86ptbloWoNZCrzUvai0I1kI';
  const testUserId = 'b3686973-ba60-4405-8525-f8d6b3dcb7fc';
  const testTmdbId = 110492; // Peacemaker

  try {
    // Step 1: Test database connection and user existence
    console.log('📋 Step 1: Testing database connection and user existence...');

    const { data: userExists, error: userCheckError } = await serviceSupabase
      .from('users')
      .select('id, email')
      .eq('id', testUserId)
      .single();

    if (userCheckError && userCheckError.code !== 'PGRST116') {
      console.error('❌ User check failed:', userCheckError);
      return;
    }

    if (!userExists) {
      console.log('👤 Creating test user...');
      const { error: createUserError } = await serviceSupabase.from('users').insert({
        id: testUserId,
        email: 'test@test.com',
        display_name: 'Test User',
        is_test_user: true,
      });

      if (createUserError) {
        console.error('❌ User creation failed:', createUserError);
        return;
      }
      console.log('✅ Test user created');
    } else {
      console.log('✅ Test user exists:', userExists);
    }

    // Step 2: Test JWT authentication
    console.log('\n🔐 Step 2: Testing JWT authentication...');

    const userClient = createUserClient(testToken);
    const { data: authTest, error: authError } = await userClient
      .from('users')
      .select('id')
      .eq('id', testUserId)
      .single();

    if (authError) {
      console.error('❌ JWT auth test failed:', authError);
      console.error('   This suggests RLS policies are blocking access');
    } else {
      console.log('✅ JWT authentication working:', authTest);
    }

    // Step 3: Test show creation directly
    console.log('\n🎭 Step 3: Testing show creation/retrieval...');

    // First, try to create a test show directly
    const testShowData = {
      tmdb_id: testTmdbId,
      title: 'Peacemaker (Test)',
      status: 'Ended',
      overview: 'Test show for debugging',
      tmdb_last_updated: new Date().toISOString(),
      is_popular: false,
    };

    const { data: testShow, error: showError } = await serviceSupabase
      .from('shows')
      .upsert(testShowData, { onConflict: 'tmdb_id' })
      .select()
      .single();

    if (showError) {
      console.error('❌ Direct show creation failed:', showError);
      return;
    }

    console.log('✅ Test show created/exists:', {
      id: testShow.id,
      title: testShow.title,
      tmdb_id: testShow.tmdb_id,
    });

    // Step 4: Test ShowService
    console.log('\n⚙️  Step 4: Testing ShowService...');

    const showServiceResult = await showService.getOrCreateShow(testTmdbId, serviceSupabase);

    if (!showServiceResult) {
      console.error('❌ ShowService returned null - this is the likely cause!');
    } else {
      console.log('✅ ShowService successful:', {
        id: showServiceResult.id,
        title: showServiceResult.title,
        tmdb_id: showServiceResult.tmdb_id,
      });
    }

    // Step 5: Test direct database INSERT with user_shows
    console.log('\n➕ Step 5: Testing direct user_shows INSERT...');

    // Test with service role (should work)
    const { data: serviceInsert, error: serviceError } = await serviceSupabase
      .from('user_shows')
      .insert({
        user_id: testUserId,
        show_id: testShow.id,
        status: 'watchlist',
      })
      .select()
      .single();

    if (serviceError) {
      console.error('❌ Service role INSERT failed:', serviceError);
    } else {
      console.log('✅ Service role INSERT successful:', serviceInsert.id);

      // Clean up
      await serviceSupabase.from('user_shows').delete().eq('id', serviceInsert.id);
    }

    // Test with user client (tests RLS)
    const { data: userInsert, error: userInsertError } = await userClient
      .from('user_shows')
      .insert({
        user_id: testUserId,
        show_id: testShow.id,
        status: 'watchlist',
      })
      .select()
      .single();

    if (userInsertError) {
      console.error('❌ User client INSERT failed:', userInsertError);
      console.error('   Error code:', userInsertError.code);
      console.error('   This indicates RLS policy issues');

      if (userInsertError.code === 'PGRST301') {
        console.log('🔥 CONFIRMED: PGRST301 error - foreign key constraint issue');
      }
    } else {
      console.log('✅ User client INSERT successful:', userInsert.id);

      // Clean up
      await serviceSupabase.from('user_shows').delete().eq('id', userInsert.id);
    }

    // Step 6: Test WatchlistService directly
    console.log('\n📝 Step 6: Testing WatchlistService directly...');

    const watchlistService = new WatchlistService(testToken);
    const watchlistResult = await watchlistService.addToWatchlist(
      testUserId,
      testTmdbId,
      'watching'
    );

    if (!watchlistResult) {
      console.error('❌ WatchlistService returned null - confirmed failure point!');
    } else {
      console.log('✅ WatchlistService successful:', {
        id: watchlistResult.id,
        show_id: watchlistResult.show_id,
        status: watchlistResult.status,
      });
    }
  } catch (error) {
    console.error('❌ Debug script failed:', error);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  debugWatchlistFailure()
    .then(() => {
      console.log('\n🎯 Debug complete. Check the results above to identify the failure point.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Debug script failed:', error);
      process.exit(1);
    });
}

export { debugWatchlistFailure };
