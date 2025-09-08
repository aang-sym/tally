#!/usr/bin/env node
/**
 * Test Real API Flow - Complete PGRST301 Fix Verification
 * 
 * This test simulates the exact real API flow:
 * 1. Creates a proper Supabase user (in auth.users)
 * 2. Gets a real JWT token from that user
 * 3. Uses createUserClient with the real JWT
 * 4. Tests watchlist insertion with proper RLS policies
 */

import { serviceSupabase, createUserClient } from '../db/supabase.js';

async function testRealAPIFlow() {
  console.log('🧪 Testing Real API Flow - Complete PGRST301 Fix...\n');
  
  let authUser: any = null;
  let testUser: any = null;
  
  try {
    const testEmail = `test-real-api-${Date.now()}@example.com`;
    const testPassword = 'test_password_123!';
    
    // Step 1: Create a real Supabase Auth user
    console.log('📋 Step 1: Creating real Supabase Auth user...');
    const { data: authData, error: authError } = await serviceSupabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true, // Skip email confirmation for testing
      user_metadata: {
        display_name: 'Real API Test User'
      }
    });
    
    if (authError || !authData.user) {
      console.log('❌ Auth user creation failed:', authError);
      return false;
    }
    
    authUser = authData.user;
    console.log(`✅ Auth user created: ${authUser.email} (ID: ${authUser.id})`);
    
    // Step 2: Create corresponding profile in public.users table
    console.log('\n📋 Step 2: Creating user profile in public.users...');
    const { data: userData, error: userError } = await serviceSupabase
      .from('users')
      .insert({
        id: authUser.id, // Use the same UUID from auth.users
        email: testEmail,
        password_hash: 'hashed_password', // This would be handled by auth normally
        display_name: 'Real API Test User',
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (userError) {
      console.log('❌ User profile creation failed:', userError);
      return false;
    }
    
    testUser = userData;
    console.log(`✅ User profile created: ${testUser.display_name}`);
    
    // Step 3: Get a real JWT token by signing in as this user
    console.log('\n📋 Step 3: Getting real JWT token...');
    const { data: signInData, error: signInError } = await serviceSupabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (signInError || !signInData.session) {
      console.log('❌ Sign in failed:', signInError);
      return false;
    }
    
    const realJWT = signInData.session.access_token;
    console.log(`✅ Real JWT obtained: ${realJWT.substring(0, 50)}...`);
    
    // Step 4: Create user client with real JWT (like the API does)
    console.log('\n📋 Step 4: Creating user client with real JWT...');
    const userClient = createUserClient(realJWT);
    
    // Step 5: Ensure Peacemaker show exists
    console.log('\n📋 Step 5: Finding Peacemaker show...');
    const { data: showData, error: showError } = await serviceSupabase
      .from('shows')
      .select('id, title, tmdb_id')
      .eq('tmdb_id', 110492)
      .single();
    
    if (showError) {
      console.log('❌ Show lookup failed:', showError);
      return false;
    }
    
    console.log(`✅ Peacemaker show found: ${showData.title} (ID: ${showData.id})`);
    
    // Step 6: Test real watchlist insertion using user client
    console.log('\n📋 Step 6: Testing real watchlist insertion with user client...');
    const { data: watchlistData, error: watchlistError } = await userClient
      .from('user_shows')
      .insert({
        user_id: authUser.id, // This should match auth.uid() from the JWT
        show_id: showData.id,
        status: 'watching',
        added_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (watchlistError) {
      console.log('❌ Real API watchlist insertion failed:', watchlistError);
      console.log('   This means the RLS policies are still not working correctly');
      return false;
    }
    
    console.log('✅ Real API watchlist insertion succeeded!');
    console.log(`   User ${testUser.display_name} added ${showData.title} to watchlist`);
    console.log(`   Watchlist entry ID: ${watchlistData.id}`);
    console.log(`   Auth user ID: ${authUser.id}`);
    console.log(`   Watchlist user_id: ${watchlistData.user_id}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Real API flow test failed:', error);
    return false;
  } finally {
    // Clean up test data
    try {
      if (authUser) {
        console.log('\n📋 Cleaning up test data...');
        await serviceSupabase.auth.admin.deleteUser(authUser.id);
        await serviceSupabase.from('user_shows').delete().eq('user_id', authUser.id);
        await serviceSupabase.from('users').delete().eq('id', authUser.id);
        console.log('✅ Test data cleaned up');
      }
    } catch (cleanupError) {
      console.warn('⚠️  Cleanup warning:', cleanupError);
    }
  }
}

// Only run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testRealAPIFlow()
    .then((success) => {
      if (success) {
        console.log('\n🎉 REAL API FLOW VERIFIED! PGRST301 error is completely fixed.');
        console.log('   ✅ Users can now add shows to watchlist through the real API');
        console.log('   ✅ JWT authentication working with RLS policies');
        console.log('   ✅ Foreign key validation passing for both users and shows tables');
      } else {
        console.log('\n❌ Real API flow still has issues. Need further investigation.');
      }
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Test script failed:', error);
      process.exit(1);
    });
}

export { testRealAPIFlow };