import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Under test: router
// IMPORTANT: We will mock deep dependencies before importing the router module
// so that ESM import of the router doesn't evaluate real Supabase code.

// Test JWT secret aligned with [Node.generateTestToken()](apps/api/src/utils/generate-test-token.js:1)
const TEST_JWT_SECRET = 'tally_super_secret_jwt_key_2025_production_ready_secure_token_12345';

// Build a basic auth middleware identical in behavior to [TypeScript.authenticateUser()](apps/api/src/middleware/user-identity.ts:28)
// We import the real middleware to assert 401 behavior for "no token".
import { authenticateUser } from '../middleware/user-identity.js';

// Mocks for supabase and dependent services used by the router
// Use vi.hoisted so that hoisted vi.mock factories can safely access these values
const hoisted = vi.hoisted(() => {
  const svc = {
    updateStreamingProvider: vi.fn(),
    updateCountryCode: vi.fn(),
    updateBufferDays: vi.fn(),
  };
  const WatchlistCtor = vi.fn().mockImplementation(() => svc);

  const showSvc = {
    getOrCreateShow: vi.fn(),
    getShowWithDetails: vi.fn(),
  };

  const supFrom = vi.fn();
  const svcSupFrom = vi.fn();
  const sup = { from: supFrom };
  const svcSup = { from: svcSupFrom };

  return {
    svc,
    WatchlistCtor,
    showSvc,
    supFrom,
    svcSupFrom,
    sup,
    svcSup,
  };
});

const mockWatchlistService = hoisted.svc;
const MockWatchlistServiceCtor = hoisted.WatchlistCtor;
const mockShowService = hoisted.showSvc;
const supabaseFrom = hoisted.supFrom;
const serviceSupabaseFrom = hoisted.svcSupFrom;
const mockSupabase = hoisted.sup;
const mockServiceSupabase = hoisted.svcSup;

// Provide select()->eq()->single() chains for GET progress
const chain = () => {
  const obj: any = {};
  obj.select = vi.fn().mockReturnValue(obj);
  obj.eq = vi.fn().mockReturnValue(obj);
  obj.in = vi.fn().mockReturnValue(obj);
  obj.order = vi.fn().mockReturnValue(obj);
  obj.single = vi.fn();
  return obj;
};

beforeAll(() => {
  // Make sure JWT secret is available for real middleware
  process.env.JWT_SECRET = TEST_JWT_SECRET;
});

// Mock module graph
vi.mock('../services/WatchlistService.js', () => {
  const { WatchlistCtor } = hoisted;
  return { WatchlistService: WatchlistCtor };
});

vi.mock('../services/ShowService.js', () => {
  const { showSvc } = hoisted;
  return { showService: showSvc };
});

vi.mock('../services/StreamingService.js', () => ({
  streamingService: {
    getShowAvailability: vi.fn().mockResolvedValue({ normalized: {} }),
  },
}));

vi.mock('../db/supabase.js', () => {
  const { sup, svcSup } = hoisted;
  return {
    supabase: sup,
    serviceSupabase: svcSup,
    createUserClient: vi.fn(),
  };
});

// Now import the router under test after mocks are set
import watchlistV2Router from './watchlist.js';

// Helper: build an express app mounting the same middleware chain as [Node.app()](apps/api/src/server.ts:1) for this route
const buildApp = () => {
  const app = express();
  app.use(express.json());
  // In server.ts the route is protected with authenticateUser before mounting the router at /api/watchlist
  // We replicate that for accurate 401 behavior.
  app.use('/api/watchlist', authenticateUser as any, watchlistV2Router);
  // Generic error passthrough to reveal route status codes in tests
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err?.statusCode || 500;
    res.status(status).json({ success: false, error: err?.message || 'Unhandled' });
  });
  return app;
};

// JWT helpers
const signToken = (payload: { userId: string; email?: string; displayName?: string }) =>
  jwt.sign(
    {
      userId: payload.userId,
      email: payload.email ?? 'test@example.com',
      displayName: payload.displayName ?? 'Test User',
    },
    TEST_JWT_SECRET,
    { expiresIn: '1d' }
  );

const authHeaderFor = (userId: string) => `Bearer ${signToken({ userId })}`;

