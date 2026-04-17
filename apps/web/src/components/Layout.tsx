import React, { useState } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { Tv, Search, Sparkles, Settings, LogOut, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import UserSwitcher from './UserSwitcher';
import LoginModal from './Auth/LoginModal';

const navigation = [
  { name: 'My Shows', href: '/my-shows', icon: Tv },
  { name: 'Search', href: '/search', icon: Search },
  { name: 'Plan', href: '/plan', icon: Sparkles },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, login, logout } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const handleLoginSuccess = (token: string, userData: { id: string; email: string }) => {
    login(token, userData);
    setIsLoginModalOpen(false);
    navigate('/my-shows');
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/my-shows" className="text-2xl font-bold text-primary-600">
              Tally
            </Link>

            {/* Main Navigation */}
            <nav className="hidden md:flex space-x-1">
              {navigation.map(({ name, href, icon: Icon }) => (
                <Link
                  key={name}
                  to={href}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(href)
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={16} />
                  {name}
                </Link>
              ))}
            </nav>

            {/* User Menu */}
            <div className="flex items-center">
              {isAuthenticated ? (
                <div className="flex items-center gap-3">
                  <span className="hidden sm:block text-sm text-gray-500">{user?.email}</span>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    <LogOut size={16} />
                    <span className="hidden sm:inline">Log out</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md transition-colors"
                >
                  <LogIn size={16} />
                  Log in
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-gray-200">
          <div className="flex">
            {navigation.map(({ name, href, icon: Icon }) => (
              <Link
                key={name}
                to={href}
                className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                  isActive(href) ? 'text-primary-700' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Icon size={20} />
                {name}
              </Link>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        <Outlet />
      </main>

      {/* Dev overlay — only in development, not in the header */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
          <UserSwitcher />
          <Link
            to="/admin"
            className="px-3 py-1.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-md border border-yellow-200 hover:bg-yellow-200 transition-colors"
          >
            Admin
          </Link>
        </div>
      )}

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
};

export default Layout;
