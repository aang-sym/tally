import { Router } from 'express';
import { PlanResponseSchema, type ServiceWindow } from '@tally/types';
import { generateActivationWindows, calculateSavingsEstimate } from '@tally/core';
import { watchlistStore } from '../storage/index.js';
import { ValidationError } from '../middleware/errorHandler.js';

const router = Router();

// Mock auth middleware - extracts user from stubbed token
function extractUserId(req: any): string {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new ValidationError('Authorization token required');
  }

  const token = authHeader.substring(7);
  if (!token.startsWith('stub_token_')) {
    throw new ValidationError('Invalid token format');
  }

  return token.substring(11); // Extract user ID from stub_token_{userId}
}

async function generateRealActivationWindows(userId: string): Promise<ServiceWindow[]> {
  const windows: ServiceWindow[] = [];

  // Get user's watchlist
  const watchlist = await watchlistStore.getByUserId(userId);

  if (watchlist.length === 0) {
    // Fallback to mock data if no watchlist items
    return generateActivationWindows();
  }

  // Group items by service
  const serviceGroups = new Map<string, typeof watchlist>();
  for (const item of watchlist) {
    if (!serviceGroups.has(item.serviceId)) {
      serviceGroups.set(item.serviceId, []);
    }
    const group = serviceGroups.get(item.serviceId);
    if (group) group.push(item);
  }

  // Generate windows for each service based on content availability
  for (const [serviceId, items] of serviceGroups) {
    const serviceName = items[0]?.serviceName || 'Unknown Service';

    // Find items that are leaving soon
    const leavingSoonItems = items.filter((item) => item.availability?.leavingSoon);

    // Find items with specific expiration dates
    const itemsWithExpirationDates = items.filter(
      (item) => item.availability?.expiresOn && !item.availability.leavingSoon
    );

    if (leavingSoonItems.length > 0) {
      // Create urgency window for content leaving soon
      const now = new Date();
      const urgentWindow: ServiceWindow = {
        serviceId,
        serviceName,
        start: now.toISOString(),
        end: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks
        reason: `${leavingSoonItems.length} items leaving soon: ${leavingSoonItems.map((i) => i.title).join(', ')}`,
      };
      windows.push(urgentWindow);
    }

    if (itemsWithExpirationDates.length > 0) {
      // Create windows based on expiration dates
      for (const item of itemsWithExpirationDates) {
        if (item.availability?.expiresOn) {
          const expirationDate = new Date(item.availability.expiresOn);
          const startDate = new Date(expirationDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days before

          const window: ServiceWindow = {
            serviceId,
            serviceName,
            start: startDate.toISOString(),
            end: expirationDate.toISOString(),
            reason: `Watch "${item.title}" before it expires`,
          };
          windows.push(window);
        }
      }
    }
  }

  // Sort windows by start date
  windows.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  // If no windows generated, fallback to mock data
  return windows.length > 0 ? windows : generateActivationWindows();
}

router.post('/generate', async (req, res, next) => {
  try {
    const userId = extractUserId(req);

    // Generate activation windows based on user's watchlist
    const windows = await generateRealActivationWindows(userId);

    // Calculate savings estimate (still using mock calculation for now)
    const savings = calculateSavingsEstimate();

    const response = PlanResponseSchema.parse({
      windows,
      savings,
    });

    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.post('/optimize', async (req, res, next) => {
  try {
    const userId = extractUserId(req);
    const { preferences = {} } = req.body;

    const {
      maxSimultaneous = 2,
      watchDelay = 'P2D', // 2 days in ISO 8601 duration format
      batchEpisodes = true,
    } = preferences;

    // Get user's watchlist
    const watchlist = await watchlistStore.getByUserId(userId);

    if (watchlist.length === 0) {
      return res.json({
        optimizedPlan: [],
        savings: calculateSavingsEstimate(),
        message: 'No watchlist items to optimize',
      });
    }

    // Group by service and release pattern
    const serviceGroups = new Map();
    for (const item of watchlist) {
      const key = item.serviceId;
      if (!serviceGroups.has(key)) {
        serviceGroups.set(key, {
          serviceId: item.serviceId,
          serviceName: item.serviceName,
          items: [],
          weeklyShows: [],
          bingeShows: [],
        });
      }

      const group = serviceGroups.get(key);
      group.items.push(item);

      // Categorize by release pattern - prioritize TMDB detected patterns
      const releasePattern = item.detectedReleasePattern || item.releasePattern?.pattern;
      if (releasePattern === 'weekly') {
        group.weeklyShows.push(item);
      } else if (releasePattern === 'binge') {
        group.bingeShows.push(item);
      }
    }

    // Generate optimized subscription windows
    const optimizedWindows = [];

    for (const [, group] of serviceGroups) {
      if (group.weeklyShows.length > 0) {
        // For weekly shows, create longer subscription periods
        const now = new Date();
        const weeklyWindow = {
          serviceId: group.serviceId,
          serviceName: group.serviceName,
          start: now.toISOString(),
          end: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 3 months
          reason: `Weekly shows: ${group.weeklyShows.map((s: any) => s.title).join(', ')}`,
          type: 'weekly_content',
          showCount: group.weeklyShows.length,
        };
        optimizedWindows.push(weeklyWindow);
      }

      if (group.bingeShows.length > 0 && batchEpisodes) {
        // For binge shows, create shorter, focused periods
        const batchStart = new Date();
        batchStart.setMonth(batchStart.getMonth() + 1); // Start next month

        const bingeWindow = {
          serviceId: group.serviceId,
          serviceName: group.serviceName,
          start: batchStart.toISOString(),
          end: new Date(batchStart.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 1 month
          reason: `Binge watching: ${group.bingeShows.map((s: any) => s.title).join(', ')}`,
          type: 'binge_content',
          showCount: group.bingeShows.length,
        };
        optimizedWindows.push(bingeWindow);
      }
    }

    // Limit simultaneous subscriptions based on preference
    if (optimizedWindows.length > maxSimultaneous) {
      // Sort by priority (weekly shows first, then by show count)
      optimizedWindows.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'weekly_content' ? -1 : 1;
        }
        return b.showCount - a.showCount;
      });

      // Keep only top priorities
      optimizedWindows.splice(maxSimultaneous);
    }

    const savings = calculateSavingsEstimate();

    res.json({
      optimizedPlan: optimizedWindows,
      savings: {
        ...savings,
        optimizedMonthly: savings.monthly * 1.2, // Assume 20% more savings with optimization
      },
      preferences: {
        maxSimultaneous,
        watchDelay,
        batchEpisodes,
      },
      summary: {
        totalServices: serviceGroups.size,
        weeklyShows: Array.from(serviceGroups.values()).reduce(
          (sum, g) => sum + g.weeklyShows.length,
          0
        ),
        bingeShows: Array.from(serviceGroups.values()).reduce(
          (sum, g) => sum + g.bingeShows.length,
          0
        ),
        optimizedWindows: optimizedWindows.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

export { router as planRouter };
