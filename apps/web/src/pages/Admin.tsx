/**
 * Admin/Dev Tools Page
 * 
 * Development and administrative tools for user management and system testing.
 * Only accessible in development mode.
 */

import React, { useState, useEffect } from 'react';
import { UserManager } from '../components/UserSwitcher';

interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  is_test_user: boolean;
  created_at: string;
}

interface UserStats {
  totalShows: number;
  activeSubscriptions: number;
  monthlySpend: number;
}

const API_BASE = 'http://localhost:3001';

const Admin: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [userStats, setUserStats] = useState<Record<string, UserStats>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [bulkCreating, setBulkCreating] = useState(false);

  // Check if we're in development mode
  if (process.env.NODE_ENV !== 'development') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">Admin tools are only available in development mode.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/api/users`);
      if (response.ok) {
        const data = await response.json();
        const usersList = data.data.users || [];
        setUsers(usersList);

        // Load stats for each user
        const statsPromises = usersList.map(async (user: User) => {
          try {
            const statsResponse = await fetch(`${API_BASE}/api/users/${user.id}/profile`, {
              headers: { 'x-user-id': user.id }
            });
            if (statsResponse.ok) {
              const statsData = await statsResponse.json();
              return {
                userId: user.id,
                stats: {
                  totalShows: statsData.data.stats.totalShows || 0,
                  activeSubscriptions: statsData.data.stats.activeSubscriptions || 0,
                  monthlySpend: statsData.data.stats.monthlySpend || 0
                }
              };
            }
          } catch (err) {
            console.warn(`Failed to load stats for user ${user.id}:`, err);
          }
          return { userId: user.id, stats: { totalShows: 0, activeSubscriptions: 0, monthlySpend: 0 } };
        });

        const statsResults = await Promise.all(statsPromises);
        const statsMap = statsResults.reduce((acc, { userId, stats }) => {
          acc[userId] = stats;
          return acc;
        }, {} as Record<string, UserStats>);

        setUserStats(statsMap);
      } else {
        throw new Error('Failed to load users');
      }
    } catch (err) {
      console.error('Failed to load users:', err);
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const userData = {
      displayName: formData.get('displayName') as string,
      email: formData.get('email') as string
    };

    try {
      setCreating(true);
      const response = await fetch(`${API_BASE}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      if (response.ok) {
        form.reset();
        await loadUsers();
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to create user');
      }
    } catch (err) {
      console.error('Failed to create user:', err);
      alert('Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const deleteUser = async (userId: string, displayName: string) => {
    if (!confirm(`Are you sure you want to delete user "${displayName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/users/${userId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': UserManager.getCurrentUserId() }
      });

      if (response.ok) {
        await loadUsers();
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to delete user');
      }
    } catch (err) {
      console.error('Failed to delete user:', err);
      alert('Failed to delete user');
    }
  };

  const createBulkUsers = async () => {
    const sampleUsers = [
      { displayName: 'Alice Cooper', email: 'alice.cooper@example.com' },
      { displayName: 'Bob Smith', email: 'bob.smith@example.com' },
      { displayName: 'Carol Davis', email: 'carol.davis@example.com' },
      { displayName: 'David Wilson', email: 'david.wilson@example.com' },
      { displayName: 'Eva Garcia', email: 'eva.garcia@example.com' }
    ];

    try {
      setBulkCreating(true);
      const response = await fetch(`${API_BASE}/api/users/bulk-create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: sampleUsers })
      });

      if (response.ok) {
        await loadUsers();
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to create bulk users');
      }
    } catch (err) {
      console.error('Failed to create bulk users:', err);
      alert('Failed to create bulk users');
    } finally {
      setBulkCreating(false);
    }
  };

  const switchToUser = (userId: string) => {
    UserManager.setCurrentUserId(userId);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Tools</h1>
          <p className="text-gray-600 mt-2">
            Development and administrative tools for user management and testing
          </p>
          <div className="mt-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm inline-block">
            🚧 Development Mode Only
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <p className="text-red-800">{error}</p>
            <button 
              onClick={loadUsers}
              className="mt-2 px-3 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-800 rounded transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* User Management */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Test Users</h2>
                  <div className="flex space-x-2">
                    <button
                      onClick={createBulkUsers}
                      disabled={bulkCreating}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 rounded transition-colors disabled:opacity-50"
                    >
                      {bulkCreating ? 'Creating...' : 'Quick Add 5 Users'}
                    </button>
                    <button
                      onClick={loadUsers}
                      disabled={loading}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
                    >
                      Refresh
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span className="ml-3 text-gray-600">Loading users...</span>
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No users found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {users.map((user) => (
                      <div key={user.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                              {user.display_name.charAt(0)}
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900">{user.display_name}</h3>
                              <p className="text-sm text-gray-500">{user.email}</p>
                              <div className="flex items-center space-x-4 mt-1 text-xs text-gray-400">
                                <span>{userStats[user.id]?.totalShows || 0} shows</span>
                                <span>{userStats[user.id]?.activeSubscriptions || 0} subscriptions</span>
                                <span>${(userStats[user.id]?.monthlySpend || 0).toFixed(2)}/month</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {user.is_test_user && (
                              <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                                Test
                              </span>
                            )}
                            <button
                              onClick={() => switchToUser(user.id)}
                              className="px-3 py-1 text-sm bg-green-100 text-green-700 hover:bg-green-200 rounded transition-colors"
                            >
                              Switch To
                            </button>
                            {user.is_test_user && (
                              <button
                                onClick={() => deleteUser(user.id, user.display_name)}
                                className="px-3 py-1 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded transition-colors"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Create User Form */}
          <div>
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Create Test User</h2>
              
              <form onSubmit={createUser} className="space-y-4">
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
                
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {creating ? 'Creating...' : 'Create User'}
                </button>
              </form>

              {/* Quick Stats */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-3">System Stats</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Total Users:</span>
                    <span className="font-medium">{users.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Test Users:</span>
                    <span className="font-medium">{users.filter(u => u.is_test_user).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Current User:</span>
                    <span className="font-medium text-blue-600">
                      {UserManager.getCurrentUserId()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Tools */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Development Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <a
              href="/api/health"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
            >
              <div className="text-2xl mb-2">🩺</div>
              <h3 className="font-medium text-gray-900">Health Check</h3>
              <p className="text-sm text-gray-600">View API health status</p>
            </a>
            
            <a
              href="/api/usage-stats"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
            >
              <div className="text-2xl mb-2">📊</div>
              <h3 className="font-medium text-gray-900">Usage Stats</h3>
              <p className="text-sm text-gray-600">View API usage statistics</p>
            </a>
            
            <a
              href="/api/streaming-quota"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
            >
              <div className="text-2xl mb-2">🔍</div>
              <h3 className="font-medium text-gray-900">Quota Monitor</h3>
              <p className="text-sm text-gray-600">Check streaming API quotas</p>
            </a>
            
            <button
              onClick={() => window.location.reload()}
              className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors text-left"
            >
              <div className="text-2xl mb-2">🔄</div>
              <h3 className="font-medium text-gray-900">Reload App</h3>
              <p className="text-sm text-gray-600">Refresh the application</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;