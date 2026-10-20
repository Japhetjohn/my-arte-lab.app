import { useState, useMemo } from 'react';
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
  Users,
  Search,
  ShoppingBag,
  Linkedin,
  Facebook,
  Twitter
} from 'lucide-react';
import type { User as UserType } from '@/types';
import { getAvatarUrl } from '@/lib/imageUrl';

interface TopNavigationProps {
  user: UserType | null;
  unreadNotifications: number;
  unreadMessages: number;
  onLogout?: () => void;
  onNavigate?: (path: string) => void;
  variantOverride?: 1 | 2 | 3 | 4 | 5;
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
  onNavigate,
  variantOverride
}: TopNavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const targetUrl = `/explore?search=${encodeURIComponent(searchQuery.trim())}`;
    handleNavClick(targetUrl);
  };

  // Determine active desktop navigation design (1 to 5)
  const activeVariant: 1 | 2 | 3 | 4 | 5 = useMemo(() => {
    if (variantOverride) return variantOverride;
    
    // Check URL query param ?nav=1..5 or ?nav_variant=1..5
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const navParam = params.get('nav') || params.get('nav_variant');
      if (navParam === '1') return 1;
      if (navParam === '2') return 2;
      if (navParam === '3') return 3;
      if (navParam === '4') return 4;
      if (navParam === '5') return 5;
    }

    // Contextual mapping based on authentication & page route
    if (!user) {
      return 5; // Design 5: Header with simplified Login action
    }

    const path = typeof window !== 'undefined' ? window.location.pathname : '/home';
    if (path === '/explore' || path === '/creators' || path.startsWith('/creators/')) {
      return 2; // Design 2: Header with search field
    }
    if (path === '/wallet' || path === '/bookings' || path.startsWith('/bookings/') || path === '/profile') {
      return 3; // Design 3: Two-row navigation with utility actions
    }
    if (path === '/legal' || path === '/privacy-policy') {
      return 4; // Design 4: Secondary row with social icons
    }
    
    // Default for /home, /projects, /messages, /notifications, /settings
    return 1; // Design 1: Standard header with right-side action button
  }, [user, variantOverride]);

  // Filter items for mobile drawer based on auth state
  const visibleNavItems = allNavItems.filter(item => !item.authOnly || !!user);

  return (
    <>
      {/* =========================================================================
          MOBILE VIEW: Clean Mobile Header + Strict Minimal Reference Drawer (lg:hidden)
          ========================================================================= */}
      <div className="lg:hidden sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-gray-200/80">
        <div className="flex items-center justify-between h-14 px-4">
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

              {/* Bottom Section: Full-width subtle neutral grey (#eeeeee) container with centered Logout */}
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

          {/* Mobile Header Center Logo & Refined Wordmark */}
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
              <Button
                size="sm"
                onClick={() => handleNavClick('/login')}
                className="h-8 px-4 text-xs border border-gray-800 hover:border-black text-gray-900 hover:bg-gray-50 rounded-full font-medium"
              >
                Log in
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          DESKTOP VIEW: Seamless, Integrated Persistent Navigation Strip (hidden lg:block)
          Blends into the page background without detached cards, floating boxes, or heavy shadows.
          ========================================================================= */}
      <header className="hidden lg:block sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-gray-200/70 transition-all">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* -------------------------------------------------------------------
              DESIGN 1: Standard header with right-side action button
              ------------------------------------------------------------------- */}
          {activeVariant === 1 && (
            <div className="h-16 flex items-center justify-between">
              {/* Left: Transparent Logo & Modern Wordmark */}
              <BrandLogo onNavigate={handleNavClick} />

              {/* Right: Navigation Links + Outlined Action Button */}
              <div className="flex items-center gap-7 lg:gap-8">
                <nav className="flex items-center gap-6 lg:gap-7 text-sm font-medium text-gray-700">
                  <button 
                    type="button" 
                    onClick={() => handleNavClick('/home')} 
                    className={`transition-colors hover:text-[#9747FF] ${isCurrentActive('/home') ? 'text-[#9747FF] font-semibold' : ''}`}
                  >
                    Home
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleNavClick('/explore')} 
                    className={`transition-colors hover:text-[#9747FF] ${isCurrentActive('/explore') ? 'text-[#9747FF] font-semibold' : ''}`}
                  >
                    Explore
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleNavClick('/bookings')} 
                    className={`transition-colors hover:text-[#9747FF] ${isCurrentActive('/bookings') ? 'text-[#9747FF] font-semibold' : ''}`}
                  >
                    Bookings
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleNavClick('/projects')} 
                    className={`transition-colors hover:text-[#9747FF] ${isCurrentActive('/projects') ? 'text-[#9747FF] font-semibold' : ''}`}
                  >
                    Projects
                  </button>
                </nav>

                {/* Pill-shaped Outlined Action Button matching reference */}
                <button
                  type="button"
                  onClick={() => handleNavClick('/explore')}
                  className="rounded-full border border-gray-800 hover:border-black text-gray-900 hover:bg-gray-50 px-5 py-1.5 text-sm font-medium transition-colors cursor-pointer"
                >
                  Explore
                </button>

                {/* User Profile Avatar / Quick Menu */}
                {user && (
                  <DesktopUserMenu 
                    user={user} 
                    unreadNotifications={unreadNotifications} 
                    unreadMessages={unreadMessages} 
                    onLogout={handleLogout} 
                    onNavigate={handleNavClick} 
                  />
                )}
              </div>
            </div>
          )}

          {/* -------------------------------------------------------------------
              DESIGN 2: Header with a search field
              ------------------------------------------------------------------- */}
          {activeVariant === 2 && (
            <div className="h-16 flex items-center justify-between">
              {/* Left: Transparent Logo & Modern Wordmark */}
              <BrandLogo onNavigate={handleNavClick} />

              {/* Right: Navigation Links + Pill Search Input */}
              <div className="flex items-center gap-6 lg:gap-7">
                <nav className="flex items-center gap-6 lg:gap-7 text-sm font-medium text-gray-700">
                  <button 
                    type="button" 
                    onClick={() => handleNavClick('/home')} 
                    className={`transition-colors hover:text-[#9747FF] ${isCurrentActive('/home') ? 'text-[#9747FF] font-semibold' : ''}`}
                  >
                    Home
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleNavClick('/explore')} 
                    className={`transition-colors hover:text-[#9747FF] ${isCurrentActive('/explore') ? 'text-[#9747FF] font-semibold' : ''}`}
                  >
                    Explore
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleNavClick('/creators')} 
                    className={`transition-colors hover:text-[#9747FF] ${isCurrentActive('/creators') ? 'text-[#9747FF] font-semibold' : ''}`}
                  >
                    Creators
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleNavClick('/bookings')} 
                    className={`transition-colors hover:text-[#9747FF] ${isCurrentActive('/bookings') ? 'text-[#9747FF] font-semibold' : ''}`}
                  >
                    Bookings
                  </button>
                </nav>

                {/* Pill Search Input matching reference Design 2 */}
                <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                  <div className="flex items-center gap-2 rounded-full border border-gray-300 bg-white px-3.5 py-1.5 w-56 lg:w-64 focus-within:border-[#9747FF] focus-within:ring-1 focus-within:ring-[#9747FF] transition-all">
                    <Search className="w-4 h-4 text-gray-400 shrink-0" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search your creators..."
                      className="w-full bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
                    />
                  </div>
                </form>

                {/* User Profile Avatar / Quick Menu */}
                {user && (
                  <DesktopUserMenu 
                    user={user} 
                    unreadNotifications={unreadNotifications} 
                    unreadMessages={unreadMessages} 
                    onLogout={handleLogout} 
                    onNavigate={handleNavClick} 
                  />
                )}
              </div>
            </div>
          )}

          {/* -------------------------------------------------------------------
              DESIGN 3: Two-row navigation (Upper row with utilities, Lower row with pipe links)
              ------------------------------------------------------------------- */}
          {activeVariant === 3 && (
            <div className="flex flex-col">
              {/* Upper Row: Secondary navigation + Utility Icons */}
              <div className="h-9 flex items-center justify-between text-xs text-gray-600">
                <div className="flex items-center gap-6">
                  <button 
                    type="button" 
                    onClick={() => handleNavClick('/explore')} 
                    className="hover:text-gray-950 transition-colors"
                  >
                    Explore
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleNavClick('/creators')} 
                    className="hover:text-gray-950 transition-colors"
                  >
                    Creators
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleNavClick('/projects')} 
                    className="hover:text-gray-950 transition-colors"
                  >
                    Projects
                  </button>
                </div>

                {/* Right Utility Icons (Search, User, Shopping Bag/Wallet) */}
                <div className="flex items-center gap-5 text-gray-600">
                  <button
                    type="button"
                    onClick={() => handleNavClick('/explore')}
                    aria-label="Search"
                    className="hover:text-gray-950 transition-colors cursor-pointer"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavClick('/profile')}
                    aria-label="Account"
                    className="hover:text-gray-950 transition-colors cursor-pointer"
                  >
                    <User className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavClick('/wallet')}
                    aria-label="Wallet"
                    className="hover:text-gray-950 transition-colors cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Thin horizontal divider */}
              <div className="w-full border-b border-gray-200/60" />

              {/* Lower Row: Logo on left, Links separated by vertical pipes on right */}
              <div className="h-14 flex items-center justify-between">
                <BrandLogo onNavigate={handleNavClick} />

                {/* Primary Links with Vertical Separators '|' */}
                <nav className="flex items-center gap-4 lg:gap-5 text-sm font-medium text-gray-700">
                  <button 
                    type="button" 
                    onClick={() => handleNavClick('/home')} 
                    className={`transition-colors hover:text-[#9747FF] ${isCurrentActive('/home') ? 'text-[#9747FF] font-semibold' : ''}`}
                  >
                    Home
                  </button>
                  <span className="text-gray-300 select-none">|</span>
                  <button 
                    type="button" 
                    onClick={() => handleNavClick('/explore')} 
                    className={`transition-colors hover:text-[#9747FF] ${isCurrentActive('/explore') ? 'text-[#9747FF] font-semibold' : ''}`}
                  >
                    Explore
                  </button>
                  <span className="text-gray-300 select-none">|</span>
                  <button 
                    type="button" 
                    onClick={() => handleNavClick('/bookings')} 
                    className={`transition-colors hover:text-[#9747FF] ${isCurrentActive('/bookings') ? 'text-[#9747FF] font-semibold' : ''}`}
                  >
                    Bookings
                  </button>
                  <span className="text-gray-300 select-none">|</span>
                  <button 
                    type="button" 
                    onClick={() => handleNavClick('/wallet')} 
                    className={`transition-colors hover:text-[#9747FF] ${isCurrentActive('/wallet') ? 'text-[#9747FF] font-semibold' : ''}`}
                  >
                    Wallet
                  </button>
                </nav>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------------------
              DESIGN 4: Secondary row above main header with social icons
              ------------------------------------------------------------------- */}
          {activeVariant === 4 && (
            <div className="flex flex-col">
              {/* Upper Row: Secondary links on left, Social Media Icons on right */}
              <div className="h-9 flex items-center justify-between text-xs text-gray-600">
                <div className="flex items-center gap-6">
                  <button 
                    type="button" 
                    onClick={() => handleNavClick('/creators')} 
                    className="hover:text-gray-950 transition-colors"
                  >
                    Creators
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleNavClick('/legal')} 
                    className="hover:text-gray-950 transition-colors"
                  >
                    About us
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleNavClick('/privacy-policy')} 
                    className="hover:text-gray-950 transition-colors"
                  >
                    Privacy Policy
                  </button>
                </div>

                {/* Right: Social icons (LinkedIn, Facebook, Twitter) */}
                <div className="flex items-center gap-4 text-gray-500">
                  <a 
                    href="https://linkedin.com" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    aria-label="LinkedIn"
                    className="hover:text-[#0077b5] transition-colors"
                  >
                    <Linkedin className="w-3.5 h-3.5" />
                  </a>
                  <a 
                    href="https://facebook.com" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    aria-label="Facebook"
                    className="hover:text-[#1877f2] transition-colors"
                  >
                    <Facebook className="w-3.5 h-3.5" />
                  </a>
                  <a 
                    href="https://twitter.com" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    aria-label="Twitter"
                    className="hover:text-gray-900 transition-colors"
                  >
                    <Twitter className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Thin horizontal divider */}
              <div className="w-full border-b border-gray-200/60" />

              {/* Lower Row: Logo on left, Links + Search Icon on right */}
              <div className="h-14 flex items-center justify-between">
                <BrandLogo onNavigate={handleNavClick} />

                <div className="flex items-center gap-6 lg:gap-7">
                  <nav className="flex items-center gap-6 lg:gap-7 text-sm font-medium text-gray-700">
                    <button 
                      type="button" 
                      onClick={() => handleNavClick('/explore')} 
                      className={`transition-colors hover:text-[#9747FF] ${isCurrentActive('/explore') ? 'text-[#9747FF] font-semibold' : ''}`}
                    >
                      Explore
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleNavClick('/creators')} 
                      className={`transition-colors hover:text-[#9747FF] ${isCurrentActive('/creators') ? 'text-[#9747FF] font-semibold' : ''}`}
                    >
                      Creators
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleNavClick('/projects')} 
                      className={`transition-colors hover:text-[#9747FF] ${isCurrentActive('/projects') ? 'text-[#9747FF] font-semibold' : ''}`}
                    >
                      Projects
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleNavClick('/home')} 
                      className={`transition-colors hover:text-[#9747FF] ${isCurrentActive('/home') ? 'text-[#9747FF] font-semibold' : ''}`}
                    >
                      Home
                    </button>
                  </nav>

                  {/* Search Icon button at far right */}
                  <button
                    type="button"
                    onClick={() => handleNavClick('/explore')}
                    aria-label="Search"
                    className="p-1 text-gray-700 hover:text-[#9747FF] transition-colors cursor-pointer"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------------------
              DESIGN 5: Header with Single Clean Login Action (Simplified Auth)
              ------------------------------------------------------------------- */}
          {activeVariant === 5 && (
            <div className="h-16 flex items-center justify-between">
              {/* Left: Transparent Logo & Modern Wordmark */}
              <BrandLogo onNavigate={handleNavClick} />

              {/* Right: Navigation Links + Single Login Button */}
              <div className="flex items-center gap-7 lg:gap-8">
                <nav className="flex items-center gap-6 lg:gap-7 text-sm font-medium text-gray-700">
                  <button 
                    type="button" 
                    onClick={() => handleNavClick('/home')} 
                    className={`transition-colors hover:text-[#9747FF] ${isCurrentActive('/home') ? 'text-[#9747FF] font-semibold' : ''}`}
                  >
                    Home
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleNavClick('/explore')} 
                    className={`transition-colors hover:text-[#9747FF] ${isCurrentActive('/explore') ? 'text-[#9747FF] font-semibold' : ''}`}
                  >
                    Explore
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleNavClick('/creators')} 
                    className={`transition-colors hover:text-[#9747FF] ${isCurrentActive('/creators') ? 'text-[#9747FF] font-semibold' : ''}`}
                  >
                    Creators
                  </button>
                </nav>

                {/* Single Outlined Login Button (Sign up accessed via Login screen) */}
                <button
                  type="button"
                  onClick={() => handleNavClick('/login')}
                  className="rounded-full border border-gray-800 hover:border-black text-gray-900 hover:bg-gray-50 px-6 py-1.5 text-sm font-medium transition-colors cursor-pointer"
                >
                  Login
                </button>
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  );
}

