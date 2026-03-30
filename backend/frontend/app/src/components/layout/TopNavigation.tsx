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
import { Search, Bell, MessageSquare, User, Settings, LogOut, Wallet } from 'lucide-react';
import type { User as UserType } from '@/types';

interface TopNavigationProps {
  user: UserType;
  unreadNotifications: number;
  unreadMessages: number;
  onSearch?: (query: string) => void;
}

export function TopNavigation({ 
  user, 
  unreadNotifications, 
  unreadMessages,
  onSearch 
}: TopNavigationProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-gray-200">
      <div className="flex items-center justify-between h-14 sm:h-16 px-2 sm:px-4 lg:px-6">
        {/* Left - Logo */}
        <div className="flex items-center gap-1 sm:gap-4 min-w-0 flex-shrink-0">
          <a href="/" className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <img src="/images/logo.png" alt="MyArtelab" className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0" />
            <span className="font-bold text-base sm:text-xl hidden sm:block truncate">MyArtelab</span>
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
        <div className="flex items-center gap-0.5 sm:gap-2 flex-shrink-0">
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
            className="relative h-8 w-8 sm:h-9 sm:w-9"
            onClick={() => window.location.href = '/messages'}
          >
            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
            {unreadMessages > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 sm:min-w-[18px] sm:h-4.5 bg-[#8A2BE2] text-white text-[9px] sm:text-xs rounded-full flex items-center justify-center px-1">
                {unreadMessages > 99 ? '99+' : unreadMessages}
              </span>
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="relative h-8 w-8 sm:h-9 sm:w-9"
            onClick={() => window.location.href = '/notifications'}
          >
            <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 sm:min-w-[18px] sm:h-4.5 bg-red-500 text-white text-[9px] sm:text-xs rounded-full flex items-center justify-center px-1">
                {unreadNotifications > 99 ? '99+' : unreadNotifications}
              </span>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-1.5 sm:gap-2 px-1 sm:px-2 h-8 sm:h-9 ml-0.5 sm:ml-0">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover flex-shrink-0"
                />
                <span className="hidden sm:block font-medium text-sm max-w-[80px] lg:max-w-[120px] truncate">{user.name}</span>
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
              <DropdownMenuItem className="text-red-600">
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
