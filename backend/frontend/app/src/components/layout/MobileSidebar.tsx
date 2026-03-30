import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Menu, Home, Calendar, FolderOpen, Wallet, MessageSquare, Bell, Settings, Users, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface MobileSidebarProps {
  currentPath: string;
}

const navItems = [
  { path: '/home', label: 'Home', icon: Home },
  { path: '/explore', label: 'Explore', icon: Search },
  { path: '/bookings', label: 'Bookings', icon: Calendar },
  { path: '/projects', label: 'Projects', icon: FolderOpen },
  { path: '/messages', label: 'Messages', icon: MessageSquare },
  { path: '/notifications', label: 'Notifications', icon: Bell },
  { path: '/wallet', label: 'Wallet', icon: Wallet },
  { path: '/creators', label: 'Creators', icon: Users },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function MobileSidebar({ currentPath }: MobileSidebarProps) {
  const [open, setOpen] = useState(false);
  const isActive = (path: string) => currentPath === path || currentPath.startsWith(path);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="p-4 border-b border-gray-200">
          <SheetTitle className="flex items-center gap-2">
            <img src="/images/logo.png" alt="MyArtelab" className="w-8 h-8" />
            <span className="font-bold text-xl">MyArtelab</span>
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-5rem)]">
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <a
                  key={item.path}
                  href={item.path}
                  onClick={() => setOpen(false)}
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
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
