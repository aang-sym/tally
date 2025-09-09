// apps/web/src/services/apiClient.ts
import { Configuration, DefaultApi } from '../../../packages/api-client';
import { UserManager } from '../services/UserManager';

const basePath =
  import.meta.env.VITE_API_BASE_URL ??
  (window as any).__API_BASE_URL__ ??
  'http://localhost:3001';

const config = new Configuration({
  basePath,
  accessToken: async () => {
    // return token string or undefined
    return localStorage.getItem('authToken') ?? undefined;
  },
  // optional: send credentials, timeouts, etc.
});

export const api = new DefaultApi(config);