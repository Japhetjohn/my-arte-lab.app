import { useState, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { TopNavigation } from '@/components/layout/TopNavigation';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { AuthProvider, useAuth, api } from '@/contexts/AuthContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';

import { Login } from '@/pages/auth/Login';
import { Register } from '@/pages/auth/Register';
import { Onboarding } from '@/pages/auth/Onboarding';
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
import { CreatorProfile } from '@/pages/CreatorProfile';
import { PostDetail } from '@/pages/PostDetail';
import { Explore } from '@/pages/Explore';
import { Creators } from '@/pages/Creators';
import { Legal } from '@/pages/Legal';
import { PrivacyPolicy } from '@/pages/PrivacyPolicy';
import { EmptyState, preloadOfflineImage } from '@/components/shared/EmptyState';
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
    
    // Preload offline image for when user goes offline
    preloadOfflineImage();
    
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
        // Messages API returns { count }, notifications returns { unreadCount }
        const msgCount = msgRes?.data?.data?.count || msgRes?.data?.data?.unreadCount || 0;
        setUnreadMessages(msgCount);
      } catch (error) {
        // Silently fail - don't spam console with server errors
      }
    };
    
    fetchCounts();
    // Poll every 30 seconds
    const interval = setInterval(fetchCounts, 30000);
    
    // Listen for messages being marked as read
    const handleMessagesRead = () => {
      fetchCounts();
    };
    window.addEventListener('messagesRead', handleMessagesRead);

    // Listen for notifications being updated or marked as read
    const handleNotificationsUpdated = (e: any) => {
      if (typeof e?.detail?.unreadCount === 'number') {
        setUnreadNotifications(e.detail.unreadCount);
      } else {
        fetchCounts();
      }
    };
    window.addEventListener('notificationsUpdated', handleNotificationsUpdated);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('messagesRead', handleMessagesRead);
      window.removeEventListener('notificationsUpdated', handleNotificationsUpdated);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  
  // Keep currentPath in sync with actual pathname (not full URL with query params)
  useEffect(() => {
    const syncPath = () => setCurrentPath(window.location.pathname);
    // Sync on any navigation event
    window.addEventListener('hashchange', syncPath);
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    window.history.pushState = function(...args) {
      originalPushState.apply(this, args);
      syncPath();
    };
    window.history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      syncPath();
    };
    return () => {
      window.removeEventListener('hashchange', syncPath);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    // Only update pathname for routing, ignore query params
    setCurrentPath(window.location.pathname);
  };

  // Get creator ID from URL for dynamic routing
  const getCreatorFromPath = (path: string) => {
    const match = path.match(/\/creators?\/(.+)/);
    if (match) {
      return match[1];
    }
    return null;
  };

  // Normalize currentPath to remove trailing slash (except for '/')
  const normalizedPath = currentPath.length > 1 && currentPath.endsWith('/')
    ? currentPath.slice(0, -1)
    : currentPath;

  // Show clean lightweight loading while auth state is initializing
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#9747FF] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Auth-only pages (rendered without the main app layout)
  const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/onboarding'];
  const isAuthRoute = authRoutes.some(route => normalizedPath.startsWith(route));

  if (isAuthRoute) {
    switch (true) {
      case normalizedPath === '/login':
        return isAuthenticated ? (user?.isOnboarded === false ? <NavigateToOnboarding /> : <NavigateToHome />) : <Login />;
      case normalizedPath === '/register':
        return isAuthenticated ? (user?.isOnboarded === false ? <NavigateToOnboarding /> : <NavigateToHome />) : <Register />;
      case normalizedPath === '/onboarding':
        return isAuthenticated ? (user?.isOnboarded === false ? <Onboarding /> : <NavigateToHome />) : <Login />;
      case normalizedPath === '/forgot-password':
        return <ForgotPassword />;
      case normalizedPath.startsWith('/reset-password'):
        return <ResetPassword />;
      case normalizedPath.startsWith('/verify-email'):
        return <VerifyEmail />;
      default:
        return <Login />;
    }
  }

  // Redirect authenticated users with genuinely incomplete onboarding to /onboarding
  if (!isLoading && isAuthenticated && user && user.isOnboarded === false && normalizedPath !== '/onboarding') {
    return <NavigateToOnboarding />;
  }

  // Public browsing pages: visible to guests and logged-in users
  const publicBrowsingRoutes = ['/', '/home', '/creators', '/explore', '/legal', '/privacy-policy'];
  const isPublicBrowsingRoute =
    publicBrowsingRoutes.includes(normalizedPath) ||
    normalizedPath.startsWith('/creator/') ||
    normalizedPath.startsWith('/creators/') ||
    normalizedPath.startsWith('/post/') ||
    normalizedPath.startsWith('/posts/');

  // Protected routes require authentication
  if (!isPublicBrowsingRoute && !isAuthenticated && !isLoading) {
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
    const creatorId = getCreatorFromPath(normalizedPath);
    if (creatorId) {
      return <CreatorProfile creatorId={creatorId} />;
    }

    // Check if it's a dedicated post detail page
    const postMatch = normalizedPath.match(/\/posts?\/(.+)/);
    if (postMatch) {
      return <PostDetail postId={postMatch[1]} />;
    }

    // Check if it's a booking detail page
    const bookingMatch = normalizedPath.match(/\/bookings?\/(.+)/);
    if (bookingMatch) {
      return <BookingDetail bookingId={bookingMatch[1]} />;
    }

    // Redirect obsolete Discover & Project routes cleanly to Home
    if (
      normalizedPath === '/discover' ||
      normalizedPath.startsWith('/discover/') ||
      normalizedPath === '/projects' ||
      normalizedPath.startsWith('/projects/')
    ) {
      return <NavigateToHome />;
    }

    switch (normalizedPath) {
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
      case '/profile':
        return <Settings />;
      case '/explore':
        return <Explore />;
      case '/creators':
        return <Creators />;
      case '/legal':
        return <Legal />;
      case '/privacy-policy':
        return <PrivacyPolicy />;
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

  const { isDark } = useTheme();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#121212] text-gray-900 dark:text-gray-100 transition-colors duration-150">
      <TopNavigation
        user={user}
        unreadNotifications={unreadNotifications}
        unreadMessages={unreadMessages}
        onLogout={logout}
        onNavigate={navigate}
      />
      
      <main className="min-h-[calc(100vh-4rem)] p-3 sm:p-4 lg:p-6 xl:p-8 pb-24 lg:pb-8">
        <div className="max-w-7xl mx-auto">
          {renderPage()}
        </div>
      </main>
      
      <BottomNavigation currentPath={currentPath} />
      <Toaster theme={isDark ? 'dark' : 'light'} />
    </div>
  );
}

function NavigateToHome() {
  window.location.href = '/home';
  return null;
}

function NavigateToOnboarding() {
  window.location.href = '/onboarding';
  return null;
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
