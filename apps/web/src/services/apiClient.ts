// apps/web/src/services/apiClient.ts
import { Configuration, WatchlistApi, Middleware, RequestContext } from '@tally/api-client';

const basePath =
  import.meta.env.VITE_API_BASE_URL ?? (window as any).__API_BASE_URL__ ?? 'http://localhost:4000';

// Get the auth token from the current authentication system
// This application uses custom JWTs stored in localStorage after login
async function getSupabaseAccessToken(): Promise<string | undefined> {
  try {
    // First try the current auth system token
    const authToken = localStorage.getItem('authToken');
    if (authToken) {
      if (import.meta.env?.DEV) {
        console.debug('[API DEBUG] Found authToken in localStorage');
      }
      return authToken;
    }

    // Fallback: window-exposed supabase client (optional)
    const supa = (window as any).__supabase ?? (window as any).supabase;
    if (supa?.auth?.getSession) {
      const { data } = await supa.auth.getSession();
      const token = data?.session?.access_token;
      if (token) {
        if (import.meta.env?.DEV) {
          console.debug('[API DEBUG] Found token from window.supabase');
        }
        return token as string;
      }
    }

    // Fallback: Look for Supabase v2 localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw);
          const token = parsed?.access_token ?? parsed?.currentSession?.access_token;
          if (token) {
            if (import.meta.env?.DEV) {
              console.debug('[API DEBUG] Found token from Supabase localStorage key:', key);
            }
            return token as string;
          }
        } catch {
          // not JSON, skip
        }
      }
    }

    if (import.meta.env?.DEV) {
      console.debug('[API DEBUG] No auth token found');
    }
  } catch (error) {
    if (import.meta.env?.DEV) {
      console.error('[API DEBUG] Error getting auth token:', error);
    }
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
        console.debug(
          '[API DEBUG] (web) attached Authorization and x-supabase-access-token headers'
        );
      }
      context.init.headers = headers;
    }
    return context;
  },
};

const config = new Configuration({
  basePath,
  middleware: [supabaseTokenMiddleware],
});

export const api = new WatchlistApi(config);
