import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Layout Components
import Layout from './components/Layout';

// Page Components
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import MyShows from './pages/MyShows';
import Calendar from './pages/Calendar';
import Recommendations from './pages/Recommendations';
import SearchShows from './pages/SearchShows';
import Settings from './pages/Settings';
import Admin from './pages/Admin';

function App() {
  return (
    <Router>
      <Routes>
        {/* Landing Page (public) */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Main App Routes (with navigation layout) */}
        <Route path="/" element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/my-shows" element={<MyShows />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/search" element={<SearchShows />} />
          <Route path="/settings" element={<Settings />} />
          
          {/* Development Routes */}
          {process.env.NODE_ENV === 'development' && (
            <Route path="/admin" element={<Admin />} />
          )}
        </Route>

        {/* Redirect /app to /dashboard for convenience */}
        <Route path="/app" element={<Navigate to="/dashboard" replace />} />

        {/* Catch all route - redirect to landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;