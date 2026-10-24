import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { api, useAuth } from '@/contexts/AuthContext';
import {
  Search,
  Send,
  ChevronLeft,
  Ban,
  Loader2,
  Info,
  ShieldCheck,
  CheckCircle2,
  MessageSquare,
  Home as HomeIcon,
  Users,
  Calendar,
  Wallet,
  X,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAvatarUrl } from '@/lib/imageUrl';
import { toast } from '@/components/ui/sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { VerifiedBadge } from '@/components/shared/VerifiedBadge';
import { creatorService } from '@/lib/api';
import type { Creator } from '@/types';

interface Participant {
  _id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  email?: string;
  username?: string;
  isVerified?: boolean;
}

interface Message {
  _id: string;
  senderId: string | Participant;
  recipientId: string | Participant;
  content: string;
  createdAt: string;
  read?: boolean;
}

interface Conversation {
  _id: string;
  otherUser: Participant;
  lastMessage: {
    content: string;
    createdAt: string;
    senderId?: string;
  };
  unreadCount: number;
}

export function Messages() {
  const { user: currentUser } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [suggestedCreators, setSuggestedCreators] = useState<Creator[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch conversations and suggested creators on mount
  useEffect(() => {
    fetchConversations();
    fetchSuggestedCreators();
  }, []);

  const fetchSuggestedCreators = async () => {
    try {
      const res = await creatorService.getCreators({ limit: 5 });
      const list = res.data?.data?.results || res.data?.data || [];
      setSuggestedCreators(list.slice(0, 5));
    } catch (err) {
      console.error('Error fetching suggested creators:', err);
    }
  };

  const fetchConversations = async () => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams(window.location.search);
      const userId = params.get('user');

      const response = await api.get('/messages/conversations');
      const convs = response.data.data?.conversations || [];
      setConversations(convs);

      // Handle user param - open existing or start conversation
      if (userId) {
        const existingConv = convs.find(
          (c: Conversation) => c.otherUser?._id === userId || c._id === userId
        );

        if (existingConv) {
          setSelectedConversation(existingConv);
        } else {
          try {
            const userRes = await api.get(`/creators/${userId}`);
            const userData = userRes.data.data?.creator || userRes.data.data;

            if (userData) {
              const newConv: Conversation = {
                _id: userId,
                otherUser: {
                  _id: userId,
                  name: userData.name,
                  firstName: userData.firstName,
                  lastName: userData.lastName,
                  avatar: userData.avatar,
                  email: userData.email,
                  username: userData.username,
                  isVerified: userData.isVerified,
                },
                lastMessage: {
                  content: 'Start a conversation...',
                  createdAt: new Date().toISOString(),
                },
                unreadCount: 0,
              };

              setConversations((prev) => [newConv, ...prev]);
              setSelectedConversation(newConv);
            } else {
              toast.error('User not found');
            }
          } catch (err) {
            console.error('Error fetching user for messaging:', err);
            toast.error('Could not start conversation');
          }
        }

        // Clean query param from URL bar
        const url = new URL(window.location.href);
        url.searchParams.delete('user');
        window.history.replaceState({}, '', url);
      }
    } catch (error: any) {
      console.error('Error fetching conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch messages and update block status when selected conversation changes
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation);
      checkBlockStatus(selectedConversation);

      if (selectedConversation.unreadCount > 0) {
        markAsRead(selectedConversation);
      }
    }
  }, [selectedConversation]);

  // Real-time polling for incoming messages every 10 seconds
  useEffect(() => {
    if (!selectedConversation) return;

    const interval = setInterval(() => {
      fetchMessages(selectedConversation);
    }, 10000);

    return () => clearInterval(interval);
  }, [selectedConversation]);

  // Handle browser back/forward buttons smoothly on mobile
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const userId = params.get('user');
      if (!userId) {
        setSelectedConversation(null);
      } else {
        const match = conversations.find(
          (c) => (c.otherUser?._id || c._id) === userId
        );
        if (match) setSelectedConversation(match);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [conversations]);

  const fetchMessages = async (conversation: Conversation) => {
    try {
      const otherUserId = conversation.otherUser?._id || conversation._id;
      const response = await api.get(`/messages/${otherUserId}`);
      setMessages(response.data.data?.messages || []);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
    }
  };

  const checkBlockStatus = async (conversation: Conversation) => {
    try {
      const otherUserId = conversation.otherUser?._id || conversation._id;
      const response = await api.get(`/blocks/${otherUserId}/status`);
      setIsBlocked(response.data.data?.isBlocked || false);
    } catch (error) {
      console.error('Error checking block status:', error);
    }
  };

  const markAsRead = async (conversation: Conversation) => {
    try {
      const otherUserId = conversation.otherUser?._id || conversation._id;
      await api.patch(`/messages/${otherUserId}/read`);

      // Update local conversation state immediately
      setConversations((prev) =>
        prev.map((conv) => {
          if ((conv.otherUser?._id || conv._id) === otherUserId) {
            return { ...conv, unreadCount: 0 };
          }
          return conv;
        })
      );

      // Notify App header to decrement message unread count badge
      window.dispatchEvent(
        new CustomEvent('messagesRead', { detail: { userId: otherUserId } })
      );
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Auto-scroll chat to latest message
  useEffect(() => {
    if (selectedConversation && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, selectedConversation]);

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    const otherUserId = conversation.otherUser?._id || conversation._id;
    const url = new URL(window.location.href);
    url.searchParams.set('user', otherUserId);
    window.history.pushState({ selectedUserId: otherUserId }, '', url);
  };

  const handleBackToList = () => {
    setSelectedConversation(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('user');
    window.history.pushState({}, '', url);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    if (isBlocked) {
      toast.error('You have blocked this user. Unblock them to send messages.');
      return;
    }

    const otherUserId = selectedConversation.otherUser?._id || selectedConversation._id;
    const messageContent = newMessage.trim();

    setIsSending(true);
    setNewMessage('');

    // Optimistic UI update
    const tempMessage: Message = {
      _id: `temp-${Date.now()}`,
      senderId: currentUser?.id || '',
      recipientId: otherUserId,
      content: messageContent,
      createdAt: new Date().toISOString(),
      read: false,
    };
    setMessages((prev) => [...prev, tempMessage]);

    try {
      const response = await api.post('/messages', {
        recipientId: otherUserId,
        content: messageContent,
      });

      const savedMessage = response.data.data?.message;
      if (savedMessage) {
        setMessages((prev) =>
          prev.map((m) => (m._id === tempMessage._id ? savedMessage : m))
        );

        // Update conversation list locally and move active thread to top
        setConversations((prev) => {
          const updated = prev.map((conv) => {
            if ((conv.otherUser?._id || conv._id) === otherUserId) {
              return {
                ...conv,
                lastMessage: {
                  content: savedMessage.content,
                  createdAt: savedMessage.createdAt,
                  senderId: savedMessage.senderId,
                },
              };
            }
            return conv;
          });

          const convIndex = updated.findIndex(
            (conv) => (conv.otherUser?._id || conv._id) === otherUserId
          );
          if (convIndex > 0) {
            const [conv] = updated.splice(convIndex, 1);
            updated.unshift(conv);
          }
          return updated;
        });
      }
    } catch (error: any) {
      setMessages((prev) => prev.filter((m) => m._id !== tempMessage._id));
      setNewMessage(messageContent);
      toast.error(error.response?.data?.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleBlockUser = async () => {
    if (!selectedConversation) return;

    const otherUserId = selectedConversation.otherUser?._id || selectedConversation._id;
    const otherUserName = getParticipantName(selectedConversation.otherUser);

    if (!confirm(`Are you sure you want to block ${otherUserName}?`)) return;

    try {
      await api.post(`/blocks/${otherUserId}`);
      setIsBlocked(true);
      toast.success(`${otherUserName} has been blocked`);

      setConversations((prev) =>
        prev.filter((c) => {
          const cUserId = c.otherUser?._id || c._id;
          return cUserId !== otherUserId;
        })
      );
      handleBackToList();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to block user');
    }
  };

  const handleUnblockUser = async () => {
    if (!selectedConversation) return;

    const otherUserId = selectedConversation.otherUser?._id || selectedConversation._id;
    const otherUserName = getParticipantName(selectedConversation.otherUser);

    try {
      await api.delete(`/blocks/${otherUserId}`);
      setIsBlocked(false);
      toast.success(`${otherUserName} unblocked`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to unblock user');
    }
  };

  // Timestamp formatters styled after reference image
  const formatListTimestamp = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min`;
    if (diffHours < 24 && date.getDate() === now.getDate()) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'}`;
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const formatMessageTime = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDateHeader = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  };

  const getParticipantName = (participant?: Participant) => {
    if (!participant) return 'Member';
    return (
      participant.name ||
      `${participant.firstName || ''} ${participant.lastName || ''}`.trim() ||
      'Member'
    );
  };

  const getParticipantUsername = (participant?: Participant) => {
    if (!participant) return '';
    if (participant.username) return participant.username;
    if (participant.email) return participant.email.split('@')[0];
    const name = getParticipantName(participant);
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
  };

  const isMyMessage = (message: Message) => {
    const senderId =
      typeof message.senderId === 'string'
        ? message.senderId
        : message.senderId?._id;
    return senderId === currentUser?.id;
  };

  const filteredConversations = conversations.filter((conv) => {
    const name = getParticipantName(conv.otherUser).toLowerCase();
    const username = getParticipantUsername(conv.otherUser).toLowerCase();
    const lastMsg = (conv.lastMessage?.content || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || username.includes(query) || lastMsg.includes(query);
  });

  // Group messages chronologically by day
  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatDateHeader(message.createdAt);
    if (!groups[date]) groups[date] = [];
    groups[date].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  const currentUserUsername = currentUser?.email
    ? currentUser.email.split('@')[0]
    : 'user';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#9747FF]" />
      </div>
    );
  }

  return (
    <div className="w-full relative">
      {/* 3-Column Standardized Layout (Consistent with Home, Bookings & Creators) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* =========================================================================
            LEFT COLUMN (lg:col-span-3, hidden on mobile/tablet)
            Profile summary & platform navigation
           ========================================================================= */}
        <aside className="hidden lg:flex flex-col gap-6 lg:col-span-3 sticky top-20">
          {/* User Profile Section */}
          <div className="pb-5 border-b border-[#DADDE1] dark:border-[#2f3032]">
            {currentUser ? (
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-purple-100 dark:bg-purple-950/40 flex items-center justify-center border-2 border-[#9747FF]/20 mb-3">
                  {currentUser.avatar ? (
                    <img
                      src={getAvatarUrl(currentUser.avatar)}
                      alt={currentUser.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[#9747FF] font-bold text-xl">
                      {(currentUser.name || currentUser.firstName || 'U')[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-center gap-1.5 max-w-full">
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base leading-tight truncate">
                    {currentUser.name ||
                      `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() ||
                      'Member'}
                  </h3>
                  {(currentUser as any)?.isVerified && (
                    <VerifiedBadge
                      className="w-4 h-4 shrink-0 inline-block align-middle"
                      showTooltip={false}
                    />
                  )}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                  @{currentUserUsername}
                </p>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/50 text-[#9747FF] text-xs font-semibold mt-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#9747FF]"></span>
                  {currentUser.role === 'creator' ? 'Verified Creator' : 'Creative Member'}
                </div>
              </div>
            ) : (
              <div className="text-center py-2">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-950/40 text-[#9747FF] flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">
                  Direct Messages
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 mb-4 leading-relaxed">
                  Sign in to connect, collaborate, and chat directly with creators and clients.
                </p>
                <Button
                  type="button"
                  onClick={() => (window.location.href = '/login?redirect=/messages')}
                  className="w-full bg-[#9747FF] hover:bg-[#8534f0] text-white font-semibold rounded-xl text-xs py-2 shadow-xs cursor-pointer"
                >
                  Log In / Sign Up
                </Button>
              </div>
            )}
          </div>

          {/* Quick Navigation Menu */}
          <div className="pb-2">
            <nav className="space-y-1">
              <a
                href="/home"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-gray-700 dark:text-gray-300 hover:text-[#9747FF] dark:hover:text-[#9747FF] hover:bg-gray-100/70 dark:hover:bg-white/[0.04] transition-colors"
              >
                <HomeIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span>Home</span>
              </a>

              <a
                href="/creators"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-gray-700 dark:text-gray-300 hover:text-[#9747FF] dark:hover:text-[#9747FF] hover:bg-gray-100/70 dark:hover:bg-white/[0.04] transition-colors"
              >
                <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span>Browse Creators</span>
              </a>

              {currentUser && (
                <>
                  <a
                    href="/bookings"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-gray-700 dark:text-gray-300 hover:text-[#9747FF] dark:hover:text-[#9747FF] hover:bg-gray-100/70 dark:hover:bg-white/[0.04] transition-colors"
                  >
                    <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span>My Bookings</span>
                  </a>

                  <a
                    href="/wallet"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-gray-700 dark:text-gray-300 hover:text-[#9747FF] dark:hover:text-[#9747FF] hover:bg-gray-100/70 dark:hover:bg-white/[0.04] transition-colors"
                  >
                    <Wallet className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span>Wallet &amp; Earnings</span>
                  </a>

                  <a
                    href="/messages"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm bg-purple-50 dark:bg-purple-950/50 text-[#9747FF] transition-colors"
                  >
                    <MessageSquare className="w-4 h-4 text-[#9747FF]" />
                    <span>Messages</span>
                  </a>
                </>
              )}
            </nav>
          </div>
        </aside>

        {/* =========================================================================
            CENTER COLUMN (lg:col-span-6, full width on mobile)
            Two-pane messaging interface on desktop, single-view transition on mobile
           ========================================================================= */}
        <main className="col-span-1 lg:col-span-6 flex flex-col min-w-0">
          {/* Main Messaging Container — Borderless Clean Card-Free Design */}
          <div className="w-full bg-white dark:bg-[#18191a] border border-[#DADDE1] dark:border-[#2f3032] rounded-2xl overflow-hidden flex h-[calc(100vh-8.5rem)] min-h-[580px] shadow-xs">
            {/* ---------------------------------------------------------------------
                PANE 1: CONVERSATION LIST
                Hidden on mobile when an individual conversation is active
               --------------------------------------------------------------------- */}
            <div
              className={cn(
                'w-full lg:w-[220px] xl:w-[250px] shrink-0 border-r border-[#DADDE1] dark:border-[#2f3032] flex flex-col h-full bg-white dark:bg-[#18191a]',
                selectedConversation && 'hidden lg:flex'
              )}
            >
              {/* Header with Title and Search Icon */}
              <div className="px-4 py-3.5 border-b border-[#DADDE1] dark:border-[#2f3032] shrink-0">
                <div className="flex items-center justify-between">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-950 dark:text-gray-100">
                    Messages
                  </h1>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSearchOpen((prev) => !prev);
                      setTimeout(() => searchInputRef.current?.focus(), 50);
                    }}
                    className={cn(
                      'p-2 rounded-full text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-[#252628] transition-colors cursor-pointer',
                      (isSearchOpen || searchQuery) && 'text-[#9747FF] bg-purple-50 dark:bg-purple-950/40'
                    )}
                    aria-label="Search messages"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                </div>

                {/* Collapsible Clean Search Input */}
                {(isSearchOpen || searchQuery) && (
                  <div className="mt-3 relative flex items-center">
                    <Search className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search messages..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-gray-100 dark:bg-[#252628] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 text-xs rounded-full pl-9 pr-8 py-2 border-none outline-none focus:ring-1 focus:ring-[#9747FF]/40 transition-all"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Vertically Scrolling Conversation List */}
              <div className="flex-1 overflow-y-auto divide-y divide-[#DADDE1] dark:divide-[#2f3032]">
                {filteredConversations.length > 0 ? (
                  filteredConversations.map((conversation) => {
                    const isSelected = selectedConversation?._id === conversation._id;
                    const otherUser = conversation.otherUser;
                    const name = getParticipantName(otherUser);
                    const username = getParticipantUsername(otherUser);
                    const time = formatListTimestamp(conversation.lastMessage?.createdAt);
                    const unread = conversation.unreadCount || 0;

                    return (
                      <button
                        key={conversation._id}
                        type="button"
                        onClick={() => handleSelectConversation(conversation)}
                        className={cn(
                          'w-full px-3.5 py-3 flex items-start gap-3 hover:bg-gray-50/80 dark:hover:bg-white/[0.03] transition-colors text-left cursor-pointer group',
                          isSelected && 'bg-[#9747FF]/5 dark:bg-[#9747FF]/10 border-l-2 border-[#9747FF]'
                        )}
                      >
                        {/* Circular Avatar */}
                        <div className="relative shrink-0 mt-0.5">
                          <img
                            src={getAvatarUrl(otherUser?.avatar)}
                            alt={name}
                            className="w-11 h-11 rounded-full object-cover border border-gray-200/80 dark:border-gray-800"
                          />
                        </div>

                        {/* Conversation Details */}
                        <div className="flex-1 min-w-0">
                          {/* Row 1: Name and Timestamp */}
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <h3 className="font-semibold text-xs sm:text-sm text-gray-950 dark:text-gray-100 truncate group-hover:text-[#9747FF] transition-colors">
                              {name}
                            </h3>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap shrink-0">
                              {time}
                            </span>
                          </div>

                          {/* Row 2: @Username */}
                          {username && (
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-normal truncate -mt-0.5 mb-1">
                              @{username}
                            </p>
                          )}

                          {/* Row 3: Message preview & Unread badge */}
                          <div className="flex items-center justify-between gap-2">
                            <p
                              className={cn(
                                'text-xs truncate',
                                unread > 0
                                  ? 'text-gray-950 dark:text-gray-100 font-medium'
                                  : 'text-gray-500 dark:text-gray-400 font-normal'
                              )}
                            >
                              {conversation.lastMessage?.content || 'No messages yet'}
                            </p>
                            {unread > 0 && (
                              <span className="h-4.5 min-w-[18px] px-1 rounded-full bg-[#9747FF] text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-xs">
                                {unread}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="py-12 px-4 text-center">
                    <EmptyState
                      image="/images/empty-messages.png"
                      title={searchQuery ? 'No results found' : 'No messages yet'}
                      description={
                        searchQuery
                          ? `No conversation matches "${searchQuery}"`
                          : 'Connect with creators to start a conversation.'
                      }
                      actionLabel={searchQuery ? 'Clear Search' : 'Browse Creators'}
                      onAction={() => {
                        if (searchQuery) setSearchQuery('');
                        else window.location.href = '/creators';
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* ---------------------------------------------------------------------
                PANE 2: INDIVIDUAL CONVERSATION VIEW
                Takes over full view on mobile; side-by-side right pane on desktop
               --------------------------------------------------------------------- */}
            <div
              className={cn(
                'flex-1 flex flex-col min-w-0 h-full bg-white dark:bg-[#18191a]',
                !selectedConversation && 'hidden lg:flex',
                selectedConversation && 'fixed inset-0 z-40 lg:static lg:z-auto h-[100dvh] lg:h-full'
              )}
            >
              {selectedConversation ? (
                <>
                  {/* Conversation Header */}
                  <div className="px-4 py-3 border-b border-[#DADDE1] dark:border-[#2f3032] flex items-center justify-between bg-white dark:bg-[#18191a] shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Back button (Mobile view only) */}
                      <button
                        type="button"
                        onClick={handleBackToList}
                        className="p-1.5 -ml-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-[#252628] transition-colors lg:hidden cursor-pointer"
                        aria-label="Back to messages"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>

                      {/* Recipient Avatar */}
                      <a
                        href={`/creators/${selectedConversation.otherUser?._id || selectedConversation._id}`}
                        className="shrink-0"
                      >
                        <img
                          src={getAvatarUrl(selectedConversation.otherUser?.avatar)}
                          alt={getParticipantName(selectedConversation.otherUser)}
                          className="w-10 h-10 rounded-full object-cover border border-gray-200/80 dark:border-gray-800"
                        />
                      </a>

                      {/* Recipient Name and Username */}
                      <div className="min-w-0">
                        <a
                          href={`/creators/${selectedConversation.otherUser?._id || selectedConversation._id}`}
                          className="hover:underline flex items-center gap-1 group truncate"
                        >
                          <h2 className="font-bold text-sm sm:text-base text-gray-950 dark:text-gray-100 leading-tight truncate">
                            {getParticipantName(selectedConversation.otherUser)}
                          </h2>
                          {selectedConversation.otherUser?.isVerified && (
                            <VerifiedBadge className="w-3.5 h-3.5 shrink-0 inline-block align-middle" showTooltip={false} />
                          )}
                        </a>
                        {getParticipantUsername(selectedConversation.otherUser) && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-normal truncate">
                            @{getParticipantUsername(selectedConversation.otherUser)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions Menu */}
                    <div className="flex items-center gap-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-[#252628] transition-colors cursor-pointer"
                            aria-label="Conversation options"
                          >
                            <Info className="w-5 h-5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-48 bg-white dark:bg-[#1f2022] border border-[#DADDE1] dark:border-[#2f3032] shadow-lg rounded-xl p-1"
                        >
                          <DropdownMenuItem
                            onClick={() =>
                              (window.location.href = `/creators/${selectedConversation.otherUser?._id || selectedConversation._id}`)
                            }
                            className="cursor-pointer text-xs font-medium py-2 rounded-lg"
                          >
                            <ExternalLink className="w-4 h-4 mr-2 text-gray-500" />
                            View Profile
                          </DropdownMenuItem>

                          {isBlocked ? (
                            <DropdownMenuItem
                              onClick={handleUnblockUser}
                              className="cursor-pointer text-xs font-medium text-[#9747FF] focus:text-[#9747FF] py-2 rounded-lg"
                            >
                              <Ban className="w-4 h-4 mr-2 text-[#9747FF]" />
                              Unblock User
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={handleBlockUser}
                              className="cursor-pointer text-xs font-medium text-red-600 focus:text-red-600 py-2 rounded-lg"
                            >
                              <Ban className="w-4 h-4 mr-2 text-red-600" />
                              Block User
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Message History Thread */}
                  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-white dark:bg-[#18191a]">
                    {Object.entries(groupedMessages).map(([date, dateMessages]) => (
                      <div key={date} className="space-y-3">
                        {/* Centered Date Separator Pill */}
                        <div className="flex justify-center my-2">
                          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#252628] px-3 py-0.5 rounded-full">
                            {date}
                          </span>
                        </div>

                        {/* Messages in Group */}
                        {dateMessages.map((message) => {
                          const isMe = isMyMessage(message);
                          return (
                            <div
                              key={message._id}
                              className={cn('flex w-full', isMe ? 'justify-end' : 'justify-start')}
                            >
                              <div
                                className={cn(
                                  'max-w-[80%] sm:max-w-[75%] flex flex-col',
                                  isMe ? 'items-end' : 'items-start'
                                )}
                              >
                                {/* Message Bubble */}
                                <div
                                  className={cn(
                                    'px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words whitespace-pre-wrap',
                                    isMe
                                      ? 'bg-[#9747FF] text-white rounded-tr-xs shadow-xs'
                                      : 'bg-gray-100 dark:bg-[#252628] text-gray-900 dark:text-gray-100 rounded-tl-xs'
                                  )}
                                >
                                  {message.content}
                                </div>

                                {/* Subtle Timestamp */}
                                <span
                                  className={cn(
                                    'text-[10px] text-gray-400 dark:text-gray-500 mt-1 block',
                                    isMe ? 'mr-1 text-right' : 'ml-1 text-left'
                                  )}
                                >
                                  {formatMessageTime(message.createdAt)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Composer Anchored at Bottom */}
                  <div className="p-3 sm:p-4 border-t border-[#DADDE1] dark:border-[#2f3032] bg-white dark:bg-[#18191a] shrink-0 safe-area-pb">
                    {isBlocked ? (
                      <div className="text-center py-2.5 px-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs rounded-xl border border-red-100 dark:border-red-900/40">
                        You have blocked this user.
                        <button
                          type="button"
                          onClick={handleUnblockUser}
                          className="underline ml-1 font-semibold text-[#9747FF] cursor-pointer"
                        >
                          Unblock to message
                        </button>
                      </div>
                    ) : (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSendMessage();
                        }}
                        className="flex items-center gap-2"
                      >
                        {/* Rounded-full Light Gray Input Container */}
                        <div className="flex-1 bg-gray-100 dark:bg-[#252628] rounded-full flex items-center px-4 py-1.5 focus-within:ring-2 focus-within:ring-[#9747FF]/20 focus-within:bg-white dark:focus-within:bg-[#202124] border border-transparent focus-within:border-[#9747FF]/30 transition-all">
                          <input
                            type="text"
                            placeholder="Write a message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                if (!isSending && newMessage.trim()) {
                                  handleSendMessage();
                                }
                              }
                            }}
                            disabled={isSending}
                            className="w-full bg-transparent border-0 outline-none text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 py-1"
                          />
                        </div>

                        {/* Circular Purple Send Button */}
                        <button
                          type="submit"
                          disabled={isSending || !newMessage.trim()}
                          className="w-10 h-10 rounded-full bg-[#9747FF] hover:bg-[#8534f0] disabled:opacity-40 disabled:hover:bg-[#9747FF] text-white flex items-center justify-center shrink-0 shadow-xs transition-all active:scale-95 cursor-pointer"
                          aria-label="Send message"
                        >
                          {isSending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4 -ml-0.5" />
                          )}
                        </button>
                      </form>
                    )}
                  </div>
                </>
              ) : (
                /* Desktop Empty Selection State */
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-[#18191a]">
                  <div className="w-16 h-16 rounded-full bg-purple-50 dark:bg-purple-950/40 text-[#9747FF] flex items-center justify-center mb-4">
                    <MessageSquare className="w-8 h-8" />
                  </div>
                  <h3 className="font-bold text-gray-950 dark:text-gray-100 text-base mb-1">
                    Your Messages
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mb-5 leading-relaxed">
                    Select a conversation from the list to start chatting, or browse creators to connect and collaborate.
                  </p>
                  <Button
                    type="button"
                    onClick={() => (window.location.href = '/creators')}
                    className="bg-[#9747FF] hover:bg-[#8534f0] text-white text-xs font-semibold rounded-xl px-4 py-2 shadow-xs cursor-pointer"
                  >
                    Browse Creators
                  </Button>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* =========================================================================
            RIGHT COLUMN (lg:col-span-3, hidden on mobile/tablet)
            Top Creators & Safe Messaging Escrow Guarantee
           ========================================================================= */}
        <aside className="hidden lg:flex flex-col gap-6 lg:col-span-3 sticky top-20">
          {/* Safe Messaging Escrow Protection */}
          <div className="pb-5 border-b border-[#DADDE1] dark:border-[#2f3032]">
            <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100 mb-2">
              <ShieldCheck className="w-4 h-4 text-[#9747FF]" />
              <h4 className="text-xs font-semibold uppercase tracking-wider">
                Safe Messaging &amp; Escrow
              </h4>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
              Keep communication and payments on MyArteLab for 100% escrow protection, verified deliverables, and dispute mediation.
            </p>
            <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#9747FF] shrink-0 mt-0.5" />
                <span>Zero financial release before deliverable inspection</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#9747FF] shrink-0 mt-0.5" />
                <span>Encrypted conversations &amp; contract trail</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#9747FF] shrink-0 mt-0.5" />
                <span>Full refund rights if agreements are unfulfilled</span>
              </div>
            </div>
          </div>

          {/* Top Creators to Connect With */}
          <div className="pb-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#DADDE1] dark:border-[#2f3032] mb-3.5">
              <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 tracking-tight">
                Top Creators
              </h4>
              <a
                href="/creators"
                className="text-xs font-semibold text-[#9747FF] hover:underline"
              >
                View all
              </a>
            </div>

            <div className="space-y-3.5">
              {suggestedCreators.map((creator) => {
                const creatorName =
                  creator.name ||
                  `${creator.firstName || ''} ${creator.lastName || ''}`.trim() ||
                  'Creator';
                const creatorUsername =
                  (creator as any)?.username ||
                  (creator.email ? creator.email.split('@')[0] : '');

                return (
                  <div key={creator.id} className="flex items-center justify-between gap-2.5">
                    <a
                      href={`/creators/${creator.id}`}
                      className="flex items-center gap-2.5 min-w-0 group cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-purple-100 dark:bg-purple-950/40 flex items-center justify-center shrink-0 border border-purple-200 dark:border-purple-800/40">
                        {creator.avatar ? (
                          <img
                            src={getAvatarUrl(creator.avatar)}
                            alt={creatorName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[#9747FF] font-bold text-xs">
                            {(creatorName || 'C')[0]?.toUpperCase() || 'C'}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex flex-col">
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="font-bold text-xs text-gray-900 dark:text-gray-100 group-hover:text-[#9747FF] truncate">
                            {creatorName}
                          </span>
                          {creator.isVerified && (
                            <VerifiedBadge
                              className="w-3.5 h-3.5 shrink-0 inline-block align-middle"
                              showTooltip={false}
                            />
                          )}
                        </div>
                        {creatorUsername && (
                          <span className="text-[11px] text-gray-500 dark:text-gray-400 font-normal truncate mt-0.5">
                            @{creatorUsername}
                          </span>
                        )}
                        <span className="text-[11px] text-gray-600 dark:text-gray-400 truncate">
                          {Array.isArray(creator.category)
                            ? creator.category[0]
                            : creator.category || 'Creative'}
                        </span>
                      </div>
                    </a>

                    <a
                      href={`/messages?user=${creator.id}`}
                      className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/50 text-[#9747FF] hover:bg-[#9747FF] hover:text-white transition-all cursor-pointer"
                    >
                      Chat
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
