import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { authRouter } from './routes/auth.js';
import { waitlistRouter } from './routes/waitlist.js';
// Removed old watchlist router - using v2 instead
import { planRouter } from './routes/plan.js';
import { healthRouter } from './routes/health.js';
import { streamingQuotaRouter } from './routes/streaming-quota.js';
import { showsRouter } from './routes/shows.js';
import { tmdbRouter } from './routes/tmdb.js';
import { usageStatsRouter } from './routes/usage-stats.js';
// New v4 routes
import watchlistV2Router from './routes/watchlist.js';
import progressRouter from './routes/progress.js';
import ratingsRouter from './routes/ratings.js';
import recommendationsRouter from './routes/recommendations.js';
import dbAdminRouter from './routes/db-admin.js';
import usersDbRouter from './routes/users.js';
import streamingServicesRouter from './routes/streaming-services.js';
import tvGuideRouter from './routes/tv-guide.js';
import { errorHandler } from './middleware/errorHandler.js';
import { trackAPIUsage } from './middleware/usage-tracker.js';
import { config } from './config/index.js';
import { quotaTracker } from './services/quota-tracker.js';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

function getSupabaseForRequest(req: any) {
  const url = process.env.SUPABASE_URL as string | undefined;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY as string | undefined;
  if (!url || !serviceKey) {
    const parts = [!url ? 'SUPABASE_URL' : null, !serviceKey ? 'SUPABASE_SERVICE_KEY' : null].filter(Boolean).join(', ');
    throw new Error(`Supabase env missing: ${parts}. Ensure these are set in apps/api/.env`);
  }
  
  // Check if we have a validated user from the authenticateUser middleware
  const userId = req.userId || req.user?.id;
  const hasAuth = Boolean(userId);
  
  console.log('[SUPA][client] building per-request client', { hasAuth, userId: userId ? `${userId.substring(0, 8)}...` : null });
  
  // For authenticated users, we'll use the service key to bypass RLS and manually filter by user_id
  // This is necessary because we use custom JWTs, not Supabase-issued tokens
  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false },
    db: { schema: 'public' },
    global: {
      headers: {
        // Preserve debugging info
        ...(req.headers?.authorization ? { 'x-original-auth': req.headers.authorization } : {}),
        ...(userId ? { 'x-user-id': userId } : {})
      }
    }
  });
}


const app = express();
// Prevent 304s on dynamic endpoints (Express enables ETag by default)
app.set('etag', false);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    config.frontendUrl,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3002',
    'http://127.0.0.1:3002',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
  ],
  credentials: true,
}));

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Normalize Supabase auth headers: if the client sends only x-supabase-access-token,
// synthesize the standard Authorization: Bearer <token> header so downstream
// Supabase clients pick it up for RLS.
app.use((req, _res, next) => {
  const existingAuth = req.headers?.authorization;
  const xTokenHeader = req.headers['x-supabase-access-token'];
  const xToken = Array.isArray(xTokenHeader) ? xTokenHeader[0] : xTokenHeader;
  if (!existingAuth && typeof xToken === 'string' && xToken.trim()) {
    req.headers.authorization = `Bearer ${xToken.trim()}`;
    if (process.env.NODE_ENV !== 'production') {
      console.log('[AUTH][normalize] synthesized Authorization from x-supabase-access-token');
    }
  }
  next();
});

