// apps/web/src/services/apiClient.ts
import { DefaultApi, Configuration } from '@tally/api-client';

const basePath =
  import.meta.env.VITE_API_BASE_URL ?? (window as any).__API_BASE_URL__ ?? 'http://localhost:4000';

// Resolve the current auth token (JWT stored in localStorage or Supabase fallbacks)
async function getAccessToken(): Promise<string | undefined> {
  try {
    const authToken = localStorage.getItem('authToken');
    if (authToken) return authToken;

    const supa = (window as any).__supabase ?? (window as any).supabase;
    if (supa?.auth?.getSession) {
      const { data } = await supa.auth.getSession();
      const token = data?.session?.access_token;
      if (token) return token as string;
    }

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
          // ignore parse errors
        }
      }
    }
  } catch {
    // ignore
  }
  return undefined;
}

// Provide accessToken resolver so the generated client attaches Authorization automatically
const config = new Configuration({
  basePath,
  accessToken: async () => (await getAccessToken()) ?? '',
});

export const api = new DefaultApi(config);
