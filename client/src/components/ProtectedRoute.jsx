import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Spinner from './Spinner';

export default function ProtectedRoute({ children, requiredPermission }) {
  const { user, loading, hasPermission } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-page flex flex-col items-center justify-center">
        <Spinner size="lg" />
        <p className="text-ink-muted mt-4 text-sm font-medium">Loading your workspace...</p>
      </div>
    );
  }

  if (!user) {
    // Redirect to login page while preserving search query locations
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    // Redirect to Dashboard if authorization permission is missing
    return <Navigate to="/" replace />;
  }

  return children;
}
