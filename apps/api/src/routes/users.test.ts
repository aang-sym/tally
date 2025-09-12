import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import usersDbRouter from './users.js';
import { supabase } from '../db/supabase.js';
import jwt from 'jsonwebtoken';
// Generate a unique user ID for this test run to avoid conflicts
const TEST_USER_ID = `test-user-${Date.now()}`;
const TEST_EMAIL = `${TEST_USER_ID}@test.dev`;
const TEST_DISPLAY_NAME = 'Test User';
const TEST_JWT_SECRET = 'tally_super_secret_jwt_key_2025_production_ready_secure_token_12345';

const app = express();
// We need to use express.json() to parse the body of POST requests if any
app.use(express.json());
// Mount router (route-level middleware inside users router will handle auth)
app.use('/users', usersDbRouter);

// Helper to create Authorization header token
const tokenFor = (userId: string) =>
  jwt.sign({ userId, email: `${userId}@test.dev`, displayName: 'Tester' }, TEST_JWT_SECRET, {
    expiresIn: '1d',
  });

describe('GET /users/:id/profile', () => {
  beforeAll(() => {
    // Ensure JWT secret is configured for middleware
    process.env.JWT_SECRET = TEST_JWT_SECRET;
  });

  afterAll(async () => {
    // Clean up the user created during the test
    const { error } = await supabase.from('users').delete().eq('id', TEST_USER_ID);
    if (error) {
      console.error('Failed to clean up test user', error);
    }
  });

  it('should return 401 when no Authorization header is provided', async () => {
    await request(app).get(`/users/non-existent-user/profile`).expect(401);
  });

  it('should create a new user via POST and then return their profile', async () => {
    // Create the user first (protected route requires Authorization)
    const createRes = await request(app)
      .post(`/users`)
      .set('Authorization', `Bearer ${tokenFor(TEST_USER_ID)}`)
      .send({
        displayName: TEST_DISPLAY_NAME,
        email: TEST_EMAIL,
        avatarUrl: null,
        isTestUser: true,
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.user.id).toBeDefined();

    // Now fetch the profile
    const response = await request(app)
      .get(`/users/${TEST_USER_ID}/profile`)
      .set('Authorization', `Bearer ${tokenFor(TEST_USER_ID)}`)
      .expect('Content-Type', /json/)
      .expect(200);

    // Check the response body
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.id).toBe(TEST_USER_ID);
    // display_name can be present; ensure it's the one we set
    expect(response.body.data.user.display_name).toBe(TEST_DISPLAY_NAME);
    expect(response.body.data.stats.totalShows).toBeDefined();
  });

  it('should return the profile for an existing user on subsequent requests', async () => {
    const response = await request(app)
      .get(`/users/${TEST_USER_ID}/profile`)
      .set('Authorization', `Bearer ${tokenFor(TEST_USER_ID)}`)
      .expect(200);

    expect(response.body.data.user.id).toBe(TEST_USER_ID);
  });
});
