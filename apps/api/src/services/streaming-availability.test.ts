import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StreamingAvailabilityClient, StreamingAvailabilityError } from '@tally/core';

// Mock the external client
vi.mock('@tally/core', () => ({
  StreamingAvailabilityClient: vi.fn(),
  StreamingAvailabilityError: class extends Error {
    constructor(
      message: string,
      public statusCode?: number,
      public rateLimitReset?: number
    ) {
      super(message);
      this.name = 'StreamingAvailabilityError';
    }
  },
}));

// Mock the config
vi.mock('../config/index.js', () => ({
  config: {
    streamingAvailabilityApiKey: 'test-api-key',
    streamingApiDevMode: false,
    streamingApiMonthlyLimit: 1000000,
  },
}));
// Mock the quota tracker to bypass monthly quota and provide stable stats
vi.mock('./quota-tracker.js', () => {
  const canMakeCall = vi.fn().mockResolvedValue(true);
  const shouldWarnLowQuota = vi.fn().mockResolvedValue(false);
  const getRemainingCalls = vi.fn().mockResolvedValue(1000);
  const getUsageStats = vi.fn().mockResolvedValue({
    month: '2025-09',
    callsUsed: 0,
    callsRemaining: 1000,
    limit: 1000000,
    percentUsed: 0,
    lastReset: new Date().toISOString(),
  });
  const recordCall = vi.fn().mockResolvedValue(undefined);

  return {
    quotaTracker: {
      canMakeCall,
      shouldWarnLowQuota,
      getRemainingCalls,
      getUsageStats,
      recordCall,
    },
  };
});

describe('StreamingAvailabilityService', () => {
  let mockClient: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    await vi.resetModules(); // ensure singleton service re-initializes per test

    // Create a mock client instance
    mockClient = {
      search: vi.fn(),
      getShow: vi.fn(),
      getLeavingSoon: vi.fn(),
      getNewlyAdded: vi.fn(),
      isAvailableOnService: vi.fn(),
      getExpirationDate: vi.fn(),
      isLeavingSoon: vi.fn(),
    };

    // Make the constructor return our mock
    (StreamingAvailabilityClient as any).mockImplementation(() => mockClient);
  });

  it('should initialize with API key', async () => {
    // Import after mocks are set up
    await import('./streaming-availability.js');

    expect(StreamingAvailabilityClient).toHaveBeenCalledWith('test-api-key');
  });

  it('should search for shows with caching', async () => {
    const mockSearchResult = {
      shows: [
        {
          id: '123',
          title: 'Test Show',
          year: 2023,
          type: 'series' as const,
          streamingOptions: {
            us: [],
          },
        },
      ],
      hasMore: false,
    };

    mockClient.search.mockResolvedValue(mockSearchResult);

    // Import after mocks are set up
    const { streamingAvailabilityService } = await import('./streaming-availability.js');

    const result = await streamingAvailabilityService.searchShows('Test Show');

    expect(mockClient.search).toHaveBeenCalledWith('Test Show', 'us', undefined, 10);
    expect(result).toEqual(mockSearchResult.shows);
  });

  it('should handle API rate limiting', async () => {
    const rateLimitError = new StreamingAvailabilityError('Rate limit exceeded', 429, 5000);
    mockClient.search.mockRejectedValue(rateLimitError);

    // Import after mocks are set up
    const { streamingAvailabilityService } = await import('./streaming-availability.js');

    await expect(streamingAvailabilityService.searchShows('Test Show')).rejects.toThrow(
      'Rate limit exceeded'
    );
  });

  it('should get show details with error handling', async () => {
    const notFoundError = new StreamingAvailabilityError('Not found', 404);
    mockClient.getShow.mockRejectedValue(notFoundError);

    // Import after mocks are set up
    const { streamingAvailabilityService } = await import('./streaming-availability.js');

    const result = await streamingAvailabilityService.getShowDetails('nonexistent');

    expect(result).toBeNull();
  });

  it('should get content availability info', async () => {
    const mockShow = {
      id: '123',
      title: 'Test Show',
      streamingOptions: {
        us: [],
      },
    };

    const mockOption = {
      service: { id: 'netflix', name: 'Netflix' },
      type: 'subscription' as const,
      expiresSoon: true,
      link: 'https://netflix.com',
    };

    mockClient.getShow.mockResolvedValue(mockShow);
    mockClient.isAvailableOnService.mockReturnValue(mockOption);
    mockClient.getExpirationDate.mockReturnValue(new Date('2024-12-31'));
    mockClient.isLeavingSoon.mockReturnValue(true);

    // Import after mocks are set up
    const { streamingAvailabilityService } = await import('./streaming-availability.js');

    const result = await streamingAvailabilityService.getContentAvailability('123', 'netflix');

    expect(result).toEqual({
      available: true,
      expiresOn: new Date('2024-12-31').toISOString(),
      leavingSoon: true,
    });
  });

  it('should handle content not available on service', async () => {
    const mockShow = {
      id: '123',
      title: 'Test Show',
      streamingOptions: {
        us: [],
      },
    };

    mockClient.getShow.mockResolvedValue(mockShow);
    mockClient.isAvailableOnService.mockReturnValue(null);

    // Import after mocks are set up
    const { streamingAvailabilityService } = await import('./streaming-availability.js');

    const result = await streamingAvailabilityService.getContentAvailability('123', 'hulu');

    expect(result).toEqual({
      available: false,
      leavingSoon: false,
    });
  });
});
