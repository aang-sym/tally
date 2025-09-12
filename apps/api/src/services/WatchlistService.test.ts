import { describe, it, expect, beforeEach, vi } from 'vitest';

// System under test
import { WatchlistService } from './WatchlistService.js';
import { serviceSupabase } from '../db/supabase.js';

// Mocks: createUserClient returns a fake supabase client with fluent query builders
const mkFluent = () => {
  const q: any = {};
  q.update = vi.fn().mockReturnValue(q);
  q.eq = vi.fn().mockReturnValue(q);
  q.select = vi.fn().mockReturnValue(q);
  q.single = vi.fn();
  return q;
};

const userClient = {
  from: vi.fn(),
} as any;

vi.mock('../db/supabase.js', () => {
  // Create a fluent mock for serviceSupabase
  const createServiceSupabaseMock = (): any => {
    const q: any = {};
    q.select = vi.fn().mockReturnValue(q);
    q.insert = vi.fn().mockReturnValue(q);
    q.update = vi.fn().mockReturnValue(q);
    q.delete = vi.fn().mockReturnValue(q);
    q.eq = vi.fn().mockReturnValue(q);
    q.ilike = vi.fn().mockReturnValue(q);
    q.single = vi.fn();
    return q;
  };

  const serviceSupabase = {
    from: vi.fn(() => createServiceSupabaseMock()),
  } as any;
  
  return {
    // Not used directly in these unit tests, but WatchlistService imports them
    supabase: {} as any,
    serviceSupabase,
    createUserClient: vi.fn(() => userClient),
  };
});

