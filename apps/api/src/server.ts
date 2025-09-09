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