describe('watchlist PUT endpoints', () => {
  const app = buildApp();
  const userId = 'user-1';
  const otherUserId = 'user-2';
  const showId = 'user-show-123'; // This is the user_shows.id in routes

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Common 401 - no token
  it('PUT /:id/provider - 401 when no token', async () => {
    const res = await request(app)
      .put(`/api/watchlist/${showId}/provider`)
      .send({ provider: { id: 8, name: 'Netflix', logo_path: '/p/netflix.png' } });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('PUT /:id/country - 401 when no token', async () => {
    const res = await request(app)
      .put(`/api/watchlist/${showId}/country`)
      .send({ countryCode: 'US' });

    expect(res.status).toBe(401);
  });

  it('PUT /:id/buffer - 401 when no token', async () => {
    const res = await request(app)
      .put(`/api/watchlist/${showId}/buffer`)
      .send({ bufferDays: 7 });

    expect(res.status).toBe(401);
  });

  // Validation errors (400)
  it('PUT /:id/provider - 400 for invalid provider payload', async () => {
    const res = await request(app)
      .put(`/api/watchlist/${showId}/provider`)
      .set('Authorization', authHeaderFor(userId))
      .send({ provider: { id: 1, name: 'X' } }); // missing logo_path

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid provider object');
    expect(mockWatchlistService.updateStreamingProvider).not.toHaveBeenCalled();
  });

  it('PUT /:id/country - 400 for invalid countryCode type', async () => {
    const res = await request(app)
      .put(`/api/watchlist/${showId}/country`)
      .set('Authorization', authHeaderFor(userId))
      .send({ countryCode: 123 }); // invalid

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid countryCode');
  });

  it('PUT /:id/buffer - 400 for invalid bufferDays', async () => {
    const res = await request(app)
      .put(`/api/watchlist/${showId}/buffer`)
      .set('Authorization', authHeaderFor(userId))
      .send({ bufferDays: -1 });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid bufferDays');
  });

  // Not found / access denied (404)
  it('PUT /:id/provider - 404 when service reports not found or access denied', async () => {
    mockWatchlistService.updateStreamingProvider.mockResolvedValue(false);
    const res = await request(app)
      .put(`/api/watchlist/${showId}/provider`)
      .set('Authorization', authHeaderFor(otherUserId))
      .send({ provider: { id: 8, name: 'Netflix', logo_path: '/p/netflix.png' } });

    expect(res.status).toBe(404);
  });

  it('PUT /:id/country - 404 when service reports not found or access denied', async () => {
    mockWatchlistService.updateCountryCode.mockResolvedValue(false);
    const res = await request(app)
      .put(`/api/watchlist/${showId}/country`)
      .set('Authorization', authHeaderFor(otherUserId))
      .send({ countryCode: 'AU' });

    expect(res.status).toBe(404);
  });

  it('PUT /:id/buffer - 404 when service reports not found or access denied', async () => {
    mockWatchlistService.updateBufferDays.mockResolvedValue(false);
    const res = await request(app)
      .put(`/api/watchlist/${showId}/buffer`)
      .set('Authorization', authHeaderFor(otherUserId))
      .send({ bufferDays: 3 });

    expect(res.status).toBe(404);
  });

  // Success cases (200)
  it('PUT /:id/provider - 200 and returns updated provider', async () => {
    mockWatchlistService.updateStreamingProvider.mockResolvedValue(true);
    const provider = { id: 9, name: 'Disney+', logo_path: '/p/dp.png' };

    const res = await request(app)
      .put(`/api/watchlist/${showId}/provider`)
      .set('Authorization', authHeaderFor(userId))
      .send({ provider });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.provider).toEqual(provider);
    expect(mockWatchlistService.updateStreamingProvider).toHaveBeenCalledWith(userId, showId, provider);
  });

  it('PUT /:id/country - 200 and returns updated countryCode', async () => {
    mockWatchlistService.updateCountryCode.mockResolvedValue(true);

    const res = await request(app)
      .put(`/api/watchlist/${showId}/country`)
      .set('Authorization', authHeaderFor(userId))
      .send({ countryCode: 'US' });

    expect(res.status).toBe(200);
    expect(res.body.data.countryCode).toBe('US');
    expect(mockWatchlistService.updateCountryCode).toHaveBeenCalledWith(userId, showId, 'US');
  });

  it('PUT /:id/buffer - 200 and returns updated bufferDays', async () => {
    mockWatchlistService.updateBufferDays.mockResolvedValue(true);

    const res = await request(app)
      .put(`/api/watchlist/${showId}/buffer`)
      .set('Authorization', authHeaderFor(userId))
      .send({ bufferDays: 5 });

    expect(res.status).toBe(200);
    expect(res.body.data.bufferDays).toBe(5);
    expect(mockWatchlistService.updateBufferDays).toHaveBeenCalledWith(userId, showId, 5);
  });
});

describe('watchlist GET :tmdbId/progress - fixed response shape', () => {
  const app = buildApp();
  const userId = 'user-1';

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset supabase/serviceSupabase FROM chains
    const sb = chain();
    const sbs = chain();
    supabaseFrom.mockReturnValue(sb);
    serviceSupabaseFrom.mockReturnValue(sbs);

    // Mock show lookup not found by tmdb -> creation path
    (supabaseFrom().select as any).mockReturnValue(supabaseFrom()); // chain continuity
    (supabaseFrom().eq as any).mockReturnValue(supabaseFrom());
    (supabaseFrom().single as any).mockResolvedValue({ data: null, error: { code: 'PGRST116' } });

    // Mock showService create and details
    mockShowService.getOrCreateShow.mockResolvedValue({ id: 'show-123' });

    mockShowService.getShowWithDetails.mockResolvedValue({
      show: { id: 'show-123', tmdb_id: 100, title: 'Mock Show' },
      seasons: [
        {
          id: 'season-1',
          show_id: 'show-123',
          season_number: 1,
          episodes: [
            { id: 'e1', season_id: 'season-1', tmdb_episode_id: 0, episode_number: 1, name: 'Ep1' },
            { id: 'e2', season_id: 'season-1', tmdb_episode_id: 0, episode_number: 2, name: 'Ep2' },
          ],
        },
        {
          id: 'season-2',
          show_id: 'show-123',
          season_number: 2,
          episodes: [
            { id: 'e3', season_id: 'season-2', tmdb_episode_id: 0, episode_number: 1, name: 'S2E1' },
          ],
        },
      ],
    });
  });

  it('returns seasons map when some episodes have progress', async () => {
    // serviceSupabase query for user_episode_progress
    const svc = serviceSupabaseFrom();
    (svc.select as any).mockReturnValue(svc);
    (svc.eq as any).mockReturnValue(svc);
    (svc.in as any).mockResolvedValue({
      data: [
        { episode_id: 'e1', state: 'watched' },
        { episode_id: 'e3', state: 'watching' },
      ],
      error: null,
    });

    const res = await request(app)
      .get(`/api/watchlist/999/progress`)
      .set('Authorization', authHeaderFor(userId));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Ensure new shape "data.seasons" exists and not legacy "data.showProgress"
    expect(res.body.data.seasons).toBeDefined();
    expect(res.body.data.showProgress).toBeUndefined();

    // Grouped structure check
    expect(res.body.data.seasons['1']).toEqual([{ episodeNumber: 1, status: 'watched' }]);
    expect(res.body.data.seasons['2']).toEqual([{ episodeNumber: 1, status: 'watching' }]);
  });

  it('returns empty seasons object when no progress rows', async () => {
    const svc = serviceSupabaseFrom();
    (svc.select as any).mockReturnValue(svc);
    (svc.eq as any).mockReturnValue(svc);
    (svc.in as any).mockResolvedValue({ data: [], error: null });

    const res = await request(app)
      .get(`/api/watchlist/100/progress`)
      .set('Authorization', authHeaderFor(userId));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.seasons).toEqual({});
  });

  it('401 when no auth', async () => {
    const res = await request(app).get(`/api/watchlist/100/progress`);
    expect(res.status).toBe(401);
  });

  it('400 for invalid tmdbId', async () => {
    const res = await request(app)
      .get(`/api/watchlist/not-a-number/progress`)
      .set('Authorization', authHeaderFor(userId));

    expect(res.status).toBe(400);
  });
});

// Additional cases appended by tests

describe('watchlist PUT /:id/provider - null provider clears value', () => {
  const app = (function build() {
    const expressApp = express();
    expressApp.use(express.json());
    expressApp.use('/api/watchlist', authenticateUser as any, watchlistV2Router);
    return expressApp;
  })();

  const userId = 'user-3';
  const showId = 'user-show-789';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('200 when setting provider to null', async () => {
    mockWatchlistService.updateStreamingProvider.mockResolvedValue(true);

    const res = await request(app)
      .put(`/api/watchlist/${showId}/provider`)
      .set('Authorization', `Bearer ${jwt.sign({ userId, email: 'x@test.dev', displayName: 'X' }, process.env.JWT_SECRET!, { expiresIn: '1d' })}`)
      .send({ provider: null });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.provider).toBeNull();
    expect(mockWatchlistService.updateStreamingProvider).toHaveBeenCalledWith(userId, showId, null);
  });
});