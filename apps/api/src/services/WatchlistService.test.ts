import { describe, it, expect, beforeEach, vi } from 'vitest';

// System under test
import { WatchlistService } from './WatchlistService.js';

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
  return {
    // Not used directly in these unit tests, but WatchlistService imports them
    supabase: {} as any,
    serviceSupabase: {} as any,
    createUserClient: vi.fn(() => userClient),
  };
});

describe('WatchlistService update field methods', () => {
  let service: WatchlistService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new WatchlistService('fake-user-token');
  });

  it('updateStreamingProvider() succeeds and targets correct table/filters', async () => {
    const q = mkFluent();
    userClient.from.mockReturnValue(q);
    q.single.mockResolvedValue({ data: { id: 'xyz' }, error: null });

    const ok = await service.updateStreamingProvider('user-1', 'user-show-1', { id: 8, name: 'Netflix', logo_path: '/logo.png' });

    expect(ok).toBe(true);
    expect(userClient.from).toHaveBeenCalledWith('user_shows');
    expect(q.update).toHaveBeenCalledWith(expect.objectContaining({
      streaming_provider_id: 8,
    }));
    // RLS enforcement by user_id scope
    expect(q.eq).toHaveBeenNthCalledWith(1, 'id', 'user-show-1');
    expect(q.eq).toHaveBeenNthCalledWith(2, 'user_id', 'user-1');
  });

  it('updateStreamingProvider() returns false on DB error', async () => {
    const q = mkFluent();
    userClient.from.mockReturnValue(q);
    q.single.mockRejectedValue(new Error('update failed'));

    const ok = await service.updateStreamingProvider('user-1', 'user-show-1', { id: 100, name: 'X', logo_path: '/x.png' });
    expect(ok).toBe(false);
  });

  it('updateStreamingProvider(null) clears provider id', async () => {
    const q = mkFluent();
    userClient.from.mockReturnValue(q);
    q.single.mockResolvedValue({ data: { id: 'xyz' }, error: null });

    const ok = await service.updateStreamingProvider('user-1', 'user-show-1', null);
    expect(ok).toBe(true);
    const payload = q.update.mock.calls[0][0];
    expect(payload.streaming_provider_id).toBeNull();
  });

  it('updateCountryCode() writes country_code and scopes by user_id', async () => {
    const q = mkFluent();
    userClient.from.mockReturnValue(q);
    q.single.mockResolvedValue({ data: { id: 'xyz' }, error: null });

    const ok = await service.updateCountryCode('user-1', 'user-show-1', 'AU');
    expect(ok).toBe(true);
    expect(userClient.from).toHaveBeenCalledWith('user_shows');
    expect(q.update).toHaveBeenCalledWith(expect.objectContaining({ country_code: 'AU' }));
    expect(q.eq).toHaveBeenNthCalledWith(1, 'id', 'user-show-1');
    expect(q.eq).toHaveBeenNthCalledWith(2, 'user_id', 'user-1');
  });

  it('updateCountryCode(null) clears country_code', async () => {
    const q = mkFluent();
    userClient.from.mockReturnValue(q);
    q.single.mockResolvedValue({ data: { id: 'xyz' }, error: null });

    const ok = await service.updateCountryCode('user-1', 'user-show-1', null);
    expect(ok).toBe(true);
    const payload = q.update.mock.calls[0][0];
    expect(payload.country_code).toBeNull();
  });

  it('updateBufferDays() persists buffer_days and enforces user scope', async () => {
    const q = mkFluent();
    userClient.from.mockReturnValue(q);
    q.single.mockResolvedValue({ data: { id: 'xyz' }, error: null });

    const ok = await service.updateBufferDays('user-1', 'user-show-1', 7);
    expect(ok).toBe(true);
    expect(userClient.from).toHaveBeenCalledWith('user_shows');
    expect(q.update).toHaveBeenCalledWith(expect.objectContaining({ buffer_days: 7 }));
    expect(q.eq).toHaveBeenNthCalledWith(1, 'id', 'user-show-1');
    expect(q.eq).toHaveBeenNthCalledWith(2, 'user_id', 'user-1');
  });

  it('updateBufferDays() returns false on DB error', async () => {
    const q = mkFluent();
    userClient.from.mockReturnValue(q);
    q.single.mockRejectedValue(new Error('DB down'));

    const ok = await service.updateBufferDays('user-1', 'user-show-1', 3);
    expect(ok).toBe(false);
  });
});