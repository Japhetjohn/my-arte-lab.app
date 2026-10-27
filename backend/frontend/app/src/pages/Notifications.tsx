import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { api, useAuth } from '@/contexts/AuthContext';
import { getAvatarUrl } from '@/lib/imageUrl';
import { VerifiedBadge } from '@/components/shared/VerifiedBadge';
import { ConfirmationModal } from '@/components/modals/ConfirmationModal';
import { Spinner } from '@/components/ui/spinner';
import { 
  Bell, 
  CheckCircle, 
  Trash2, 
  DollarSign,
  MessageSquare,
  Briefcase,
  AlertCircle,
  CheckCheck,
  Heart,
  Sparkles,
  Calendar,
  Wallet,
  Settings as SettingsIcon,
  Users,
  ArrowRight
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useSEO } from '@/hooks/useSEO';
import { cn } from '@/lib/utils';

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
  post_like: <Heart className="w-4 h-4 text-[#9747FF] fill-[#9747FF]" />,
  post_comment: <MessageSquare className="w-4 h-4 text-[#9747FF]" />,
  post_reply: <MessageSquare className="w-4 h-4 text-[#9747FF]" />,
  post_mention: <MessageSquare className="w-4 h-4 text-[#9747FF]" />,
  comment_mention: <MessageSquare className="w-4 h-4 text-[#9747FF]" />,
  comment_like: <Heart className="w-4 h-4 text-[#9747FF] fill-[#9747FF]" />,
  review_received: <CheckCircle className="w-4 h-4 text-[#9747FF]" />,
  booking_request: <Briefcase className="w-4 h-4 text-blue-500" />,
  booking_accepted: <CheckCircle className="w-4 h-4 text-emerald-500" />,
  booking_rejected: <AlertCircle className="w-4 h-4 text-rose-500" />,
  booking_completed: <CheckCircle className="w-4 h-4 text-[#9747FF]" />,
  booking_cancelled: <AlertCircle className="w-4 h-4 text-rose-500" />,
  payment_received: <DollarSign className="w-4 h-4 text-[#9747FF]" />,
  payment_deducted: <DollarSign className="w-4 h-4 text-amber-500" />,
  payment_failed: <AlertCircle className="w-4 h-4 text-rose-500" />,
  message: <MessageSquare className="w-4 h-4 text-[#9747FF]" />,
  counter_proposal: <DollarSign className="w-4 h-4 text-amber-500" />,
  work_delivered: <CheckCircle className="w-4 h-4 text-blue-500" />,
  system: <Bell className="w-4 h-4 text-gray-500" />,
  project_created: <Briefcase className="w-4 h-4 text-[#9747FF]" />,
  project_application_received: <Briefcase className="w-4 h-4 text-blue-500" />,
  project_application_accepted: <CheckCircle className="w-4 h-4 text-emerald-500" />,
  project_application_rejected: <AlertCircle className="w-4 h-4 text-rose-500" />,
  project_started: <CheckCircle className="w-4 h-4 text-[#9747FF]" />,
  project_completed: <CheckCircle className="w-4 h-4 text-emerald-500" />,
  project_cancelled: <AlertCircle className="w-4 h-4 text-rose-500" />,
  project_delivered: <CheckCircle className="w-4 h-4 text-blue-500" />,
  project_message: <MessageSquare className="w-4 h-4 text-[#9747FF]" />,
};

