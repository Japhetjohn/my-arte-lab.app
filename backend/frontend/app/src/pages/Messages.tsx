import { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { api, useAuth } from '@/contexts/AuthContext';
import { Search, Send, Phone, Video, MoreVertical, ChevronLeft, Ban, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Participant {
  _id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [initialUserId, setInitialUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch conversations - non-blocking
  const fetchConversations = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const response = await api.get('/messages/conversations');
      setConversations(response.data.data?.conversations || []);
      return response.data.data?.conversations || [];
    } catch (error: any) {
      console.error('Error fetching conversations:', error);
      return [];
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  // Check URL for user parameter on mount - IMMEDIATE
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('user');
    if (userId) {
      setInitialUserId(userId);
      // IMMEDIATELY create a placeholder conversation so UI renders fast
      const placeholderConv: Conversation = {
        _id: userId,
        otherUser: {
          _id: userId,
          name: 'Loading...',
          avatar: '/images/avatar-1.png',
        },
        lastMessage: {
          content: 'Starting conversation...',
          createdAt: new Date().toISOString(),
        },
        unreadCount: 0,
      };
      setConversations([placeholderConv]);
      setSelectedConversation(placeholderConv);
    }
  }, []);

  // Initial load - runs AFTER first render
  useEffect(() => {
    // Start loading conversations in background
    fetchConversations(true);

    // If there's a user param, fetch real user details and update
    if (initialUserId) {
      api.get(`/creators/${initialUserId}`)
        .then(userResponse => {
          const userData = userResponse?.data?.data?.creator || userResponse?.data?.data;
          if (userData) {
            // Update the placeholder with real data
            setConversations(prev => prev.map(c => 
              c._id === initialUserId ? {
                ...c,
                otherUser: {
                  _id: initialUserId,
                  name: userData.name,
                  firstName: userData.firstName,
                  lastName: userData.lastName,
                  avatar: userData.avatar,
                },
                lastMessage: {
                  content: 'Start a conversation...',
                  createdAt: new Date().toISOString(),
                },
              } : c
            ));
          }
          // Clear URL
          const url = new URL(window.location.href);
          url.searchParams.delete('user');
          window.history.replaceState({}, '', url);
        })
        .catch(() => {
          toast.error('Could not load user');
        });
    }

    // Poll for new conversations every 10 seconds (less aggressive)
    pollIntervalRef.current = window.setInterval(() => fetchConversations(false), 10000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [fetchConversations, initialUserId]);

  // Fetch messages when conversation is selected
  const fetchMessages = useCallback(async (conversation: Conversation) => {
    try {
      const otherUserId = conversation.otherUser?._id || conversation._id;
      const response = await api.get(`/messages/${otherUserId}`);
      setMessages(response.data.data?.messages || []);
      
      // Refresh conversations to update unread count
      fetchConversations();
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    }
  }, [fetchConversations]);

  // Check block status
  const checkBlockStatus = useCallback(async (conversation: Conversation) => {
    try {
      const otherUserId = conversation.otherUser?._id || conversation._id;
      const response = await api.get(`/blocks/${otherUserId}/status`);
      setIsBlocked(response.data.data?.isBlocked || false);
    } catch (error) {
      console.error('Error checking block status:', error);
    }
  }, []);

  // When conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation);
      checkBlockStatus(selectedConversation);

      // Poll for new messages every 3 seconds
      const messagePoll = setInterval(() => {
        fetchMessages(selectedConversation);
      }, 3000);

      return () => clearInterval(messagePoll);
    }
  }, [selectedConversation, fetchMessages, checkBlockStatus]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

    // Optimistically add message
    const tempMessage: Message = {
      _id: `temp-${Date.now()}`,
      senderId: currentUser?.id || '',
      recipientId: otherUserId,
      content: messageContent,
      createdAt: new Date().toISOString(),
      read: false,
    };
    setMessages(prev => [...prev, tempMessage]);

    try {
      const response = await api.post('/messages', {
        recipientId: otherUserId,
        content: messageContent,
      });

      // Replace temp message with real one
      const savedMessage = response.data.data?.message;
      if (savedMessage) {
        setMessages(prev => prev.map(m => m._id === tempMessage._id ? savedMessage : m));
      }

      // Refresh conversations
      fetchConversations();
    } catch (error: any) {
      // Remove temp message on error
      setMessages(prev => prev.filter(m => m._id !== tempMessage._id));
      setNewMessage(messageContent); // Restore input
      
      const errorMsg = error.response?.data?.message || 'Failed to send message';
      toast.error(errorMsg);
    } finally {
      setIsSending(false);
    }
  };

  const handleBlockUser = async () => {
    if (!selectedConversation) return;
    
    const otherUserId = selectedConversation.otherUser?._id || selectedConversation._id;
    const otherUserName = getParticipantName(selectedConversation.otherUser);

    if (!confirm(`Are you sure you want to block ${otherUserName}? You won't see their messages anymore.`)) {
      return;
    }

    try {
      await api.post(`/blocks/${otherUserId}`);
      setIsBlocked(true);
      toast.success(`${otherUserName} has been blocked`);
      
      // Remove conversation from list
      setConversations(prev => prev.filter(c => {
        const cUserId = c.otherUser?._id || c._id;
        return cUserId !== otherUserId;
      }));
      
      // Close conversation
      setSelectedConversation(null);
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
      toast.success(`${otherUserName} has been unblocked`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to unblock user');
    }
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const getParticipantName = (participant?: Participant) => {
    if (!participant) return 'Unknown';
    return participant.name || 
           `${participant.firstName || ''} ${participant.lastName || ''}`.trim() || 
           'Unknown';
  };

  const getParticipantAvatar = (participant?: Participant) => {
    return participant?.avatar || '/images/avatar-1.png';
  };

  const isMyMessage = (message: Message) => {
    const senderId = typeof message.senderId === 'string' 
      ? message.senderId 
      : message.senderId?._id;
    return senderId === currentUser?.id;
  };

  const filteredConversations = conversations.filter(conv =>
    getParticipantName(conv.otherUser).toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatDate(message.createdAt);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-[#8A2BE2]" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] pb-20 lg:pb-8">
      <Card className="h-full overflow-hidden">
        <div className="flex h-full">
          {/* Conversations List */}
          <div className={cn(
            'w-full lg:w-80 border-r border-gray-200 flex flex-col',
            selectedConversation && 'hidden lg:flex'
          )}>
            <div className="p-4 border-b border-gray-200">
              <h1 className="text-xl font-bold text-gray-900 mb-4">Messages</h1>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search conversations..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.length > 0 ? (
                filteredConversations.map((conversation) => (
                  <button
                    key={conversation._id}
                    onClick={() => setSelectedConversation(conversation)}
                    className={cn(
                      'w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 text-left',
                      selectedConversation?._id === conversation._id && 'bg-[#8A2BE2]/5'
                    )}
                  >
                    <div className="relative">
                      <img
                        src={getParticipantAvatar(conversation.otherUser)}
                        alt={getParticipantName(conversation.otherUser)}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      {conversation.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#8A2BE2] text-white text-xs rounded-full flex items-center justify-center">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 truncate">
                          {getParticipantName(conversation.otherUser)}
                        </h3>
                        <span className="text-xs text-gray-400">
                          {formatTime(conversation.lastMessage?.createdAt)}
                        </span>
                      </div>
                      <p className={cn(
                        'text-sm truncate',
                        conversation.unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'
                      )}>
                        {conversation.lastMessage?.content || 'No messages yet'}
                      </p>
                    </div>
                  </button>
                ))
              ) : (
                <EmptyState
                  image="/images/empty-messages.png"
                  title="No conversations"
                  description={searchQuery ? 'No conversations match your search' : 'Start messaging with creators or clients'}
                />
              )}
            </div>
          </div>

          {/* Chat Window */}
          <div className={cn(
            'flex-1 flex flex-col',
            !selectedConversation && 'hidden lg:flex'
          )}>
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="lg:hidden"
                      onClick={() => setSelectedConversation(null)}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <img
                      src={getParticipantAvatar(selectedConversation.otherUser)}
                      alt={getParticipantName(selectedConversation.otherUser)}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {getParticipantName(selectedConversation.otherUser)}
                      </h3>
                      <p className="text-xs text-green-600">
                        {isBlocked ? 'Blocked' : 'Online'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon">
                      <Phone className="w-5 h-5" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Video className="w-5 h-5" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-5 h-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {isBlocked ? (
                          <DropdownMenuItem onClick={handleUnblockUser}>
                            <Ban className="w-4 h-4 mr-2 text-green-600" />
                            <span className="text-green-600">Unblock User</span>
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={handleBlockUser}>
                            <Ban className="w-4 h-4 mr-2 text-red-600" />
                            <span className="text-red-600">Block User</span>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {Object.entries(groupedMessages).map(([date, dateMessages]) => (
                    <div key={date} className="space-y-4">
                      <div className="flex justify-center">
                        <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                          {date}
                        </span>
                      </div>
                      {dateMessages.map((message) => {
                        const isMe = isMyMessage(message);
                        return (
                          <div
                            key={message._id}
                            className={cn(
                              'flex',
                              isMe ? 'justify-end' : 'justify-start'
                            )}
                          >
                            <div
                              className={cn(
                                'max-w-[70%] px-4 py-2 rounded-2xl',
                                isMe
                                  ? 'bg-[#8A2BE2] text-white rounded-br-md'
                                  : 'bg-gray-100 text-gray-900 rounded-bl-md'
                              )}
                            >
                              <p>{message.content}</p>
                              <span className={cn(
                                'text-xs mt-1 block',
                                isMe ? 'text-white/70' : 'text-gray-500'
                              )}>
                                {formatTime(message.createdAt)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-gray-200">
                  {isBlocked ? (
                    <div className="text-center py-2 px-4 bg-red-50 text-red-600 rounded-lg">
                      You have blocked this user. 
                      <button 
                        onClick={handleUnblockUser}
                        className="underline ml-1 font-medium"
                      >
                        Unblock to send messages
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !isSending && handleSendMessage()}
                        className="flex-1"
                        disabled={isSending}
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={isSending || !newMessage.trim()}
                        className="bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white"
                      >
                        {isSending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <EmptyState
                  image="/images/welcome.png"
                  title="Select a conversation"
                  description="Choose a conversation from the list to start messaging"
                />
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
