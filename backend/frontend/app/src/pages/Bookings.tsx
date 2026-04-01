import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { BookingTracker } from '@/components/shared/BookingTracker';
import { bookings as mockBookings } from '@/lib/data/mockData';
import { Calendar, MessageSquare, MoreVertical, DollarSign } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Booking } from '@/types';

export function Bookings() {
  const [bookings] = useState<Booking[]>(mockBookings);

  const filterBookings = (status: string) => {
    if (status === 'all') return bookings;
    return bookings.filter(b => b.status === status);
  };

  const renderBookingCard = (booking: Booking) => (
    <Card key={booking.id} className="mb-4 hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <img
              src={booking.creator.avatar}
              alt={booking.creator.name}
              className="w-12 h-12 rounded-full object-cover"
            />
            <div>
              <h3 className="font-semibold text-gray-900">{booking.title}</h3>
              <p className="text-sm text-gray-500">with {booking.creator.name}</p>
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
                <DropdownMenuItem>View Details</DropdownMenuItem>
                <DropdownMenuItem>Contact Creator</DropdownMenuItem>
                {booking.status !== 'completed' && (
                  <DropdownMenuItem className="text-red-600">Cancel</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <BookingTracker booking={booking} />

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              ${booking.price}
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {booking.deadline ? new Date(booking.deadline).toLocaleDateString() : 'No deadline'}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={`/messages?user=${booking.creator.id}`}>
                <MessageSquare className="w-4 h-4 mr-1" />
                Message
              </a>
            </Button>
            <Button 
              size="sm" 
              className="bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white"
              asChild
            >
              <a href={`/bookings/${booking.id}`}>
                View Details
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

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

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress</TabsTrigger>
          <TabsTrigger value="review">Review</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
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

        <TabsContent value="review" className="mt-6">
          {filterBookings('review').length > 0 ? (
            filterBookings('review').map(renderBookingCard)
          ) : (
            <EmptyState
              image="/images/empty-bookings.png"
              title="Nothing under review"
              description="Bookings awaiting your review will appear here"
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
