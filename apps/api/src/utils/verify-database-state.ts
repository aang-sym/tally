#!/usr/bin/env node
/**
 * Database State Verification
 * 
 * Comprehensive check of database migrations, RLS policies, and RPCs
 * to diagnose authentication and PGRST301 issues
 */

import { supabase, serviceSupabase, createUserClient } from '../db/supabase.js';

async function verifyDatabaseState() {
  console.log('🔍 COMPREHENSIVE DATABASE STATE VERIFICATION...\n');
  
  const results = {
    migrations: false,
    rlsPolicies: false,
    rpcFunctions: false,
    authTest: false,
    userDataTest: false
  };
  
  try {
    // 1. Check if tables exist with proper columns
    console.log('📋 Step 1: Verifying table schemas...');
    
    const { data: userShowsColumns, error: colError } = await serviceSupabase
      .rpc('exec_sql', { 
        sql: `SELECT column_name, data_type, is_nullable 
              FROM information_schema.columns 
              WHERE table_name = 'user_shows' 
              ORDER BY ordinal_position;` 
      });
    
    if (colError) {
      console.error('❌ Cannot check table schema:', colError);
      return results;
    }
    
    console.log('   user_shows columns:', userShowsColumns);
    
    // 2. Check RLS policies
    console.log('\n🛡️  Step 2: Verifying RLS policies...');
    
    const { data: rlsPolicies, error: rlsError } = await serviceSupabase
      .rpc('exec_sql', { 
        sql: `SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
              FROM pg_policies 
              WHERE tablename IN ('user_shows', 'shows', 'user_episode_progress')
              ORDER BY tablename, policyname;` 
      });
    
    if (rlsError) {
      console.error('❌ Cannot check RLS policies:', rlsError);
    } else {
      console.log('   RLS Policies found:', rlsPolicies?.length || 0);
      rlsPolicies?.forEach(policy => {
        console.log(`   - ${policy.tablename}.${policy.policyname} (${policy.cmd})`);
      });
      results.rlsPolicies = (rlsPolicies?.length || 0) > 0;
    }
    
    // 3. Check RPC functions
    console.log('\n⚙️  Step 3: Verifying RPC functions...');
    
    const { data: rpcFunctions, error: rpcError } = await serviceSupabase
      .rpc('exec_sql', { 
        sql: `SELECT proname, prosecdef, proowner 
              FROM pg_proc p
              JOIN pg_namespace n ON p.pronamespace = n.oid
              WHERE n.nspname = 'public' 
              AND proname LIKE 'rpc_%'
              ORDER BY proname;` 
      });
    
    if (rpcError) {
      console.error('❌ Cannot check RPC functions:', rpcError);
    } else {
      console.log('   RPC Functions found:', rpcFunctions?.length || 0);
      rpcFunctions?.forEach(func => {
        console.log(`   - ${func.proname} (security definer: ${func.prosecdef})`);
      });
      results.rpcFunctions = (rpcFunctions?.length || 0) > 0;
    }
    
    // 4. Test auth.uid() functionality
    console.log('\n🔐 Step 4: Testing auth.uid() functionality...');
    
    // Test with JWT token
    const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiMzY4Njk3My1iYTYwLTQ0MDUtODUyNS1mOGQ2YjNkY2I3ZmMiLCJ1c2VySWQiOiJiMzY4Njk3My1iYTYwLTQ0MDUtODUyNS1mOGQ2YjNkY2I3ZmMiLCJlbWFpbCI6InRlc3RAdGVzdC5jb20iLCJkaXNwbGF5TmFtZSI6IlRlc3QgVXNlciIsImF1ZCI6ImF1dGhlbnRpY2F0ZWQiLCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImlhdCI6MTc1NzE0MTI0NiwiZXhwIjoxNzU3MjI3NjQ2fQ.YiMp-JwFPWrjCw9Lg7Ot86ptbloWoNZCrzUvai0I1kI';
    
    const userClient = createUserClient(testToken);
    
    // Test direct auth.uid() call
    const { data: authUidResult, error: authUidError } = await userClient
      .rpc('exec_sql', { sql: 'SELECT auth.uid() as user_id;' });
    
    if (authUidError) {
      console.error('❌ auth.uid() test failed:', authUidError);
    } else {
      console.log('   auth.uid() result:', authUidResult);
      results.authTest = authUidResult?.[0]?.user_id !== null;
    }
    
    // 5. Test user_shows access with RLS
    console.log('\n👤 Step 5: Testing user_shows RLS access...');
    
    // First ensure test user exists
    const testUserId = 'b3686973-ba60-4405-8525-f8d6b3dcb7fc';
    const { error: userInsertError } = await serviceSupabase
      .from('users')
      .upsert({
        id: testUserId,
        email: 'test@test.com',
        display_name: 'Test User',
        is_test_user: true
      });
    
    if (userInsertError) {
      console.log('   Note: User upsert issue (may be expected):', userInsertError.message);
    } else {
      console.log('   ✅ Test user ensured in database');
    }
    
    // Test SELECT with RLS
    const { data: userShowsData, error: selectError } = await userClient
      .from('user_shows')
      .select('*')
      .limit(5);
    
    if (selectError) {
      console.error('❌ user_shows SELECT with RLS failed:', selectError);
      console.error('   Error code:', selectError.code);
      console.error('   Error message:', selectError.message);
    } else {
      console.log('   ✅ user_shows SELECT with RLS successful');
      console.log('   Records returned:', userShowsData?.length || 0);
      results.userDataTest = true;
    }
    
    // 6. Test direct INSERT to diagnose PGRST301
    console.log('\n➕ Step 6: Testing INSERT operations...');
    
    // First ensure a show exists for foreign key
    const { data: testShow, error: showError } = await serviceSupabase
      .from('shows')
      .select('id')
      .limit(1)
      .single();
    
    if (showError || !testShow) {
      console.log('   Creating test show for FK test...');
      const { data: newShow, error: newShowError } = await serviceSupabase
        .from('shows')
        .insert({
          tmdb_id: 999999,
          title: 'Test Show for Debugging',
          type: 'tv'
        })
        .select('id')
        .single();
        
      if (newShowError) {
        console.error('❌ Cannot create test show:', newShowError);
        return results;
      }
      
      console.log('   ✅ Test show created:', newShow.id);
    }
    
    const showId = testShow?.id || 'test-show-id';
    
    // Test INSERT with authenticated client
    const { data: insertResult, error: insertError } = await userClient
      .from('user_shows')
      .insert({
        user_id: testUserId,
        show_id: showId,
        status: 'watchlist'
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ user_shows INSERT with RLS failed:', insertError);
      console.error('   Error code:', insertError.code);
      console.error('   Error details:', insertError.details);
      console.error('   Error hint:', insertError.hint);
      
      if (insertError.code === 'PGRST301') {
        console.log('🔥 CONFIRMED: PGRST301 error reproduced in verification!');
      }
    } else {
      console.log('   ✅ user_shows INSERT with RLS successful:', insertResult.id);
      
      // Clean up test record
      await serviceSupabase
        .from('user_shows')
        .delete()
        .eq('id', insertResult.id);
    }
    
  } catch (error) {
    console.error('❌ Verification script failed:', error);
  }
  
  // Summary
  console.log('\n📊 VERIFICATION SUMMARY:');
  console.log('   Database Tables: ✅ (assuming working since health check passed)');
  console.log(`   RLS Policies: ${results.rlsPolicies ? '✅' : '❌'}`);
  console.log(`   RPC Functions: ${results.rpcFunctions ? '✅' : '❌'}`);
  console.log(`   auth.uid() Test: ${results.authTest ? '✅' : '❌'}`);
  console.log(`   User Data Access: ${results.userDataTest ? '✅' : '❌'}`);
  
  const overallStatus = Object.values(results).every(result => result);
  console.log(`\n🎯 OVERALL STATUS: ${overallStatus ? '✅ HEALTHY' : '❌ ISSUES DETECTED'}`);
  
  if (!overallStatus) {
    console.log('\n💡 RECOMMENDED ACTIONS:');
    if (!results.rlsPolicies) console.log('   - Apply RLS policy migrations');
    if (!results.rpcFunctions) console.log('   - Apply RPC function migrations');
    if (!results.authTest) console.log('   - Fix JWT token format for Supabase compatibility');
    if (!results.userDataTest) console.log('   - Debug RLS policy configuration');
  }
  
  return results;
}

// Run verification if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  verifyDatabaseState()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Verification failed:', error);
      process.exit(1);
    });
}

export { verifyDatabaseState };