/**
 * Smart Recommendations API Routes
 *
 * Handles intelligent subscription optimization recommendations,
 * cancellation suggestions, and subscription planning.
 */

import {
  Router,
  Request,
  Response,
  NextFunction,
  type RequestHandler,
  type Router as ExpressRouter,
} from 'express';
import { streamingService } from '../services/StreamingService.js';
import { WatchlistService } from '../services/WatchlistService.js';
import { ratingService } from '../services/RatingService.js';

// Augmented request type with userId set by authenticateUser
type AuthedRequest = Request & { userId: string };

// Middleware to extract userId (stub implementation)
const authenticateUser: RequestHandler = (req, _res, next) => {
  // TODO: Replace with proper JWT authentication
  const userId = (req.headers['x-user-id'] as string) || 'user-1';
  (req as AuthedRequest).userId = userId;
  next();
};


const router: ExpressRouter = Router();

router.use(authenticateUser);

// helper to create a per-request WatchlistService (supports bearer auth later)
const makeWatchlistService = (req: AuthedRequest) => {
  const auth = req.header('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : undefined;
  return new WatchlistService(token);
};

const ah = (
  handler: (req: AuthedRequest, res: Response, next: NextFunction) => Promise<void> | void
): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(handler(req as AuthedRequest, res, next)).catch(next);
  };
};

/**
 * GET /api/recommendations/cancel
 * Get subscription cancellation suggestions
 */
const cancelHandler: RequestHandler = ah(async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const analysis = await streamingService.getUserSubscriptionAnalysis(userId);
  const recommendations = analysis.services
    .filter(
      (service) =>
        service.watchingCount === 0 && service.watchlistCount === 0 && service.completedCount > 0
    )
    .map((service) => ({
      serviceId: service.service.id,
      serviceName: service.service.name,
      type: 'cancel' as const,
      reason: 'No active content - all shows completed',
      potentialSavings: { monthly: 15.99, annual: 191.88 },
      confidence: 0.9,
      showsCompleted: service.completedCount,
      nextContent: null,
      safeDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }));
  const pauseRecommendations = analysis.services
    .filter(
      (service) =>
        service.watchingCount === 0 && service.watchlistCount > 0 && service.watchlistCount <= 2
    )
    .map((service) => ({
      serviceId: service.service.id,
      serviceName: service.service.name,
      type: 'pause' as const,
      reason: `Only ${service.watchlistCount} show(s) in watchlist`,
      potentialSavings: { monthly: 15.99, shortTerm: 47.97 },
      confidence: 0.7,
      showsInWatchlist: service.watchlistCount,
      recommendation: "Consider pausing until you're ready to watch",
      resumeWhen: 'When you start watching your watchlist shows',
    }));
  const allRecommendations = [...recommendations, ...pauseRecommendations];
  res.json({
    success: true,
    data: {
      recommendations: allRecommendations,
      totalPotentialSavings: allRecommendations.reduce(
        (sum, rec) => sum + (rec.potentialSavings?.monthly || 0),
        0
      ),
      servicesAnalyzed: analysis.totalServices,
      timestamp: new Date().toISOString(),
    },
  });
});
router.get('/cancel', cancelHandler);

/**
 * GET /api/recommendations/subscribe
 * Get subscription recommendations (what to subscribe to next)
 */
const subscribeHandler: RequestHandler = ah(async (req, res) => {
  const userId = (req as AuthedRequest).userId;

  // Get user's watchlist to see what they want to watch
  const watchlist = await makeWatchlistService(req as AuthedRequest).getUserWatchlist(
    userId,
    'watchlist'
  );

  // Get user's rating preferences
  const preferences = await ratingService.getUserRatingPreferences(userId);

  // This would analyze user's watchlist and determine which services
  // have the most content they want to watch
  // For now, return a simplified recommendation

  const recommendations = [
    {
      serviceName: 'Netflix',
      priority: 'high',
      reason: 'Contains 3 shows from your watchlist',
      monthlyPrice: 15.99,
      shows: ['Stranger Things', 'The Crown', 'Ozark'],
      startDate: new Date().toISOString(),
      estimatedValue: 8.5,
      confidence: 0.85,
    },
    {
      serviceName: 'HBO Max',
      priority: 'medium',
      reason: 'High-rated shows matching your preferences',
      monthlyPrice: 14.99,
      shows: ['House of the Dragon', 'The Last of Us'],
      startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      estimatedValue: 7.8,
      confidence: 0.72,
    },
  ];

  res.json({
    success: true,
    data: {
      recommendations,
      userPreferences: {
        averageRatingThreshold: preferences.averageRatingThreshold,
        isGenerousRater: preferences.ratingTrends.isGenerousRater,
      },
      watchlistAnalysis: {
        totalShows: watchlist.length,
        servicesNeeded: recommendations.length,
      },
      timestamp: new Date().toISOString(),
    },
  });
});
router.get('/subscribe', subscribeHandler);

/**
 * GET /api/recommendations/optimization
 * Get full subscription optimization plan
 */
