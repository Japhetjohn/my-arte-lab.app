import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Home, 
  Compass,
  Calendar, 
  FolderOpen, 
  Wallet, 
  MessageSquare, 
  Bell, 
  Settings,
  Users,
  User
} from 'lucide-react';

interface SidebarProps {
  currentPath: string;
  className?: string;
}

const mainNavItems = [
  { path: '/home', label: 'Home', icon: Home },
  { path: '/explore', label: 'Explore', icon: Compass },
  { path: '/bookings', label: 'Bookings', icon: Calendar },
  { path: '/projects', label: 'Projects', icon: FolderOpen },
];

const secondaryNavItems = [
  { path: '/messages', label: 'Messages', icon: MessageSquare },
  { path: '/notifications', label: 'Notifications', icon: Bell },
  { path: '/wallet', label: 'Wallet', icon: Wallet },
  { path: '/creators', label: 'Creators', icon: Users },
  { path: '/profile', label: 'Profile', icon: User },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ currentPath, className }: SidebarProps) {
  const isActive = (path: string) => {
    return currentPath === path || currentPath.startsWith(path + '/');
  };

  return (
    <aside className={cn('hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 h-[calc(100vh-4rem)] sticky top-16', className)}>
      <ScrollArea className="flex-1 py-4">
        <nav className="px-3 space-y-1">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <a
                key={item.path}
                href={item.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active 
                    ? 'bg-[#8A2BE2]/10 text-[#8A2BE2]' 
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <Icon className={cn('w-5 h-5', active && 'fill-current')} />
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="mt-6 px-3">
          <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Account
          </p>
          <nav className="space-y-1">
            {secondaryNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <a
                  key={item.path}
                  href={item.path}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    active 
                      ? 'bg-[#8A2BE2]/10 text-[#8A2BE2]' 
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <Icon className={cn('w-5 h-5', active && 'fill-current')} />
                  {item.label}
                </a>
              );
            })}
          </nav>
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-gray-200">
        <div className="bg-gradient-to-br from-[#8A2BE2]/10 to-[#8A2BE2]/5 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-900">Become a Creator</p>
          <p className="text-xs text-gray-500 mt-1">Start earning on MyArtelab</p>
          <a 
            href="/become-creator" 
            className="inline-flex items-center text-sm font-medium text-[#8A2BE2] mt-2 hover:underline"
          >
            Learn more
          </a>
        </div>
      </div>
    </aside>
  );
}
