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
function PrivateRoute({ children }) {
  const { currentUser } = useAuth();

  // If not logged in, redirect to login page
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Ideally verify admin role here too, e.g.:
  // if (currentUser.role !== 'admin') { return <Navigate to="/unauthorized" />; }

  return children;
}

function RoleBasedDashboard() {
  const { userRole } = useAuth();

  if (userRole === 'accommodation') return <AccommodationDashboard />;
  if (userRole === 'vendor') return <VendorDashboard />;
  if (userRole === 'tour_provider') return <TourProviderDashboard />;

  // Default to Admin Dashboard for 'admin' or undefined (for now)
  return <AdminDashboard />;
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
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
              <Route path="users" element={<Users />} />
              <Route path="vendors" element={<Vendors />} />
              <Route path="bookings" element={<Bookings />} />
              <Route path="sos" element={<SOSMonitor />} />
              <Route path="destinations" element={<Destinations />} />
              <Route path="events" element={<CulturalEvents />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="health" element={<SystemHealth />} />
              <Route path="reports" element={<Reports />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
