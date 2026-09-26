import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import AdminDashboard from './pages/Dashboard'; // Rename existing default as Admin
import AccommodationDashboard from './pages/dashboards/AccommodationDashboard';
import VendorDashboard from './pages/dashboards/VendorDashboard';
import TourProviderDashboard from './pages/dashboards/TourProviderDashboard';
import ProviderRegister from './pages/ProviderRegister';

import Users from './pages/Users';
import Vendors from './pages/Vendors';
import Bookings from './pages/Bookings';
import SOSAlerts from './pages/SOSAlerts';
import SOSMonitor from './pages/SOSMonitor';
import Guides from './pages/Guides';
import Login from './pages/Login';
import Destinations from './pages/Destinations';
import CulturalEvents from './pages/CulturalEvents';
import Analytics from './pages/Analytics';
import Notifications from './pages/Notifications';
import SystemHealth from './pages/SystemHealth';
import Reports from './pages/Reports';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';
import './App.css';

// Private Route Component
function PrivateRoute({ children, allowedRoles }) {
  const { currentUser, userRole } = useAuth();

  // If not logged in, redirect to login page
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Check role-based access if allowedRoles are provided
  // Note: userRole might be undefined initially if not fully loaded, 
  // but AuthContext blocks render until loading is false.
  if (allowedRoles && userRole && !allowedRoles.includes(userRole) && userRole !== 'super_admin' && userRole !== 'admin') {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

function Unauthorized() {
  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h1>403 - Unauthorized</h1>
      <p>You do not have permission to view this page.</p>
      <a href="/">Go to Dashboard</a>
    </div>
  );
}

function RoleBasedDashboard() {
  const { userRole } = useAuth();

  if (userRole === 'accommodation') return <AccommodationDashboard />;
  if (userRole === 'vendor') return <VendorDashboard />;
  if (userRole === 'tour_provider') return <TourProviderDashboard />;

  // Default to Admin Dashboard for 'admin' or undefined (for now)
  return <AdminDashboard />;
}

import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <Router>
          <AuthProvider>
            <Routes>
            {/* Public Route */}
            <Route path="/login" element={<Login />} />
            <Route path="/register-provider" element={<ProviderRegister />} />

            {/* Protected Routes wrapped in Layout */}
            <Route path="/" element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }>
              <Route index element={<RoleBasedDashboard />} />
              <Route path="users" element={<PrivateRoute allowedRoles={['support', 'manager']}><Users /></PrivateRoute>} />
              <Route path="vendors" element={<PrivateRoute allowedRoles={['vendor_manager', 'manager']}><Vendors /></PrivateRoute>} />
              <Route path="bookings" element={<PrivateRoute allowedRoles={['finance', 'support', 'vendor_manager', 'manager']}><Bookings /></PrivateRoute>} />
              <Route path="sos" element={<PrivateRoute allowedRoles={['support', 'manager']}><SOSMonitor /></PrivateRoute>} />
              <Route path="guides" element={<PrivateRoute allowedRoles={['guide_manager', 'manager']}><Guides /></PrivateRoute>} />
              <Route path="destinations" element={<PrivateRoute allowedRoles={['content_manager', 'manager']}><Destinations /></PrivateRoute>} />
              <Route path="events" element={<PrivateRoute allowedRoles={['content_manager', 'manager']}><CulturalEvents /></PrivateRoute>} />
              <Route path="analytics" element={<PrivateRoute allowedRoles={['finance', 'manager']}><Analytics /></PrivateRoute>} />
              <Route path="notifications" element={<PrivateRoute allowedRoles={['support', 'content_manager', 'manager']}><Notifications /></PrivateRoute>} />
              <Route path="health" element={<PrivateRoute allowedRoles={['manager']}><SystemHealth /></PrivateRoute>} />
              <Route path="reports" element={<PrivateRoute allowedRoles={['finance', 'vendor_manager', 'manager']}><Reports /></PrivateRoute>} />
            </Route>

            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
        </Router>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
