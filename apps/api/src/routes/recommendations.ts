/**
 * Smart Recommendations API Routes
 * 
 * Handles intelligent subscription optimization recommendations,
 * cancellation suggestions, and subscription planning.
 */

import { Router, Request, Response } from 'express';
import { streamingService } from '../services/StreamingService.js';
import { watchlistService } from '../services/WatchlistService.js';
import { ratingService } from '../services/RatingService.js';

const router = Router();

// Middleware to extract userId (stub implementation)
const authenticateUser = (req: Request, res: Response, next: any) => {
  // TODO: Replace with proper JWT authentication
  const userId = req.headers['x-user-id'] as string || 'user-1';
  (req as any).userId = userId;
  next();
};

router.use(authenticateUser);

/**
 * GET /api/recommendations/cancel
 * Get subscription cancellation suggestions
 */
router.get('/cancel', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    // Get user's subscription analysis
    const analysis = await streamingService.getUserSubscriptionAnalysis(userId);

    // Generate cancellation recommendations
    const recommendations = analysis.services
      .filter(service => {
        // Suggest cancellation if:
        // - No currently watching shows
        // - No watchlist shows
        // - Only completed shows
        return service.watchingCount === 0 && 
               service.watchlistCount === 0 &&
               service.completedCount > 0;
      })
      .map(service => ({
        serviceId: service.service.id,
        serviceName: service.service.name,
        type: 'cancel' as const,
        reason: 'No active content - all shows completed',
        potentialSavings: {
          monthly: 15.99, // Would calculate based on service pricing
          annual: 191.88
        },
        confidence: 0.9,
        showsCompleted: service.completedCount,
        nextContent: null, // Would check for upcoming premieres
        safeDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 1 week from now
      }));

    // Add pause recommendations for services with only watchlist content
    const pauseRecommendations = analysis.services
      .filter(service => {
        return service.watchingCount === 0 && 
               service.watchlistCount > 0 &&
               service.watchlistCount <= 2; // Few watchlist shows
      })
      .map(service => ({
        serviceId: service.service.id,
        serviceName: service.service.name,
        type: 'pause' as const,
        reason: `Only ${service.watchlistCount} show(s) in watchlist`,
        potentialSavings: {
          monthly: 15.99,
          shortTerm: 47.97 // 3 months
        },
        confidence: 0.7,
        showsInWatchlist: service.watchlistCount,
        recommendation: 'Consider pausing until you\'re ready to watch',
        resumeWhen: 'When you start watching your watchlist shows'
      }));

    const allRecommendations = [...recommendations, ...pauseRecommendations];

    res.json({
      success: true,
      data: {
        recommendations: allRecommendations,
        totalPotentialSavings: allRecommendations.reduce((sum, rec) => 
          sum + (rec.potentialSavings?.monthly || 0), 0
        ),
        servicesAnalyzed: analysis.totalServices,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Failed to get cancellation recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate cancellation recommendations'
    });
  }
});

/**
 * GET /api/recommendations/subscribe
 * Get subscription recommendations (what to subscribe to next)
 */
router.get('/subscribe', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    // Get user's watchlist to see what they want to watch
    const watchlist = await watchlistService.getUserWatchlist(userId, 'watchlist');

    // Get user's rating preferences
    const preferences = await ratingService.getUserRatingPreferences(userId);

    // Analyze which services have the most content the user wants
    const serviceRecommendations = new Map<string, {
      serviceName: string;
      showCount: number;
      highRatedShows: number;
      totalCost: number;
      shows: string[];
    }>();

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
        confidence: 0.85
      },
      {
        serviceName: 'HBO Max',
        priority: 'medium',
        reason: 'High-rated shows matching your preferences',
        monthlyPrice: 14.99,
        shows: ['House of the Dragon', 'The Last of Us'],
        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        estimatedValue: 7.8,
        confidence: 0.72
      }
    ];

    res.json({
      success: true,
      data: {
        recommendations,
        userPreferences: {
          averageRatingThreshold: preferences.averageRatingThreshold,
          isGenerousRater: preferences.ratingTrends.isGenerousRater
        },
        watchlistAnalysis: {
          totalShows: watchlist.length,
          servicesNeeded: recommendations.length
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Failed to get subscription recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate subscription recommendations'
    });
  }
});

/**
 * GET /api/recommendations/optimization
 * Get full subscription optimization plan
 */
