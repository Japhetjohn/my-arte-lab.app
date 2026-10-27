import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Spinner } from '@/components/ui/spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireVerified?: boolean;
}

export function ProtectedRoute({ children, requireVerified = true }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa] dark:bg-[#121212]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireVerified && !user?.isEmailVerified) {
    return <Navigate to="/verify-email" state={{ from: location }} replace />;
  }

  if (user && user.isOnboarded === false) {
    return <Navigate to="/onboarding" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

// Public route - redirects to home if already logged in
export function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || '/home';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa] dark:bg-[#121212]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isAuthenticated) {
    if (!user?.isEmailVerified) {
      return <Navigate to="/verify-email" replace />;
    }
    if (user?.isOnboarded === false) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
}
