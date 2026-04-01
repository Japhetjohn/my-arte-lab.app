import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui-custom/EmptyState';
import { conversations as mockConversations } from '@/lib/data/mockData';
import { Search, Send, Phone, Video, MoreVertical, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Conversation, Message } from '@/types';

// Mock messages for a conversation
const mockMessages: Message[] = [
  {
    id: 'm1',
    senderId: 'u1',
    receiverId: 'c1',
    content: 'Hi Sarah! I saw your portfolio and love your work.',
    createdAt: '2024-03-25T14:00:00',
    isRead: true,
  },
  {
    id: 'm2',
    senderId: 'c1',
    receiverId: 'u1',
    content: 'Thank you so much! I would love to work with you.',
    createdAt: '2024-03-25T14:05:00',
    isRead: true,
  },
  {
    id: 'm3',
    senderId: 'u1',
    receiverId: 'c1',
    content: 'Great! I have a product photography project. Are you available next week?',
    createdAt: '2024-03-25T14:10:00',
    isRead: true,
  },
  {
    id: 'm4',
    senderId: 'c1',
    receiverId: 'u1',
    content: 'Yes, I am available! Can you share more details about the project?',
    createdAt: '2024-03-25T14:15:00',
    isRead: true,
  },
  {
    id: 'm5',
    senderId: 'u1',
    receiverId: 'c1',
    content: 'I need 20 product photos for my e-commerce website. The products are jewelry items.',
    createdAt: '2024-03-25T14:20:00',
    isRead: true,
  },
  {
    id: 'm6',
    senderId: 'c1',
    receiverId: 'u1',
    content: 'That sounds perfect! I have experience with jewelry photography. I will send the first draft tomorrow.',
    createdAt: '2024-03-25T14:30:00',
    isRead: false,
  },
];

export function Messages() {
  const [conversations] = useState<Conversation[]>(mockConversations);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages] = useState<Message[]>(mockMessages);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    // In a real app, this would send the message
    setNewMessage('');
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const filteredConversations = conversations.filter(conv =>
    (conv.participant.name || 'Unknown').toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                    key={conversation.id}
                    onClick={() => setSelectedConversation(conversation)}
                    className={cn(
                      'w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 text-left',
                      selectedConversation?.id === conversation.id && 'bg-[#8A2BE2]/5'
                    )}
                  >
                    <div className="relative">
                      <img
                        src={conversation.participant.avatar}
                        alt={conversation.participant.name}
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
                          {conversation.participant.name}
                        </h3>
                        <span className="text-xs text-gray-400">
                          {formatTime(conversation.lastMessage.createdAt)}
                        </span>
                      </div>
                      <p className={cn(
                        'text-sm truncate',
                        conversation.unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'
                      )}>
                        {conversation.lastMessage.content}
                      </p>
                    </div>
                  </button>
                ))
              ) : (
                <EmptyState
                  image="/images/empty-messages.png"
                  title="No conversations"
                  description="Start messaging with creators"
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
                      src={selectedConversation.participant.avatar}
                      alt={selectedConversation.participant.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {selectedConversation.participant.name}
                      </h3>
                      <p className="text-xs text-green-600">Online</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon">
                      <Phone className="w-5 h-5" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Video className="w-5 h-5" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((message) => {
                    const isMe = message.senderId === 'u1';
                    return (
                      <div
                        key={message.id}
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

                {/* Input */}
                <div className="p-4 border-t border-gray-200">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleSendMessage}
                      className="bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
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
