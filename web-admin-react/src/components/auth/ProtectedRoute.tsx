import { Navigate, Outlet, useLocation } from 'react-router-dom';
import apiService from '@/services/api';
import { ROUTES } from '@/utils/routes';

export const ProtectedRoute = () => {
  const location = useLocation();
  const isAuthenticated = apiService.isAuthenticated();
  
  if (!isAuthenticated) {
    // Save the current location so we can redirect back after login
    return <Navigate to={ROUTES.LOGIN} state={{ from: location.pathname }} replace />;
  }
  
  return <Outlet />;
};
