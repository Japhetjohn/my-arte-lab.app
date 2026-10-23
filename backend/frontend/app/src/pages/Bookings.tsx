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
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
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
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Calendar,
  DollarSign,
  Loader2,
  Star,
  Sparkles,
  Compass,
  Wallet,
  Settings as SettingsIcon,
  MoreVertical,
  Plus,
  Package,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Send,
  XCircle,
  Bell,
  MessageSquare,
  Lock,
  CheckCircle2,
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
  const isMobile = useIsMobile();
  const [bookings, setBookings] = useState<BookingWorkflowItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Role switcher
  const [roleFilter, setRoleFilter] = useState<'all' | 'client' | 'creator'>('all');

  // New Booking Modal
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<CreatorInfo | null>(null);

  // Funding Escrow modal state
  const [fundingBooking, setFundingBooking] = useState<BookingWorkflowItem | null>(null);
  const [walletAvailableBalance, setWalletAvailableBalance] = useState<number | null>(null);
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);
  const [isSubmittingFunding, setIsSubmittingFunding] = useState(false);

  // Counter proposal modal state
  const [counterModalBooking, setCounterModalBooking] = useState<BookingWorkflowItem | null>(null);
  const [counterAmount, setCounterAmount] = useState('');
  const [isSubmittingCounter, setIsSubmittingCounter] = useState(false);

  // Decline modal state
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

  // Open Funding Modal
  const handleOpenFundingModal = async (booking: BookingWorkflowItem) => {
    setFundingBooking(booking);
    setIsLoadingWallet(true);
    try {
      const res = await api.get('/wallet');
      const avail = res.data?.availableBalance ?? res.data?.data?.availableBalance ?? res.data?.balance ?? 0;
      setWalletAvailableBalance(parseFloat(Number(avail).toFixed(2)));
    } catch {
      setWalletAvailableBalance(0);
    } finally {
      setIsLoadingWallet(false);
    }
  };

  // Confirm Escrow Funding
  const handleConfirmFunding = async () => {
    if (!fundingBooking) return;
    try {
      setIsSubmittingFunding(true);
      await bookingWorkflowService.payBooking(fundingBooking._id);
      toast.success(`Funds locked in escrow! The creator has been notified to begin work.`);
      setFundingBooking(null);
      fetchBookings();
    } catch (error: any) {
      const msg = error.response?.data?.error || error.response?.data?.message || 'Failed to fund escrow';
      toast.error(msg);
    } finally {
      setIsSubmittingFunding(false);
    }
  };

  // Creator Accepts Booking Request -> advances to awaiting_payment
  const handleAccept = async (booking: BookingWorkflowItem) => {
    try {
      setIsProcessingAction(true);
      await bookingWorkflowService.acceptBooking(booking._id);
      toast.success('Booking accepted! Client has been notified to deposit funds into escrow.');
      fetchBookings();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to accept booking');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Client Accepts Counter Offer -> advances to awaiting_payment at counter amount
  const handleAcceptCounter = async (booking: BookingWorkflowItem) => {
    try {
      setIsProcessingAction(true);
      await bookingWorkflowService.acceptCounterProposal(booking._id);
      toast.success('Counter offer accepted! Ready for escrow funding.');
      fetchBookings();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to accept counter offer');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Client Rejects Counter Offer
  const handleRejectCounter = async (booking: BookingWorkflowItem) => {
    try {
      setIsProcessingAction(true);
      await bookingWorkflowService.rejectCounterProposal(booking._id);
      toast.success('Counter offer declined');
      fetchBookings();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to decline counter offer');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Counter proposal modal handlers
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

  // Decline modal handlers
  const handleOpenDeclineModal = (booking: BookingWorkflowItem) => {
    setDeclineModalBooking(booking);
    setDeclineReason('');
  };

  const handleSendDecline = async () => {
    if (!declineModalBooking) return;
    try {
      setIsSubmittingDecline(true);
      await bookingWorkflowService.rejectBooking(declineModalBooking._id, declineReason.trim() || 'Declined by creator');
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
    const reason = prompt('Please specify a reason for cancellation:');
    if (reason === null) return;
    try {
      await bookingWorkflowService.cancelBooking(bookingId, reason || 'Cancelled by user');
      toast.success('Booking cancelled');
      fetchBookings();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to cancel booking');
    }
  };

  // Filter bookings by role
  const roleBookings = bookings.filter((b) => {
    const isClient = user?.id === b.client._id;
    const isCreator = user?.id === b.creator._id;
    if (roleFilter === 'client' && !isClient) return false;
    if (roleFilter === 'creator' && !isCreator) return false;
    return true;
  });

  // 1. Action Required: Bookings needing immediate attention
  const actionRequiredBookings = roleBookings.filter((b) => {
    const isClient = user?.id === b.client._id;
    const isCreator = user?.id === b.creator._id;
    const hasActiveCounter = Boolean(b.counterProposal?.amount && !b.counterProposal?.applied);
    const hasActiveRevision = Boolean(b.revisionRequests && b.revisionRequests.length > 0 && b.status === 'in_progress');

    if (isCreator && b.status === 'pending') return true;
    if (isClient && hasActiveCounter) return true;
    if (isClient && b.status === 'awaiting_payment') return true;
    if (isClient && b.status === 'delivered') return true;
    if (isCreator && hasActiveRevision) return true;
    return false;
  });

  const actionRequiredIds = new Set(actionRequiredBookings.map((b) => b._id));

  // 2. Active Projects: Ongoing production or waiting on counterpart
  const activeBookings = roleBookings.filter((b) => {
    if (actionRequiredIds.has(b._id)) return false;
    return ['pending', 'awaiting_payment', 'confirmed', 'in_progress', 'delivered'].includes(b.status);
  });

  // 3. Completed & Past Bookings
  const pastBookings = roleBookings.filter((b) => {
    return ['completed', 'cancelled', 'disputed'].includes(b.status);
  });

  // Calculate stats for overview
  const activeCount = bookings.filter((b) => ['in_progress', 'confirmed', 'delivered'].includes(b.status)).length;
  const completedCount = bookings.filter((b) => b.status === 'completed').length;
  const totalValue = bookings
    .filter((b) => b.status !== 'cancelled')
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);

  // Status display helper - restrained typography label matching home feed
  const getStatusDisplay = (b: BookingWorkflowItem) => {
    const isRevision = (b.revisionRequests && b.revisionRequests.length > 0) && b.status === 'in_progress';

    if (isRevision) {
      return {
        label: 'Revision Requested',
        textClassName: 'text-amber-600 dark:text-amber-400',
      };
    }

    switch (b.status) {
      case 'pending':
        return {
          label: 'Pending Response',
          textClassName: 'text-blue-600 dark:text-blue-400',
        };
      case 'awaiting_payment':
        return {
          label: 'Awaiting Escrow Deposit',
          textClassName: 'text-[#9747FF]',
        };
      case 'confirmed':
      case 'in_progress':
        return {
          label: 'In Progress',
          textClassName: 'text-indigo-600 dark:text-indigo-400',
        };
      case 'delivered':
        return {
          label: 'Delivered / In Review',
          textClassName: 'text-emerald-600 dark:text-emerald-400',
        };
      case 'completed':
        return {
          label: 'Completed',
          textClassName: 'text-emerald-600 dark:text-emerald-400',
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          textClassName: 'text-gray-500 dark:text-gray-400',
        };
      default:
        return {
          label: b.status,
          textClassName: 'text-gray-600 dark:text-gray-400',
        };
    }
  };

  const renderBookingItem = (b: BookingWorkflowItem) => {
    const isClient = user?.id === b.client._id;
    const isCreator = user?.id === b.creator._id;
    const otherParty = isClient ? b.creator : b.client;
    const statusInfo = getStatusDisplay(b);
    const deliverablesCount = (b.expectedDeliverables || []).length;
    const hasActiveCounterOffer = Boolean(b.counterProposal?.amount && !b.counterProposal?.applied);

    return (
      <article
        key={b._id}
        className="py-4 border-b border-[#DADDE1] dark:border-[#2f3032] space-y-2.5 transition-colors"
      >
        {/* Top Header: Creator Avatar, Identity, Status & Three-Dot Menu */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <a
              href={isClient ? `/creators/${b.creator._id}` : undefined}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-purple-50 dark:bg-purple-950/40 border border-gray-200/80 dark:border-gray-800 shrink-0"
            >
              {otherParty.avatar ? (
                <img
                  src={getAvatarUrl(otherParty.avatar)}
                  alt={otherParty.name || 'User'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-[#9747FF] text-xs sm:text-sm">
                  {(otherParty.name || 'U')[0]?.toUpperCase()}
                </div>
              )}
            </a>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <a
                  href={isClient ? `/creators/${b.creator._id}` : undefined}
                  className="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100 hover:text-[#9747FF] transition-colors truncate"
                >
                  {otherParty.name}
                </a>
                {otherParty.isVerified && (
                  <VerifiedBadge className="w-3.5 h-3.5 shrink-0" showTooltip={false} />
                )}
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/80 shrink-0">
                  {isClient ? 'Hired Creator' : 'Client'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                {b.category ? `${b.category} • ` : ''}ID: <span className="font-mono">{b.bookingId || b._id.slice(-8).toUpperCase()}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 pt-0.5">
            <span
              className={cn(
                'text-xs font-semibold tracking-tight text-right',
                statusInfo.textClassName
              )}
            >
              {statusInfo.label}
            </span>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors cursor-pointer outline-none"
                  aria-label="Booking options"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white dark:bg-[#18191a] border border-[#DADDE1] dark:border-[#2f3032] rounded-xl shadow-md p-1 min-w-[150px]">
                <DropdownMenuItem onClick={() => (window.location.href = `/bookings/${b._id}`)} className="text-xs cursor-pointer">
                  Open Workspace
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => (window.location.href = `/messages?user=${otherParty._id}`)} className="text-xs cursor-pointer">
                  Message {otherParty.name?.split(' ')[0]}
                </DropdownMenuItem>
                {b.status !== 'completed' && b.status !== 'cancelled' && (
                  <DropdownMenuItem
                    className="text-xs text-rose-600 cursor-pointer"
                    onClick={() => handleCancelBooking(b._id)}
                  >
                    Cancel Booking
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Project Title & Short Description */}
        <div className="space-y-0.5">
          <h4
            onClick={() => (window.location.href = `/bookings/${b._id}`)}
            className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100 hover:text-[#9747FF] dark:hover:text-[#9747FF] transition-colors cursor-pointer leading-snug line-clamp-1"
          >
            {b.serviceTitle}
          </h4>
          {b.serviceDescription && (
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
              {b.serviceDescription}
            </p>
          )}
        </div>

        {/* Counter Offer Notice if pending */}
        {hasActiveCounterOffer && (
          <div className="py-2 px-3 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border-l-2 border-[#9747FF] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-[#9747FF] font-semibold">
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span>Counter Offer: {b.counterProposal?.amount} {b.currency}</span>
            </div>
            {isClient ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  size="sm"
                  onClick={() => handleAcceptCounter(b)}
                  disabled={isProcessingAction}
                  className="h-7.5 px-3 text-xs bg-[#9747FF] text-white rounded-full hover:bg-[#8534f0] font-semibold shadow-2xs"
                >
                  Accept Offer
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRejectCounter(b)}
                  disabled={isProcessingAction}
                  className="h-7.5 px-3 text-xs rounded-full border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Decline
                </Button>
              </div>
            ) : (
              <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                Waiting for client to respond
              </span>
            )}
          </div>
        )}

        {/* Metadata and Contextual Actions: Single line on desktop, wrapping gracefully on mobile */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-0.5">
          {/* Metadata items */}
          <div className="flex items-center gap-x-4 gap-y-1.5 flex-wrap text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1 font-bold text-gray-900 dark:text-gray-100">
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

          {/* Contextual Action Buttons - Proportional, content-fitting, matching header buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* 1. Client Action: Fund Escrow */}
            {isClient && b.status === 'awaiting_payment' && (
              <Button
                size="sm"
                onClick={() => handleOpenFundingModal(b)}
                className="h-8 px-3.5 text-xs rounded-full bg-[#9747FF] hover:bg-[#8534f0] text-white font-semibold shadow-2xs cursor-pointer inline-flex items-center gap-1.5 transition-colors"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Fund Escrow</span>
              </Button>
            )}

            {/* 2. Creator Action when Pending: Accept / Counter / Decline */}
            {isCreator && b.status === 'pending' && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleOpenDeclineModal(b)}
                  disabled={isProcessingAction}
                  className="h-8 px-2.5 text-xs rounded-full text-gray-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                >
                  Decline
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenCounterModal(b)}
                  disabled={isProcessingAction}
                  className="h-8 px-3 text-xs rounded-full border border-gray-300 dark:border-gray-700 text-[#9747FF] hover:bg-purple-50 dark:hover:bg-purple-950/30 font-semibold transition-colors"
                >
                  Counter
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleAccept(b)}
                  disabled={isProcessingAction}
                  className="h-8 px-3.5 text-xs rounded-full bg-[#9747FF] hover:bg-[#8534f0] text-white font-semibold shadow-2xs transition-colors"
                >
                  {isProcessingAction ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                  <span>Accept</span>
                </Button>
              </>
            )}

            {/* 3. Creator Action when In Progress: Submit Work */}
            {isCreator && (b.status === 'in_progress' || b.status === 'confirmed') && (
              <Button
                size="sm"
                onClick={() => (window.location.href = `/bookings/${b._id}?action=submit`)}
                className="h-8 px-3.5 text-xs rounded-full bg-[#9747FF] hover:bg-[#8534f0] text-white font-semibold shadow-2xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Submit Work</span>
              </Button>
            )}

            {/* 4. Client Action when Delivered: Review & Approve */}
            {isClient && b.status === 'delivered' && (
              <Button
                size="sm"
                onClick={() => (window.location.href = `/bookings/${b._id}?action=review`)}
                className="h-8 px-3.5 text-xs rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-2xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Review &amp; Approve</span>
              </Button>
            )}

            {/* 5. General Workspace Navigation Button - borderless, clean arrow on mobile */}
            <button
              type="button"
              onClick={() => (window.location.href = `/bookings/${b._id}`)}
              className="p-1.5 sm:px-2.5 sm:py-1 text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors inline-flex items-center gap-1 cursor-pointer outline-none group border-0 bg-transparent"
              title="Open Workspace"
              aria-label="Open Workspace"
            >
              <span className="hidden sm:inline font-medium text-gray-600 dark:text-gray-400 group-hover:text-[#9747FF] transition-colors">
                Workspace
              </span>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#9747FF] group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>
        </div>
      </article>
    );
  };

  const userDisplayName = user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Creative Member';
  const userUsername = user?.email ? user.email.split('@')[0] : 'creator';

  return (
    <div className="w-full relative">
      {/* 3-Column Standardized Desktop Layout with continuous ash-gray dividers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* =========================================================================
            LEFT COLUMN (lg:col-span-3, hidden on mobile/tablet)
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
                  <span>{user.category || 'Creative Member'}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Join the MyArteLab community</p>
                <Button asChild size="sm" className="mt-2 rounded-full bg-[#9747FF] hover:bg-[#8534f0] text-white">
                  <a href="/login">Log In</a>
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
                <span>Creative Feed</span>
              </a>

              <a
                href="/notifications"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-gray-700 dark:text-gray-300 hover:text-[#9747FF] dark:hover:text-[#9747FF] hover:bg-gray-100/70 dark:hover:bg-[#1e1f20] transition-colors"
              >
                <Bell className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span>Notifications</span>
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
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm text-[#9747FF] bg-purple-50/80 dark:bg-purple-950/30 transition-colors"
              >
                <Calendar className="w-4 h-4 text-[#9747FF]" />
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
                <span>Profile &amp; Settings</span>
              </a>
            </nav>
          </div>
        </aside>

        {/* =========================================================================
            CENTER COLUMN (lg:col-span-6, full width on mobile)
            Interactive Bookings Stream & Filter Tabs
           ========================================================================= */}
        <main className="col-span-1 lg:col-span-6 w-full max-w-xl mx-auto flex flex-col pb-16">
          {/* Header */}
          <div className="px-4 pt-2 pb-3 flex items-center justify-between border-b border-[#DADDE1] dark:border-[#2f3032]">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                Bookings
              </h1>
              {bookings.length > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/50 text-[#9747FF]">
                  {bookings.length}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {/* Role Toggle Switcher */}
              <div className="inline-flex p-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-[11px] font-medium">
                <button
                  type="button"
                  onClick={() => setRoleFilter('all')}
                  className={cn(
                    'px-2.5 py-1 rounded-full transition-colors',
                    roleFilter === 'all'
                      ? 'bg-white dark:bg-[#18191a] text-gray-900 dark:text-gray-100 font-semibold shadow-2xs'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900'
                  )}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter('client')}
                  className={cn(
                    'px-2.5 py-1 rounded-full transition-colors',
                    roleFilter === 'client'
                      ? 'bg-white dark:bg-[#18191a] text-gray-900 dark:text-gray-100 font-semibold shadow-2xs'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900'
                  )}
                >
                  As Client
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter('creator')}
                  className={cn(
                    'px-2.5 py-1 rounded-full transition-colors',
                    roleFilter === 'creator'
                      ? 'bg-white dark:bg-[#18191a] text-gray-900 dark:text-gray-100 font-semibold shadow-2xs'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900'
                  )}
                >
                  As Creator
                </button>
              </div>

              {/* Book Creator Shortcut */}
              <Button
                size="sm"
                onClick={() => (window.location.href = '/explore')}
                className="h-7.5 sm:h-8 px-2.5 sm:px-3.5 rounded-full bg-[#9747FF] hover:bg-[#8534f0] text-white text-[11px] sm:text-xs font-semibold shadow-2xs inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Book Creator</span>
                <span className="sm:hidden">Book</span>
              </Button>
            </div>
          </div>

          {/* Bookings Stream - Organized by Sectional Priority without Cluttered Filter Bars */}
          <div className="flex flex-col">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-[#9747FF]" />
                <span className="text-xs text-gray-500">Loading bookings...</span>
              </div>
            ) : roleBookings.length === 0 ? (
              <div className="py-14 px-4">
                <EmptyState
                  image="/images/empty-bookings.png"
                  title="No bookings found"
                  description={
                    roleFilter === 'all'
                      ? "You haven't initiated or received any bookings yet."
                      : `No bookings found under your ${roleFilter} account.`
                  }
                  actionLabel="Browse Creators"
                  onAction={() => (window.location.href = '/explore')}
                />
              </div>
            ) : (
              <div className="flex flex-col">
                {/* 1. Action Required / Needs Attention */}
                {actionRequiredBookings.length > 0 && (
                  <section className="mb-4">
                    <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-[#DADDE1] dark:border-[#2f3032]">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#9747FF] animate-pulse" />
                        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100">
                          Action Required ({actionRequiredBookings.length})
                        </h2>
                      </div>
                      <span className="text-[11px] text-[#9747FF] font-medium">Needs response</span>
                    </div>
                    <div className="px-4">
                      {actionRequiredBookings.map(renderBookingItem)}
                    </div>
                  </section>
                )}

                {/* 2. Active Projects */}
                {activeBookings.length > 0 && (
                  <section className="mb-4">
                    <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-[#DADDE1] dark:border-[#2f3032]">
                      <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Active Bookings ({activeBookings.length})
                      </h2>
                      <span className="text-[11px] text-gray-400">In production</span>
                    </div>
                    <div className="px-4">
                      {activeBookings.map(renderBookingItem)}
                    </div>
                  </section>
                )}

                {/* 3. Completed & Past Bookings */}
                {pastBookings.length > 0 && (
                  <section className="mb-4">
                    <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-[#DADDE1] dark:border-[#2f3032]">
                      <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Completed &amp; Past ({pastBookings.length})
                      </h2>
                      <span className="text-[11px] text-gray-400">History</span>
                    </div>
                    <div className="px-4">
                      {pastBookings.map(renderBookingItem)}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        </main>

        {/* =========================================================================
            RIGHT COLUMN (lg:col-span-3, hidden on mobile/tablet)
            Escrow Security Guarantee & Wallet Summary
           ========================================================================= */}
        <aside className="hidden lg:flex flex-col gap-6 lg:col-span-3 sticky top-20">
          {/* Escrow Guarantee Card */}
          <div className="pb-5 border-b border-[#DADDE1] dark:border-[#2f3032]">
            <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100 mb-2">
              <ShieldCheck className="w-4 h-4 text-[#9747FF]" />
              <h4 className="text-xs font-semibold uppercase tracking-wider">
                MyArteLab Escrow Protection
              </h4>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
              Funds are safely locked in smart escrow and only released to the creator once you review and approve the agreed deliverables.
            </p>
            <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#9747FF] shrink-0 mt-0.5" />
                <span>Zero financial release before deliverable inspection</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#9747FF] shrink-0 mt-0.5" />
                <span>Clear deliverable checklists &amp; revision rounds</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#9747FF] shrink-0 mt-0.5" />
                <span>Full refund rights if project is unfulfilled</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="pb-5 border-b border-[#DADDE1] dark:border-[#2f3032]">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
              Portfolio Overview
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Active Projects</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{activeCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Completed Projects</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{completedCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Total Volume</span>
                <span className="font-bold text-[#9747FF]">{totalValue} USDC</span>
              </div>
            </div>
          </div>

          {/* Discover Shortcut */}
          <div className="pb-5 border-b border-[#DADDE1] dark:border-[#2f3032]">
            <a
              href="/explore"
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-[#1e1f20] transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <Compass className="w-4 h-4 text-[#9747FF]" />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Explore Creators</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#9747FF] transition-colors" />
            </a>
          </div>

          <div className="px-1 text-xs text-gray-400">
            <p>© {new Date().getFullYear()} MyArteLab Inc.</p>
          </div>
        </aside>

      </div>

      {/* =========================================================================
          MODALS & BOTTOM SHEETS (Responsive: Drawer on mobile, Dialog on desktop)
         ========================================================================= */}

      {/* 1. Real Escrow Funding Modal */}
      {fundingBooking && (
        isMobile ? (
          <Drawer open={!!fundingBooking} onOpenChange={() => setFundingBooking(null)}>
            <DrawerContent className="p-5 bg-white dark:bg-[#18191a] border-t border-[#DADDE1] dark:border-[#2f3032]">
              <DrawerHeader className="p-0 pb-3 border-b border-[#DADDE1] dark:border-[#2f3032]">
                <DrawerTitle className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#9747FF]" />
                  <span>Fund Escrow Deposit</span>
                </DrawerTitle>
                <DrawerDescription className="text-xs text-gray-500">
                  Lock payment for "{fundingBooking.serviceTitle}" in secure escrow.
                </DrawerDescription>
              </DrawerHeader>

              <div className="py-4 space-y-4">
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-[#DADDE1]/60 dark:border-[#2f3032]">
                    <span className="text-gray-500">Creator:</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{fundingBooking.creator.name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#DADDE1]/60 dark:border-[#2f3032]">
                    <span className="text-gray-500">Deposit Amount:</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">{fundingBooking.amount} {fundingBooking.currency}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#DADDE1]/60 dark:border-[#2f3032]">
                    <span className="text-gray-500">Your Available Balance:</span>
                    <span className="font-semibold text-[#9747FF]">
                      {isLoadingWallet ? 'Checking...' : `${walletAvailableBalance ?? 0} ${fundingBooking.currency}`}
                    </span>
                  </div>
                </div>

                {walletAvailableBalance !== null && walletAvailableBalance < fundingBooking.amount ? (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs space-y-2">
                    <p>Your wallet balance is lower than the required {fundingBooking.amount} {fundingBooking.currency}.</p>
                    <Button
                      size="sm"
                      onClick={() => (window.location.href = '/wallet')}
                      className="w-full rounded-full bg-[#9747FF] hover:bg-[#8534f0] text-white text-xs"
                    >
                      Deposit Funds into Wallet
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Funds will be deducted from your wallet and held by MyArteLab smart escrow. Funds are only transferred to the creator after you approve the final deliverables.
                  </p>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setFundingBooking(null)}
                    disabled={isSubmittingFunding}
                    className="flex-1 rounded-full text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmFunding}
                    disabled={isSubmittingFunding || (walletAvailableBalance !== null && walletAvailableBalance < fundingBooking.amount)}
                    className="flex-1 rounded-full bg-[#9747FF] hover:bg-[#8534f0] text-white text-xs font-semibold"
                  >
                    {isSubmittingFunding ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Lock className="w-3.5 h-3.5 mr-1" />}
                    Confirm &amp; Lock
                  </Button>
                </div>
              </div>
            </DrawerContent>
          </Drawer>
        ) : (
          <Dialog open={!!fundingBooking} onOpenChange={() => setFundingBooking(null)}>
            <DialogContent className="max-w-md bg-white dark:bg-[#18191a] border border-[#DADDE1] dark:border-[#2f3032] p-5 rounded-2xl">
              <DialogHeader className="pb-3 border-b border-[#DADDE1] dark:border-[#2f3032]">
                <DialogTitle className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#9747FF]" />
                  <span>Fund Escrow Deposit</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500">
                  Lock payment for "{fundingBooking.serviceTitle}" in secure escrow.
                </DialogDescription>
              </DialogHeader>

              <div className="py-4 space-y-4">
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-[#DADDE1]/60 dark:border-[#2f3032]">
                    <span className="text-gray-500">Creator:</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{fundingBooking.creator.name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#DADDE1]/60 dark:border-[#2f3032]">
                    <span className="text-gray-500">Escrow Deposit:</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">{fundingBooking.amount} {fundingBooking.currency}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#DADDE1]/60 dark:border-[#2f3032]">
                    <span className="text-gray-500">Your Available Balance:</span>
                    <span className="font-semibold text-[#9747FF]">
                      {isLoadingWallet ? 'Checking...' : `${walletAvailableBalance ?? 0} ${fundingBooking.currency}`}
                    </span>
                  </div>
                </div>

                {walletAvailableBalance !== null && walletAvailableBalance < fundingBooking.amount ? (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs space-y-2">
                    <p>Your wallet balance is lower than the required {fundingBooking.amount} {fundingBooking.currency}.</p>
                    <Button
                      size="sm"
                      onClick={() => (window.location.href = '/wallet')}
                      className="w-full rounded-full bg-[#9747FF] hover:bg-[#8534f0] text-white text-xs"
                    >
                      Deposit Funds into Wallet
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Funds will be deducted from your wallet and held securely in escrow. Funds are only transferred to the creator after you inspect and approve the completed deliverables.
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setFundingBooking(null)}
                    disabled={isSubmittingFunding}
                    className="rounded-full text-xs px-4"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmFunding}
                    disabled={isSubmittingFunding || (walletAvailableBalance !== null && walletAvailableBalance < fundingBooking.amount)}
                    className="rounded-full bg-[#9747FF] hover:bg-[#8534f0] text-white text-xs font-semibold px-5"
                  >
                    {isSubmittingFunding ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Lock className="w-3.5 h-3.5 mr-1" />}
                    Confirm &amp; Lock in Escrow
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )
      )}

      {/* 2. Counter Offer Modal */}
      {counterModalBooking && (
        <Dialog open={!!counterModalBooking} onOpenChange={() => setCounterModalBooking(null)}>
          <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-[#18191a] border border-[#DADDE1] dark:border-[#2f3032] p-5">
            <DialogHeader className="pb-3 border-b border-[#DADDE1] dark:border-[#2f3032]">
              <DialogTitle className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-[#9747FF]" />
                <span>Send Counter Offer</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Propose revised pricing terms for "{counterModalBooking.serviceTitle}".
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="flex justify-between text-xs py-1 border-b border-[#DADDE1]/60 dark:border-[#2f3032]">
                <span className="text-gray-500">Original Proposed Budget:</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {counterModalBooking.amount} {counterModalBooking.currency}
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Your Proposed Amount ({counterModalBooking.currency})
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="Enter revised amount"
                    value={counterAmount}
                    onChange={(e) => setCounterAmount(e.target.value)}
                    className="pl-9 text-xs rounded-xl border-[#DADDE1] dark:border-[#2f3032]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCounterModalBooking(null)}
                  disabled={isSubmittingCounter}
                  className="rounded-full text-xs px-4"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSendCounter}
                  disabled={isSubmittingCounter}
                  className="bg-[#9747FF] hover:bg-[#8534f0] text-white text-xs font-semibold rounded-full px-5"
                >
                  {isSubmittingCounter ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                  Submit Counter Offer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 3. Decline Booking Modal */}
      {declineModalBooking && (
        <Dialog open={!!declineModalBooking} onOpenChange={() => setDeclineModalBooking(null)}>
          <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-[#18191a] border border-[#DADDE1] dark:border-[#2f3032] p-5">
            <DialogHeader className="pb-3 border-b border-[#DADDE1] dark:border-[#2f3032]">
              <DialogTitle className="text-base font-bold text-gray-900 dark:text-gray-100">
                Decline Booking Request
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Let {declineModalBooking.client.name} know why you are unable to take this project.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Reason for Declining (Optional)
                </label>
                <Textarea
                  placeholder="e.g., Currently fully booked, scope outside specialty, timeline unachievable..."
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  className="text-xs rounded-xl border-[#DADDE1] dark:border-[#2f3032] min-h-[90px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeclineModalBooking(null)}
                  disabled={isSubmittingDecline}
                  className="rounded-full text-xs px-4"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSendDecline}
                  disabled={isSubmittingDecline}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-full px-5"
                >
                  {isSubmittingDecline ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <XCircle className="w-3.5 h-3.5 mr-1" />}
                  Decline Request
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 4. New Booking Modal */}
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
            setIsBookingModalOpen(false);
            setSelectedCreator(null);
          }}
        />
      )}
    </div>
  );
}