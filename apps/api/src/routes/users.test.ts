import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { identifyUser } from '../middleware/user-identity.js';
import usersDbRouter from './users.js';
import { supabase } from '../db/supabase.js';

// Generate a unique user ID for this test run to avoid conflicts
const TEST_USER_ID = `test-user-${Date.now()}`;

const app = express();
// We need to use express.json() to parse the body of POST requests if any
app.use(express.json());
// Register the middleware and router in the same way as server.ts
app.use(identifyUser);
app.use('/users', usersDbRouter);

describe('GET /users/:id/profile', () => {

  afterAll(async () => {
    // Clean up the user created during the test
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', TEST_USER_ID);
    if (error) {
      console.error('Failed to clean up test user', error);
    }
  });

  it('should return 404 for a user that does not exist and no header is provided', async () => {
    await request(app)
      .get(`/users/non-existent-user`)
      .expect(404);
  });

  it('should create a new user and return their profile on the first request', async () => {
    const response = await request(app)
      .get(`/users/${TEST_USER_ID}/profile`)
      .set('x-user-id', TEST_USER_ID)
      .expect('Content-Type', /json/)
      .expect(200);

    // Check the response body
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.id).toBe(TEST_USER_ID);
    expect(response.body.data.user.display_name).toBeNull(); // It should be null initially
    expect(response.body.data.stats.totalShows).toBe(0);

    // Verify the user now exists in the database
    const { data: dbUser, error } = await supabase
      .from('users')
      .select('id')
      .eq('id', TEST_USER_ID)
      .single();

    expect(error).toBeNull();
    expect(dbUser).not.toBeNull();
    expect(dbUser?.id).toBe(TEST_USER_ID);
  });

  it('should return the profile for an existing user on subsequent requests', async () => {
    // The user was created in the previous test
    const response = await request(app)
      .get(`/users/${TEST_USER_ID}/profile`)
      .set('x-user-id', TEST_USER_ID)
      .expect(200);

    expect(response.body.data.user.id).toBe(TEST_USER_ID);
  });
});
