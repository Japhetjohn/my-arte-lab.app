import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Bell, 
  MessageSquare, 
  User, 
  Settings, 
  Search,
  X,
  Clock,
  Menu,
  Home,
  Compass,
  Sparkles,
  Users,
  Calendar,
  FolderOpen,
  Wallet
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetTrigger
} from '@/components/ui/sheet';
import type { User as UserType } from '@/types';
import { getAvatarUrl } from '@/lib/imageUrl';

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  authOnly?: boolean;
}

const mobileNavItems: NavItem[] = [
  { path: '/home', label: 'Home', icon: Home },
  { path: '/discover', label: 'Discover', icon: Sparkles },
  { path: '/explore', label: 'Explore', icon: Compass },
  { path: '/creators', label: 'Creators', icon: Users },
  { path: '/bookings', label: 'Bookings', icon: Calendar, authOnly: true },
  { path: '/projects', label: 'Projects', icon: FolderOpen, authOnly: true },
  { path: '/messages', label: 'Messages', icon: MessageSquare, authOnly: true },
  { path: '/notifications', label: 'Notifications', icon: Bell, authOnly: true },
  { path: '/wallet', label: 'Wallet', icon: Wallet, authOnly: true },
  { path: '/profile', label: 'Profile', icon: User, authOnly: true },
  { path: '/settings', label: 'Settings', icon: Settings, authOnly: true },
];

interface TopNavigationProps {
  user: UserType | null;
  unreadNotifications: number;
  unreadMessages: number;
  onLogout?: () => void;
  onNavigate?: (path: string) => void;
}

