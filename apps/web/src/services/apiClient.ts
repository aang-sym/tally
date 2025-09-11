// apps/web/src/services/apiClient.ts
import { Configuration, WatchlistApi, Middleware, RequestContext } from '@tally/api-client';

const basePath =
  import.meta.env.VITE_API_BASE_URL ??
  (window as any).__API_BASE_URL__ ??
  'http://localhost:4000';

// Try multiple sources for a Supabase access token without importing a client:
// 1) window.__supabase or window.supabase (if app exposes it)
// 2) localStorage Supabase v2 keys: sb-<project-ref>-auth-token (JSON with access_token)
// 3) legacy local storage fallback ("sb-access-token" JSON or "authToken" plain)
async function getSupabaseAccessToken(): Promise<string | undefined> {
  // 1) window-exposed supabase client (optional)
  try {
    const supa = (window as any).__supabase ?? (window as any).supabase;
    if (supa?.auth?.getSession) {
      const { data } = await supa.auth.getSession();
      const token = data?.session?.access_token;
      if (token) return token as string;
    }
  } catch {
    // ignore
  }

  // 2) Look for Supabase v2 localStorage keys
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw);
          const token = parsed?.access_token ?? parsed?.currentSession?.access_token;
          if (token) return token as string;
        } catch {
          // not JSON, skip
        }
      }
    }
  } catch {
    // ignore
  }

  // 3) Legacy fallbacks
  try {
    const sb = localStorage.getItem('sb-access-token');
    if (sb) {
      try {
        const parsed = JSON.parse(sb);
        const token = parsed?.access_token ?? parsed?.currentSession?.access_token;
        if (token) return token as string;
      } catch {
        if (sb) return sb;
      }
    }
    const legacy = localStorage.getItem('authToken');
    if (legacy) return legacy;
  } catch {
    // ignore
  }

  return undefined;
}

const supabaseTokenMiddleware: Middleware = {
  async pre(context: RequestContext) {
    const token = await getSupabaseAccessToken();
    if (import.meta.env?.DEV) {
      console.debug('[API DEBUG] (web) resolved Supabase token?', Boolean(token));
    }
    if (token) {
      // Forward both Authorization and x-supabase-access-token headers with the Supabase access token
      // Normalize headers to a Headers instance
      const current = context.init.headers;
      const headers =
        current instanceof Headers
          ? current
          : new Headers((current ?? {}) as Record<string, string>);
      headers.set('Authorization', `Bearer ${token}`);
      headers.set('x-supabase-access-token', token);
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      if (import.meta.env?.DEV) {
        console.debug('[API DEBUG] (web) attached Authorization and x-supabase-access-token headers');
      }
      context.init.headers = headers;
    }
    return context;
  }
};

const config = new Configuration({
  basePath,
  middleware: [supabaseTokenMiddleware]
});

export const api = new WatchlistApi(config);