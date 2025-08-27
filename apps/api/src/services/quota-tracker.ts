/**
 * API Quota Tracker
 * 
 * Tracks API usage across months to ensure we stay within limits.
 * Uses simple JSON file storage for persistence in development.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { config } from '../config/index.js';

interface QuotaData {
  month: string; // YYYY-MM format
  callsUsed: number;
  lastReset: string; // ISO date string
  callLog: Array<{
    timestamp: string;
    endpoint: string;
    success: boolean;
  }>;
}

class QuotaTracker {
  private quotaFilePath: string;
  private quotaData: QuotaData | null = null;
  private initialized = false;

  constructor() {
    // Store quota data in the API directory for development
    this.quotaFilePath = path.join(process.cwd(), 'streaming-api-quota.json');
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const data = await fs.readFile(this.quotaFilePath, 'utf-8');
      this.quotaData = JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is corrupted, start fresh
      this.quotaData = null;
    }

    // Check if we need to reset for a new month
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
    if (!this.quotaData || this.quotaData.month !== currentMonth) {
      this.quotaData = {
        month: currentMonth,
        callsUsed: 0,
        lastReset: new Date().toISOString(),
        callLog: [],
      };
      await this.save();
    }

    this.initialized = true;
  }

  private async save(): Promise<void> {
    if (!this.quotaData) return;
    
    try {
      await fs.writeFile(this.quotaFilePath, JSON.stringify(this.quotaData, null, 2));
    } catch (error) {
      console.error('Failed to save quota data:', error);
    }
  }

  async getRemainingCalls(): Promise<number> {
    await this.initialize();
    if (!this.quotaData) return config.streamingApiMonthlyLimit;
    
    return Math.max(0, config.streamingApiMonthlyLimit - this.quotaData.callsUsed);
  }

  async getUsageStats(): Promise<{
    month: string;
    callsUsed: number;
    callsRemaining: number;
    limit: number;
    percentUsed: number;
    lastReset: string;
  }> {
    await this.initialize();
    
    const callsUsed = this.quotaData?.callsUsed || 0;
    const callsRemaining = await this.getRemainingCalls();
    
    return {
      month: this.quotaData?.month || new Date().toISOString().substring(0, 7),
      callsUsed,
      callsRemaining,
      limit: config.streamingApiMonthlyLimit,
      percentUsed: (callsUsed / config.streamingApiMonthlyLimit) * 100,
      lastReset: this.quotaData?.lastReset || new Date().toISOString(),
    };
  }

  async canMakeCall(): Promise<boolean> {
    // Always allow calls in dev mode
    if (config.streamingApiDevMode) return true;
    
    // Always allow if no API key configured
    if (config.streamingAvailabilityApiKey === 'dev-key-placeholder') return true;
    
    const remaining = await this.getRemainingCalls();
    return remaining > 0;
  }

  async shouldWarnLowQuota(): Promise<boolean> {
    const remaining = await this.getRemainingCalls();
    const warningThreshold = Math.min(50, config.streamingApiMonthlyLimit * 0.1); // 10% or 50 calls
    return remaining <= warningThreshold;
  }

  async recordCall(endpoint: string, success: boolean): Promise<void> {
    // Don't track calls in dev mode
    if (config.streamingApiDevMode) return;
    
    // Don't track if no real API key
    if (config.streamingAvailabilityApiKey === 'dev-key-placeholder') return;
    
    await this.initialize();
    if (!this.quotaData) return;

    this.quotaData.callsUsed += 1;
    this.quotaData.callLog.push({
      timestamp: new Date().toISOString(),
      endpoint,
      success,
    });

    // Keep only the last 100 log entries to avoid bloating the file
    if (this.quotaData.callLog.length > 100) {
      this.quotaData.callLog = this.quotaData.callLog.slice(-100);
    }

    await this.save();

    // Log warnings
    const remaining = config.streamingApiMonthlyLimit - this.quotaData.callsUsed;
    if (remaining <= 10) {
      console.warn(`⚠️  STREAMING API QUOTA CRITICAL: Only ${remaining} calls remaining this month!`);
    } else if (remaining <= 50) {
      console.warn(`⚠️  Streaming API quota running low: ${remaining} calls remaining this month`);
    }
  }

  async getCallLog(limit: number = 20): Promise<QuotaData['callLog']> {
    await this.initialize();
    if (!this.quotaData) return [];
    
    return this.quotaData.callLog.slice(-limit).reverse(); // Most recent first
  }

  async resetQuota(): Promise<void> {
    const currentMonth = new Date().toISOString().substring(0, 7);
    this.quotaData = {
      month: currentMonth,
      callsUsed: 0,
      lastReset: new Date().toISOString(),
      callLog: [],
    };
    await this.save();
  }

  async deleteQuotaFile(): Promise<void> {
    try {
      await fs.unlink(this.quotaFilePath);
      this.quotaData = null;
      this.initialized = false;
    } catch (error) {
      // File might not exist, that's OK
    }
  }
}

// Singleton instance
export const quotaTracker = new QuotaTracker();

export default quotaTracker;