export function Notifications() {
  const { user } = useAuth();
  useSEO({ title: 'Notifications', noindex: true });
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const broadcastUnreadCount = (count: number) => {
    window.dispatchEvent(new CustomEvent('notificationsUpdated', { detail: { unreadCount: count } }));
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications?limit=100');
      const items = response.data.data?.notifications || [];
      const unread = response.data.data?.unreadCount || 0;
      setNotifications(items);
      setUnreadCount(unread);
      broadcastUnreadCount(unread);
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
      setUnreadCount(prev => {
        const next = Math.max(0, prev - 1);
        broadcastUnreadCount(next);
        return next;
      });
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      broadcastUnreadCount(0);
      toast.success('All notifications marked as read.');
    } catch (error) {
      toast.error("We couldn't mark notifications as read.");
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      const target = notifications.find(n => n._id === notificationId);
      if (target && !target.read) {
        setUnreadCount(prev => {
          const next = Math.max(0, prev - 1);
          broadcastUnreadCount(next);
          return next;
        });
      }
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      toast.success('Notification removed.');
    } catch (error) {
      toast.error("We couldn't remove this notification.");
    }
  };

  const deleteAllRead = async () => {
    try {
      await api.delete('/notifications/read');
      setNotifications(prev => prev.filter(n => !n.read));
      toast.success('Read notifications cleared.');
    } catch (error) {
      toast.error("We couldn't clear notifications.");
    }
  };

  const clearAllNotifications = () => {
    setIsClearModalOpen(true);
  };

  const handleConfirmClearAll = async () => {
    try {
      setIsClearing(true);
      await api.delete('/notifications/all');
      setNotifications([]);
      setUnreadCount(0);
      broadcastUnreadCount(0);
      toast.success('All notifications cleared.');
      setIsClearModalOpen(false);
    } catch (error) {
      toast.error("We couldn't clear notifications.");
    } finally {
      setIsClearing(false);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification._id);
    }
    if (notification.link) {
      if (notification.link.startsWith('/')) {
        navigate(notification.link);
      } else {
        window.location.href = notification.link;
      }
    }
  };

  const getNotificationIcon = (type: string) => {
    return notificationIcons[type] || <Bell className="w-4 h-4 text-gray-500" />;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const minutes = Math.floor(diffInHours * 60);
      return `${Math.max(1, minutes)}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const isArtworkType = (type: string) =>
    type.startsWith('post_') || type.startsWith('comment_');
  const isBookingsType = (type: string) =>
    type.includes('booking') || type.includes('payment') || type === 'work_delivered' || type === 'counter_proposal' || type === 'review_received';
  const isMessagesType = (type: string) => type === 'message';

  const artworkCount = notifications.filter(n => isArtworkType(n.type)).length;
  const bookingsCount = notifications.filter(n => isBookingsType(n.type)).length;
  const messagesCount = notifications.filter(n => isMessagesType(n.type)).length;

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !n.read;
    if (activeTab === 'artwork') return isArtworkType(n.type);
    if (activeTab === 'bookings') return isBookingsType(n.type);
    if (activeTab === 'messages') return isMessagesType(n.type);
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" variant="primary" />
      </div>
    );
  }

  const userDisplayName = user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Creative Member';
  const userUsername = user?.email ? user.email.split('@')[0] : 'creator';

  return (
    <div className="w-full relative">
      {/* 3-Column Standardized Layout with continuous ash-gray dividers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* =========================================================================
            LEFT COLUMN (lg:col-span-3, hidden on mobile)
            Profile summary & platform navigation
           ========================================================================= */}
        <aside className="hidden lg:flex flex-col gap-6 lg:col-span-3 sticky top-20">
          {/* User Profile Mini Summary */}
          <div className="pb-5 border-b border-[#DADDE1] dark:border-[#2f3032]">
            {user ? (
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center border-2 border-[#9747FF]/20 mb-3">
                  {user.avatar ? (
                    <img src={getAvatarUrl(user.avatar)} alt={userDisplayName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[#9747FF] font-bold text-xl">
                      {(userDisplayName || 'C')[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 justify-center">
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base leading-tight">
                    {userDisplayName}
                  </h3>
                  {user.isVerified && (
                    <VerifiedBadge className="w-4 h-4 shrink-0 inline-block align-middle" showTooltip={false} />
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  @{userUsername}
                </p>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/50 text-[#9747FF] text-xs font-semibold mt-2.5">
                  <Sparkles className="w-3 h-3" />
                  <span>{user.category || 'Creator'}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Join the MyArteLab community</p>
                <Button asChild size="sm" className="mt-2 rounded-full bg-[#9747FF] hover:bg-[#8534f0] text-white">
                  <a href="/login">Sign in</a>
                </Button>
              </div>
            )}
          </div>

          {/* Quick Platform Navigation Menu */}
          <div className="pb-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-3 mb-2">
              Menu
            </div>
            <nav className="space-y-1">
              <a
                href="/home"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-gray-700 dark:text-gray-300 hover:text-[#9747FF] dark:hover:text-[#9747FF] hover:bg-gray-100/70 dark:hover:bg-[#1e1f20] transition-colors"
              >
                <Sparkles className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span>Creative feed</span>
              </a>

              <a
                href="/notifications"
                className="flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold text-sm text-[#9747FF] bg-purple-50/80 dark:bg-purple-950/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 text-[#9747FF]" />
                  <span>Notifications</span>
                </div>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-[#9747FF] text-white">
                    {unreadCount}
                  </span>
                )}
              </a>

              <a
                href="/messages"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-gray-700 dark:text-gray-300 hover:text-[#9747FF] dark:hover:text-[#9747FF] hover:bg-gray-100/70 dark:hover:bg-[#1e1f20] transition-colors"
              >
                <MessageSquare className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span>Messages</span>
              </a>

              <a
                href="/bookings"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-gray-700 dark:text-gray-300 hover:text-[#9747FF] dark:hover:text-[#9747FF] hover:bg-gray-100/70 dark:hover:bg-[#1e1f20] transition-colors"
              >
                <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span>Bookings</span>
              </a>

              <a
                href="/wallet"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-gray-700 dark:text-gray-300 hover:text-[#9747FF] dark:hover:text-[#9747FF] hover:bg-gray-100/70 dark:hover:bg-[#1e1f20] transition-colors"
              >
                <Wallet className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span>Wallet</span>
              </a>

              <a
                href="/settings"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-gray-700 dark:text-gray-300 hover:text-[#9747FF] dark:hover:text-[#9747FF] hover:bg-gray-100/70 dark:hover:bg-[#1e1f20] transition-colors"
              >
                <SettingsIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span>Settings</span>
              </a>
            </nav>
          </div>
        </aside>

        {/* =========================================================================
            CENTER COLUMN (lg:col-span-6, full width on mobile)
            Notifications Header, Tabs, and Feed Stream
           ========================================================================= */}
        <main className="col-span-1 lg:col-span-6 w-full max-w-xl mx-auto flex flex-col pb-16">
          {/* Header */}
          <div className="px-4 pt-2 pb-3 flex items-center justify-between border-b border-[#DADDE1] dark:border-[#2f3032]">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                Notifications
              </h1>
              {unreadCount > 0 && (
                <Badge className="bg-[#9747FF] text-white hover:bg-[#8534f0] border-none font-semibold text-xs px-2 py-0.5">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="h-8 px-2.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-[#9747FF] dark:hover:text-[#9747FF]"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5 mr-1 text-[#9747FF]" />
                  <span>Mark all read</span>
                </Button>
              )}
              {notifications.some(n => n.read) && notifications.some(n => !n.read) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={deleteAllRead}
                  className="h-8 px-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-rose-600"
                  title="Clear read notifications"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  <span>Clear read</span>
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllNotifications}
                  className="h-8 px-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-rose-600"
                  title="Clear all notifications"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  <span>{notifications.every(n => n.read) ? 'Clear' : 'Clear all'}</span>
                </Button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-[#DADDE1] dark:border-[#2f3032] px-2 overflow-x-auto scrollbar-hide">
              <TabsList className="bg-transparent h-11 p-0 flex gap-1 justify-start">
                <TabsTrigger
                  value="all"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#9747FF] data-[state=active]:text-[#9747FF] data-[state=active]:bg-transparent px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 transition-colors"
                >
                  All ({notifications.length})
                </TabsTrigger>
                <TabsTrigger
                  value="unread"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#9747FF] data-[state=active]:text-[#9747FF] data-[state=active]:bg-transparent px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 transition-colors"
                >
                  Unread ({unreadCount})
                </TabsTrigger>
                <TabsTrigger
                  value="artwork"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#9747FF] data-[state=active]:text-[#9747FF] data-[state=active]:bg-transparent px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 transition-colors"
                >
                  Artwork ({artworkCount})
                </TabsTrigger>
                <TabsTrigger
                  value="bookings"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#9747FF] data-[state=active]:text-[#9747FF] data-[state=active]:bg-transparent px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 transition-colors"
                >
                  Bookings ({bookingsCount})
                </TabsTrigger>
                <TabsTrigger
                  value="messages"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#9747FF] data-[state=active]:text-[#9747FF] data-[state=active]:bg-transparent px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 transition-colors"
                >
                  Messages ({messagesCount})
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value={activeTab} className="m-0 focus-visible:outline-none">
              {filteredNotifications.length > 0 ? (
                <div className="flex flex-col">
                  {filteredNotifications.map((notification) => {
                    const isUnread = !notification.read;
                    return (
                      <div
                        key={notification._id}
                        onClick={() => handleNotificationClick(notification)}
                        className={cn(
                          'w-full px-4 py-3.5 border-b border-[#DADDE1] dark:border-[#2f3032] flex items-start gap-3.5 transition-colors cursor-pointer group hover:bg-gray-50/80 dark:hover:bg-[#1f2022]',
                          isUnread && 'bg-purple-50/40 dark:bg-purple-950/20'
                        )}
                      >
                        {/* Icon or Avatar */}
                        <div className="relative shrink-0 mt-0.5">
                          {notification.sender?.avatar ? (
                            <img
                              src={getAvatarUrl(notification.sender.avatar)}
                              alt=""
                              className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center">
                              {getNotificationIcon(notification.type)}
                            </div>
                          )}
                          {/* Mini Type Badge Indicator */}
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-[#18191a] border border-[#DADDE1] dark:border-[#2f3032] flex items-center justify-center shadow-xs">
                            {getNotificationIcon(notification.type)}
                          </div>
                        </div>

                        {/* Notification Body */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className={cn(
                                'text-sm text-gray-900 dark:text-gray-100 leading-snug',
                                isUnread ? 'font-bold' : 'font-medium'
                              )}>
                                {notification.title}
                                {isUnread && (
                                  <span className="inline-block w-2 h-2 rounded-full bg-[#9747FF] ml-2 align-middle" />
                                )}
                              </p>
                              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                                {notification.message}
                              </p>
                            </div>

                            <span className="text-[11px] text-gray-600 dark:text-gray-400 shrink-0 mt-0.5 font-medium">
                              {formatTime(notification.createdAt)}
                            </span>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 mt-2">
                            {isUnread && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification._id);
                                }}
                                className="text-xs text-[#9747FF] hover:underline font-medium inline-flex items-center gap-1"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Mark read</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification._id);
                              }}
                              className="text-xs text-gray-600 hover:text-rose-600 font-medium ml-auto p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                              title="Delete notification"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 px-4">
                  <EmptyState
                    image="/images/empty-notifications.png"
                    title="No notifications"
                    description={
                      activeTab === 'unread'
                        ? "You're all caught up. No unread notifications."
                        : "Nothing here yet. New activity will show up in this tab."
                    }
                    actionLabel="Browse creators"
                    onAction={() => (window.location.href = '/creators')}
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </main>

        {/* =========================================================================
            RIGHT COLUMN (lg:col-span-3, hidden on mobile)
            Notification Info & Community Highlights
           ========================================================================= */}
        <aside className="hidden lg:flex flex-col gap-6 lg:col-span-3 sticky top-20">
          {/* Notifications summary info */}
          <div className="pb-5 border-b border-[#DADDE1] dark:border-[#2f3032]">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2">
              Activity overview
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Total notifications</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{notifications.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Unread</span>
                <span className="font-semibold text-[#9747FF]">{unreadCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Posts & comments</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{artworkCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Bookings</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{bookingsCount}</span>
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div className="pb-5 border-b border-[#DADDE1] dark:border-[#2f3032]">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2">
              Discover
            </h4>
            <div className="space-y-2">
              <a
                href="/creators"
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-[#1e1f20] transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-[#9747FF]" />
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Browse creators</span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#9747FF] transition-colors" />
              </a>

              <a
                href="/home"
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-[#1e1f20] transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-[#9747FF]" />
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Explore feed</span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#9747FF] transition-colors" />
              </a>
            </div>
          </div>

          {/* Footer copyright */}
          <div className="px-1 text-xs text-gray-600 dark:text-gray-400">
            <p>© {new Date().getFullYear()} MyArteLab Inc.</p>
            <p className="mt-1">Portfolio & creative booking platform</p>
          </div>
        </aside>

      </div>

      {/* Clear All Notifications Modal (Type A: Centered Modal on both mobile & desktop) */}
      <ConfirmationModal
        isOpen={isClearModalOpen}
        onClose={() => !isClearing && setIsClearModalOpen(false)}
        onConfirm={handleConfirmClearAll}
        title="Clear all notifications?"
        description="This will remove all notifications from your inbox. This action cannot be undone."
        confirmLabel="Clear all"
        cancelLabel="Cancel"
        variant="destructive"
        isLoading={isClearing}
      />
    </div>
  );
}