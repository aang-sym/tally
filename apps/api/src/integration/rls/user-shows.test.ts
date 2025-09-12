import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Load environment variables for integration tests
dotenv.config();

// Import the routes we'll test
import watchlistRouter from '../../routes/watchlist.js';
import { authenticateUser } from '../../middleware/user-identity.js';

/**
 * RLS Integration Tests for user_shows table
 *
 * Tests verify that Row-Level Security policies properly isolate user data:
 * 1. Authenticated users can access their own shows
 * 2. Authenticated users cannot access other users' shows
 * 3. Unauthenticated requests are denied
 *
 * These tests use real API endpoints to ensure end-to-end RLS enforcement.
 */

const JWT_SECRET =
  process.env.JWT_SECRET || 'dev-secret-key-for-tally-security-tests-2025-9f8a7b6c5d';

// Test user payloads
const user1Payload = {
  sub: '11111111-1111-1111-1111-111111111111',
  userId: '11111111-1111-1111-1111-111111111111',
  email: 'user1@test.com',
  displayName: 'Test User 1',
  aud: 'authenticated',
  role: 'authenticated',
};

const user2Payload = {
  sub: '22222222-2222-2222-2222-222222222222',
  userId: '22222222-2222-2222-2222-222222222222',
  email: 'user2@test.com',
  displayName: 'Test User 2',
  aud: 'authenticated',
  role: 'authenticated',
};

// Generate JWT tokens for testing
const user1Token = jwt.sign(user1Payload, JWT_SECRET, { expiresIn: '1d' });
const user2Token = jwt.sign(user2Payload, JWT_SECRET, { expiresIn: '1d' });

let app: express.Application;

beforeAll(() => {
  // Create test app with same middleware as main server
  app = express();
  app.use(cors());
  app.use(morgan('tiny'));
  app.use(express.json());

  // Use the real authentication middleware
  app.use('/api/watchlist', authenticateUser);
  app.use('/api/watchlist', watchlistRouter);
});

describe('RLS Integration Tests: user_shows table', () => {
  describe('Authentication Requirements', () => {
    it('should deny unauthenticated requests to GET /api/watchlist', async () => {
      const response = await request(app).get('/api/watchlist').expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('token required');
    });

    it('should deny requests with invalid JWT tokens', async () => {
      const response = await request(app)
        .get('/api/watchlist')
        .set('Authorization', 'Bearer invalid-token-format')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('Invalid token');
    });
  });

  describe('User Data Isolation (RLS Enforcement)', () => {
    it('should allow user to access their own watchlist data', async () => {
      const response = await request(app)
        .get('/api/watchlist')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('shows');
      expect(Array.isArray(response.body.data.shows)).toBe(true);

      // All shows in response should belong to user1
      const shows = response.body.data.shows;
      shows.forEach((show: any) => {
        expect(show.user_id).toBe(user1Payload.userId);
      });
    });

    it('should return different data for different users', async () => {
      // Get user1's watchlist
      const user1Response = await request(app)
        .get('/api/watchlist')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      // Get user2's watchlist
      const user2Response = await request(app)
        .get('/api/watchlist')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      const user1Shows = user1Response.body.data.shows;
      const user2Shows = user2Response.body.data.shows;

      // Verify all shows belong to the correct user
      user1Shows.forEach((show: any) => {
        expect(show.user_id).toBe(user1Payload.userId);
      });

      user2Shows.forEach((show: any) => {
        expect(show.user_id).toBe(user2Payload.userId);
      });

      // Users should have different show lists (RLS isolation)
      const user1ShowIds = user1Shows.map((s: any) => s.id).sort();
      const user2ShowIds = user2Shows.map((s: any) => s.id).sort();
      expect(user1ShowIds).not.toEqual(user2ShowIds);
    });
  });

  describe('Watchlist Stats RLS Enforcement', () => {
    it('should return user-specific stats', async () => {
      const response = await request(app)
        .get('/api/watchlist/stats')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('totalShows');
      expect(response.body.data).toHaveProperty('byStatus');
      expect(typeof response.body.data.totalShows).toBe('number');
    });

    it('should deny unauthenticated access to stats', async () => {
      const response = await request(app).get('/api/watchlist/stats').expect(401);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('Write Operations RLS Enforcement', () => {
    let testShowId: string;

    beforeEach(async () => {
      // Create a test show for user1 to use in write operation tests
      const createResponse = await request(app)
        .post('/api/watchlist')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          tmdb_id: 999999,
          status: 'watchlist',
        })
        .expect(201);

      testShowId = createResponse.body.data.id;
    });

    it('should allow user to update their own show status', async () => {
      const response = await request(app)
        .put(`/api/watchlist/${testShowId}/status`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ status: 'watching' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it("should prevent user from updating another user's show", async () => {
      // Try to update user1's show using user2's token
      const response = await request(app)
        .put(`/api/watchlist/${testShowId}/status`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ status: 'watching' });

      // Should return 404 (not found) due to RLS filtering, not 403
      // This is because RLS makes the row invisible to user2
      expect([404, 403]).toContain(response.status);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should prevent unauthenticated status updates', async () => {
      const response = await request(app)
        .put(`/api/watchlist/${testShowId}/status`)
        .send({ status: 'watching' })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('Delete Operations RLS Enforcement', () => {
    let user1ShowId: string;

    beforeEach(async () => {
      // Create a test show for user1
      const createResponse = await request(app)
        .post('/api/watchlist')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          tmdb_id: 888888,
          status: 'watchlist',
        })
        .expect(201);

      user1ShowId = createResponse.body.data.id;
    });

    it('should allow user to delete their own show', async () => {
      const response = await request(app)
        .delete(`/api/watchlist/${user1ShowId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it("should prevent user from deleting another user's show", async () => {
      // Try to delete user1's show using user2's token
      const response = await request(app)
        .delete(`/api/watchlist/${user1ShowId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      // Should return 404 (not found) due to RLS filtering
      expect([404, 403]).toContain(response.status);
      expect(response.body).toHaveProperty('success', false);
    });
  });
});