// Prevent caching on dynamic watchlist responses
app.use('/api/watchlist', (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// Import authentication middleware
import { authenticateUser, optionalAuth } from './middleware/user-identity.js';

// Routes that don't require authentication
app.use('/api/auth', authRouter); // Already handles auth internally
app.use('/api/waitlist', waitlistRouter);
app.use('/api/health', healthRouter);

// Public routes (don't require auth but can use it if provided)
app.use('/api/shows', optionalAuth, showsRouter);
app.use('/api/tmdb', optionalAuth, trackAPIUsage('tmdb'), tmdbRouter);
app.use('/api/streaming-services', optionalAuth, streamingServicesRouter);
app.use('/api/tv-guide', optionalAuth, tvGuideRouter);

// Protected routes (require authentication)
// Old watchlist route removed - use /api/watchlist instead

// Explicit rating endpoint to avoid PGRST301 issues
app.put('/api/watchlist/:userShowId/rating', authenticateUser, async (req, res) => {
  try {
    const supaRead = getSupabaseForRequest(req);
    const supaWrite = getSupabaseForRequest(req); // Use regular client for writes to get data back
    const userId = (req as any).user?.id as string | undefined;
    const { userShowId } = req.params as { userShowId: string };
    const { rating } = req.body as { rating?: number };

    // Diagnostics to line up front/back ids
    console.log('[RATE] incoming', {
      userId: userId ? `${userId.substring(0, 8)}...` : null,
      userShowId,
      rating,
      ts: new Date().toISOString(),
    });

    if (!userId) {
      console.error('[RATE] No userId found in request');
      return res.status(401).json({ success: false, error: 'Unauthorized - no user ID' });
    }

    // Validate rating: must be a number, finite, 0-10 range, and in 0.5 increments
    if (typeof rating !== 'number' || 
        !Number.isFinite(rating) || 
        rating < 0 || 
        rating > 10 || 
        (rating * 2) % 1 !== 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid rating (0-10 in 0.5 increments, e.g., 0, 0.5, 1, 1.5, ..., 10)' 
      });
    }

    // ==== Verification that user owns this user_show ====
    const ownership = await supaRead
      .from('user_shows')
      .select('id,user_id,show_rating', { count: 'exact' })
      .eq('id', userShowId)
      .eq('user_id', userId)
      .limit(1);

    if (ownership.error) {
      console.error('[RATE][ownership] error', ownership.error);
      return res.status(400).json({ success: false, error: 'Failed to verify ownership' });
    }

    if (!ownership.data || ownership.data.length === 0) {
      console.warn('[RATE][ownership] user_show not found or not owned', { userShowId, userId: `${userId.substring(0, 8)}...` });
      return res.status(404).json({ success: false, error: 'Show not found or not owned by user' });
    }

    console.log('[RATE][ownership] verified, current rating:', ownership.data[0]?.show_rating);

    // === Direct UPDATE via PostgREST with service key (bypasses RLS) ===
    try {
      // Since we're using service key, we must explicitly filter by user_id for security
      const upd = await supaWrite
        .from('user_shows')
        .update({ 
          show_rating: rating,
          updated_at: new Date().toISOString()
        })
        .eq('id', userShowId)
        .eq('user_id', userId) // Critical: must include user_id filter when using service key
        .select('id, user_id, show_rating')
        .limit(1);

      if (upd.error) {
        console.error('[RATE][update] error', {
          code: upd.error.code,
          message: upd.error.message,
          details: upd.error.details,
          hint: upd.error.hint,
        });

        return res.status(400).json({ success: false, error: upd.error.message || 'Update failed' });
      }

      const row = Array.isArray(upd.data) ? upd.data[0] : upd.data;
      if (!row) {
        console.warn('[RATE][update] no row returned after update', { userShowId, userId: `${userId.substring(0, 8)}...` });
        return res.status(404).json({ success: false, error: 'Show not found or not owned' });
      }

      console.log('[RATE][update] success', { 
        id: row.id, 
        old_rating: ownership.data[0]?.show_rating, 
        new_rating: row.show_rating 
      });

      return res.json({ success: true, data: { id: row.id, show_rating: row.show_rating } });
    } catch (e: any) {
      console.error('[RATE][update] threw', e);
      return res.status(500).json({ success: false, error: 'Update invocation failed' });
    }
  } catch (e: any) {
    console.error('Unhandled error in PUT /api/watchlist/:userShowId/rating', e);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// === Temporary debug route for user_shows deep diagnostics ===
app.get('/api/debug/user-shows/:id', authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user?.id as string;
    const { id } = req.params as { id: string };
    const supaRead = getSupabaseForRequest(req);

    const probePk = await supaRead
      .from('user_shows')
      .select('id,user_id,show_rating', { count: 'exact' })
      .eq('id', id)
      .limit(2);

    const probePkAndUser = await supaRead
      .from('user_shows')
      .select('id,user_id', { count: 'exact' })
      .eq('id', id)
      .eq('user_id', userId)
      .limit(2);

    const probeCols = await supaRead
      .from('user_shows')
      .select('id,user_id,show_id,show_rating,updated_at')
      .eq('id', id)
      .limit(1);

    return res.json({
      userId,
      idLooksUuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id),
      probePk: { count: probePk.count, data: probePk.data, error: probePk.error },
      probePkAndUser: { count: probePkAndUser.count, data: probePkAndUser.data, error: probePkAndUser.error },
      probeCols: { data: probeCols.data, error: probeCols.error },
    });
  } catch (e: any) {
    console.error('[DEBUG user-shows] error', e);
    return res.status(500).json({ error: e?.message || 'debug error' });
  }
});

app.use('/api/watchlist', authenticateUser, watchlistV2Router);
app.use('/api/plan', authenticateUser, planRouter);
app.use('/api/streaming-quota', authenticateUser, streamingQuotaRouter);
app.use('/api/usage-stats', authenticateUser, usageStatsRouter);

