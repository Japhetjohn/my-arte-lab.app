import { cn } from '@/lib/utils';
import { Home, Compass, Calendar, FolderOpen, Wallet } from 'lucide-react';

interface BottomNavigationProps {
  currentPath: string;
}

const navItems = [
  { path: '/home', label: 'Home', icon: Home },
  { path: '/explore', label: 'Explore', icon: Compass },
  { path: '/bookings', label: 'Bookings', icon: Calendar },
  { path: '/projects', label: 'Projects', icon: FolderOpen },
  { path: '/wallet', label: 'Wallet', icon: Wallet },
];

export function BottomNavigation({ currentPath }: BottomNavigationProps) {
  const isActive = (path: string) => {
    return currentPath === path || currentPath.startsWith(path + '/');
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 lg:hidden safe-area-pb">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <a
              key={item.path}
              href={item.path}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full transition-colors py-1',
                active ? 'text-[#8A2BE2]' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <div className={cn(
                'p-1.5 rounded-lg transition-colors',
                active && 'bg-[#8A2BE2]/10'
              )}>
                <Icon className={cn('w-5 h-5', active && 'fill-current')} />
              </div>
              <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
