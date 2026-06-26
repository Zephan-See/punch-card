import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useContext, lazy, Suspense } from 'react';
import { AuthContext, AuthProvider } from './AuthContext';
import Login from './pages/Login';
import Home from './pages/Home';
import InstallPrompt from './components/InstallPrompt';
import NotificationManager from './components/NotificationManager';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy-loaded routes — split into separate chunks so the initial bundle
// stays small. Each page loads on first navigation.
const CheckIn = lazy(() => import('./pages/CheckIn'));
const Wall = lazy(() => import('./pages/Wall'));
const Feed = lazy(() => import('./pages/Feed'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Profile = lazy(() => import('./pages/Profile'));
const Goals = lazy(() => import('./pages/Goals'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));

const Loading = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin"></div>
  </div>
);

function AppContent() {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <Loading />;

  return (
    <Router>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/home" />} />
          {/* /reset is reachable from the email link even though Supabase auto-creates a recovery session */}
          <Route path="/reset" element={<ResetPassword />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/" element={user ? <Navigate to="/home" /> : <Navigate to="/login" />} />
          <Route path="/home" element={user ? <Home /> : <Navigate to="/login" />} />
          <Route path="/checkin" element={user ? <CheckIn /> : <Navigate to="/login" />} />
          <Route path="/wall" element={user ? <Wall /> : <Navigate to="/login" />} />
          <Route path="/wall/:userId" element={user ? <Wall /> : <Navigate to="/login" />} />
          <Route path="/feed" element={user ? <Feed /> : <Navigate to="/login" />} />
          <Route path="/leaderboard" element={user ? <Leaderboard /> : <Navigate to="/login" />} />
          <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" />} />
          <Route path="/goals" element={user ? <Goals /> : <Navigate to="/login" />} />
          <Route path="/admin" element={user ? <AdminDashboard /> : <Navigate to="/login" />} />
        </Routes>
      </Suspense>
      <InstallPrompt />
      {user && <NotificationManager />}
    </Router>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