router.get('/optimization', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    // Get user's current subscriptions analysis
    const currentAnalysis = await streamingService.getUserSubscriptionAnalysis(userId);
    
    // Get watchlist stats
    const watchlistStats = await watchlistService.getUserWatchlistStats(userId);

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
          completed: watchlistStats.byStatus.completed
        }
      },
      optimizedPlan: {
        recommendedServices: Math.max(1, currentAnalysis.services.length - 1),
        estimatedMonthlyCost: Math.max(15.99, currentMonthlyCost - 15.99),
        estimatedAnnualSavings: Math.min(191.88, (currentMonthlyCost - 15.99) * 12),
        actions: [
          ...currentAnalysis.recommendedCancellations.map(service => ({
            action: 'cancel',
            service,
            timing: 'immediate',
            reason: 'No active content'
          })),
          {
            action: 'rotate',
            explanation: 'Subscribe to services only when needed',
            estimatedSavings: 47.97
          }
        ]
      },
      timeline: [
        {
          month: 1,
          action: 'Cancel unused subscriptions',
          savings: 15.99,
          reasoning: 'Remove services with no active content'
        },
        {
          month: 2,
          action: 'Continue with reduced services',
          savings: 15.99,
          reasoning: 'Focus on shows you\'re actively watching'
        },
        {
          month: 3,
          action: 'Evaluate and rotate if needed',
          savings: 0,
          reasoning: 'Assess if new content requires additional services'
        }
      ]
    };

    res.json({
      success: true,
      data: optimizationPlan
    });
  } catch (error) {
    console.error('Failed to generate optimization recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate optimization recommendations'
    });
  }
});

/**
 * GET /api/recommendations/calendar
 * Get calendar-based subscription recommendations
 */
router.get('/calendar', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const months = parseInt(req.query.months as string) || 6;

    // Generate calendar recommendations for the next N months
    const calendarRecommendations = [];

    const currentDate = new Date();
    for (let i = 0; i < months; i++) {
      const month = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      
      // This would analyze premieres, user's watchlist timing, etc.
      calendarRecommendations.push({
        month: month.toISOString(),
        monthName: month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        recommendations: [
          {
            action: i === 0 ? 'keep' : (i % 2 === 0 ? 'subscribe' : 'pause'),
            service: 'Netflix',
            reason: i === 0 ? 'Currently watching shows' : 
                   (i % 2 === 0 ? 'New season premieres' : 'No new content'),
            shows: i === 0 ? ['Ongoing shows'] : 
                  (i % 2 === 0 ? ['New season starts'] : []),
            cost: i % 2 === 0 ? 15.99 : 0
          }
        ],
        totalMonthlyCost: i % 2 === 0 ? 31.98 : 15.99,
        savings: i % 2 === 1 ? 15.99 : 0
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
          averageMonthlyCost: calendarRecommendations.reduce((sum, month) => 
            sum + month.totalMonthlyCost, 0) / months
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Failed to generate calendar recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate calendar recommendations'
    });
  }
});

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
router.post('/feedback', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { recommendationId, action, feedback } = req.body;

    if (!recommendationId || !['accepted', 'rejected', 'modified'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Valid recommendationId and action (accepted/rejected/modified) required'
      });
    }

    // Store feedback for improving recommendations
    // This would go to a feedback table in the database
    console.log(`User ${userId} provided feedback:`, {
      recommendationId,
      action,
      feedback,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      data: {
        message: 'Feedback recorded successfully',
        recommendationId,
        action
      }
    });
  } catch (error) {
    console.error('Failed to record recommendation feedback:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record feedback'
    });
  }
});

/**
 * GET /api/recommendations/savings-simulator
 * Simulate potential savings with different strategies
 */
router.get('/savings-simulator', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const strategies = [
      {
        name: 'Aggressive Optimization',
        description: 'Cancel all unused services immediately',
        monthlySavings: 47.97,
        annualSavings: 575.64,
        riskLevel: 'low',
        effort: 'minimal'
      },
      {
        name: 'Rotation Strategy',
        description: 'Subscribe only when actively watching',
        monthlySavings: 23.98,
        annualSavings: 287.76,
        riskLevel: 'minimal',
        effort: 'moderate'
      },
      {
        name: 'Bundle Consolidation',
        description: 'Switch to service bundles',
        monthlySavings: 15.99,
        annualSavings: 191.88,
        riskLevel: 'minimal',
        effort: 'low'
      }
    ];

    res.json({
      success: true,
      data: {
        strategies,
        recommendations: {
          topStrategy: strategies[0],
          balancedStrategy: strategies[1]
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Failed to generate savings simulation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate savings simulation'
    });
  }
});

export default router;