export function TopNavigation({ 
  user, 
  unreadNotifications, 
  unreadMessages,
  onLogout,
  onNavigate,
}: TopNavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load recent searches from localStorage on mount or search toggle
  useEffect(() => {
    try {
      const stored = localStorage.getItem('myartelab_search_history');
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch {
      setRecentSearches([]);
    }
  }, [mobileSearchOpen]);

  // Focus input when search bar opens
  useEffect(() => {
    if (mobileSearchOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [mobileSearchOpen]);

  const executeSearch = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    // Save to history using same key as Explore.tsx
    try {
      const stored = localStorage.getItem('myartelab_search_history');
      const history = stored ? JSON.parse(stored) : [];
      const filtered = history.filter((h: string) => h.toLowerCase() !== trimmed.toLowerCase());
      localStorage.setItem('myartelab_search_history', JSON.stringify([trimmed, ...filtered].slice(0, 8)));
    } catch {}

    setMobileSearchOpen(false);

    const targetUrl = `/explore?q=${encodeURIComponent(trimmed)}`;
    if (window.location.pathname === '/explore') {
      window.location.search = `?q=${encodeURIComponent(trimmed)}`;
    } else {
      if (onNavigate) {
        onNavigate(targetUrl);
      } else {
        window.location.href = targetUrl;
      }
    }
  };

  const handleMobileSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(mobileSearchQuery);
  };

  const handleNavClick = (path: string) => {
    setMobileMenuOpen(false);
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.location.href = path;
    }
  };

  const handleLogout = () => {
    setMobileMenuOpen(false);
    if (onLogout) {
      onLogout();
    }
  };

  const isCurrentActive = (path: string) => {
    const currentPath = window.location.pathname;
    if (path === '/home') {
      return currentPath === '/' || currentPath === '/home';
    }
    if (path === '/creators') {
      return currentPath === '/creators' || currentPath.startsWith('/creators/') || currentPath.startsWith('/creator/');
    }
    return currentPath === path || currentPath.startsWith(path + '/');
  };

  const visibleMobileNavItems = mobileNavItems.filter((item) => !item.authOnly || !!user);

  return (
    <>
      {/* =========================================================================
          MOBILE VIEW: Simplified Mobile Header (lg:hidden)
          Strict requirements:
          - Logo on the left
          - Search icon
          - Profile/person icon
          - Hamburger menu at the far right
          - No visible horizontal navigation capsule/links
          ========================================================================= */}
      <div className="lg:hidden sticky top-0 z-50 w-full bg-white border-b border-gray-200/80">
        <div className="flex items-center justify-between h-14 sm:h-16 px-4 sm:px-6">
          {/* 1. Left: MyArteLab Brand Logo */}
          <a 
            href="/home" 
            onClick={(e) => { e.preventDefault(); handleNavClick('/home'); }}
            className="flex items-center shrink-0 cursor-pointer outline-none focus:outline-none"
            aria-label="MyArteLab Home"
          >
            <img 
              src="/images/logo.png" 
              alt="MyArteLab" 
              className="h-7 w-7 sm:h-8 sm:w-8 object-contain" 
            />
          </a>

          {/* 2. Right: Search icon, Profile/Person icon, Hamburger menu at far right */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
            {/* Search Icon */}
            <button
              type="button"
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className={`p-1.5 sm:p-2 transition-colors cursor-pointer outline-none focus:outline-none ${
                mobileSearchOpen ? 'text-[#9747FF]' : 'text-gray-800 hover:text-gray-950'
              }`}
              aria-label="Search"
            >
              <Search className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.75]" />
            </button>

            {/* Profile / Person Icon */}
            {user ? (
              <button
                type="button"
                onClick={() => handleNavClick('/profile')}
                className="p-1.5 sm:p-2 text-gray-800 hover:text-gray-950 transition-colors cursor-pointer outline-none focus:outline-none relative"
                aria-label="Profile"
              >
                <User className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.75]" />
                {(unreadNotifications > 0 || unreadMessages > 0) && (
                  <span className="absolute top-1 sm:top-1.5 right-1 sm:right-1.5 w-2 h-2 rounded-full bg-[#9747FF]" />
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleNavClick('/login')}
                className="p-1.5 sm:p-2 text-gray-800 hover:text-gray-950 transition-colors cursor-pointer outline-none focus:outline-none"
                aria-label="Log in"
              >
                <User className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.75]" />
              </button>
            )}

            {/* Hamburger Menu (Far Right) */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="p-1.5 sm:p-2 text-gray-800 hover:text-gray-950 transition-colors cursor-pointer outline-none focus:outline-none"
                  aria-label="Open navigation menu"
                >
                  <Menu className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.75]" />
                </button>
              </SheetTrigger>

              {/* Mobile Drawer (sliding in from right) */}
              <SheetContent 
                side="right" 
                className="w-[82vw] max-w-xs sm:max-w-sm p-0 flex flex-col h-full bg-[#fafafa] border-l border-gray-200/80 [&>button:last-child]:hidden [&>[data-slot=sheet-close]]:hidden"
              >
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <SheetDescription className="sr-only">MyArteLab mobile navigation drawer</SheetDescription>

                {/* Top Section: Title & Close control */}
                <div className="pt-6 pb-2 px-6 sm:px-7 shrink-0 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900 tracking-tight">Navigation</span>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 text-gray-500 hover:text-gray-950 transition-colors cursor-pointer outline-none focus:outline-none"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5 stroke-[1.75]" />
                  </button>
                </div>

                {/* Navigation Items: Home, Discover, Explore, Creators + Auth items */}
                <div className="flex-1 overflow-y-auto px-6 sm:px-7 pt-3 pb-6">
                  <nav className="space-y-4 sm:space-y-5">
                    {visibleMobileNavItems.map((item) => {
                      const Icon = item.icon;
                      const active = isCurrentActive(item.path);

                      return (
                        <button
                          key={item.path}
                          type="button"
                          onClick={() => handleNavClick(item.path)}
                          className={`w-full flex items-center gap-4 text-left transition-colors cursor-pointer group py-1.5 outline-none focus:outline-none ${
                            active 
                              ? 'text-[#9747FF] font-semibold' 
                              : 'text-gray-700 hover:text-gray-950 font-normal'
                          }`}
                        >
                          <Icon 
                            className={`w-5 h-5 shrink-0 transition-colors stroke-[1.75] ${
                              active 
                                ? 'text-[#9747FF]' 
                                : 'text-gray-500 group-hover:text-gray-900'
                            }`} 
                          />
                          <span className="text-base tracking-normal">
                            {item.label}
                          </span>
                          {item.path === '/messages' && unreadMessages > 0 && (
                            <span className="ml-auto text-xs bg-[#9747FF] text-white px-2 py-0.5 rounded-full font-bold">
                              {unreadMessages}
                            </span>
                          )}
                          {item.path === '/notifications' && unreadNotifications > 0 && (
                            <span className="ml-auto text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">
                              {unreadNotifications}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </nav>
                </div>

                {/* Bottom Section: Centered Logout / Login */}
                <div className="mt-auto shrink-0 bg-[#f3f4f6] w-full border-t border-gray-200/80 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] px-6 flex items-center justify-center">
                  {user ? (
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full text-center text-sm font-semibold text-red-600 hover:text-red-700 transition-colors cursor-pointer py-1.5 outline-none focus:outline-none"
                    >
                      Logout
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleNavClick('/login')}
                      className="w-full text-center text-sm font-semibold text-[#9747FF] hover:text-[#8534f0] transition-colors cursor-pointer py-1.5 outline-none focus:outline-none"
                    >
                      Log in
                    </button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Expandable Mobile Search Interface */}
        {mobileSearchOpen && (
          <div className="border-t border-gray-150 bg-white px-4 py-3 shadow-xs animate-in slide-in-from-top duration-200">
            <form onSubmit={handleMobileSearchSubmit} className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search creators, skills, city, country..."
                  className="pl-10 pr-9 h-10 bg-gray-50/90 border border-gray-200 text-gray-900 placeholder:text-gray-400 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-[#9747FF] focus-visible:border-[#9747FF]"
                  value={mobileSearchQuery}
                  onChange={(e) => setMobileSearchQuery(e.target.value)}
                  autoFocus
                />
                {mobileSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setMobileSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                    aria-label="Clear search input"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <Button
                type="submit"
                size="sm"
                className="h-10 px-4 rounded-xl bg-[#9747FF] hover:bg-[#8534f0] text-white text-xs font-semibold shadow-none cursor-pointer shrink-0"
              >
                Search
              </Button>
              <button
                type="button"
                onClick={() => setMobileSearchOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer shrink-0"
                aria-label="Close search"
              >
                <X className="w-5 h-5" />
              </button>
            </form>
            {recentSearches.length > 0 && (
              <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Recent:
                </span>
                {recentSearches.slice(0, 4).map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => {
                      setMobileSearchQuery(term);
                      executeSearch(term);
                    }}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1 rounded-full shrink-0 transition-colors cursor-pointer"
                  >
                    {term}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* =========================================================================
          DESKTOP VIEW: Global Consistent Header Matching media_1792622592203_1f622278.png
          Consistent across homepage and every page of the application.
          ========================================================================= */}
      <header className="hidden lg:block sticky top-0 z-50 w-full bg-white border-b border-gray-200/80 transition-all">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left: Original MyArteLab Logo & Wordmark */}
          <a 
            href="/home" 
            onClick={(e) => { e.preventDefault(); handleNavClick('/home'); }}
            className="flex items-center gap-2.5 shrink-0 group select-none cursor-pointer"
          >
            <img 
              src="/images/logo.png" 
              alt="MyArteLab" 
              className="h-7 w-7 object-contain shrink-0 transition-transform group-hover:scale-105" 
            />
            <span className="font-semibold text-lg tracking-[-0.015em] text-gray-900 antialiased leading-none">
              MyArteLab
            </span>
          </a>

          {/* Right: Navigation Links & Outlined Auth Button (Login when logged out, Logout when logged in) */}
          <div className="flex items-center gap-7 lg:gap-8">
            <nav className="flex items-center gap-7 lg:gap-8 text-sm font-medium">
              {/* Public navigation links (Always visible) */}
              <button 
                type="button" 
                onClick={() => handleNavClick('/home')} 
                className={`transition-colors hover:text-[#9747FF] cursor-pointer ${
                  isCurrentActive('/home') ? 'text-[#9747FF] font-semibold' : 'text-gray-700'
                }`}
              >
                Home
              </button>
              <button 
                type="button" 
                onClick={() => handleNavClick('/discover')} 
                className={`transition-colors hover:text-[#9747FF] cursor-pointer ${
                  isCurrentActive('/discover') ? 'text-[#9747FF] font-semibold' : 'text-gray-700'
                }`}
              >
                Discover
              </button>
              <button 
                type="button" 
                onClick={() => handleNavClick('/explore')} 
                className={`transition-colors hover:text-[#9747FF] cursor-pointer ${
                  isCurrentActive('/explore') ? 'text-[#9747FF] font-semibold' : 'text-gray-700'
                }`}
              >
                Explore
              </button>
              <button 
                type="button" 
                onClick={() => handleNavClick('/creators')} 
                className={`transition-colors hover:text-[#9747FF] cursor-pointer ${
                  isCurrentActive('/creators') ? 'text-[#9747FF] font-semibold' : 'text-gray-700'
                }`}
              >
                Creators
              </button>

              {/* Authenticated navigation options (Visible only when logged in) */}
              {user && (
                <>
                  <button 
                    type="button" 
                    onClick={() => handleNavClick('/bookings')} 
                    className={`transition-colors hover:text-[#9747FF] cursor-pointer ${
                      isCurrentActive('/bookings') ? 'text-[#9747FF] font-semibold' : 'text-gray-700'
                    }`}
                  >
                    Bookings
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleNavClick('/projects')} 
                    className={`transition-colors hover:text-[#9747FF] cursor-pointer ${
                      isCurrentActive('/projects') ? 'text-[#9747FF] font-semibold' : 'text-gray-700'
                    }`}
                  >
                    Projects
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleNavClick('/wallet')} 
                    className={`transition-colors hover:text-[#9747FF] cursor-pointer ${
                      isCurrentActive('/wallet') ? 'text-[#9747FF] font-semibold' : 'text-gray-700'
                    }`}
                  >
                    Wallet
                  </button>
                </>
              )}
            </nav>

            {/* Authenticated Quick Utilities (Messages, Notifications, User Avatar) */}
            {user && (
              <div className="flex items-center gap-1 sm:gap-2 pl-2 border-l border-gray-200">
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-9 w-9 text-gray-700 hover:text-gray-950"
                  onClick={() => handleNavClick('/messages')}
                  aria-label="Messages"
                >
                  <MessageSquare className="w-5 h-5" />
                  {unreadMessages > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#9747FF] text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                      {unreadMessages}
                    </span>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-9 w-9 text-gray-700 hover:text-gray-950"
                  onClick={() => handleNavClick('/notifications')}
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                      {unreadNotifications}
                    </span>
                  )}
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 px-1.5 h-9 rounded-full">
                      <img
                        src={getAvatarUrl(user?.avatar)}
                        alt={user?.name || 'User'}
                        className="w-7 h-7 rounded-full object-cover border border-gray-200"
                      />
                      <span className="font-medium text-sm text-gray-800">{user?.name || 'User'}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleNavClick('/profile')} className="cursor-pointer">
                      <User className="w-4 h-4 mr-2" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleNavClick('/settings')} className="cursor-pointer">
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Outlined Rounded Authentication Button: Login when logged out, Logout when logged in */}
            {user ? (
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full border border-gray-800 hover:border-black text-gray-900 hover:bg-gray-50 px-6 py-2 text-sm font-medium transition-colors cursor-pointer"
              >
                Logout
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleNavClick('/login')}
                className="rounded-full border border-gray-800 hover:border-black text-gray-900 hover:bg-gray-50 px-6 py-2 text-sm font-medium transition-colors cursor-pointer"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
