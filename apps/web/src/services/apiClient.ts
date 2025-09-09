// apps/web/src/services/apiClient.ts
import { Configuration, DefaultApi } from '@tally/api-client';

const basePath =
  import.meta.env.VITE_API_BASE_URL ??
  (window as any).__API_BASE_URL__ ??
  'http://localhost:3001';

const config = new Configuration({
  basePath,
  accessToken: () => {
    const t = localStorage.getItem('authToken');
    return t || '';
  },
  // optional: send credentials, timeouts, etc.
});

export const api = new DefaultApi(config);