/**
 * Brand Logo & Refined Wordmark Helper
 * Transparent logo with no badge/container, paired with clean, modern typography.
 */
function BrandLogo({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <a 
      href="/home" 
      onClick={(e) => { e.preventDefault(); onNavigate('/home'); }}
      className="flex items-center gap-2.5 shrink-0 group select-none"
    >
      <img 
        src="/images/logo.png" 
        alt="MyArteLab Logo" 
        className="h-7 w-7 object-contain shrink-0 transition-transform group-hover:scale-105" 
      />
      <span className="font-semibold text-[17px] tracking-[-0.02em] text-gray-900 antialiased leading-none">
        MyArteLab
      </span>
    </a>
  );
}

/**
 * Desktop User Menu Helper Component
 */
function DesktopUserMenu({
  user,
  unreadNotifications,
  unreadMessages,
  onLogout,
  onNavigate
}: {
  user: UserType;
  unreadNotifications: number;
  unreadMessages: number;
  onLogout: () => void;
  onNavigate: (path: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 sm:gap-2 pl-3 border-l border-gray-200">
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9 text-gray-700"
        onClick={() => onNavigate('/messages')}
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
        onClick={() => onNavigate('/notifications')}
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
          <DropdownMenuItem onClick={() => onNavigate('/profile')}>
            <User className="w-4 h-4 mr-2" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onNavigate('/wallet')}>
            <Wallet className="w-4 h-4 mr-2" />
            Wallet
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onNavigate('/settings')}>
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
    </div>
  );
}
