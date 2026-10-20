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

const allNavItems: NavItem[] = [
  { path: '/home', label: 'Home', icon: Home },
  { path: '/explore', label: 'Explore', icon: Compass },
  { path: '/bookings', label: 'Bookings', icon: Calendar, authOnly: true },
  { path: '/projects', label: 'Projects', icon: FolderOpen, authOnly: true },
  { path: '/messages', label: 'Messages', icon: MessageSquare, authOnly: true },
  { path: '/notifications', label: 'Notifications', icon: Bell, authOnly: true },
  { path: '/wallet', label: 'Wallet', icon: Wallet, authOnly: true },
  { path: '/creators', label: 'Creators', icon: Users },
  { path: '/profile', label: 'Profile', icon: User, authOnly: true },
  { path: '/settings', label: 'Settings', icon: Settings, authOnly: true },
];

export function TopNavigation({ 
  user, 
  unreadNotifications, 
  unreadMessages,
  onLogout,
  onNavigate
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

  // Filter items based on auth state
  const visibleNavItems = allNavItems.filter(item => !item.authOnly || !!user);

  return (
    <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-gray-200">
      <div className="flex items-center justify-between h-14 sm:h-16 px-3 sm:px-4 lg:px-6">
        {/* Left - Hamburger & Logo */}
        <div className="flex items-center gap-2 sm:gap-4">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-9 w-9 text-gray-700"
                aria-label="Open mobile navigation"
              >
                <Menu className="w-5 h-5 stroke-[1.75]" />
              </Button>
            </SheetTrigger>
            
            {/* Minimal Mobile Drawer matching reference image */}
            <SheetContent 
              side="left" 
              className="w-[82vw] max-w-xs sm:max-w-sm p-0 flex flex-col h-full bg-[#fafafa] border-r border-gray-200/80 [&>button:last-child]:hidden [&>[data-slot=sheet-close]]:hidden"
            >
              {/* Accessibility Titles (hidden) */}
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <SheetDescription className="sr-only">MyArteLab mobile navigation drawer</SheetDescription>

              {/* Top Section: Hamburger control at top-left with generous spacing */}
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

              {/* Navigation Items: Single vertical column with generous whitespace */}
              <div className="flex-1 overflow-y-auto px-7 sm:px-8 pt-8 sm:pt-10 pb-6">
                <nav className="space-y-6 sm:space-y-7">
                  {visibleNavItems.map((item) => {
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

              {/* Bottom Section: Centered Logout in distinct subtle background */}
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
          
          {/* Logo (Desktop & Header) */}
          <a href="/" className="flex items-center gap-2">
            <img src="/images/logo.png?v=2" alt="MyArteLab" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full" />
            <span className="font-bold text-lg sm:text-xl hidden sm:block">MyArteLab</span>
          </a>
        </div>

        {/* Right - Actions (Preserved Desktop Navigation) */}
        <div className="flex items-center gap-1 sm:gap-2 ml-auto">
          {user ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9 text-gray-700"
                onClick={() => window.location.href = '/messages'}
                aria-label="Messages"
              >
                <MessageSquare className="w-5 h-5" />
                {unreadMessages > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 bg-[#9747FF] text-white text-[10px] sm:text-xs rounded-full flex items-center justify-center font-bold">
                    {unreadMessages}
                  </span>
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9 text-gray-700"
                onClick={() => window.location.href = '/notifications'}
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 text-white text-[10px] sm:text-xs rounded-full flex items-center justify-center font-bold">
                    {unreadNotifications}
                  </span>
                )}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-1.5 sm:px-2 h-9">
                    <img
                      src={getAvatarUrl(user?.avatar)}
                      alt={user?.name || 'User'}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover"
                    />
                    <span className="hidden sm:block font-medium text-sm">{user?.name || 'User'}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => window.location.href = '/profile'}>
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.location.href = '/wallet'}>
                    <Wallet className="w-4 h-4 mr-2" />
                    Wallet
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.location.href = '/settings'}>
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onLogout} className="text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = '/login'}
                className="h-9"
              >
                Log in
              </Button>
              <Button
                size="sm"
                onClick={() => window.location.href = '/register'}
                className="h-9 bg-[#9747FF] hover:bg-[#8534f0] text-white rounded-full font-medium shadow-sm"
              >
                Sign up
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
