/**
 * API Usage Tracking Middleware
 *
 * Tracks API calls for both TMDB and Streaming Availability APIs
 * to display usage statistics on the dashboard.
 */

import { Request, Response, NextFunction } from 'express';

export interface APIUsage {
  service: 'tmdb' | 'streaming-availability';
  timestamp: Date;
  endpoint?: string;
  success: boolean;
  responseTime?: number;
}

class UsageTracker {
  private usageData: APIUsage[] = [];

  /**
   * Record an API call
   */
  recordUsage(usage: APIUsage) {
    this.usageData.push(usage);

    // Keep only last 30 days of data to prevent memory issues
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    this.usageData = this.usageData.filter((record) => record.timestamp >= thirtyDaysAgo);
  }

  /**
   * Get usage statistics for a specific service
   */
  getUsageStats(service: 'tmdb' | 'streaming-availability') {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const serviceData = this.usageData.filter((record) => record.service === service);

    // Count calls today
    const todayCalls = serviceData.filter((record) => record.timestamp >= today).length;

    // Count calls this month
    const monthCalls = serviceData.filter((record) => record.timestamp >= thisMonth).length;

    // Count successful calls
    const todaySuccessful = serviceData.filter(
      (record) => record.timestamp >= today && record.success
    ).length;

    const monthSuccessful = serviceData.filter(
      (record) => record.timestamp >= thisMonth && record.success
    ).length;

    // Calculate average response time for today
    const todayWithResponseTime = serviceData.filter(
      (record) => record.timestamp >= today && record.responseTime !== undefined
    );

    const avgResponseTime =
      todayWithResponseTime.length > 0
        ? todayWithResponseTime.reduce((sum, record) => sum + (record.responseTime || 0), 0) /
          todayWithResponseTime.length
        : 0;

    return {
      service,
      today: {
        total: todayCalls,
        successful: todaySuccessful,
        failed: todayCalls - todaySuccessful,
        avgResponseTime: Math.round(avgResponseTime),
      },
      month: {
        total: monthCalls,
        successful: monthSuccessful,
        failed: monthCalls - monthSuccessful,
      },
      lastUpdated: now,
    };
  }

  /**
   * Get combined usage statistics for all services
   */
  getAllUsageStats() {
    return {
      tmdb: this.getUsageStats('tmdb'),
      streamingAvailability: this.getUsageStats('streaming-availability'),
    };
  }

  /**
   * Get recent API calls for debugging
   */
  getRecentCalls(limit: number = 50) {
    return this.usageData
      .slice(-limit)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
}

// Singleton instance
export const usageTracker = new UsageTracker();

/**
 * Express middleware to track API response times and success rates
 */
export function trackAPIUsage(service: 'tmdb' | 'streaming-availability') {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const originalSend = res.send;

    // Override res.send to capture response
    res.send = function (body: any) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      const success = res.statusCode < 400;

      // Record the usage
      usageTracker.recordUsage({
        service,
        timestamp: new Date(),
        success,
        ...(req.route?.path || req.path ? { endpoint: req.route?.path || req.path } : {}),
        ...(responseTime !== undefined ? { responseTime } : {}),
      });

      return originalSend.call(this, body);
    };

    next();
  };
}

/**
 * Manually track external API calls (like TMDB client calls)
 */
export function trackExternalAPICall(
  service: 'tmdb' | 'streaming-availability',
  success: boolean,
  responseTime?: number,
  endpoint?: string
) {
  usageTracker.recordUsage({
    service,
    timestamp: new Date(),
    success,
    ...(endpoint ? { endpoint } : {}),
    ...(responseTime !== undefined ? { responseTime } : {}),
  });
}
