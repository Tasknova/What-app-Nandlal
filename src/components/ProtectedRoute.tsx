import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useClientAuth } from '@/hooks/useClientAuth';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading } = useClientAuth();
  const location = useLocation();

  // Check if this is an admin route being accessed by a client
  const isAdminRoute = location.pathname.startsWith('/admin') || location.pathname === '/users';
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // If a client tries to access admin routes, redirect to client dashboard
  if (isAdminRoute) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;