// New v4 protected API routes
app.use('/api/progress', authenticateUser, progressRouter);
app.use('/api/ratings', authenticateUser, ratingsRouter);
app.use('/api/recommendations', authenticateUser, recommendationsRouter);

// Users route - mix of public (signup/login) and protected endpoints
app.use('/api/users', usersDbRouter); // Handles auth internally per endpoint

// Admin routes (require authentication)
app.use('/api/admin', authenticateUser, dbAdminRouter);

// --- OpenAPI quickstart: minimal spec + docs ---
// Gives us a live contract surface we can refine incrementally.

const openapiDoc = {
  openapi: '3.0.3',
  info: {
    title: 'Tally API',
    version: '0.1.0',
    description:
      'Minimal OpenAPI surface for watchlist v2. Expand with real schemas per route as we iterate.'
  },
  servers: [
    { url: process.env.API_PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? 4000}` }
  ],
  security: [
    { bearerAuth: [] }
  ],
  paths: {
    '/api/health': {
      get: {
        summary: 'Health check endpoint',
        tags: ['system'],
        security: [],
        responses: {
          '200': {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['ok', 'timestamp'],
                  properties: {
                    ok: { type: 'boolean', example: true },
                    timestamp: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/watchlist': {
      get: {
        summary: 'List user shows with progress',
        tags: ['watchlist'],
        parameters: [
          {
            name: 'country',
            in: 'query',
            required: false,
            schema: { type: 'string', minLength: 2, maxLength: 2 },
            description: 'ISO country code (e.g., AU) used for availability/provider context.'
          },
          {
            name: 'status',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['watchlist', 'watching', 'completed'] },
            description: 'Filter by status. If omitted, returns all.'
          }
        ],
        responses: {
          '200': {
            description: 'Object with count and shows',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    count: { type: 'integer' },
                    shows: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/UserShowCard' }
                    }
                  },
                  required: ['shows']
                }
              }
            }
          },
          '401': {
            description: 'Missing or invalid JWT token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          '403': {
            description: 'RLS policy denied access',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/api/watchlist/stats': {
      get: {
        summary: 'Watchlist aggregate stats',
        tags: ['watchlist'],
        responses: {
          '200': {
            description: 'Aggregated stats for the user\'s watchlist',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['totalShows', 'byStatus', 'averageRating'],
                  properties: {
                    totalShows: { type: 'integer' },
                    byStatus: {
                      type: 'object',
                      required: ['watchlist', 'watching', 'completed', 'dropped'],
                      properties: {
                        watchlist: { type: 'integer' },
                        watching: { type: 'integer' },
                        completed: { type: 'integer' },
                        dropped: { type: 'integer' }
                      }
                    },
                    averageRating: { type: 'number' }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Missing or invalid JWT token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          '403': {
            description: 'RLS policy denied access',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/api/watchlist/{userShowId}/provider': {
      put: {
        summary: 'Set selected streaming provider for a user_show',
        tags: ['watchlist'],
        parameters: [
          {
            name: 'userShowId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SetProviderRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Updated provider echo',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Provider' }
              }
            }
          },
          '400': {
            description: 'Invalid request data',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          '401': {
            description: 'Missing or invalid JWT token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          '403': {
            description: 'RLS policy denied access',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          '404': {
            description: 'User show not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/api/watchlist/{userShowId}/status': {
      put: {
        summary: 'Update user show status',
        tags: ['watchlist'],
        parameters: [
          { name: 'userShowId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateStatusRequest' } } }
        },
        responses: {
          '200': {
            description: 'Status updated',
            content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' } } } } }
          },
          '400': {
            description: 'Invalid request data',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          '401': {
            description: 'Missing or invalid JWT token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          '403': {
            description: 'RLS policy denied access',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          '404': {
            description: 'User show not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/api/watchlist/{userShowId}/rating': {
      put: {
        summary: 'Rate a user show',
        tags: ['watchlist'],
        parameters: [
          { name: 'userShowId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateRatingRequest' } } }
        },
        responses: {
          '200': {
            description: 'Rating updated',
            content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' } } } } }
          },
          '400': {
            description: 'Invalid request data',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          '401': {
            description: 'Missing or invalid JWT token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          '403': {
            description: 'RLS policy denied access',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          '404': {
            description: 'User show not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/api/watchlist/{tmdbId}/progress': {
      put: {
        summary: 'Update progress for a TMDB show id',
        tags: ['watchlist'],
        parameters: [
          { name: 'tmdbId', in: 'path', required: true, schema: { type: 'integer' } }
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ProgressUpdateRequest' } } }
        },
        responses: {
          '200': {
            description: 'Progress updated',
            content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' } } } } }
          },
          '400': {
            description: 'Invalid request data',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          '401': {
            description: 'Missing or invalid JWT token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          '403': {
            description: 'RLS policy denied access',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          '404': {
            description: 'User show not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['success', 'error'],
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string' },
          details: { type: 'string' }
        }
      },
      Provider: {
        type: 'object',
        required: ['id', 'name'],
        properties: {
          id: { type: 'integer', description: 'TMDB provider id (numeric)' },
          name: { type: 'string' },
          logo_path: { type: 'string', nullable: true }
        }
      },
      Progress: {
        type: 'object',
        properties: {
          watched_eps: { type: 'integer', minimum: 0 },
          total_eps: { type: 'integer', minimum: 0 },
          watched_eps_latest: { type: 'integer', minimum: 0 },
          total_eps_latest: { type: 'integer', minimum: 0 }
        }
      },
      UserShowCard: {
        type: 'object',
        required: ['user_show_id', 'show_id', 'title'],
        properties: {
          user_show_id: { type: 'string', format: 'uuid' },
          show_id: { type: 'string', format: 'uuid' },
          tmdb_id: { type: 'integer' },
          title: { type: 'string' },
          country_code: { type: 'string', nullable: true },
          streaming_provider: { $ref: '#/components/schemas/Provider' },
          progress: { $ref: '#/components/schemas/Progress' }
        }
      },
      SetProviderRequest: {
        type: 'object',
        required: ['provider'],
        properties: {
          provider: { $ref: '#/components/schemas/Provider' },
          country: { type: 'string', nullable: true, minLength: 2, maxLength: 2 }
        }
      },
      UpdateStatusRequest: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['watchlist', 'watching', 'completed'] }
        }
      },
      UpdateRatingRequest: {
        type: 'object',
        required: ['rating'],
        properties: {
          rating: { type: 'number', minimum: 0, maximum: 10, multipleOf: 0.5 }
        }
      },
      ProgressUpdateRequest: {
        type: 'object',
        properties: {
          state: { type: 'string', enum: ['watched', 'unwatched'] },
          progress: { type: 'integer', minimum: 0, maximum: 100 },
          started_watching_at: { type: 'string', format: 'date-time' },
          watched_at: { type: 'string', format: 'date-time' }
        }
      },
    }
  }
} as const;

// Serve the raw spec
app.get('/openapi.json', (_req, res) => {
  res.setHeader('cache-control', 'no-store');
  res.json(openapiDoc);
});

// Simple Redoc UI (no extra deps)
app.get('/docs', (_req, res) => {
  res.setHeader('content-type', 'text/html');
  res.send(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8"/>
    <title>Tally API Docs</title>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <style>html,body{height:100%;margin:0} .container{height:100vh}</style>
  </head>
  <body>
    <div class="container">
      <redoc spec-url="/openapi.json"></redoc>
    </div>
    <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
  </body>
</html>`);
});
// --- /OpenAPI quickstart ---

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Error handling middleware
app.use(errorHandler);

