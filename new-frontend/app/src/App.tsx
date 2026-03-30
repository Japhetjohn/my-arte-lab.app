import { useState, useEffect } from 'react';
import { TopNavigation } from '@/components/layout/TopNavigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { Home } from '@/pages/Home';
import { Bookings } from '@/pages/Bookings';
import { Wallet } from '@/pages/Wallet';
import { Messages } from '@/pages/Messages';
import { Notifications } from '@/pages/Notifications';
import { Settings } from '@/pages/Settings';
import { Projects } from '@/pages/Projects';
import { CreatorProfile } from '@/pages/CreatorProfile';
import { Explore } from '@/pages/Explore';
import { Creators } from '@/pages/Creators';
import { currentUser, notifications, conversations, creators } from '@/lib/data/mockData';
import { EmptyState } from '@/components/ui-custom/EmptyState';
import './App.css';

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const unreadNotifications = notifications.filter(n => !n.isRead).length;
  const unreadMessages = conversations.reduce((acc, conv) => acc + conv.unreadCount, 0);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  // Get creator ID from URL for dynamic routing
  const getCreatorFromPath = (path: string) => {
    const match = path.match(/\/creator\/(.+)/);
    if (match) {
      const creatorId = match[1];
      return creators.find(c => c.id === creatorId) || null;
    }
    return null;
  };

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
    const creator = getCreatorFromPath(currentPath);
    if (creator) {
      return <CreatorProfile creatorId={creator.id} />;
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
        return <Settings />;
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
        user={currentUser}
        unreadNotifications={unreadNotifications}
        unreadMessages={unreadMessages}
        onSearch={(query) => navigate(`/explore?q=${query}`)}
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

export default App;
