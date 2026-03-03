// src/components/shared/PrivateRoute.tsx

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  requireAdmin?: boolean;
}

export default function PrivateRoute({ requireAdmin = false }: Props) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const location = useLocation();

  // Show nothing while session is being restored from localStorage
  if (isLoading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    // User is logged in but doesn't have admin role
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}