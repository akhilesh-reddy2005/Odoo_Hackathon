import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './layouts/Layout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Fleet from './pages/Fleet';
import Drivers from './pages/Drivers';
import Trips from './pages/Trips';
import Maintenance from './pages/Maintenance';
import FuelExpenses from './pages/FuelExpenses';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';

export default function App() {
  return (
    <Router>
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
              background: '#0e1420',
              color: '#d1d5db',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              fontFamily: 'Inter, sans-serif',
              fontSize: '13px',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)'
            },
            success: {
              iconTheme: {
                primary: '#f97316',
                secondary: '#ffffff',
              },
            },
          }}
        />
      </AuthProvider>
    </Router>
  );
}
