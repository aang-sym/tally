import { describe, it, expect, beforeAll } from 'vitest';
import { StreamingAvailabilityClient } from '@tally/core';

// These are integration tests that would run against the real API
// They are skipped by default to avoid hitting rate limits during development
// Set STREAMING_AVAILABILITY_API_KEY environment variable to run these tests

const shouldRunIntegrationTests =
  process.env.STREAMING_AVAILABILITY_API_KEY &&
  process.env.STREAMING_AVAILABILITY_API_KEY !== 'dev-key-placeholder';

describe.skipIf(!shouldRunIntegrationTests)('Streaming Availability Integration Tests', () => {
  let client: StreamingAvailabilityClient;

  beforeAll(() => {
    if (!process.env.STREAMING_AVAILABILITY_API_KEY) {
      throw new Error(
        'STREAMING_AVAILABILITY_API_KEY environment variable required for integration tests'
      );
    }
    client = new StreamingAvailabilityClient(process.env.STREAMING_AVAILABILITY_API_KEY);
  });

  it('should search for popular shows', async () => {
    const results = await client.search('Stranger Things', 'us', 'series', 5);

    expect(results.shows).toBeDefined();
    expect(results.shows.length).toBeGreaterThan(0);

    const show = results.shows[0];
    if (!show) {
      throw new Error('No show found in results');
    }
    expect(show.title).toContain('Stranger');
    expect(show.type).toBe('series');
    expect(show.streamingOptions?.us).toBeDefined();
  }, 10000); // 10 second timeout for API calls

  it('should get show details', async () => {
    // First search to get a valid show ID
    const searchResults = await client.search('The Office', 'us', 'series', 1);
    expect(searchResults.shows.length).toBeGreaterThan(0);

    const first = searchResults.shows[0];
    if (!first) {
      throw new Error('No show found in search results');
    }
    const showId = first.id;
    const show = await client.getShow(showId, 'us');

    expect(show.id).toBe(showId);
    expect(show.title).toBeDefined();
    expect(show.streamingOptions).toBeDefined();
  }, 15000);

  it('should get shows leaving soon', async () => {
    const leavingSoon = await client.getLeavingSoon('us', undefined, 10);

    expect(Array.isArray(leavingSoon)).toBe(true);
    // Note: This may be empty if no shows are leaving soon
    if (leavingSoon.length > 0) {
      const show = leavingSoon[0];
      if (!show) return;
      expect(show.id).toBeDefined();
      expect(show.title).toBeDefined();
    }
  }, 10000);

  it('should get newly added shows', async () => {
    const newlyAdded = await client.getNewlyAdded('us', undefined, 10);

    expect(Array.isArray(newlyAdded)).toBe(true);
    if (newlyAdded.length > 0) {
      const show = newlyAdded[0];
      if (!show) return;
      expect(show.id).toBeDefined();
      expect(show.title).toBeDefined();
    }
  }, 10000);

  it('should get available services', async () => {
    const services = await client.getServices('us');

    expect(Array.isArray(services)).toBe(true);
    expect(services.length).toBeGreaterThan(0);

    const service = services[0];
    if (!service) {
      throw new Error('No services returned');
    }
    expect(service.id).toBeDefined();
    expect(service.name).toBeDefined();
    expect(service.homePage).toBeDefined();
  }, 10000);

  it('should handle rate limiting gracefully', async () => {
    // Make multiple rapid requests to potentially trigger rate limiting
    const promises = Array.from({ length: 5 }, () => client.search('Test', 'us', undefined, 1));

    // This should either succeed or throw a rate limit error
    // Both are acceptable behaviors
    try {
      await Promise.all(promises);
    } catch (error: any) {
      if (error.statusCode === 429) {
        expect(error.message).toContain('Rate limit');
        expect(error.rateLimitReset).toBeDefined();
      } else {
        throw error;
      }
    }
  }, 30000);
});

// Unit tests for the client that always run
describe('Streaming Availability Client Unit Tests', () => {
  it('should throw error without API key', () => {
    expect(() => new StreamingAvailabilityClient('')).toThrow('API key is required');
  });

  it('should have correct helper methods', () => {
    const client = new StreamingAvailabilityClient('test-key');

    expect(typeof client.search).toBe('function');
    expect(typeof client.getShow).toBe('function');
    expect(typeof client.getLeavingSoon).toBe('function');
    expect(typeof client.getNewlyAdded).toBe('function');
    expect(typeof client.getServices).toBe('function');
    expect(typeof client.isAvailableOnService).toBe('function');
    expect(typeof client.getExpirationDate).toBe('function');
    expect(typeof client.isLeavingSoon).toBe('function');
  });

  it('should validate availability correctly', () => {
    const client = new StreamingAvailabilityClient('test-key');

    const mockAvailability = {
      id: '123',
      title: 'Test Show',
      year: 2023,
      type: 'series' as const,
      streamingOptions: {
        us: [
          {
            service: { id: 'netflix', name: 'Netflix', homePage: '', themeColorCode: '' },
            type: 'subscription' as const,
            expiresSoon: true,
            expiresOn: Math.floor(Date.now() / 1000) + 15 * 24 * 60 * 60, // 15 days from now
            link: 'https://netflix.com',
          },
        ],
      },
    };

    const option = client.isAvailableOnService(mockAvailability, 'netflix', 'us');
    expect(option).toBeTruthy();
    expect(option?.service.id).toBe('netflix');

    const notAvailable = client.isAvailableOnService(mockAvailability, 'hulu', 'us');
    expect(notAvailable).toBeNull();

    const expirationDate = client.getExpirationDate(mockAvailability, 'netflix', 'us');
    expect(expirationDate).toBeInstanceOf(Date);

    const leavingSoon = client.isLeavingSoon(mockAvailability, 'netflix', 30, 'us');
    expect(leavingSoon).toBe(true);
  });
});
