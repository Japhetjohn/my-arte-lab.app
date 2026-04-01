import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Search, Bell, MessageSquare, Menu, User, Settings, LogOut, Wallet, Home, Compass, Calendar, FolderOpen } from 'lucide-react';
import type { User as UserType } from '@/types';

interface TopNavigationProps {
  user: UserType | null;
  unreadNotifications: number;
  unreadMessages: number;
  onSearch?: (query: string) => void;
  onLogout?: () => void;
}

const navItems = [
  { path: '/home', label: 'Home', icon: Home },
  { path: '/explore', label: 'Explore', icon: Compass },
  { path: '/bookings', label: 'Bookings', icon: Calendar },
  { path: '/projects', label: 'Projects', icon: FolderOpen },
];

export function TopNavigation({ 
  user, 
  unreadNotifications, 
  unreadMessages,
  onSearch,
  onLogout
}: TopNavigationProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  const handleNavClick = (path: string) => {
    window.location.href = path;
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-gray-200">
      <div className="flex items-center justify-between h-14 sm:h-16 px-3 sm:px-4 lg:px-6">
        {/* Left - Logo & Menu */}
        <div className="flex items-center gap-2 sm:gap-4">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-9 w-9"
              >
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="p-4 border-b border-gray-200">
                <SheetTitle className="flex items-center gap-2">
                  <img src="/images/logo.png" alt="MyArtelab" className="w-8 h-8" />
                  <span className="font-bold text-xl">MyArtelab</span>
                </SheetTitle>
              </SheetHeader>
              <nav className="p-3 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = window.location.pathname === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => handleNavClick(item.path)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                        isActive 
                          ? 'bg-[#8A2BE2]/10 text-[#8A2BE2]' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'fill-current' : ''}`} />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
                <div className="bg-gradient-to-br from-[#8A2BE2]/10 to-[#8A2BE2]/5 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-900">Become a Creator</p>
                  <p className="text-xs text-gray-500 mt-1">Start earning on MyArtelab</p>
                  <button 
                    onClick={() => handleNavClick('/become-creator')}
                    className="inline-flex items-center text-sm font-medium text-[#8A2BE2] mt-2 hover:underline"
                  >
                    Learn more
                  </button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          
          <a href="/" className="flex items-center gap-2">
            <img src="/images/logo.png" alt="MyArtelab" className="w-7 h-7 sm:w-8 sm:h-8" />
            <span className="font-bold text-lg sm:text-xl hidden sm:block">MyArtelab</span>
          </a>
        </div>

        {/* Center - Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md mx-2 sm:mx-4 hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="search"
              placeholder="Search creators, services..."
              className="pl-10 pr-4 h-9 sm:h-10 bg-gray-100 border-0 focus:bg-white focus:ring-2 focus:ring-[#8A2BE2]/20"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </form>

        {/* Right - Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="relative md:hidden h-9 w-9"
            onClick={() => window.location.href = '/explore'}
          >
            <Search className="w-5 h-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9"
            onClick={() => window.location.href = '/messages'}
          >
            <MessageSquare className="w-5 h-5" />
            {unreadMessages > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 bg-[#8A2BE2] text-white text-[10px] sm:text-xs rounded-full flex items-center justify-center">
                {unreadMessages}
              </span>
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9"
            onClick={() => window.location.href = '/notifications'}
          >
            <Bell className="w-5 h-5" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 text-white text-[10px] sm:text-xs rounded-full flex items-center justify-center">
                {unreadNotifications}
              </span>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-1.5 sm:px-2 h-9">
                <img
                  src={user?.avatar || '/images/default-avatar.png'}
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
        </div>
      </div>
    </header>
  );
}
