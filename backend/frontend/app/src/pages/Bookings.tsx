import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { api } from '@/contexts/AuthContext';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Calendar, 
  MessageSquare, 
  MoreVertical, 
  DollarSign, 
  Loader2,
  Star
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface Booking {
  _id: string;
  bookingId: string;
  serviceTitle: string;
  serviceDescription: string;
  amount: number;
  currency: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
  startDate: string;
  endDate: string;
  completedAt?: string;
  client: {
    _id: string;
    name: string;
    avatar?: string;
    category?: string;
  };
  creator: {
    _id: string;
    name: string;
    avatar?: string;
    category?: string;
  };
  review?: {
    rating: number;
    comment: string;
  };
}

export function Bookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/bookings');
      setBookings(response.data.data?.bookings || []);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to fetch bookings');
    } finally {
      setIsLoading(false);
    }
  };

  const filterBookings = (status: string) => {
    if (status === 'all') return bookings;
    return bookings.filter(b => b.status === status);
  };



  const getOtherParty = (booking: Booking) => {
    if (user?.id === booking.client._id) {
      return booking.creator;
    }
    return booking.client;
  };

  const renderBookingCard = (booking: Booking) => {
    const otherParty = getOtherParty(booking);
    const isClient = user?.id === booking.client._id;
    
    return (
      <Card key={booking._id} className="mb-4 hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <img
                src={otherParty.avatar || '/images/avatar-1.png'}
                alt={otherParty.name}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <h3 className="font-semibold text-gray-900">{booking.serviceTitle}</h3>
                <p className="text-sm text-gray-500">
                  {isClient ? 'with' : 'for'} {otherParty.name}
                  {otherParty.category && (
                    <span className="text-gray-400"> • {otherParty.category}</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={booking.status} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => window.location.href = `/bookings/${booking._id}`}>
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.location.href = `/messages?user=${otherParty._id}`}>
                    Send Message
                  </DropdownMenuItem>
                  {booking.status !== 'completed' && booking.status !== 'cancelled' && (
                    <DropdownMenuItem 
                      className="text-red-600"
                      onClick={() => handleCancelBooking(booking._id)}
                    >
                      Cancel
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mb-4">
            <div className={`flex-1 h-2 rounded-full ${
              ['pending', 'awaiting_payment', 'confirmed', 'in_progress', 'delivered', 'completed'].includes(booking.status) 
                ? 'bg-[#8A2BE2]' : 'bg-gray-200'
            }`} />
            <div className={`flex-1 h-2 rounded-full ${
              ['confirmed', 'in_progress', 'delivered', 'completed'].includes(booking.status) 
                ? 'bg-[#8A2BE2]' : 'bg-gray-200'
            }`} />
            <div className={`flex-1 h-2 rounded-full ${
              ['in_progress', 'delivered', 'completed'].includes(booking.status) 
                ? 'bg-[#8A2BE2]' : 'bg-gray-200'
            }`} />
            <div className={`flex-1 h-2 rounded-full ${
              ['delivered', 'completed'].includes(booking.status) 
                ? 'bg-[#8A2BE2]' : 'bg-gray-200'
            }`} />
            <div className={`flex-1 h-2 rounded-full ${
              booking.status === 'completed' ? 'bg-[#8A2BE2]' : 'bg-gray-200'
            }`} />
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                {booking.amount} {booking.currency}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(booking.endDate).toLocaleDateString()}
              </div>
              {booking.review && (
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  {booking.review.rating}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.location.href = `/messages?user=${otherParty._id}`}
              >
                <MessageSquare className="w-4 h-4 mr-1" />
                Message
              </Button>
              <Button 
                size="sm" 
                className="bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white"
                onClick={() => window.location.href = `/bookings/${booking._id}`}
              >
                View Details
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    
    try {
      await api.post(`/bookings/${bookingId}/cancel`, { reason: 'Cancelled by user' });
      toast.success('Booking cancelled');
      fetchBookings();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to cancel booking');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#8A2BE2]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
        <Button 
          className="bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white"
          onClick={() => window.location.href = '/explore'}
        >
          New Booking
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
          <TabsTrigger value="all">All ({bookings.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({filterBookings('pending').length})</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress ({filterBookings('in_progress').length})</TabsTrigger>
          <TabsTrigger value="delivered">Delivered ({filterBookings('delivered').length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({filterBookings('completed').length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {filterBookings('all').length > 0 ? (
            filterBookings('all').map(renderBookingCard)
          ) : (
            <EmptyState
              image="/images/empty-bookings.png"
              title="No bookings yet"
              description="Start by booking a creator for your project"
              actionLabel="Explore Creators"
              onAction={() => window.location.href = '/explore'}
            />
          )}
        </TabsContent>

        <TabsContent value="pending" className="mt-6">
          {filterBookings('pending').length > 0 ? (
            filterBookings('pending').map(renderBookingCard)
          ) : (
            <EmptyState
              image="/images/empty-bookings.png"
              title="No pending bookings"
              description="Your pending bookings will appear here"
            />
          )}
        </TabsContent>

        <TabsContent value="in_progress" className="mt-6">
          {filterBookings('in_progress').length > 0 ? (
            filterBookings('in_progress').map(renderBookingCard)
          ) : (
            <EmptyState
              image="/images/empty-bookings.png"
              title="No active bookings"
              description="Your in-progress bookings will appear here"
            />
          )}
        </TabsContent>

        <TabsContent value="delivered" className="mt-6">
          {filterBookings('delivered').length > 0 ? (
            filterBookings('delivered').map(renderBookingCard)
          ) : (
            <EmptyState
              image="/images/empty-bookings.png"
              title="No delivered bookings"
              description="Bookings waiting for your review will appear here"
            />
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          {filterBookings('completed').length > 0 ? (
            filterBookings('completed').map(renderBookingCard)
          ) : (
            <EmptyState
              image="/images/empty-bookings.png"
              title="No completed bookings"
              description="Your completed bookings will appear here"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
