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
    return localStorage.getItem('current_user_id') || 'user-1';
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
  }
};

export type { User };
