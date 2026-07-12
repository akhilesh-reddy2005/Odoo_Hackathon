import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute({ children, requiredPermission }) {
  const { user, loading, hasPermission } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-darkbg-base flex flex-col items-center justify-center">
        <div className="relative w-16 h-16">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-brand-orange/20 rounded-full"></div>
          <div className="absolute top-0 left-0 w-full h-full border-4 border-t-brand-orange rounded-full animate-spin"></div>
        </div>
        <p className="text-gray-400 mt-4 font-medium animate-pulse">Initializing transit operations session...</p>
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