app.listen(config.port, async () => {
  console.log(`🚀 Tally API server running on port ${config.port}`);
  console.log(`📊 Health check: http://localhost:${config.port}/api/health`);
  console.log(`🗄️ Supabase URL env: ${process.env.SUPABASE_URL ? 'set' : 'MISSING'}`);
  console.log(`🗝️ Supabase ANON KEY env: ${process.env.SUPABASE_API_KEY ? 'set' : 'MISSING'}`);

  // Log configuration status
  const hasApiKey = config.streamingAvailabilityApiKey !== 'dev-key-placeholder';
  console.log(`🎬 Streaming Availability API: ${hasApiKey ? 'Configured' : 'Not configured (using dev mode)'}`);

  if (config.streamingApiDevMode) {
    console.log(`🔧 Streaming API Dev Mode: ENABLED (API calls will be mocked)`);
  }

  // Log quota status
  try {
    const stats = await quotaTracker.getUsageStats();
    console.log(`📈 API Quota: ${stats.callsUsed}/${stats.limit} calls used this month (${stats.percentUsed.toFixed(1)}%)`);

    const isLowQuota = await quotaTracker.shouldWarnLowQuota();
    if (isLowQuota && !config.streamingApiDevMode) {
      console.warn(`⚠️  API quota is running low! Only ${stats.callsRemaining} calls remaining.`);
    }
  } catch (error) {
    console.log(`📈 API Quota: Unable to load quota data`);
  }

  console.log(`🔍 Quota monitoring: http://localhost:${config.port}/api/streaming-quota`);
});
