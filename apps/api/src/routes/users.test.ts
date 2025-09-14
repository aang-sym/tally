import { describe, it, expect, afterAll, beforeAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

// Hoisted mocks to ensure ESM import of the router sees mocked supabase
const hoisted = vi.hoisted(() => {
  // Simple in-memory store for created user
  const store: {
    user?: {
      id: string;
      email: string;
      display_name: string;
      avatar_url: string | null;
      is_test_user: boolean;
      created_at: string;
    };
  } = {};

  // Track the current token's user id so inserts align with token-derived identity
  const state = {
    currentUserId: '' as string,
  };

  // Create a per-table query chain with minimal methods used by the route
  const mkChain = (table: string) => {
    const chain: any = {};
    chain._table = table;
    chain._filters = new Map<string, any[]>();

    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockImplementation((col: string, val: any) => {
      const arr = chain._filters.get(col) ?? [];
      arr.push(val);
      chain._filters.set(col, arr);
      return chain;
    });
    chain.single = vi.fn().mockImplementation(async () => {
      if (table === 'users') {
        // GET /users/:id/profile path queries users by id
        const idFilters = chain._filters.get('id');
        if (idFilters && idFilters.length > 0) {
          const id = idFilters[idFilters.length - 1];
          if (store.user && store.user.id === id) {
            const {
              id: uid,
              email,
              display_name,
              avatar_url,
              is_test_user,
              created_at,
            } = store.user;
            return {
              data: { id: uid, email, display_name, avatar_url, is_test_user, created_at },
              error: null,
            };
          }
          // Not found
          return { data: null, error: { message: 'User not found', code: 'PGRST116' } };
        }
        // Email uniqueness check path
        const emailFilters = chain._filters.get('email');
        if (emailFilters && emailFilters.length > 0) {
          const email = emailFilters[emailFilters.length - 1];
          if (store.user && store.user.email === email) {
            return { data: { id: store.user.id }, error: null };
          }
          return { data: null, error: { message: 'No rows', code: 'PGRST116' } };
        }
      }
      // Default
      return { data: null, error: null };
    });
    chain.insert = vi.fn().mockImplementation((rows: any[]) => {
      // For POST /users we insert test user; align id with token-derived ID contract
      const row = rows[0];
      // Force id to token-derived current user id if present
      const effectiveId = state.currentUserId || row.id;
      store.user = {
        id: effectiveId,
        email: row.email,
        display_name: row.display_name,
        avatar_url: row.avatar_url ?? null,
        is_test_user: !!row.is_test_user,
        created_at: row.created_at ?? new Date().toISOString(),
      };
      return chain;
    });
    chain.update = vi.fn().mockReturnValue(chain);
    chain.delete = vi.fn().mockReturnValue(chain);
    chain.order = vi.fn().mockReturnValue(chain);

    // Return shapes used by route code
    chain.select.mockReturnValue(chain);
    chain.single.mockResolvedValue({ data: null, error: null });

    // Terminal execution for select().eq().single() on different tables in GET /users/:id/profile
    chain.then = undefined; // not a Promise

    // After insert/select chains, route calls .select(...).single()
    chain.select.mockReturnValue(chain);
    chain.single.mockImplementation(async () => {
      if (table === 'users' && store.user) {
        // If called after insert().select(...).single()
        return {
          data: {
            id: store.user.id,
            email: store.user.email,
            display_name: store.user.display_name,
            avatar_url: store.user.avatar_url,
            created_at: store.user.created_at,
          },
          error: null,
        };
      }
      return { data: null, error: null };
    });

    // For GET /users/:id/profile stats queries
    chain.eq.mockImplementation((col: string, val: any) => {
      const arr = chain._filters.get(col) ?? [];
      arr.push(val);
      chain._filters.set(col, arr);
      return chain;
    });

    // Non-single select returns
    chain.then = undefined;
    chain.select.mockReturnValue(chain);

    return chain;
  };

  const from = vi.fn().mockImplementation((table: string) => {
    const chain = mkChain(table);
    // Provide table-specific non-single query responses
    if (table === 'user_shows') {
      chain.eq.mockReturnValue(chain);
      // Final await returns array
      return {
        ...chain,
        then: undefined,
        // When awaited without .single(), resolve to empty data
        // Vitest/route uses "const { data } = await supabase.from('user_shows').select(...).eq(...);"
        // Simulate that shape via manual unwrap helper below when needed
        async exec() {
          return { data: [], error: null };
        },
      };
    }
    if (table === 'user_streaming_subscriptions') {
      chain.eq.mockReturnValue(chain);
      return {
        ...chain,
        then: undefined,
        async exec() {
          return { data: [], error: null };
        },
      };
    }
    return chain;
  });

  const supabase = { from } as any;

  return { store, supabase, state };
});

// Mock supabase module before importing router
vi.mock('../db/supabase.js', () => {
  const { supabase } = hoisted;
  return {
    supabase,
    serviceSupabase: supabase,
    createUserClient: vi.fn(),
  };
});

// Now import router after mocks
import usersDbRouter from './users.js';
import { supabase } from '../db/supabase.js';

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
const tokenFor = (userId: string) => {
  // Ensure our mock DB aligns inserted id with the token's user id
  hoisted.state.currentUserId = userId;
  return jwt.sign({ userId, email: `${userId}@test.dev`, displayName: 'Tester' }, TEST_JWT_SECRET, {
    expiresIn: '1d',
  });
};

describe('GET /users/:id/profile', () => {
  beforeAll(() => {
    // Ensure JWT secret is configured for middleware
    process.env.JWT_SECRET = TEST_JWT_SECRET;
  });

  afterAll(async () => {
    // Clean up the user created during the test (mock always succeeds)
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
