import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { 
  Bell, 
  MessageSquare, 
  Menu, 
  User, 
  Settings, 
  LogOut, 
  Wallet, 
  Home, 
  Compass, 
  Calendar, 
  FolderOpen, 
  Users 
} from 'lucide-react';
import type { User as UserType } from '@/types';
import { getAvatarUrl } from '@/lib/imageUrl';

interface TopNavigationProps {
  user: UserType | null;
  unreadNotifications: number;
  unreadMessages: number;
  onLogout?: () => void;
  onNavigate?: (path: string) => void;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  authOnly?: boolean;
}

// All available navigation items for mobile drawer
const mobileNavItems: NavItem[] = [
  { path: '/home', label: 'Home', icon: Home },
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

export function TopNavigation({ 
  user, 
  unreadNotifications, 
  unreadMessages,
  onLogout,
  onNavigate,
}: TopNavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.location.href = path;
    }
    setMobileMenuOpen(false);
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
    return currentPath === path || currentPath.startsWith(path + '/');
  };

  // Filter items for mobile drawer based on auth state
  const visibleMobileNavItems = mobileNavItems.filter(item => !item.authOnly || !!user);

  return (
    <>
      {/* =========================================================================
          MOBILE VIEW: Header + Reference Minimal Mobile Drawer (lg:hidden)
          ========================================================================= */}
      <div className="lg:hidden sticky top-0 z-50 w-full bg-white border-b border-gray-200/80">
        <div className="flex items-center justify-between h-14 sm:h-16 px-4">
          {/* Mobile Hamburger Drawer Trigger */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-gray-700"
                aria-label="Open mobile navigation"
              >
                <Menu className="w-5 h-5 stroke-[1.75]" />
              </Button>
            </SheetTrigger>

            {/* Strict Reference Mobile Drawer Matching media_1792493149177_e612e1b2.png */}
            <SheetContent 
              side="left" 
              className="w-[82vw] max-w-xs sm:max-w-sm p-0 flex flex-col h-full bg-[#fafafa] border-r border-gray-200/80 [&>button:last-child]:hidden [&>[data-slot=sheet-close]]:hidden"
            >
              {/* Accessibility Titles (hidden) */}
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <SheetDescription className="sr-only">MyArteLab mobile navigation drawer</SheetDescription>

              {/* Top Section: Hamburger close control at top-left. NO logo, NO avatar, NO name */}
              <div className="pt-7 pb-2 px-7 sm:px-8 shrink-0">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 -ml-1 text-gray-700 hover:text-gray-950 transition-colors cursor-pointer outline-none focus:outline-none"
                  aria-label="Close menu"
                >
                  <Menu className="w-6 h-6 stroke-[1.75]" />
                </button>
              </div>

              {/* Navigation Items: Single vertical column with generous whitespace, outline icons, no cards */}
              <div className="flex-1 overflow-y-auto px-7 sm:px-8 pt-8 sm:pt-10 pb-6">
                <nav className="space-y-6 sm:space-y-7">
                  {visibleMobileNavItems.map((item) => {
                    const Icon = item.icon;
                    const active = isCurrentActive(item.path);

                    return (
                      <button
                        key={item.path}
                        type="button"
                        onClick={() => handleNavClick(item.path)}
                        className={`w-full flex items-center gap-5 sm:gap-6 text-left transition-colors cursor-pointer group py-0.5 outline-none focus:outline-none ${
                          active 
                            ? 'text-[#9747FF] font-semibold' 
                            : 'text-gray-700 hover:text-gray-950 font-normal'
                        }`}
                      >
                        <Icon 
                          className={`w-6 h-6 shrink-0 transition-colors stroke-[1.75] ${
                            active 
                              ? 'text-[#9747FF]' 
                              : 'text-gray-600 group-hover:text-gray-900'
                          }`} 
                        />
                        <span className="text-base sm:text-lg tracking-normal">
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Bottom Section: Full-width subtle neutral grey (#eeeeee) container with centered Logout / Login */}
              <div className="mt-auto shrink-0 bg-[#eeeeee] w-full border-t border-gray-200/60 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] px-4 flex items-center justify-center">
                {user ? (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-center text-base sm:text-lg font-medium text-gray-700 hover:text-gray-950 transition-colors cursor-pointer py-1 outline-none focus:outline-none"
                  >
                    Logout
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleNavClick('/login')}
                    className="w-full text-center text-base sm:text-lg font-medium text-[#9747FF] hover:text-[#8534f0] transition-colors cursor-pointer py-1 outline-none focus:outline-none"
                  >
                    Log in
                  </button>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* Mobile Header Center Logo & Wordmark */}
          <a href="/home" className="flex items-center gap-2">
            <img 
              src="/images/logo.png" 
              alt="MyArteLab" 
              className="h-7 w-7 object-contain shrink-0" 
            />
            <span className="font-semibold text-lg tracking-tight text-gray-900">MyArteLab</span>
          </a>

          {/* Mobile Header Right Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {user ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-9 w-9 text-gray-700"
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
                  className="relative h-9 w-9 text-gray-700"
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
              </>
            ) : (
              <button
                type="button"
                onClick={() => handleNavClick('/login')}
                className="rounded-full border border-gray-800 text-gray-900 hover:bg-gray-50 px-4 py-1 text-xs font-medium transition-colors cursor-pointer"
              >
                Login
              </button>
            )}
          </div>
        </div>
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
                    <DropdownMenuItem onClick={() => handleNavClick('/profile')}>
                      <User className="w-4 h-4 mr-2" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleNavClick('/wallet')}>
                      <Wallet className="w-4 h-4 mr-2" />
                      Wallet
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleNavClick('/settings')}>
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
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
