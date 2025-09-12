import { API_ENDPOINTS, apiRequest } from '../config/api';

interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  is_test_user: boolean;
  created_at: string;
}

// User management utilities
export const UserManager = {
  getCurrentUserId: (): string => {
    const storedId = localStorage.getItem('current_user_id');

    // If no stored ID, try to extract from auth token
    if (!storedId || storedId === 'user-1') {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          // Decode JWT token to get the proper user ID
          const parts = token.split('.');
          if (parts.length === 3 && parts[1]) {
            const payload = JSON.parse(atob(parts[1]));
            const userId = payload.sub || payload.userId;
            if (userId && userId !== 'user-1') {
              localStorage.setItem('current_user_id', userId);
              return userId;
            }
          }
        } catch (error) {
          console.warn('Failed to decode auth token:', error);
        }
      }

      // Default to proper UUID for test user instead of 'user-1'
      const defaultUUID = 'b3686973-ba60-4405-8525-f8d6b3dcb7fc';
      localStorage.setItem('current_user_id', defaultUUID);
      return defaultUUID;
    }

    return storedId;
  },

  setCurrentUserId: (userId: string): void => {
    localStorage.setItem('current_user_id', userId);
  },

  getCurrentUser: async (): Promise<User | null> => {
    try {
      const userId = UserManager.getCurrentUserId();
      const token = localStorage.getItem('authToken') || undefined;
      // Use apiRequest for proper authentication handling
      const data = await apiRequest(API_ENDPOINTS.users.profile(userId), {}, token);
      return (data.data && (data.data.user || data.data)) as User;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  },

  // Country preference management
  getCountry: (): string => {
    return localStorage.getItem('user_country') || 'US';
  },

  setCountry: (code: string): void => {
    localStorage.setItem('user_country', code);
  },
};

export type { User };
