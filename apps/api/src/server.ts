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
    'http://127.0.0.1:3002'
  ],
  credentials: true,
}));

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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
app.use('/api/plan', authenticateUser, planRouter);
app.use('/api/streaming-quota', authenticateUser, streamingQuotaRouter);
app.use('/api/usage-stats', authenticateUser, usageStatsRouter);

// New v4 protected API routes
app.use('/api/watchlist', authenticateUser, watchlistV2Router);
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
  paths: {
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
            description: 'Array of user shows',
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
          }
        }
      }
    },
    '/api/watchlist/:userShowId/provider': {
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
          }
        }
      }
    }
  },
  components: {
    schemas: {
      Provider: {
        type: 'object',
        required: ['id', 'name'],
        properties: {
          id: { type: 'integer', description: 'TMDB provider id (numeric)' },
          name: { type: 'string' },
          logo_url: { type: 'string', nullable: true }
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
      }
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
