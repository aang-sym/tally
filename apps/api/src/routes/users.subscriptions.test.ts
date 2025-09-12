import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

// Use hoisted storage for values referenced by vi.mock factories
const hoisted = vi.hoisted(() => {
  const mkChain = () => {
    const q: any = {};
    q.select = vi.fn().mockReturnValue(q);
    q.eq = vi.fn().mockReturnValue(q);
    q.order = vi.fn().mockReturnValue(q);
    q.single = vi.fn();
    return q;
  };
  const serviceFrom = vi.fn();
  const serviceSupabase = { from: serviceFrom };
  return { mkChain, serviceFrom, serviceSupabase };
});

// Mock supabase module before importing router to avoid real env usage
vi.mock('../db/supabase.js', () => {
  const { serviceSupabase } = hoisted;
  return {
    supabase: {} as any,
    serviceSupabase,
    createUserClient: vi.fn(),
  };
});

// Now import after mocks
import usersRouter from './users.js';

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/users', usersRouter);
  return app;
};

const TEST_JWT_SECRET = 'tally_super_secret_jwt_key_2025_production_ready_secure_token_12345';
let jwt: typeof import('jsonwebtoken');

beforeAll(async () => {
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  jwt = await import('jsonwebtoken');
});

beforeEach(() => {
  vi.clearAllMocks();
});

const tokenFor = (userId: string) =>
  jwt.sign({ userId, email: `${userId}@test.dev`, displayName: 'Tester' }, TEST_JWT_SECRET, {
    expiresIn: '1d',
  });

describe('GET /api/users/:id/subscriptions', () => {
  const app = buildApp();

  it('403 when requesting another user subscriptions', async () => {
    const me = 'user-a';
    const other = 'user-b';
    const res = await request(app)
      .get(`/api/users/${other}/subscriptions`)
      .set('Authorization', `Bearer ${tokenFor(me)}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('200 success, empty list when user has no subscriptions', async () => {
    const me = 'user-a';
    const chain = hoisted.mkChain();
    hoisted.serviceFrom.mockReturnValue(chain);
    chain.order.mockResolvedValue({ data: [], error: null });

    const res = await request(app)
      .get(`/api/users/${me}/subscriptions`)
      .set('Authorization', `Bearer ${tokenFor(me)}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.subscriptions).toEqual([]);
    expect(res.body.data.totalActive).toBe(0);
  });

  it('200 success, multiple subscriptions mapped with nested service', async () => {
    const me = 'user-a';
    const chain = hoisted.mkChain();
    hoisted.serviceFrom.mockReturnValue(chain);

    const rows = [
      {
        id: 'sub-1',
        service_id: 'netflix',
        monthly_cost: 16.99,
        is_active: true,
        started_date: '2024-01-01',
        ended_date: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        streaming_services: [
          {
            id: 'netflix',
            name: 'Netflix',
            logo_path: '/n.png',
            base_url: 'https://netflix.com',
            country_code: 'US',
          },
        ],
      },
      {
        id: 'sub-2',
        service_id: 'disney',
        monthly_cost: 13.99,
        is_active: false,
        started_date: '2024-02-01',
        ended_date: '2024-03-01',
        created_at: '2024-02-01T00:00:00Z',
        updated_at: '2024-03-01T00:00:00Z',
        streaming_services: {
          id: 'disney',
          name: 'Disney+',
          logo_path: '/d.png',
          base_url: 'https://disneyplus.com',
          country_code: 'US',
        },
      },
    ];
    chain.order.mockResolvedValue({ data: rows, error: null });

    const res = await request(app)
      .get(`/api/users/${me}/subscriptions`)
      .set('Authorization', `Bearer ${tokenFor(me)}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const subs = res.body.data.subscriptions;
    expect(Array.isArray(subs)).toBe(true);
    expect(subs.length).toBe(2);

    expect(hoisted.serviceFrom).toHaveBeenCalledWith('user_streaming_subscriptions');
    expect(chain.eq).toHaveBeenCalledWith('user_id', me);

    expect(subs[0].service.name).toBe('Netflix');
    expect(res.body.data.totalActive).toBe(1);
  });

  it('no 500s: database error translates to 500 but not crash', async () => {
    const me = 'user-a';
    const chain = hoisted.mkChain();
    hoisted.serviceFrom.mockReturnValue(chain);
    chain.order.mockResolvedValue({ data: null, error: { message: 'db down' } });

    const res = await request(app)
      .get(`/api/users/${me}/subscriptions`)
      .set('Authorization', `Bearer ${tokenFor(me)}`);

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Failed to retrieve user subscriptions');
  });
});
