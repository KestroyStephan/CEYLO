import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import React, { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';

// Lazy loading all route components for performance (Code Splitting)
const AdminDashboard = lazy(() => import('./pages/Dashboard')); // Rename existing default as Admin
const AccommodationDashboard = lazy(() => import('./pages/dashboards/AccommodationDashboard'));
const VendorDashboard = lazy(() => import('./pages/dashboards/VendorDashboard'));
const TourProviderDashboard = lazy(() => import('./pages/dashboards/TourProviderDashboard'));
const ProviderRegister = lazy(() => import('./pages/ProviderRegister'));
const Users = lazy(() => import('./pages/Users'));
const Vendors = lazy(() => import('./pages/Vendors'));
const Bookings = lazy(() => import('./pages/Bookings'));
const SOSAlerts = lazy(() => import('./pages/SOSAlerts'));
const SOSMonitor = lazy(() => import('./pages/SOSMonitor'));
const Guides = lazy(() => import('./pages/Guides'));
const Drivers = lazy(() => import('./pages/Drivers'));
const Login = lazy(() => import('./pages/Login'));
const Destinations = lazy(() => import('./pages/Destinations'));
const CulturalEvents = lazy(() => import('./pages/CulturalEvents'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Marketing = lazy(() => import('./pages/Marketing'));
const AICenter = lazy(() => import('./pages/AICenter'));
const Notifications = lazy(() => import('./pages/Notifications'));
const SystemHealth = lazy(() => import('./pages/SystemHealth'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));

import { ThemeProvider } from '@mui/material/styles';
import { CircularProgress, Box } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';
import './App.css';

// Staff who may use the admin portal; admin and super_admin can open every page
export const STAFF_ROLES = ['admin', 'super_admin', 'manager', 'support', 'finance', 'vendor_manager', 'guide_manager', 'content_manager'];
// Partners who get their own dashboard on the portal
export const PROVIDER_ROLES = ['accommodation', 'vendor', 'vendor_active', 'tour_provider'];

// Private Route Component
function PrivateRoute({ children, allowedRoles }) {
  const { currentUser, userRole } = useAuth();

  // If not logged in, redirect to login page
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Accounts without a portal role (tourists, drivers, guides, missing profile) never get in
  if (!STAFF_ROLES.includes(userRole) && !PROVIDER_ROLES.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole) && userRole !== 'super_admin' && userRole !== 'admin') {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

function Unauthorized() {
  const { currentUser, logout } = useAuth();
  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h1>403 - Unauthorized</h1>
      <p>You do not have permission to view this page.</p>
      <a href="/">Go to Dashboard</a>
      {currentUser && (
        <p><button onClick={logout} style={{ marginTop: 16 }}>Sign out</button></p>
      )}
    </div>
  );
}

function RoleBasedDashboard() {
  const { userRole } = useAuth();

  if (userRole === 'accommodation') return <AccommodationDashboard />;
  if (userRole === 'vendor' || userRole === 'vendor_active') return <VendorDashboard />;
  if (userRole === 'tour_provider') return <TourProviderDashboard />;
  if (STAFF_ROLES.includes(userRole)) return <AdminDashboard />;

  return <Navigate to="/unauthorized" replace />;
}

import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <Router>
          <AuthProvider>
            <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: '#F8F9FA' }}><CircularProgress sx={{ color: '#006A3B' }} /></Box>}>
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
                <Route path="drivers" element={<PrivateRoute allowedRoles={['support', 'manager']}><Drivers /></PrivateRoute>} />
                <Route path="destinations" element={<PrivateRoute allowedRoles={['content_manager', 'manager']}><Destinations /></PrivateRoute>} />
                <Route path="events" element={<PrivateRoute allowedRoles={['content_manager', 'manager']}><CulturalEvents /></PrivateRoute>} />
                <Route path="analytics" element={<PrivateRoute allowedRoles={['finance', 'manager']}><Analytics /></PrivateRoute>} />
                <Route path="marketing" element={<PrivateRoute allowedRoles={['content_manager', 'manager']}><Marketing /></PrivateRoute>} />
                <Route path="ai-center" element={<PrivateRoute allowedRoles={['manager']}><AICenter /></PrivateRoute>} />
                <Route path="notifications" element={<PrivateRoute allowedRoles={['support', 'content_manager', 'manager']}><Notifications /></PrivateRoute>} />
                <Route path="health" element={<PrivateRoute allowedRoles={['manager']}><SystemHealth /></PrivateRoute>} />
                <Route path="reports" element={<PrivateRoute allowedRoles={['finance', 'vendor_manager', 'manager']}><Reports /></PrivateRoute>} />
                <Route path="settings" element={<PrivateRoute allowedRoles={['super_admin', 'manager', 'admin']}><Settings /></PrivateRoute>} />
              </Route>

              <Route path="/unauthorized" element={<Unauthorized />} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </Suspense>
          </AuthProvider>
        </Router>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
