import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { api } from '@/contexts/AuthContext';
import { 
  Bell, 
  CheckCircle, 
  Trash2, 
  Loader2,
  DollarSign,
  MessageSquare,
  Briefcase,
  AlertCircle,
  CheckCheck
} from 'lucide-react';
import { toast } from 'sonner';

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  createdAt: string;
  sender?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    avatar?: string;
  };
  metadata?: any;
}

const notificationIcons: Record<string, React.ReactNode> = {
  booking_request: <Briefcase className="w-5 h-5 text-blue-500" />,
  booking_accepted: <CheckCircle className="w-5 h-5 text-[#8A2BE2]" />,
  booking_rejected: <AlertCircle className="w-5 h-5 text-red-500" />,
  booking_completed: <CheckCircle className="w-5 h-5 text-[#8A2BE2]" />,
  booking_cancelled: <AlertCircle className="w-5 h-5 text-red-500" />,
  payment_received: <DollarSign className="w-5 h-5 text-[#8A2BE2]" />,
  payment_deducted: <DollarSign className="w-5 h-5 text-amber-500" />,
  payment_failed: <AlertCircle className="w-5 h-5 text-red-500" />,
  message: <MessageSquare className="w-5 h-5 text-purple-500" />,
  counter_proposal: <DollarSign className="w-5 h-5 text-amber-500" />,
  work_delivered: <CheckCircle className="w-5 h-5 text-blue-500" />,
  system: <Bell className="w-5 h-5 text-gray-500" />,
};

export function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications?limit=100');
      setNotifications(response.data.data?.notifications || []);
      setUnreadCount(response.data.data?.unreadCount || 0);
    } catch (error: any) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      setNotifications(prev => 
        prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      toast.success('Notification deleted');
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  };

  const deleteAllRead = async () => {
    try {
      await api.delete('/notifications/read');
      setNotifications(prev => prev.filter(n => !n.read));
      toast.success('Read notifications deleted');
    } catch (error) {
      toast.error('Failed to delete notifications');
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification._id);
    }
    if (notification.link) {
      window.location.href = notification.link;
    }
  };

  const getNotificationIcon = (type: string) => {
    return notificationIcons[type] || <Bell className="w-5 h-5 text-gray-500" />;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const minutes = Math.floor(diffInHours * 60);
      return `${minutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !n.read;
    if (activeTab === 'bookings') return n.type.includes('booking') || n.type.includes('payment');
    if (activeTab === 'messages') return n.type === 'message';
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#8A2BE2]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && (
            <Badge className="bg-[#8A2BE2]">{unreadCount} new</Badge>
          )}
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark all read
            </Button>
          )}
          {notifications.some(n => n.read) && (
            <Button variant="ghost" size="sm" onClick={deleteAllRead}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear read
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="all">
            All ({notifications.length})
          </TabsTrigger>
          <TabsTrigger value="unread">
            Unread ({unreadCount})
          </TabsTrigger>
          <TabsTrigger value="bookings">
            Bookings
          </TabsTrigger>
          <TabsTrigger value="messages">
            Messages
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredNotifications.length > 0 ? (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <Card 
                  key={notification._id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    !notification.read ? 'bg-blue-50/50 border-blue-200' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-1">
                        {notification.sender?.avatar ? (
                          <img 
                            src={notification.sender.avatar}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                            {getNotificationIcon(notification.type)}
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {notification.title}
                              {!notification.read && (
                                <span className="ml-2 inline-block w-2 h-2 bg-[#8A2BE2] rounded-full"></span>
                              )}
                            </p>
                            <p className="text-gray-600 text-sm mt-1">
                              {notification.message}
                            </p>
                          </div>
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {formatTime(notification.createdAt)}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-3">
                          {!notification.read && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification._id);
                              }}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Mark read
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification._id);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              image="/images/empty-notifications.png"
              title="No notifications"
              description={
                activeTab === 'unread' 
                  ? "You're all caught up! No unread notifications."
                  : "You don't have any notifications yet."
              }
              actionLabel="Browse Creators"
              onAction={() => window.location.href = '/explore'}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
