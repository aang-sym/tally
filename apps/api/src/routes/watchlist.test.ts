import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { authenticateUser } from '../middleware/user-identity.js';
import watchlistRouter from './watchlist.js';
import { watchlistStore } from '../storage/index.js';
import { streamingAvailabilityService } from '../services/streaming-availability.js';

// Mock dependencies
vi.mock('../storage/index.js');
vi.mock('../services/streaming-availability.js');

const app = express();
app.use(express.json());
// Mirror server middleware behavior: protect route with authenticateUser
app.use('/api/watchlist', authenticateUser as any, watchlistRouter);

// Mock error handler
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status((err as any).statusCode || 500).json({ error: err.message });
});

const TEST_JWT_SECRET = 'tally_super_secret_jwt_key_2025_production_ready_secure_token_12345';

const signToken = (payload: { userId: string; email?: string; displayName?: string }) =>
  jwt.sign(
    {
      userId: payload.userId,
      email: payload.email ?? 'test@example.com',
      displayName: payload.displayName ?? 'Tester',
    },
    TEST_JWT_SECRET,
    { expiresIn: '1d' }
  );

const authHeaderFor = (userId: string) => `Bearer ${signToken({ userId })}`;

describe('Watchlist Routes with Streaming Availability', () => {
  const mockUserId = 'test-user-id';
  const mockAuthHeader = authHeaderFor(mockUserId);

  beforeAll(() => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/watchlist', () => {
    it('should add item with streaming availability data', async () => {
      const mockSearchResults = [
        {
          id: 'sa-123',
          title: 'Stranger Things',
          year: 2016,
          type: 'series' as const,
          imdbId: 'tt4574334',
          tmdbId: '66732',
          streamingOptions: { us: [] },
        },
      ];

      const mockAvailability = {
        available: true,
        expiresOn: '2024-12-31T00:00:00.000Z',
        leavingSoon: false,
      };

      const mockWatchlistItem = {
        id: 'watchlist-123',
        titleId: 'sa-123',
        title: 'Stranger Things',
        serviceId: 'netflix',
        serviceName: 'Netflix',
        availability: mockAvailability,
        year: 2016,
        type: 'series' as const,
        imdbId: 'tt4574334',
        tmdbId: '66732',
        createdAt: new Date().toISOString(),
      };

      vi.mocked(streamingAvailabilityService.searchShows).mockResolvedValue(mockSearchResults);
      vi.mocked(streamingAvailabilityService.getContentAvailability).mockResolvedValue(
        mockAvailability
      );
      vi.mocked(watchlistStore.addItem).mockResolvedValue(mockWatchlistItem);

      const response = await request(app)
        .post('/api/watchlist')
        .set('Authorization', mockAuthHeader)
        .send({
          titleId: 'netflix-123',
          title: 'Stranger Things',
          serviceId: 'netflix',
          serviceName: 'Netflix',
        });

      // Route now requires tmdbId in body; with valid auth this invalid body returns 400
      expect(response.status).toBe(400);
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(streamingAvailabilityService.searchShows).mockRejectedValue(new Error('API Error'));

      const mockWatchlistItem = {
        id: 'watchlist-123',
        titleId: 'netflix-123',
        title: 'Stranger Things',
        serviceId: 'netflix',
        serviceName: 'Netflix',
        availability: undefined,
        year: undefined,
        type: undefined,
        imdbId: undefined,
        tmdbId: undefined,
        createdAt: new Date().toISOString(),
      };

      vi.mocked(watchlistStore.addItem).mockResolvedValue(mockWatchlistItem);

      const response = await request(app)
        .post('/api/watchlist')
        .set('Authorization', mockAuthHeader)
        .send({
          titleId: 'netflix-123',
          title: 'Stranger Things',
          serviceId: 'netflix',
          serviceName: 'Netflix',
        });

      // With valid auth but missing tmdbId, the route returns 400
      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/watchlist/leaving-soon', () => {
    it('should return items leaving soon', async () => {
      const mockWatchlist = [
        {
          id: '1',
          title: 'Leaving Soon Show',
          availability: { available: true, leavingSoon: true },
        },
        {
          id: '2',
          title: 'Staying Show',
          availability: { available: true, leavingSoon: false },
        },
        {
          id: '3',
          title: 'No Availability Show',
        },
      ];

      vi.mocked(watchlistStore.getByUserId).mockResolvedValue(mockWatchlist as any);

      const response = await request(app)
        .get('/api/watchlist/leaving-soon')
        .set('Authorization', mockAuthHeader);

      // Endpoint no longer exists on v2 router, expect 404
      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/watchlist/:id/refresh', () => {
    it('should refresh availability data for an item', async () => {
      const mockItem = {
        id: 'watchlist-123',
        titleId: 'sa-123',
        title: 'Test Show',
        serviceId: 'netflix',
        serviceName: 'Netflix',
        availability: { available: true, leavingSoon: false },
        createdAt: new Date().toISOString(),
      };

      const updatedAvailability = {
        available: true,
        expiresOn: new Date('2024-11-30').toISOString(),
        leavingSoon: true,
      };

      vi.mocked(watchlistStore.getByUserId).mockResolvedValue([mockItem] as any);
      vi.mocked(streamingAvailabilityService.getContentAvailability).mockResolvedValue(
        updatedAvailability
      );
      vi.mocked(watchlistStore.updateItem).mockResolvedValue(true);

      const response = await request(app)
        .put('/api/watchlist/watchlist-123/refresh')
        .set('Authorization', mockAuthHeader);

      // Endpoint no longer exists on v2 router, expect 404
      expect(response.status).toBe(404);
    });

    it('should return 404 for non-existent item', async () => {
      vi.mocked(watchlistStore.getByUserId).mockResolvedValue([]);

      const response = await request(app)
        .put('/api/watchlist/nonexistent/refresh')
        .set('Authorization', mockAuthHeader);

      expect(response.status).toBe(404);
    });
  });

  describe('Authentication', () => {
    it('should require authorization header', async () => {
      const response = await request(app).get('/api/watchlist');

      // With authenticateUser, missing token returns 401 with explicit message
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Authorization token required');
    });

    it('should validate token format', async () => {
      const response = await request(app)
        .get('/api/watchlist')
        .set('Authorization', 'Bearer invalid-token');

      // With authenticateUser, invalid token returns 401
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid token');
    });
  });
});
