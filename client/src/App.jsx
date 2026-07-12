import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './layouts/Layout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Fleet from './pages/Fleet';
import Drivers from './pages/Drivers';
import Trips from './pages/Trips';
import TripDetails from './pages/TripDetails';
import Maintenance from './pages/Maintenance';
import FuelExpenses from './pages/FuelExpenses';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';

export default function App() {
  return (
    <Router>
      <ThemeProvider>
      <AuthProvider>
        <Routes>
          {/* Public Portal */}
          <Route path="/login" element={<Login />} />

          {/* Secure System ERP Dashboard */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Index: Operations Dashboard */}
            <Route index element={<Dashboard />} />

            {/* Modules */}
            <Route 
              path="fleet" 
              element={
                <ProtectedRoute requiredPermission="fleet">
                  <Fleet />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="drivers" 
              element={
                <ProtectedRoute requiredPermission="drivers">
                  <Drivers />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="trips" 
              element={
                <ProtectedRoute requiredPermission="trips">
                  <Trips />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="trips/:id" 
              element={
                <ProtectedRoute requiredPermission="trips">
                  <TripDetails />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="maintenance" 
              element={
                <ProtectedRoute requiredPermission="maintenance">
                  <Maintenance />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="fuel-expenses" 
              element={
                <ProtectedRoute requiredPermission="fuel">
                  <FuelExpenses />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="analytics" 
              element={
                <ProtectedRoute requiredPermission="analytics">
                  <Analytics />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="settings" 
              element={
                <ProtectedRoute requiredPermission="settings">
                  <Settings />
                </ProtectedRoute>
              } 
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>

        {/* Global Floating Toasts */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'rgb(var(--bg-surface))',
              color: 'rgb(var(--text-secondary))',
              border: '1px solid rgb(var(--border-default))',
              borderRadius: '10px',
              fontFamily: 'Inter, sans-serif',
              fontSize: '13px',
              boxShadow: '0 4px 16px 0 rgba(15, 23, 42, 0.08)'
            },
            success: {
              iconTheme: {
                primary: '#4F46E5',
                secondary: '#ffffff',
              },
            },
            error: {
              iconTheme: {
                primary: '#DC2626',
                secondary: '#ffffff',
              },
            },
          }}
        />
      </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}
