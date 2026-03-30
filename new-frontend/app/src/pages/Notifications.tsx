import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui-custom/EmptyState';
import { notifications as mockNotifications } from '@/lib/data/mockData';
import { 
  Check, 
  Trash2, 
  ShoppingBag, 
  MessageCircle, 
  CreditCard, 
  Bell,
  CheckCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Notification } from '@/types';

const iconMap = {
  booking: ShoppingBag,
  message: MessageCircle,
  payment: CreditCard,
  system: Bell,
};

const colorMap = {
  booking: 'bg-blue-100 text-blue-600',
  message: 'bg-green-100 text-green-600',
  payment: 'bg-amber-100 text-amber-600',
  system: 'bg-purple-100 text-purple-600',
};

export function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, isRead: true }))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead}>
            <CheckCheck className="w-4 h-4 mr-2" />
            Mark all read
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {notifications.length > 0 ? (
            notifications.map((notification) => {
              const Icon = iconMap[notification.type];
              return (
                <div
                  key={notification.id}
                  className={cn(
                    'flex items-start gap-4 p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors',
                    !notification.isRead && 'bg-[#8A2BE2]/5'
                  )}
                >
                  <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', colorMap[notification.type])}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className={cn('font-medium', !notification.isRead && 'text-gray-900')}>
                          {notification.title}
                        </h3>
                        <p className="text-sm text-gray-500 mt-0.5">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600"
                          onClick={() => deleteNotification(notification.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <EmptyState
              image="/images/empty-notifications.png"
              title="No notifications"
              description="You are all caught up!"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
