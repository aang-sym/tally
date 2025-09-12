#!/usr/bin/env tsx
/**
 * Debug RLS Test - Investigate 400 responses
 */

import jwt from 'jsonwebtoken';

const API_BASE = 'http://localhost:4000';
const JWT_SECRET = 'dev-secret-key-for-tally-security-tests-2025-9f8a7b6c5d';

const user1Payload = {
  sub: '11111111-1111-1111-1111-111111111111',
  userId: '11111111-1111-1111-1111-111111111111',
  email: 'user1@test.com',
  displayName: 'RLS Test User 1',
  aud: 'authenticated',
  role: 'authenticated',
};

const user1Token = jwt.sign(user1Payload, JWT_SECRET, { expiresIn: '1d' });

async function debugApiCall(endpoint: string, options: RequestInit = {}) {
  console.log(`\n🔍 Testing: ${options.method || 'GET'} ${endpoint}`);
  console.log(`Headers:`, options.headers);
  if (options.body) {
    console.log(`Body:`, options.body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  let data;
  try {
    data = await response.json();
  } catch {
    data = await response.text();
  }

  console.log(`Status: ${response.status}`);
  console.log(`Response:`, JSON.stringify(data, null, 2));

  return { status: response.status, data };
}

async function runDebugTests() {
  console.log('🔍 Debug RLS Tests - Investigating 400 responses\n');

  // Test 1: Try to add a show
  console.log('\n=== Test 1: Add show to watchlist ===');
  await debugApiCall('/api/watchlist', {
    method: 'POST',
    headers: { Authorization: `Bearer ${user1Token}` },
    body: JSON.stringify({
      tmdb_id: 123456,
      status: 'watchlist',
    }),
  });

  // Test 2: Get user's watchlist to find a show ID
  console.log('\n=== Test 2: Get user watchlist ===');
  const watchlistResult = await debugApiCall('/api/watchlist', {
    headers: { Authorization: `Bearer ${user1Token}` },
  });

  if (watchlistResult.status === 200 && watchlistResult.data?.data?.shows?.length > 0) {
    const showId = watchlistResult.data.data.shows[0].id;
    console.log(`\n📝 Found show ID: ${showId}`);

    // Test 3: Try to update show status
    console.log('\n=== Test 3: Update show status ===');
    await debugApiCall(`/api/watchlist/${showId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${user1Token}` },
      body: JSON.stringify({ status: 'watching' }),
    });
  } else {
    console.log('\n⚠️ No shows found in watchlist to test updates');
  }
}

runDebugTests().catch(console.error);
