import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingModal } from '@/components/modals/LoadingModal';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireVerified?: boolean;
}

export function ProtectedRoute({ children, requireVerified = true }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingModal isOpen={true} message="Checking authentication..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireVerified && !user?.isEmailVerified) {
    return <Navigate to="/verify-email" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

// Public route - redirects to home if already logged in
export function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || '/home';

  if (isLoading) {
    return <LoadingModal isOpen={true} message="Loading..." />;
  }

  if (isAuthenticated) {
    if (!user?.isEmailVerified) {
      return <Navigate to="/verify-email" replace />;
    }
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
}
