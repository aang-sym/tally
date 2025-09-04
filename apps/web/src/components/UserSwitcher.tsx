import * as React from 'react';
import { useState, useEffect } from 'react';
import { API_ENDPOINTS, apiRequest } from '../config/api';
import { UserManager, User } from '../services/UserManager';

interface UserSwitcherProps {
  onUserChange?: (userId: string) => void;
}

const UserSwitcher: React.FC<UserSwitcherProps> = ({ onUserChange }) => {
  const [users, setUsers] = useState<User[]>([]); // All users from Supabase
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadUsers();
    setCurrentUserId(UserManager.getCurrentUserId());
  }, []);

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('authToken') || undefined;
      // Use apiRequest for consistency with authentication
      const data = await apiRequest(API_ENDPOINTS.users.base, {}, token);
      setUsers(data.data.users || []);
      
      // If no users and no token, this means user needs to create an account
      if (!token && (!data.data.users || data.data.users.length === 0)) {
        console.log('No users found and no auth token. User should create an account.');
      }
    } catch (error: any) {
      console.error('Failed to load users:', error);
      // If we get an auth error and have no token, that's expected
      if (error.message?.includes('Authorization token required')) {
        console.log('Authorization required - user needs to create an account first');
      }
    }
  };  const switchUser = (userId: string) => {
    UserManager.setCurrentUserId(userId);
    setCurrentUserId(userId);
    setIsOpen(false);
    onUserChange?.(userId);
    
    // Reload the page to update all components with new user data
    window.location.reload();
  };

  const getCurrentUser = () => {
    return users.find(user => user.id === currentUserId);
  };

  const handleCreateUser = async (userData: { displayName: string; email: string; password: string }) => {
    try {
      setLoading(true);
      // Use the correct auth endpoint for registration
      const data = await apiRequest(`${API_ENDPOINTS.users.base}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: userData.email,
          password: userData.password,
          displayName: userData.displayName
        })
      });

      if (data.token) { // Store the token if received
        localStorage.setItem('authToken', data.token);
      }

      await loadUsers();
      switchUser(data.user.id); // Assuming user object is directly under data
      setShowCreateModal(false);
    } catch (error: any) {
      console.error('Failed to create user:', error);
      alert(error.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const currentUser = getCurrentUser();

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
            {currentUser?.display_name?.charAt(0) || 'U'}
          </div>
          <span className="hidden md:block text-gray-700">
            {currentUser?.display_name || 'Select User'}
          </span>
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg z-50 border">
            <div className="py-1">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b">
                Users
              </div>
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => switchUser(user.id)}
                  className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors ${
                    user.id === currentUserId ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                      user.id === currentUserId ? 'bg-blue-500' : 'bg-gray-400'
                    }`}>
                      {user.display_name?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{user.display_name || user.email}</div>
                      <div className="text-xs text-gray-500 truncate">{user.email}</div>
                    </div>
                    {user.id === currentUserId && (
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
              
              <div className="border-t mt-1">
                <button
                  onClick={() => {
                    setShowCreateModal(true);
                    setIsOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 border-2 border-dashed border-blue-300 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium">Create New User</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Test User</h3>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              handleCreateUser({
                displayName: formData.get('displayName') as string,
                email: formData.get('email') as string,
                password: formData.get('password') as string
              });
            }}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
                    Display Name
                  </label>
                  <input
                    type="text"
                    id="displayName"
                    name="displayName"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="John Doe"
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="john.doe@example.com"
                  />
                </div>
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    required
                    minLength={8}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Password (min 8 characters)"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default UserSwitcher;
