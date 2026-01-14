import { BrowserRouter as Router, Routes, Route, Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import { useEffect } from 'react';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import GuildPage from './pages/GuildPage';
import Navbar from './components/Navbar';

// Component to handle dashboard route with OAuth callback support
function DashboardRoute() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, checkAuth } = useAuthStore();

  useEffect(() => {
    const authSuccess = searchParams.get('auth');
    const token = searchParams.get('token');

    console.log('🔍 Dashboard Route - auth parameter:', authSuccess);
    console.log('🔍 Dashboard Route - token received:', token ? '✅ YES' : '❌ NO');
    console.log('🔍 Dashboard Route - isAuthenticated:', isAuthenticated);

    // Handle OAuth callback
    if (authSuccess === 'success' && token) {
      console.log('✅ OAuth success detected with token, storing token...');

      // Store the token in localStorage
      localStorage.setItem('token', token);
      console.log('💾 Token stored in localStorage');

      // Force recheck authentication after OAuth login
      checkAuth().then(() => {
        console.log('✅ Auth check completed, navigating to dashboard');
        // Remove the query parameters and stay on dashboard
        navigate('/dashboard', { replace: true });
      });
    } else if (authSuccess === 'success' && !token) {
      console.log('⚠️ OAuth success but no token received, checking auth anyway...');
      checkAuth().then(() => {
        navigate('/dashboard', { replace: true });
      });
    }
  }, [searchParams, checkAuth, navigate, isAuthenticated]);

  // If this is an OAuth callback (has auth=success param), show dashboard
  const authParam = searchParams.get('auth');
  if (authParam === 'success') {
    console.log('📍 OAuth callback detected, rendering dashboard');
    return <DashboardPage />;
  }

  // Normal authentication check
  console.log('📍 Normal dashboard access, checking authentication');
  return isAuthenticated ? <DashboardPage /> : <Navigate to="/login" />;
}

function App() {
  const { checkAuth, isAuthenticated } = useAuthStore();
  const initTheme = useThemeStore((state) => state.initTheme);

  useEffect(() => {
    checkAuth();
    initTheme();
  }, [checkAuth, initTheme]);

  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />}
        />
        <Route
          path="/dashboard"
          element={<DashboardRoute />}
        />
        <Route
          path="/guilds"
          element={isAuthenticated ? <GuildPage /> : <Navigate to="/login" />}
        />
      </Routes>
    </Router>
  );
}

export default App;
