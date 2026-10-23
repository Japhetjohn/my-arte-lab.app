import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/shared/EmptyState';
import { VerifiedBadge } from '@/components/shared/VerifiedBadge';
import { NewBookingModal } from '@/components/booking/NewBookingModal';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/contexts/AuthContext';
import { getAvatarUrl } from '@/lib/imageUrl';
import {
  bookingWorkflowService,
  type BookingWorkflowItem,
} from '@/lib/bookingWorkflow';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/sonner';
import {
  Calendar,
  DollarSign,
  Loader2,
  Star,
  Sparkles,
  Compass,
  Wallet,
  Settings,
  MoreVertical,
  Plus,
  Package,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Send,
  XCircle,
} from 'lucide-react';

interface CreatorInfo {
  id: string;
  name: string;
  avatar?: string;
  category?: string | string[];
  isVerified?: boolean;
}

export function Bookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingWorkflowItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter tabs
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'in_progress' | 'delivered' | 'revision' | 'completed' | 'cancelled'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'client' | 'creator'>('all');

  // New Booking Modal
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<CreatorInfo | null>(null);

  // Counter proposal modal
  const [counterModalBooking, setCounterModalBooking] = useState<BookingWorkflowItem | null>(null);
  const [counterAmount, setCounterAmount] = useState('');
  const [isSubmittingCounter, setIsSubmittingCounter] = useState(false);

  // Decline modal
  const [declineModalBooking, setDeclineModalBooking] = useState<BookingWorkflowItem | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [isSubmittingDecline, setIsSubmittingDecline] = useState(false);

  // Check for creator query param in URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const creatorId = params.get('creator');
    if (creatorId) {
      fetchCreatorAndOpenModal(creatorId);
      const url = new URL(window.location.href);
      url.searchParams.delete('creator');
      window.history.replaceState({}, '', url);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchCreatorAndOpenModal = async (creatorId: string) => {
    try {
      const response = await api.get(`/creators/${creatorId}`);
      const creator = response.data.data?.creator;
      if (creator) {
        setSelectedCreator({
          id: creator.id || creator._id,
          name: creator.name || `${creator.firstName || ''} ${creator.lastName || ''}`.trim() || 'Creator',
          avatar: creator.avatar,
          category: creator.category,
          isVerified: creator.isVerified,
        });
        setIsBookingModalOpen(true);
      }
    } catch {
      toast.error('Failed to load creator details');
    }
  };

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      const list = await bookingWorkflowService.getMyBookings();
      setBookings(list);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to fetch bookings');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Action handlers
  const handleAccept = async (booking: BookingWorkflowItem) => {
    try {
      await bookingWorkflowService.acceptBooking(booking._id);
      // Auto move to In Progress in preview mode
      await bookingWorkflowService.startWork(booking._id);
      toast.success('Booking accepted! Project is now In Progress.');
      fetchBookings();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to accept booking');
    }
  };

  const handleOpenCounterModal = (booking: BookingWorkflowItem) => {
    setCounterModalBooking(booking);
    setCounterAmount(String(booking.amount));
  };

  const handleSendCounter = async () => {
    if (!counterModalBooking) return;
    const amountNum = parseFloat(counterAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      setIsSubmittingCounter(true);
      await bookingWorkflowService.counterProposal(counterModalBooking._id, amountNum);
      toast.success(`Counter offer of ${amountNum} USDC sent!`);
      setCounterModalBooking(null);
      fetchBookings();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send counter proposal');
    } finally {
      setIsSubmittingCounter(false);
    }
  };

  const handleOpenDeclineModal = (booking: BookingWorkflowItem) => {
    setDeclineModalBooking(booking);
    setDeclineReason('');
  };

  const handleSendDecline = async () => {
    if (!declineModalBooking) return;
    try {
      setIsSubmittingDecline(true);
      await bookingWorkflowService.rejectBooking(declineModalBooking._id, declineReason.trim());
      toast.success('Booking request declined');
      setDeclineModalBooking(null);
      fetchBookings();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to decline booking');
    } finally {
      setIsSubmittingDecline(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    try {
      await bookingWorkflowService.cancelBooking(bookingId, 'Cancelled by user');
      toast.success('Booking cancelled');
      fetchBookings();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to cancel booking');
    }
  };

  // Filter logic
  const filteredBookings = bookings.filter((b) => {
    const isClient = user?.id === b.client._id;
    const isCreator = user?.id === b.creator._id;

    // Role filter
    if (roleFilter === 'client' && !isClient) return false;
    if (roleFilter === 'creator' && !isCreator) return false;

    // Status tab filter
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return b.status === 'pending' || b.status === 'awaiting_payment';
    if (activeTab === 'in_progress') return b.status === 'in_progress' || b.status === 'confirmed';
    if (activeTab === 'delivered') return b.status === 'delivered';
    if (activeTab === 'revision') return (b.revisionRequests && b.revisionRequests.length > 0) && b.status === 'in_progress';
    if (activeTab === 'completed') return b.status === 'completed';
    if (activeTab === 'cancelled') return b.status === 'cancelled' || b.status === 'disputed';
    return true;
  });

  // Calculate stats
  const activeCount = bookings.filter((b) => ['in_progress', 'confirmed', 'delivered'].includes(b.status)).length;
  const pendingCount = bookings.filter((b) => ['pending', 'awaiting_payment'].includes(b.status)).length;
  const completedCount = bookings.filter((b) => b.status === 'completed').length;
  const totalValue = bookings
    .filter((b) => b.status !== 'cancelled')
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);

  // Status badge helper
  const getStatusDisplay = (b: BookingWorkflowItem) => {
    const isRevision = (b.revisionRequests && b.revisionRequests.length > 0) && b.status === 'in_progress';

    if (isRevision) {
      return {
        label: 'Revision Requested',
        className: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40',
      };
    }

    switch (b.status) {
      case 'pending':
        return {
          label: 'Pending Response',
          className: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40',
        };
      case 'awaiting_payment':
        return {
          label: 'Awaiting Settlement',
          className: 'bg-purple-50 dark:bg-purple-950/40 text-[#9747FF] border border-purple-200 dark:border-purple-800/40',
        };
      case 'confirmed':
      case 'in_progress':
        return {
          label: 'In Progress',
          className: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40',
        };
      case 'delivered':
        return {
          label: 'Delivered / In Review',
          className: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40',
        };
      case 'completed':
        return {
          label: 'Completed',
          className: 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800/40',
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          className: 'bg-gray-100 dark:bg-gray-800 text-gray-500 border border-gray-200 dark:border-gray-700',
        };
      default:
        return {
          label: b.status,
          className: 'bg-gray-100 dark:bg-gray-800 text-gray-600 border border-gray-200',
        };
    }
  };

  const renderBookingItem = (b: BookingWorkflowItem) => {
    const isClient = user?.id === b.client._id;
    const isCreator = user?.id === b.creator._id;
    const otherParty = isClient ? b.creator : b.client;
    const statusInfo = getStatusDisplay(b);
    const deliverablesCount = (b.expectedDeliverables || []).length;

    return (
      <div
        key={b._id}
        className="pb-5 mb-5 border-b border-[#DADDE1] dark:border-[#2f3032] space-y-3 transition-colors hover:bg-gray-50/50 dark:hover:bg-white/[0.01] rounded-xl p-3"
      >
        {/* Top Header: Other party info, Role badge, Status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <a
              href={isClient ? `/creators/${b.creator._id}` : undefined}
              className="w-11 h-11 rounded-full overflow-hidden bg-purple-100 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/40 shrink-0"
            >
              {otherParty.avatar ? (
                <img
                  src={getAvatarUrl(otherParty.avatar)}
                  alt={otherParty.name || 'User'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-[#9747FF] text-sm">
                  {(otherParty.name || 'U')[0]?.toUpperCase()}
                </div>
              )}
            </a>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">
                  {otherParty.name}
                </span>
                {otherParty.isVerified && (
                  <VerifiedBadge className="w-3.5 h-3.5" showTooltip={false} />
                )}
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                  {isClient ? 'Hired Creator' : 'Client'}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {b.category} • ID: <span className="font-mono text-[11px]">{b.bookingId || b._id.slice(-6)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={cn(
                'text-[11px] font-semibold px-2.5 py-1 rounded-full',
                statusInfo.className
              )}
            >
              {statusInfo.label}
            </span>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => (window.location.href = `/bookings/${b._id}`)}>
                  View Workspace
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => (window.location.href = `/messages?user=${otherParty._id}`)}>
                  Message {otherParty.name}
                </DropdownMenuItem>
                {b.status !== 'completed' && b.status !== 'cancelled' && (
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => handleCancelBooking(b._id)}
                  >
                    Cancel Booking
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Project Title & Description Preview */}
        <div className="space-y-1">
          <h4
            onClick={() => (window.location.href = `/bookings/${b._id}`)}
            className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100 hover:text-[#9747FF] dark:hover:text-[#9747FF] transition-colors cursor-pointer"
          >
            {b.serviceTitle}
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
            {b.serviceDescription}
          </p>
        </div>

        {/* Deliverables & Counter Proposal Indicator */}
        {b.counterProposal && !b.counterProposal.applied && (
          <div className="p-2.5 rounded-lg bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/50 dark:border-purple-800/30 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#9747FF] font-medium">
              <RotateCcw className="w-4 h-4" />
              <span>Counter Offer: {b.counterProposal.amount} {b.currency}</span>
            </div>
            {isClient && (
              <Button
                size="sm"
                className="h-7 text-xs bg-[#9747FF] text-white rounded-lg hover:bg-[#8534f0]"
                onClick={() => (window.location.href = `/bookings/${b._id}`)}
              >
                Review Terms
              </Button>
            )}
          </div>
        )}

        {/* Metadata Strip: Budget, Deadline, Deliverables Count, Rating */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <div className="flex items-center gap-1 font-semibold text-gray-900 dark:text-gray-100">
              <DollarSign className="w-3.5 h-3.5 text-[#9747FF]" />
              <span>{b.amount} {b.currency}</span>
            </div>

            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <span>Due {new Date(b.endDate).toLocaleDateString()}</span>
            </div>

            {deliverablesCount > 0 && (
              <div className="flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-gray-400" />
                <span>{deliverablesCount} {deliverablesCount === 1 ? 'deliverable' : 'deliverables'}</span>
              </div>
            )}

            {b.review?.rating && (
              <div className="flex items-center gap-1 text-amber-500 font-semibold">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>{b.review.rating}.0</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* If Creator & Pending: Accept / Counter / Decline */}
            {isCreator && (b.status === 'pending' || b.status === 'awaiting_payment') && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenDeclineModal(b)}
                  className="h-8 text-xs rounded-xl border-[#DADDE1] dark:border-[#2f3032] text-gray-600 hover:text-red-600"
                >
                  Decline
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenCounterModal(b)}
                  className="h-8 text-xs rounded-xl border-[#DADDE1] dark:border-[#2f3032] text-[#9747FF] hover:bg-purple-50 dark:hover:bg-purple-950/30"
                >
                  Counter Offer
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleAccept(b)}
                  className="h-8 text-xs rounded-xl bg-[#9747FF] hover:bg-[#8534f0] text-white font-semibold shadow-2xs"
                >
                  Accept Request
                </Button>
              </>
            )}

            {/* If Creator & In Progress: Submit Deliverables */}
            {isCreator && (b.status === 'in_progress' || b.status === 'confirmed') && (
              <Button
                size="sm"
                onClick={() => (window.location.href = `/bookings/${b._id}?action=submit`)}
                className="h-8 text-xs rounded-xl bg-[#9747FF] hover:bg-[#8534f0] text-white font-semibold shadow-2xs"
              >
                Submit Work
              </Button>
            )}

            {/* If Client & Delivered: Review / Approve */}
            {isClient && b.status === 'delivered' && (
              <Button
                size="sm"
                onClick={() => (window.location.href = `/bookings/${b._id}?action=review`)}
                className="h-8 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-2xs"
              >
                Review Deliverables
              </Button>
            )}

            {/* General Workspace CTA */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => (window.location.href = `/bookings/${b._id}`)}
              className="h-8 text-xs rounded-xl border-[#DADDE1] dark:border-[#2f3032] hover:bg-gray-100 dark:hover:bg-white/[0.04]"
            >
              Workspace
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full relative">
      {/* 3-Column Social / Booking Management Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* =========================================================================
            LEFT COLUMN (lg:col-span-3, hidden on mobile/tablet)
            Platform Navigation and User Context
           ========================================================================= */}
        <aside className="hidden lg:flex flex-col gap-6 lg:col-span-3 sticky top-20">
          {/* User Profile Summary */}
          <div className="pb-5 border-b border-[#DADDE1] dark:border-[#2f3032]">
            {user ? (
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-purple-100 dark:bg-purple-950/40 flex items-center justify-center border-2 border-[#9747FF]/20 mb-3">
                  {user.avatar ? (
                    <img src={getAvatarUrl(user.avatar)} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[#9747FF] font-bold text-xl">
                      {(user.name || user.firstName || 'U')[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base leading-tight">
                  {user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Creative Member'}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                  @{user.email.split('@')[0]}
                </p>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/50 text-[#9747FF] text-xs font-semibold mt-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#9747FF]"></span>
                  {user.role === 'creator' ? 'Verified Creator' : 'Client'}
                </div>
              </div>
            ) : null}
          </div>

          {/* Quick Platform Navigation */}
          <div className="pb-2">
            <nav className="space-y-1">
              <a
                href="/home"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-gray-700 dark:text-gray-300 hover:text-[#9747FF] hover:bg-gray-100/70 dark:hover:bg-white/[0.04] transition-colors"
              >
                <Sparkles className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span>Creative Feed</span>
              </a>

              <a
                href="/discover"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-gray-700 dark:text-gray-300 hover:text-[#9747FF] hover:bg-gray-100/70 dark:hover:bg-white/[0.04] transition-colors"
              >
                <Compass className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span>Discover Creators</span>
              </a>

              <a
                href="/bookings"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm bg-purple-50 dark:bg-purple-950/50 text-[#9747FF] transition-colors"
              >
                <Calendar className="w-4 h-4 text-[#9747FF]" />
                <span>My Bookings</span>
              </a>

              <a
                href="/wallet"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-gray-700 dark:text-gray-300 hover:text-[#9747FF] hover:bg-gray-100/70 dark:hover:bg-white/[0.04] transition-colors"
              >
                <Wallet className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span>Wallet &amp; Earnings</span>
              </a>

              <a
                href="/settings"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-gray-700 dark:text-gray-300 hover:text-[#9747FF] hover:bg-gray-100/70 dark:hover:bg-white/[0.04] transition-colors"
              >
                <Settings className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span>Settings &amp; Profile</span>
              </a>
            </nav>
          </div>
        </aside>

        {/* =========================================================================
            CENTER COLUMN (lg:col-span-6, full width on mobile)
            Booking Feed, Tabs, and State Management
           ========================================================================= */}
        <section className="col-span-1 lg:col-span-6 flex flex-col gap-0">
          
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-[#DADDE1] dark:border-[#2f3032] mb-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                My Bookings
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Manage your active creator projects, deliverables, and submissions
              </p>
            </div>

            <Button
              size="sm"
              onClick={() => (window.location.href = '/discover')}
              className="bg-[#9747FF] hover:bg-[#8534f0] text-white text-xs font-semibold rounded-xl px-4 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Book Creator
            </Button>
          </div>

          {/* Role Filter Selector */}
          <div className="flex items-center gap-2 pb-3 overflow-x-auto scrollbar-hide">
            {[
              { key: 'all', label: 'All Projects' },
              { key: 'client', label: 'As Client (Hired)' },
              { key: 'creator', label: 'As Creator (Booked)' },
            ].map((role) => (
              <button
                key={role.key}
                type="button"
                onClick={() => setRoleFilter(role.key as any)}
                className={cn(
                  'text-xs font-semibold px-3 py-1.5 rounded-full transition-all shrink-0 cursor-pointer',
                  roleFilter === role.key
                    ? 'bg-[#9747FF] text-white shadow-2xs'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                )}
              >
                {role.label}
              </button>
            ))}
          </div>

          {/* Status Tabs Bar */}
          <div className="flex items-center gap-1 pb-4 border-b border-[#DADDE1] dark:border-[#2f3032] mb-5 overflow-x-auto scrollbar-hide text-xs">
            {[
              { key: 'all', label: `All (${bookings.length})` },
              { key: 'pending', label: `Pending (${bookings.filter((b) => ['pending', 'awaiting_payment'].includes(b.status)).length})` },
              { key: 'in_progress', label: `In Progress (${bookings.filter((b) => ['in_progress', 'confirmed'].includes(b.status)).length})` },
              { key: 'delivered', label: `In Review (${bookings.filter((b) => b.status === 'delivered').length})` },
              { key: 'completed', label: `Completed (${bookings.filter((b) => b.status === 'completed').length})` },
              { key: 'cancelled', label: 'Cancelled' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as any)}
                className={cn(
                  'px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-colors cursor-pointer',
                  activeTab === tab.key
                    ? 'text-[#9747FF] bg-purple-50 dark:bg-purple-950/40'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Bookings Stream */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#9747FF]" />
              <p className="text-xs">Loading creative bookings...</p>
            </div>
          ) : filteredBookings.length > 0 ? (
            <div className="flex flex-col">
              {filteredBookings.map(renderBookingItem)}
            </div>
          ) : (
            <EmptyState
              image="/images/empty-bookings.png"
              title={
                activeTab === 'all'
                  ? 'No bookings found'
                  : `No ${activeTab.replace('_', ' ')} bookings`
              }
              description={
                activeTab === 'all'
                  ? 'Browse talented African creators and start your next project.'
                  : 'Bookings matching this filter will appear here.'
              }
              actionLabel="Explore Creators"
              onAction={() => (window.location.href = '/discover')}
            />
          )}
        </section>

        {/* =========================================================================
            RIGHT COLUMN (lg:col-span-3, hidden on mobile/tablet)
            Contextual Summary, Escrow Guarantee, & Statistics
           ========================================================================= */}
        <aside className="hidden lg:flex flex-col gap-6 lg:col-span-3 sticky top-20">
          
          {/* Quick Stats Card */}
          <div className="pb-5 border-b border-[#DADDE1] dark:border-[#2f3032] space-y-3">
            <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 tracking-tight">
              Project Overview
            </h4>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-[#DADDE1] dark:border-[#2f3032]">
                <span className="text-[11px] text-gray-400">Active</span>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-0.5">{activeCount}</p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-[#DADDE1] dark:border-[#2f3032]">
                <span className="text-[11px] text-gray-400">Pending</span>
                <p className="text-lg font-bold text-[#9747FF] mt-0.5">{pendingCount}</p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-[#DADDE1] dark:border-[#2f3032]">
                <span className="text-[11px] text-gray-400">Completed</span>
                <p className="text-lg font-bold text-emerald-600 mt-0.5">{completedCount}</p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-[#DADDE1] dark:border-[#2f3032]">
                <span className="text-[11px] text-gray-400">Total Volume</span>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-0.5">{totalValue} USDC</p>
              </div>
            </div>
          </div>

          {/* Escrow Guarantee / How it Works */}
          <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-900/30 space-y-2.5">
            <div className="flex items-center gap-2 text-[#9747FF]">
              <ShieldCheck className="w-5 h-5 shrink-0" />
              <h5 className="font-bold text-xs uppercase tracking-wider">Escrow Protection</h5>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              Payments are held securely in escrow. Creators are guaranteed payment upon approval, and clients review deliverables before funds are released.
            </p>
          </div>

          {/* Quick Discover CTA */}
          <div className="pb-4 space-y-2">
            <h5 className="font-bold text-xs text-gray-800 dark:text-gray-200 uppercase tracking-wider">
              Need another creator?
            </h5>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Hire illustrators, 3D artists, brand designers, and creative directors across Africa.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => (window.location.href = '/discover')}
              className="w-full rounded-xl border-[#DADDE1] dark:border-[#2f3032] text-xs font-semibold cursor-pointer"
            >
              Browse Creative Directory
            </Button>
          </div>
        </aside>
      </div>

      {/* New Booking Modal */}
      {selectedCreator && (
        <NewBookingModal
          isOpen={isBookingModalOpen}
          onClose={() => {
            setIsBookingModalOpen(false);
            setSelectedCreator(null);
          }}
          creator={selectedCreator}
          onSuccess={() => {
            fetchBookings();
          }}
        />
      )}

      {/* Counter Proposal Modal */}
      {counterModalBooking && (
        <Dialog open={!!counterModalBooking} onOpenChange={() => setCounterModalBooking(null)}>
          <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-[#18191a] border border-[#DADDE1] dark:border-[#2f3032] p-5">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-gray-900 dark:text-gray-100">
                Send Counter Offer
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Propose revised pricing terms for "{counterModalBooking.serviceTitle}".
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-[#DADDE1] dark:border-[#2f3032] text-xs flex justify-between">
                <span className="text-gray-500">Original Proposed Budget:</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {counterModalBooking.amount} {counterModalBooking.currency}
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                  Counter Budget (USDC)
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="number"
                    min="1"
                    value={counterAmount}
                    onChange={(e) => setCounterAmount(e.target.value)}
                    className="pl-9 h-10 text-sm rounded-xl border-[#DADDE1] dark:border-[#2f3032] dark:bg-[#121212] focus-visible:ring-[#9747FF]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#DADDE1] dark:border-[#2f3032]">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCounterModalBooking(null)}
                  disabled={isSubmittingCounter}
                  className="rounded-xl border-[#DADDE1] dark:border-[#2f3032] text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSendCounter}
                  disabled={isSubmittingCounter}
                  className="bg-[#9747FF] hover:bg-[#8534f0] text-white text-xs font-semibold rounded-xl"
                >
                  {isSubmittingCounter ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                  Submit Counter Offer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Decline Booking Modal */}
      {declineModalBooking && (
        <Dialog open={!!declineModalBooking} onOpenChange={() => setDeclineModalBooking(null)}>
          <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-[#18191a] border border-[#DADDE1] dark:border-[#2f3032] p-5">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-gray-900 dark:text-gray-100">
                Decline Booking Request
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Let {declineModalBooking.client.name} know why you are unable to take this project.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                  Reason for Declining (Optional)
                </label>
                <Textarea
                  rows={3}
                  placeholder="e.g. Schedule fully booked, outside my current artistic focus, timeline too tight..."
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  className="text-xs rounded-xl border-[#DADDE1] dark:border-[#2f3032] dark:bg-[#121212] focus-visible:ring-[#9747FF] resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#DADDE1] dark:border-[#2f3032]">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeclineModalBooking(null)}
                  disabled={isSubmittingDecline}
                  className="rounded-xl border-[#DADDE1] dark:border-[#2f3032] text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSendDecline}
                  disabled={isSubmittingDecline}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl"
                >
                  {isSubmittingDecline ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <XCircle className="w-3.5 h-3.5 mr-1" />}
                  Decline Request
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
