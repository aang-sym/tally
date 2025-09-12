import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserManager } from '../services/UserManager';

interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  is_test_user: boolean;
  created_at: string;
}

interface UserContextType {
  currentUserId: string;
  currentUser: User | null;
  setCurrentUserId: (userId: string) => void;
  refreshCurrentUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [currentUserId, setCurrentUserIdState] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    // Initialize with stored user ID
    const storedUserId = UserManager.getCurrentUserId();
    setCurrentUserIdState(storedUserId);
    loadCurrentUser(storedUserId);
  }, []);

  const loadCurrentUser = async (_userId: string) => {
    try {
      const user = await UserManager.getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Failed to load current user:', error);
      setCurrentUser(null);
    }
  };

  const setCurrentUserId = (userId: string) => {
    UserManager.setCurrentUserId(userId);
    setCurrentUserIdState(userId);
    loadCurrentUser(userId);
  };

  const refreshCurrentUser = async () => {
    await loadCurrentUser(currentUserId);
  };

  const value: UserContextType = {
    currentUserId,
    currentUser,
    setCurrentUserId,
    refreshCurrentUser,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export default UserProvider;
