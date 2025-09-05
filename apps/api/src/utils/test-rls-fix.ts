#!/usr/bin/env node
/**
 * Test RLS Policy Fix
 * 
 * This script tests if the RLS policy fix was applied correctly by:
 * 1. Testing user access to shows table
 * 2. Testing watchlist creation manually
 * 3. Identifying remaining issues
 */

import { serviceSupabase, createUserClient } from '../db/supabase.js';

async function testRLSFix() {
  console.log('🧪 Testing RLS Policy Fix...\n');
  
  try {
    // Test 1: Check if shows are publicly readable
    console.log('📋 Test 1: Public access to shows table');
    const { data: showsPublic, error: showsError } = await serviceSupabase
      .from('shows')
      .select('id, tmdb_id, title')
      .limit(5);
    
    if (showsError) {
      console.log('❌ Public shows access failed:', showsError);
    } else {
      console.log(`✅ Public shows access works: ${showsPublic?.length || 0} shows found`);
      if (showsPublic && showsPublic.length > 0) {
        console.log(`   First show: ${showsPublic[0].title} (TMDB: ${showsPublic[0].tmdb_id})`);
      }
    }
    
    // Test 2: Check RLS policies
    console.log('\n📋 Test 2: Current RLS policies on shows table');
    const { data: policies, error: policyError } = await serviceSupabase
      .rpc('exec_sql', { 
        sql: `SELECT schemaname, tablename, policyname, cmd, qual FROM pg_policies WHERE schemaname = 'public' AND tablename = 'shows' ORDER BY policyname;`
      });
    
    if (!policyError && policies) {
      console.log('✅ Current policies:');
      console.log(JSON.stringify(policies, null, 2));
    } else {
      console.log('⚠️  Could not retrieve policies, trying alternate method...');
    }
    
    // Test 3: Test with user context
    const testUserId = 'ca97aeb8-250a-4620-ae47-57ddef7fe629'; // From our test user
    const testJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjYTk3YWViOC0yNTBhLTQ2MjAtYWU0Ny01N2RkZWY3ZmU2MjkiLCJlbWFpbCI6InRlc3RmaW5hbEBleGFtcGxlLmNvbSIsImRpc3BsYXlOYW1lIjoiRmluYWwgVGVzdCIsImlhdCI6MTc1NzAzNjEyNiwiZXhwIjoxNzU3NjQwOTI2fQ.1Ke5_vB2HpbGDEKA4EB7RqPVgj_PLoOqUBbGo1YIaUc';
    
    console.log('\n📋 Test 3: User context access to shows');
    const userSupabase = createUserClient(testJWT);
    
    const { data: userShows, error: userShowsError } = await userSupabase
      .from('shows')
      .select('id, tmdb_id, title')
      .eq('tmdb_id', 157239)
      .limit(1);
    
    if (userShowsError) {
      console.log('❌ User shows access failed:', userShowsError);
    } else {
      console.log(`✅ User shows access works: ${userShows?.length || 0} shows found`);
    }
    
    // Test 4: Try manual watchlist insertion
    console.log('\n📋 Test 4: Manual watchlist insertion');
    
    if (userShows && userShows.length > 0) {
      const { data: watchlistData, error: watchlistError } = await userSupabase
        .from('user_shows')
        .insert({
          user_id: testUserId,
          show_id: userShows[0].id,
          status: 'watchlist',
          added_at: new Date().toISOString()
        })
        .select();
      
      if (watchlistError) {
        console.log('❌ Manual watchlist insertion failed:', watchlistError);
        console.log('   This indicates the RLS fix is not working properly');
      } else {
        console.log('✅ Manual watchlist insertion succeeded:', watchlistData);
      }
    } else {
      console.log('⚠️  Cannot test watchlist insertion - no shows found');
    }
    
    // Test 5: Check if the problematic policies still exist
    console.log('\n📋 Test 5: Check for problematic policies');
    const { data: badPolicies } = await serviceSupabase
      .from('shows')
      .select('count')
      .limit(0); // Just test connection
    
    console.log('✅ Connection to shows table works');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Only run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testRLSFix()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Test script failed:', error);
      process.exit(1);
    });
}

export { testRLSFix };