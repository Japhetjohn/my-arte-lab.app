import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { api } from '@/contexts/AuthContext';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Loader2, 
  ArrowLeft, 
  MessageSquare, 
  DollarSign, 
  CheckCircle,
  Star,
  Upload,
  AlertCircle,
  User
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';

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
  cancellationReason?: string;
  counterProposal?: {
    amount: number;
    proposedAt: string;
    applied?: boolean;
  };
  client: {
    _id: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
    email?: string;
  };
  creator: {
    _id: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
    email?: string;
    category?: string;
  };
  deliverables?: Array<{
    title: string;
    description: string;
    fileUrl?: string;
    uploadedAt: string;
  }>;
  review?: {
    rating: number;
    comment: string;
    createdAt: string;
  };
}

interface BookingDetailProps {
  bookingId?: string;
}

export function BookingDetail({ bookingId: propBookingId }: BookingDetailProps = {}) {
  const { user } = useAuth();
  // Get booking ID from URL if not passed as prop
  const urlMatch = typeof window !== 'undefined' ? window.location.pathname.match(/\/bookings\/(.+)/) : null;
  const id = propBookingId || urlMatch?.[1];
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [deliverableForm, setDeliverableForm] = useState({ title: '', description: '', fileUrl: '' });
  const [counterAmount, setCounterAmount] = useState('');

  useEffect(() => {
    if (id) fetchBooking();
  }, [id]);

  const fetchBooking = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get(`/bookings/${id}`);
      const bookingData = response.data.data?.booking;
      
      if (!bookingData) {
        setError('Booking not found');
        return;
      }
      
      // Ensure client and creator have names
      if (bookingData.client) {
        bookingData.client.name = bookingData.client.name || 
          `${bookingData.client.firstName || ''} ${bookingData.client.lastName || ''}`.trim() || 
          'Unknown Client';
      }
      if (bookingData.creator) {
        bookingData.creator.name = bookingData.creator.name || 
          `${bookingData.creator.firstName || ''} ${bookingData.creator.lastName || ''}`.trim() || 
          'Unknown Creator';
      }
      
      setBooking(bookingData);
    } catch (error: any) {
      console.error('Error fetching booking:', error);
      setError(error.response?.data?.error || 'Failed to fetch booking');
      toast.error(error.response?.data?.error || 'Failed to fetch booking');
    } finally {
      setIsLoading(false);
    }
  };

  const getUserName = (userObj: any) => {
    if (!userObj) return 'Unknown';
    return userObj.name || 
      `${userObj.firstName || ''} ${userObj.lastName || ''}`.trim() || 
      'Unknown User';
  };

  const isClient = booking?.client?._id === user?.id;
  const isCreator = booking?.creator?._id === user?.id;

  const handleAcceptBooking = async () => {
    try {
      await api.post(`/bookings/${id}/accept`);
      toast.success('Booking accepted! Client has been notified to pay.');
      fetchBooking();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to accept booking');
    }
  };

  const handleRejectBooking = async (reason: string) => {
    try {
      await api.post(`/bookings/${id}/reject`, { reason });
      toast.success('Booking rejected');
      fetchBooking();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reject booking');
    }
  };

  const handlePayBooking = async () => {
    try {
      await api.post(`/bookings/${id}/pay`);
      toast.success('Payment successful! Funds held in escrow.');
      fetchBooking();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Payment failed');
    }
  };

  const handleCompleteWork = async () => {
    try {
      await api.post(`/bookings/${id}/complete`);
      toast.success('Work marked as complete! Client notified to review.');
      fetchBooking();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to complete booking');
    }
  };

  const handleReleaseFunds = async () => {
    try {
      await api.post(`/bookings/${id}/release`);
      toast.success('Payment released to creator!');
      fetchBooking();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to release funds');
    }
  };

  const handleSubmitReview = async () => {
    try {
      await api.post(`/reviews`, {
        booking: id,
        creator: booking?.creator._id,
        rating: reviewForm.rating,
        comment: reviewForm.comment
      });
      toast.success('Review submitted!');
      fetchBooking();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to submit review');
    }
  };

  const handleSubmitDeliverable = async () => {
    try {
      await api.post(`/bookings/${id}/deliver`, deliverableForm);
      toast.success('Work delivered!');
      setDeliverableForm({ title: '', description: '', fileUrl: '' });
      fetchBooking();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to submit deliverable');
    }
  };

  const handleCounterProposal = async () => {
    try {
      await api.post(`/bookings/${id}/counter`, { amount: parseFloat(counterAmount) });
      toast.success('Counter proposal sent!');
      setCounterAmount('');
      fetchBooking();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send counter proposal');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#8A2BE2]" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-gray-500">{error || 'Booking not found'}</p>
        <Button className="mt-4" onClick={() => window.location.href = '/bookings'}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Bookings
        </Button>
      </div>
    );
  }

  const getStatusStep = () => {
    const steps = ['pending', 'awaiting_payment', 'confirmed', 'in_progress', 'delivered', 'completed'];
    return steps.indexOf(booking.status);
  };

  const clientName = getUserName(booking.client);
  const creatorName = getUserName(booking.creator);

  return (
    <div className="space-y-6 pb-20 lg:pb-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => window.location.href = '/bookings'}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Booking Details</h1>
          <p className="text-sm text-gray-500">{booking.bookingId}</p>
        </div>
      </div>

      {/* Status Timeline */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            {[
              { key: 'pending', label: 'Request Sent', icon: '1' },
              { key: 'awaiting_payment', label: 'Payment', icon: '2' },
              { key: 'confirmed', label: 'Confirmed', icon: '3' },
              { key: 'in_progress', label: 'In Progress', icon: '4' },
              { key: 'delivered', label: 'Delivered', icon: '5' },
              { key: 'completed', label: 'Completed', icon: '✓' }
            ].map((step, index) => {
              const currentStep = getStatusStep();
              const isActive = index <= currentStep;
              const isCurrent = index === currentStep;
              
              return (
                <div key={step.key} className="flex flex-col items-center flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    isActive ? 'bg-[#8A2BE2] text-white' : 'bg-gray-200 text-gray-500'
                  } ${isCurrent ? 'ring-4 ring-[#8A2BE2]/20' : ''}`}>
                    {isActive ? step.icon : index + 1}
                  </div>
                  <span className={`text-[10px] mt-2 text-center ${isActive ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Service Details */}
          <Card>
            <CardHeader>
              <CardTitle>Service Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{booking.serviceTitle}</h3>
                <p className="text-gray-600 mt-2">{booking.serviceDescription}</p>
              </div>
              
              {booking.counterProposal && booking.counterProposal.amount && !booking.counterProposal.applied && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                  <p className="font-medium text-amber-800">Counter Proposal Pending</p>
                  <p className="text-amber-700">
                    {isClient 
                      ? `${creatorName} proposed ${booking.counterProposal.amount} ${booking.currency}`
                      : `You proposed ${booking.counterProposal.amount} ${booking.currency}`
                    }
                  </p>
                  {isClient && (
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" onClick={handlePayBooking}>Accept & Pay</Button>
                      <Button size="sm" variant="outline" onClick={() => toast.info('Counter proposal rejected')}>Reject</Button>
                    </div>
                  )}
                </div>
              )}

              {/* Deliverables */}
              {booking.deliverables && booking.deliverables.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Deliverables</h4>
                  <div className="space-y-2">
                    {booking.deliverables.map((del, idx) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                        <p className="font-medium">{del.title}</p>
                        <p className="text-sm text-gray-600">{del.description}</p>
                        {del.fileUrl && (
                          <a href={del.fileUrl} target="_blank" rel="noopener noreferrer" className="text-[#8A2BE2] text-sm hover:underline">
                            Download File
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit Deliverable - Creator Only */}
              {isCreator && booking.status === 'in_progress' && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-[#8A2BE2]">
                      <Upload className="w-4 h-4 mr-2" />
                      Submit Work
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Submit Deliverable</DialogTitle>
                      <DialogDescription>
                        Submit your completed work for client review.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Title</label>
                        <Input 
                          value={deliverableForm.title}
                          onChange={(e) => setDeliverableForm({...deliverableForm, title: e.target.value})}
                          placeholder="e.g., Final Logo Design"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Description</label>
                        <Textarea 
                          value={deliverableForm.description}
                          onChange={(e) => setDeliverableForm({...deliverableForm, description: e.target.value})}
                          placeholder="Describe what you've delivered..."
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">File URL (optional)</label>
                        <Input 
                          value={deliverableForm.fileUrl}
                          onChange={(e) => setDeliverableForm({...deliverableForm, fileUrl: e.target.value})}
                          placeholder="https://..."
                        />
                      </div>
                      <Button onClick={handleSubmitDeliverable} className="w-full bg-[#8A2BE2]">
                        Submit Deliverable
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardContent>
          </Card>

          {/* Review Section - Show when completed */}
          {booking.status === 'completed' && (
            <Card>
              <CardHeader>
                <CardTitle>Review</CardTitle>
              </CardHeader>
              <CardContent>
                {booking.review ? (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          className={`w-5 h-5 ${star <= booking.review!.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
                        />
                      ))}
                    </div>
                    <p className="text-gray-700">{booking.review.comment}</p>
                  </div>
                ) : isClient ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Rating</label>
                      <div className="flex items-center gap-2 mt-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button 
                            key={star}
                            onClick={() => setReviewForm({...reviewForm, rating: star})}
                          >
                            <Star 
                              className={`w-8 h-8 ${star <= reviewForm.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Comment</label>
                      <Textarea 
                        value={reviewForm.comment}
                        onChange={(e) => setReviewForm({...reviewForm, comment: e.target.value})}
                        placeholder="Share your experience..."
                        className="mt-2"
                      />
                    </div>
                    <Button onClick={handleSubmitReview} className="bg-[#8A2BE2]">
                      Submit Review
                    </Button>
                  </div>
                ) : (
                  <p className="text-gray-500">Waiting for client review...</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Price Card */}
          <Card>
            <CardHeader>
              <CardTitle>Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total Amount</span>
                <span className="text-2xl font-bold">{booking.amount} {booking.currency}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Platform Fee (10%)</span>
                <span className="text-gray-500">{(booking.amount * 0.1).toFixed(2)} {booking.currency}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Creator Receives</span>
                <span className="text-green-600 font-medium">{(booking.amount * 0.9).toFixed(2)} {booking.currency}</span>
              </div>
              <div className="pt-4 border-t">
                <Badge variant={booking.paymentStatus === 'paid' ? 'default' : 'secondary'} className="w-full justify-center py-2">
                  {booking.paymentStatus === 'paid' ? '✓ Paid (In Escrow)' : '⏳ Pending Payment'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Other Party Card */}
          <Card>
            <CardHeader>
              <CardTitle>{isClient ? 'Creator' : 'Client'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                {isClient ? (
                  booking.creator?.avatar ? (
                    <img 
                      src={booking.creator.avatar}
                      alt={creatorName}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="w-6 h-6 text-gray-400" />
                    </div>
                  )
                ) : (
                  booking.client?.avatar ? (
                    <img 
                      src={booking.client.avatar}
                      alt={clientName}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="w-6 h-6 text-gray-400" />
                    </div>
                  )
                )}
                <div>
                  <p className="font-medium">{isClient ? creatorName : clientName}</p>
                  {isClient && booking.creator?.category && (
                    <p className="text-sm text-gray-500">{booking.creator.category}</p>
                  )}
                </div>
              </div>
              <Button 
                variant="outline" 
                className="w-full mt-4"
                onClick={() => window.location.href = `/messages?user=${isClient ? booking.creator._id : booking.client._id}`}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Send Message
              </Button>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card>
            <CardContent className="p-4 space-y-3">
              {/* Creator Actions */}
              {isCreator && booking.status === 'pending' && (
                <>
                  <Button onClick={handleAcceptBooking} className="w-full bg-green-600 hover:bg-green-700">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Accept Booking
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full">
                        Counter Offer
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Make Counter Proposal</DialogTitle>
                        <DialogDescription>
                          Propose a different price for this booking.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <p>Current amount: {booking.amount} {booking.currency}</p>
                        <div>
                          <label className="text-sm font-medium">Your Proposed Amount</label>
                          <Input 
                            type="number"
                            value={counterAmount}
                            onChange={(e) => setCounterAmount(e.target.value)}
                            placeholder="Enter amount..."
                          />
                        </div>
                        <Button onClick={handleCounterProposal} className="w-full bg-[#8A2BE2]">
                          Send Proposal
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button 
                    variant="outline" 
                    className="w-full text-red-600 hover:text-red-700"
                    onClick={() => handleRejectBooking('Not available')}
                  >
                    Decline
                  </Button>
                </>
              )}

              {/* Client Payment */}
              {isClient && booking.status === 'awaiting_payment' && (
                <Button onClick={handlePayBooking} className="w-full bg-green-600 hover:bg-green-700">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Pay {booking.amount} {booking.currency}
                </Button>
              )}

              {/* Creator Complete */}
              {isCreator && booking.status === 'in_progress' && (
                <Button onClick={handleCompleteWork} className="w-full bg-[#8A2BE2]">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark as Complete
                </Button>
              )}

              {/* Client Release Funds */}
              {isClient && booking.status === 'delivered' && (
                <>
                  <Button onClick={handleReleaseFunds} className="w-full bg-green-600 hover:bg-green-700">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Release Payment
                  </Button>
                  <p className="text-xs text-gray-500 text-center">
                    Review the deliverables and release payment if satisfied
                  </p>
                </>
              )}

              {/* Status Info */}
              {booking.status === 'completed' && (
                <div className="text-center text-green-600 font-medium">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                  Booking Completed
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