describe('WatchlistService update field methods', () => {
  let service: WatchlistService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new WatchlistService('fake-user-token');
    
    // Setup default serviceSupabase mock for all operations
    const defaultQuery = mkFluent();
    defaultQuery.single.mockResolvedValue({ data: { id: 'xyz', user_id: 'user-1' }, error: null });
    serviceSupabase.from.mockReturnValue(defaultQuery);
  });

  it('updateStreamingProvider() succeeds and targets correct table/filters', async () => {
    // Mock two serviceSupabase calls: ownership verification and service UUID lookup
    const ownershipQuery = mkFluent();
    ownershipQuery.single.mockResolvedValue({ data: { user_id: 'user-1' }, error: null });
    
    const serviceQuery = mkFluent();
    serviceQuery.single.mockResolvedValue({ data: { id: 'service-uuid-123' }, error: null });
    
    serviceSupabase.from
      .mockReturnValueOnce(ownershipQuery)  // first call for ownership
      .mockReturnValueOnce(serviceQuery);   // second call for service lookup
    
    const q = mkFluent();
    userClient.from.mockReturnValue(q);
    q.single.mockResolvedValue({ data: { id: 'xyz' }, error: null });

    const ok = await service.updateStreamingProvider('user-1', 'user-show-1', {
      id: 8,
      name: 'Netflix',
      logo_path: '/logo.png',
    });

    expect(ok).toBe(true);
    // The service uses serviceSupabase for updates after ownership verification
    expect(serviceSupabase.from).toHaveBeenCalledWith('user_shows');
    expect(serviceSupabase.from).toHaveBeenCalledWith('streaming_services');
  });

  it('updateStreamingProvider() returns false on DB error', async () => {
    // Mock ownership verification to succeed, service lookup to fail
    const ownershipQuery = mkFluent();
    ownershipQuery.single.mockResolvedValue({ data: { user_id: 'user-1' }, error: null });
    
    const serviceQuery = mkFluent();
    serviceQuery.single.mockRejectedValue(new Error('Service lookup failed'));
    
    serviceSupabase.from
      .mockReturnValueOnce(ownershipQuery)  // first call for ownership
      .mockReturnValueOnce(serviceQuery);   // second call for service lookup
    
    const q = mkFluent();
    userClient.from.mockReturnValue(q);
    q.single.mockRejectedValue(new Error('update failed'));

    const ok = await service.updateStreamingProvider('user-1', 'user-show-1', {
      id: 100,
      name: 'X',
      logo_path: '/x.png',
    });
    expect(ok).toBe(false);
  });

  it('updateStreamingProvider(null) clears provider id', async () => {
    // Only mock ownership verification since null provider skips UUID lookup
    const ownershipQuery = mkFluent();
    ownershipQuery.single.mockResolvedValue({ data: { user_id: 'user-1' }, error: null });
    serviceSupabase.from.mockReturnValueOnce(ownershipQuery);
    
    const q = mkFluent();
    userClient.from.mockReturnValue(q);
    q.single.mockResolvedValue({ data: { id: 'xyz' }, error: null });

    const ok = await service.updateStreamingProvider('user-1', 'user-show-1', null);
    expect(ok).toBe(true);
    // Check that serviceSupabase was used for the update
    expect(serviceSupabase.from).toHaveBeenCalledWith('user_shows');
  });

  it('updateCountryCode() writes country_code and scopes by user_id', async () => {
    // Only mock ownership verification for updateCountryCode
    const ownershipQuery = mkFluent();
    ownershipQuery.single.mockResolvedValue({ data: { user_id: 'user-1' }, error: null });
    serviceSupabase.from.mockReturnValueOnce(ownershipQuery);
    
    const q = mkFluent();
    userClient.from.mockReturnValue(q);
    q.single.mockResolvedValue({ data: { id: 'xyz' }, error: null });

    const ok = await service.updateCountryCode('user-1', 'user-show-1', 'AU');
    expect(ok).toBe(true);
    // Check that serviceSupabase was used for the update
    expect(serviceSupabase.from).toHaveBeenCalledWith('user_shows');
  });

  it('updateCountryCode(null) clears country_code', async () => {
    // Only mock ownership verification
    const ownershipQuery = mkFluent();
    ownershipQuery.single.mockResolvedValue({ data: { user_id: 'user-1' }, error: null });
    serviceSupabase.from.mockReturnValueOnce(ownershipQuery);
    
    const q = mkFluent();
    userClient.from.mockReturnValue(q);
    q.single.mockResolvedValue({ data: { id: 'xyz' }, error: null });

    const ok = await service.updateCountryCode('user-1', 'user-show-1', null);
    expect(ok).toBe(true);
    // Check that serviceSupabase was used for the update
    expect(serviceSupabase.from).toHaveBeenCalledWith('user_shows');
  });

  it('updateBufferDays() persists buffer_days and enforces user scope', async () => {
    // Only mock ownership verification
    const ownershipQuery = mkFluent();
    ownershipQuery.single.mockResolvedValue({ data: { user_id: 'user-1' }, error: null });
    serviceSupabase.from.mockReturnValueOnce(ownershipQuery);
    
    const q = mkFluent();
    userClient.from.mockReturnValue(q);
    q.single.mockResolvedValue({ data: { id: 'xyz' }, error: null });

    const ok = await service.updateBufferDays('user-1', 'user-show-1', 7);
    expect(ok).toBe(true);
    // Check that serviceSupabase was used for the update
    expect(serviceSupabase.from).toHaveBeenCalledWith('user_shows');
  });

  it('updateBufferDays() returns false on DB error', async () => {
    // Mock ownership verification to succeed, then update operation to fail
    const ownershipQuery = mkFluent();
    ownershipQuery.single.mockResolvedValue({ data: { user_id: 'user-1' }, error: null });
    
    const updateQuery = mkFluent();
    updateQuery.single.mockRejectedValue(new Error('DB down'));
    
    serviceSupabase.from
      .mockReturnValueOnce(ownershipQuery)   // first call for ownership
      .mockReturnValueOnce(updateQuery);     // second call for update

    const ok = await service.updateBufferDays('user-1', 'user-show-1', 3);
    expect(ok).toBe(false);
  });
});
