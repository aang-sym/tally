#!/usr/bin/env node
/**
 * Test UI Flow - Simulate Frontend Watchlist Addition
 *
 * Replicates the exact API call that the frontend makes when adding
 * Peacemaker (TMDB ID 110492) to watchlist, including authentication
 */

// Use global fetch available in Node 18+

async function testUIFlow() {
  console.log('🎭 Testing UI Flow - Frontend Watchlist Addition Simulation...\n');

  try {
    // Step 1: Create a test JWT token (simulates frontend authentication)
    // Note: This would normally be a real JWT from the auth system
    const testToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiMzY4Njk3My1iYTYwLTQ0MDUtODUyNS1mOGQ2YjNkY2I3ZmMiLCJlbWFpbCI6InRlc3RAdGVzdC5jb20iLCJzdWIiOiJiMzY4Njk3My1iYTYwLTQ0MDUtODUyNS1mOGQ2YjNkY2I3ZmMiLCJpYXQiOjE2MzA0NDQ4MDAsImV4cCI6OTk5OTk5OTk5OX0.test_signature_for_debugging';

    console.log('📱 Step 1: Simulating frontend API call...');
    console.log('   Target: POST http://localhost:4000/api/watchlist');
    console.log('   User ID: b3686973-ba60-4405-8525-f8d6b3dcb7fc');
    console.log('   TMDB ID: 110492 (Peacemaker)');
    console.log('   Status: watching');

    // Step 2: Make the exact API call the frontend would make
    const requestBody = {
      tmdbId: 110492,
      status: 'watching',
    };

    const response = await fetch('http://localhost:4000/api/watchlist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testToken}`,
        'User-Agent': 'Test-UI-Flow/1.0',
      },
      body: JSON.stringify(requestBody),
    } as RequestInit);

    console.log(`\n📊 Response Status: ${response.status} ${response.statusText}`);

    const responseData = await response.text();
    console.log('📋 Response Headers:', Object.fromEntries(response.headers.entries()));

    let parsedData;
    try {
      parsedData = JSON.parse(responseData);
      console.log('📄 Response Body:', JSON.stringify(parsedData, null, 2));
    } catch (e) {
      console.log('📄 Response Body (raw):', responseData);
    }

    // Step 3: Analyze the result
    if (response.status === 201) {
      console.log('\n✅ SUCCESS: Watchlist addition worked in UI flow simulation');
      return true;
    } else if (response.status === 500) {
      console.log('\n❌ FAILURE: Got 500 error in UI flow simulation');
      if (parsedData && typeof parsedData === 'object') {
        if (parsedData.error && parsedData.error.includes('PGRST301')) {
          console.log('🔥 PGRST301 ERROR CONFIRMED in UI flow!');
        }
      }
      return false;
    } else {
      console.log('\n⚠️  UNEXPECTED: Got unexpected status code');
      return false;
    }
  } catch (error) {
    console.error('\n❌ Test UI flow failed:', error);
    return false;
  }
}

// Only run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testUIFlow()
    .then((success) => {
      if (success) {
        console.log('\n🎉 UI Flow Test PASSED');
        console.log(
          '   The issue may have been resolved, or this is a different flow than the real UI.'
        );
      } else {
        console.log('\n💥 UI Flow Test FAILED - PGRST301 Error Reproduced');
        console.log('   Check the server logs above for detailed execution trace.');
        console.log('   This confirms the discrepancy between test script and UI flow.');
      }
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('UI flow test script failed:', error);
      process.exit(1);
    });
}

export { testUIFlow };
