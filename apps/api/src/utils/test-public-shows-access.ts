#!/usr/bin/env node
/**
 * Test Public Shows Access
 *
 * Tests if the "Public can read shows" RLS policy is working
 * by using the anonymous supabase client
 */

import { supabase } from '../db/supabase.js';

async function testPublicShowsAccess() {
  console.log('🧪 Testing Public Shows Access (Anonymous Client)...\n');

  try {
    // Test anonymous access to shows table
    console.log('📋 Testing anonymous client access to shows table');
    const { data: showsData, error: showsError } = await supabase
      .from('shows')
      .select('id, tmdb_id, title')
      .limit(3);

    if (showsError) {
      console.log('❌ Anonymous shows access failed:', showsError);
      console.log('   This means the "Public can read shows" policy is not working');
      return false;
    } else {
      console.log(`✅ Anonymous shows access works: ${showsData?.length || 0} shows found`);
      if (showsData && showsData.length > 0) {
        showsData.forEach((show) => {
          console.log(`   - ${show.title} (ID: ${show.id}, TMDB: ${show.tmdb_id})`);
        });
      }
    }

    // Test specific show that was causing issues
    console.log('\n📋 Testing access to specific show (TMDB ID 110492 - Peacemaker)');
    const { data: peacemakerData, error: peacemakerError } = await supabase
      .from('shows')
      .select('id, tmdb_id, title')
      .eq('tmdb_id', 110492)
      .limit(1);

    if (peacemakerError) {
      console.log('❌ Peacemaker show access failed:', peacemakerError);
    } else if (peacemakerData && peacemakerData.length > 0) {
      const first = peacemakerData[0]!;
      console.log(
        `✅ Peacemaker show found: ${first.title} (ID: ${first.id})`
      );
      return first; // Return the show data for further testing
    } else {
      console.log('⚠️  Peacemaker show not found in database');
    }

    return showsData && showsData.length > 0 ? showsData[0] : null;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Only run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testPublicShowsAccess()
    .then((result) => {
      if (result) {
        console.log('\n🎉 Public shows access is working! This should fix the PGRST301 error.');
      } else {
        console.log('\n❌ Public shows access is still broken. Need to investigate further.');
      }
      process.exit(result ? 0 : 1);
    })
    .catch((error) => {
      console.error('Test script failed:', error);
      process.exit(1);
    });
}

export { testPublicShowsAccess };
