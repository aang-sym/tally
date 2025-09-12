import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import watchlistRouter from './watchlist.js';
import { watchlistStore } from '../storage/index.js';
import { streamingAvailabilityService } from '../services/streaming-availability.js';

// Mock dependencies
vi.mock('../storage/index.js');
vi.mock('../services/streaming-availability.js');

const app = express();
app.use(express.json());
app.use('/api/watchlist', watchlistRouter);

// Mock error handler
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status((err as any).statusCode || 500).json({ error: err.message });
});

describe('Watchlist Routes with Streaming Availability', () => {
  const mockUserId = 'test-user-id';
  const mockAuthHeader = `Bearer stub_token_${mockUserId}`;

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

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockWatchlistItem);

      expect(streamingAvailabilityService.searchShows).toHaveBeenCalledWith(
        'Stranger Things',
        'us',
        undefined
      );
      expect(streamingAvailabilityService.getContentAvailability).toHaveBeenCalledWith(
        'sa-123',
        'netflix'
      );
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

      expect(response.status).toBe(201);
      expect(response.body.availability).toBeUndefined();
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

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe('Leaving Soon Show');
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

      expect(response.status).toBe(200);
      expect(response.body.availability.leavingSoon).toBe(true);

      expect(streamingAvailabilityService.getContentAvailability).toHaveBeenCalledWith(
        'sa-123',
        'netflix'
      );
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

      expect(response.status).toBe(500); // ValidationError gets converted to 500 by default error handler
      expect(response.body.error).toContain('Authorization token required');
    });

    it('should validate token format', async () => {
      const response = await request(app)
        .get('/api/watchlist')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Invalid token format');
    });
  });
});
