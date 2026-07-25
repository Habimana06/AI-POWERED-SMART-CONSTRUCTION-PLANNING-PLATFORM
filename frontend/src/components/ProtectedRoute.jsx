import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingScreen from './LoadingScreen';

export default function ProtectedRoute({ children, roles = [] }) {
  const { isAuthenticated, loading, user, hasRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen message="Authenticating..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles.length > 0 && !hasRole(...roles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
