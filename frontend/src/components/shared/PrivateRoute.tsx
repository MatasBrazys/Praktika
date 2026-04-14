// src/components/shared/PrivateRoute.tsx

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { UserRole } from '../../types';

interface Props {
  allowedRoles?: UserRole[];
}

export default function PrivateRoute({ allowedRoles }: Props) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user?.role as UserRole;
    if (!allowedRoles.includes(userRole)) {
      return <Navigate to="/" replace />;
    }
  }

  return <Outlet />;
}