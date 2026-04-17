import React, { useState } from 'react';
import { API_ENDPOINTS, apiRequest } from '../../config/api';
import { ensureDevUserSession } from '../../services/devAuth';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (token: string, user: { id: string; email: string }) => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? API_ENDPOINTS.auth.login : API_ENDPOINTS.auth.signup;
      const response = await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (response.success && response.token && response.user) {
        // Store token in localStorage
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('current_user_id', response.user.id);

        onLoginSuccess(response.token, response.user);
        onClose();

        // Reset form
        setEmail('');
        setPassword('');
      } else {
        setError('Authentication failed. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleTestLogin = async () => {
    setEmail('test@example.com');
    setPassword('password123');
    setError('');
    setLoading(true);

    try {
      const response = await ensureDevUserSession('test@example.com', 'password123');

      if (response.token && response.user) {
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('current_user_id', response.user.id);

        onLoginSuccess(response.token, response.user);
        onClose();
      } else {
        setError('Test login failed. The API did not return a session.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test login failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{isLogin ? 'Login' : 'Sign Up'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
              minLength={8}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Please wait...' : isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-4 space-y-2">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="w-full text-sm text-blue-600 hover:text-blue-800"
          >
            {isLogin ? 'Need an account? Sign up' : 'Already have an account? Login'}
          </button>

          <button
            onClick={handleTestLogin}
            disabled={loading}
            className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Quick Test Login'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