const optimizationHandler: RequestHandler = ah(async (req, res) => {
  const userId = (req as AuthedRequest).userId;

  // Get user's current subscriptions analysis
  const currentAnalysis = await streamingService.getUserSubscriptionAnalysis(userId);

  // Get watchlist stats
  const watchlistStats = await makeWatchlistService(req as AuthedRequest).getUserWatchlistStats(
    userId
  );

  // Generate optimization plan
  const currentMonthlyCost = currentAnalysis.services.length * 15.99; // Simplified

  const optimizationPlan = {
    currentSituation: {
      activeServices: currentAnalysis.services.length,
      monthlyCost: currentMonthlyCost,
      annualCost: currentMonthlyCost * 12,
      utilization: {
        watching: watchlistStats.byStatus.watching,
        watchlist: watchlistStats.byStatus.watchlist,
        completed: watchlistStats.byStatus.completed,
      },
    },
    optimizedPlan: {
      recommendedServices: Math.max(1, currentAnalysis.services.length - 1),
      estimatedMonthlyCost: Math.max(15.99, currentMonthlyCost - 15.99),
      estimatedAnnualSavings: Math.min(191.88, (currentMonthlyCost - 15.99) * 12),
      actions: [
        ...currentAnalysis.recommendedCancellations.map((service) => ({
          action: 'cancel' as const,
          service,
          timing: 'immediate',
          reason: 'No active content',
        })),
        {
          action: 'rotate' as const,
          explanation: 'Subscribe to services only when needed',
          estimatedSavings: 47.97,
        },
      ],
    },
    timeline: [
      {
        month: 1,
        action: 'Cancel unused subscriptions',
        savings: 15.99,
        reasoning: 'Remove services with no active content',
      },
      {
        month: 2,
        action: 'Continue with reduced services',
        savings: 15.99,
        reasoning: "Focus on shows you're actively watching",
      },
      {
        month: 3,
        action: 'Evaluate and rotate if needed',
        savings: 0,
        reasoning: 'Assess if new content requires additional services',
      },
    ],
  };

  res.json({
    success: true,
    data: optimizationPlan,
  });
});
router.get('/optimization', optimizationHandler);

/**
 * GET /api/recommendations/calendar
 * Get calendar-based subscription recommendations
 */
const calendarHandler: RequestHandler = ah(async (req, res) => {
  const months = parseInt(req.query.months as string) || 6;

  // Generate calendar recommendations for the next N months
  const calendarRecommendations: Array<{
    month: string;
    monthName: string;
    recommendations: Array<{
      action: 'keep' | 'subscribe' | 'pause';
      service: string;
      reason: string;
      shows: string[];
      cost: number;
    }>;
    totalMonthlyCost: number;
    savings: number;
  }> = [];

  const currentDate = new Date();
  for (let i = 0; i < months; i++) {
    const month = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);

    // This would analyze premieres, user's watchlist timing, etc.
    calendarRecommendations.push({
      month: month.toISOString(),
      monthName: month.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
      recommendations: [
        {
          action: i === 0 ? 'keep' : i % 2 === 0 ? 'subscribe' : 'pause',
          service: 'Netflix',
          reason:
            i === 0
              ? 'Currently watching shows'
              : i % 2 === 0
                ? 'New season premieres'
                : 'No new content',
          shows: i === 0 ? ['Ongoing shows'] : i % 2 === 0 ? ['New season starts'] : [],
          cost: i % 2 === 0 ? 15.99 : 0,
        },
      ],
      totalMonthlyCost: i % 2 === 0 ? 31.98 : 15.99,
      savings: i % 2 === 1 ? 15.99 : 0,
    });
  }

  const totalSavings = calendarRecommendations.reduce((sum, month) => sum + month.savings, 0);

  res.json({
    success: true,
    data: {
      calendar: calendarRecommendations,
      summary: {
        totalMonths: months,
        estimatedSavings: totalSavings,
        averageMonthlyCost:
          calendarRecommendations.reduce((sum, month) => sum + month.totalMonthlyCost, 0) / months,
      },
      timestamp: new Date().toISOString(),
    },
  });
});
router.get('/calendar', calendarHandler);

/**
 * POST /api/recommendations/feedback
 * Provide feedback on recommendations to improve future suggestions
 *
 * Body: {
 *   recommendationId: string,
 *   action: 'accepted' | 'rejected' | 'modified',
 *   feedback?: string
 * }
 */
const feedbackHandler: RequestHandler = ah(async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const { recommendationId, action, feedback } = req.body;

  if (!recommendationId || !['accepted', 'rejected', 'modified'].includes(action)) {
    res.status(400).json({
      success: false,
      error: 'Valid recommendationId and action (accepted/rejected/modified) required',
    });
    return;
  }

  // Store feedback for improving recommendations
  // This would go to a feedback table in the database
  console.log(`User ${userId} provided feedback:`, {
    recommendationId,
    action,
    feedback,
    timestamp: new Date().toISOString(),
  });

  res.json({
    success: true,
    data: {
      message: 'Feedback recorded successfully',
      recommendationId,
      action,
    },
  });
});
router.post('/feedback', feedbackHandler);

/**
 * GET /api/recommendations/savings-simulator
 * Simulate potential savings with different strategies
 */
const savingsHandler: RequestHandler = ah(async (req, res) => {
  const strategies = [
    {
      name: 'Aggressive Optimization',
      description: 'Cancel all unused services immediately',
      monthlySavings: 47.97,
      annualSavings: 575.64,
      riskLevel: 'low',
      effort: 'minimal',
    },
    {
      name: 'Rotation Strategy',
      description: 'Subscribe only when actively watching',
      monthlySavings: 23.98,
      annualSavings: 287.76,
      riskLevel: 'minimal',
      effort: 'moderate',
    },
    {
      name: 'Bundle Consolidation',
      description: 'Switch to service bundles',
      monthlySavings: 15.99,
      annualSavings: 191.88,
      riskLevel: 'minimal',
      effort: 'low',
    },
  ];

  res.json({
    success: true,
    data: {
      strategies,
      recommendations: {
        topStrategy: strategies[0],
        balancedStrategy: strategies[1],
      },
      timestamp: new Date().toISOString(),
    },
  });
});
router.get('/savings-simulator', savingsHandler);

export default router;
