import { describe, it, expect } from 'vitest';
import { 
  generateActivationWindows,
  calculateSavingsEstimate,
  isValidStreamingService,
  getStreamingService,
  STREAMING_SERVICES 
} from './index.js';

describe('Core business logic', () => {
  describe('generateActivationWindows', () => {
    it('should return mock activation windows', () => {
      const windows = generateActivationWindows();
      
      expect(windows).toHaveLength(2);
      expect(windows[0]).toMatchObject({
        serviceId: 'netflix',
        serviceName: 'Netflix',
        reason: 'Stranger Things Season 5 releases',
      });
      expect(windows[1]).toMatchObject({
        serviceId: 'disney',
        serviceName: 'Disney+',
        reason: 'The Mandalorian Season 4 releases',
      });
      
      // Verify dates are in the future
      const now = new Date();
      windows.forEach(window => {
        expect(new Date(window.start).getTime()).toBeGreaterThan(now.getTime());
        expect(new Date(window.end).getTime()).toBeGreaterThan(new Date(window.start).getTime());
      });
    });
  });

  describe('calculateSavingsEstimate', () => {
    it('should return realistic savings estimate', () => {
      const savings = calculateSavingsEstimate();
      
      expect(savings.monthly).toBeGreaterThan(0);
      expect(savings.yearToDate).toBeGreaterThan(0);
      expect(savings.yearToDate).toBe(savings.monthly * 12);
    });
  });

  describe('streaming service utilities', () => {
    it('should validate known streaming services', () => {
      expect(isValidStreamingService('netflix')).toBe(true);
      expect(isValidStreamingService('hulu')).toBe(true);
      expect(isValidStreamingService('unknown-service')).toBe(false);
    });

    it('should return streaming service info', () => {
      const netflix = getStreamingService('netflix');
      expect(netflix).toEqual(STREAMING_SERVICES.netflix);
      expect(netflix?.name).toBe('Netflix');
      expect(netflix?.monthlyPrice).toBeGreaterThan(0);
    });
  });
});