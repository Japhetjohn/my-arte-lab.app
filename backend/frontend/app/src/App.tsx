import { useState, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { TopNavigation } from '@/components/layout/TopNavigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { AuthProvider, useAuth, api } from '@/contexts/AuthContext';

import { Login } from '@/pages/auth/Login';
import { Register } from '@/pages/auth/Register';
import { VerifyEmail } from '@/pages/auth/VerifyEmail';
import { ForgotPassword } from '@/pages/auth/ForgotPassword';
import { ResetPassword } from '@/pages/auth/ResetPassword';
import { Home } from '@/pages/Home';
import { Bookings } from '@/pages/Bookings';
import { BookingDetail } from '@/pages/BookingDetail';
import { Wallet } from '@/pages/Wallet';
import { Messages } from '@/pages/Messages';
import { Notifications } from '@/pages/Notifications';
import { Settings } from '@/pages/Settings';
import { Projects } from '@/pages/Projects';
import { CreatorProfile } from '@/pages/CreatorProfile';
import { Explore } from '@/pages/Explore';
import { Creators } from '@/pages/Creators';
import { EmptyState } from '@/components/shared/EmptyState';
import { Toaster } from '@/components/ui/sonner';
import './App.css';

// Main App Content Component
function AppContent() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch notification counts
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const fetchCounts = async () => {
      try {
        const [notifRes, msgRes] = await Promise.all([
          api.get('/notifications/unread-count').catch(() => null),
          api.get('/messages/unread-count').catch(() => null)
        ]);
        setUnreadNotifications(notifRes?.data?.data?.unreadCount || 0);
        setUnreadMessages(msgRes?.data?.data?.unreadCount || 0);
      } catch (error) {
        // Silently fail - don't spam console with server errors
      }
    };
    
    fetchCounts();
    // Poll every 30 seconds
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  // Get creator ID from URL for dynamic routing
  const getCreatorFromPath = (path: string) => {
    const match = path.match(/\/creator\/(.+)/);
    if (match) {
      return match[1];
    }
    return null;
  };

  // Public routes (no auth required)
  const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];
  const isPublicRoute = publicRoutes.some(route => currentPath.startsWith(route));

  // If on public route, render auth pages
  if (isPublicRoute) {
    switch (true) {
      case currentPath === '/login':
        return isAuthenticated ? <NavigateToHome /> : <Login />;
      case currentPath === '/register':
        return isAuthenticated ? <NavigateToHome /> : <Register />;
      case currentPath === '/forgot-password':
        return <ForgotPassword />;
      case currentPath.startsWith('/reset-password'):
        return <ResetPassword />;
      default:
        return <Login />;
    }
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated && !isLoading) {
    window.location.href = '/login';
    return null;
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8A2BE2]"></div>
      </div>
    );
  }

  const renderPage = () => {
    if (!isOnline) {
      return (
        <EmptyState
          image="/images/offline.png"
          title="You are offline"
          description="Please check your internet connection and try again"
          actionLabel="Retry"
          onAction={() => window.location.reload()}
        />
      );
    }

    // Check if it's a creator profile page
    const creatorId = getCreatorFromPath(currentPath);
    if (creatorId) {
      return <CreatorProfile creatorId={creatorId} />;
    }

    // Check if it's a booking detail page
    const bookingMatch = currentPath.match(/\/bookings\/(.+)/);
    if (bookingMatch) {
      return <BookingDetail bookingId={bookingMatch[1]} />;
    }

    switch (currentPath) {
      case '/':
      case '/home':
        return <Home />;
      case '/bookings':
        return <Bookings />;
      case '/wallet':
        return <Wallet />;
      case '/messages':
        return <Messages />;
      case '/notifications':
        return <Notifications />;
      case '/settings':
        return <Settings />;
      case '/projects':
        return <Projects />;
      case '/explore':
        return <Explore />;
      case '/creators':
        return <Creators />;
      case '/profile':
        return user ? <CreatorProfile creatorId={user.id} isOwnProfile={true} /> : <Settings />;
      case '/verify-email':
        return <VerifyEmail />;
      default:
        return (
          <EmptyState
            image="/images/error.png"
            title="Page Not Found"
            description="The page you are looking for does not exist"
            actionLabel="Go Home"
            onAction={() => navigate('/home')}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavigation
        user={user}
        unreadNotifications={unreadNotifications}
        unreadMessages={unreadMessages}
        onSearch={(query) => navigate(`/explore?q=${query}`)}
        onLogout={logout}
      />
      
      <div className="flex">
        <Sidebar currentPath={currentPath} />
        
        <main className="flex-1 min-h-[calc(100vh-4rem)] p-3 sm:p-4 lg:p-6 xl:p-8 pb-24 lg:pb-8">
          <div className="max-w-7xl mx-auto">
            {renderPage()}
          </div>
        </main>
      </div>
      
      <BottomNavigation currentPath={currentPath} />
    </div>
  );
}

function NavigateToHome() {
  window.location.href = '/home';
  return null;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
