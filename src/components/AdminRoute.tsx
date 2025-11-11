import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface AdminRouteProps {
  children: ReactNode;
}

export const AdminRoute = ({ children }: AdminRouteProps) => {
  const { isAuthenticated, loading } = useAdminAuth();
  const location = useLocation();

  // Check if this is a client route being accessed by an admin
  const isClientRoute = !location.pathname.startsWith('/admin') && location.pathname !== '/users' && location.pathname !== '/';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin-auth" replace />;
  }

  // If an admin tries to access client routes, redirect to admin dashboard
  if (isClientRoute) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <>{children}</>;
};