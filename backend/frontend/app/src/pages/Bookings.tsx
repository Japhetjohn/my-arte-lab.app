import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
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
  Users,
  Wallet,
  Settings as SettingsIcon,
  MoreVertical,
  Package,
  ArrowRight,
  ShieldCheck,
  Bell,
  MessageSquare,
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
  const [bookings, setBookings] = useState<BookingWorkflowItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Booking Modal (triggered by URL ?creator=...)
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<CreatorInfo | null>(null);

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

  // Sort bookings: active/pending items first, completed/cancelled later, newest first
  const sortedBookings = [...bookings].sort((a, b) => {
    const priorityOrder: Record<string, number> = {
      pending: 1,
      awaiting_payment: 2,
      delivered: 3,
      in_progress: 4,
      confirmed: 5,
      completed: 6,
      cancelled: 7,
      disputed: 8,
    };
    const priorityDiff = (priorityOrder[a.status] || 99) - (priorityOrder[b.status] || 99);
    if (priorityDiff !== 0) return priorityDiff;
    const timeA = new Date(a.createdAt || a.startDate || 0).getTime();
    const timeB = new Date(b.createdAt || b.startDate || 0).getTime();
    return timeB - timeA;
  });

  // Calculate stats for overview
  const activeCount = bookings.filter((b) => ['in_progress', 'confirmed', 'delivered'].includes(b.status)).length;
  const completedCount = bookings.filter((b) => b.status === 'completed').length;
  const totalValue = bookings
    .filter((b) => b.status !== 'cancelled')
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);

  // Status display helper - restrained typography label matching home feed
  const getStatusDisplay = (b: BookingWorkflowItem) => {
    const isRevision = Boolean(b.revisionRequests && b.revisionRequests.length > 0 && b.status === 'in_progress');
    const hasActiveCounter = Boolean(b.counterProposal?.amount && !b.counterProposal?.applied);

    if (hasActiveCounter) {
      const isClient = user?.id === b.client._id;
      return {
        label: isClient ? 'Counter Offer Received' : 'Counter Offer Pending',
        textClassName: 'text-[#9747FF]',
      };
    }

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
      case 'disputed':
        return {
          label: 'Disputed',
          textClassName: 'text-rose-600 dark:text-rose-400',
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
    const otherParty = isClient ? b.creator : b.client;
    const statusInfo = getStatusDisplay(b);
    const deliverablesCount = (b.expectedDeliverables || []).length;

    return (
      <article
        key={b._id}
        onClick={() => (window.location.href = `/bookings/${b._id}`)}
        className="group py-4 border-b border-[#DADDE1] dark:border-[#2f3032] space-y-2 cursor-pointer hover:bg-black/[0.015] dark:hover:bg-white/[0.015] transition-colors rounded-none"
      >
        {/* Row 1: Creator avatar, name, hired indicator, status label, 3-dot context menu */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <a
              href={isClient ? `/creators/${b.creator._id}` : undefined}
              onClick={(e) => {
                e.stopPropagation();
              }}
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
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
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

          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
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
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors cursor-pointer outline-none"
                  aria-label="Booking options"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-[#18191a] border border-[#DADDE1] dark:border-[#2f3032] rounded-xl shadow-md p-1 min-w-[150px]"
              >
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.href = `/bookings/${b._id}`;
                  }}
                  className="text-xs cursor-pointer"
                >
                  Open Workspace
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.href = `/messages?user=${otherParty._id}`;
                  }}
                  className="text-xs cursor-pointer"
                >
                  Message {otherParty.name?.split(' ')[0]}
                </DropdownMenuItem>
                {isClient && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = `/creators/${b.creator._id}`;
                    }}
                    className="text-xs cursor-pointer"
                  >
                    View Creator Profile
                  </DropdownMenuItem>
                )}
                {b.status !== 'completed' && b.status !== 'cancelled' && (
                  <DropdownMenuItem
                    className="text-xs text-rose-600 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelBooking(b._id);
                    }}
                  >
                    Cancel Booking
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Row 2: Booking title and brief description */}
        <div className="space-y-0.5">
          <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100 group-hover:text-[#9747FF] transition-colors leading-snug line-clamp-1">
            {b.serviceTitle}
          </h4>
          {b.serviceDescription && (
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
              {b.serviceDescription}
            </p>
          )}
        </div>

        {/* Row 3: Agreed price & currency, due date, deliverables count / star rating */}
        <div className="flex items-center gap-x-4 gap-y-1.5 flex-wrap text-xs text-gray-500 dark:text-gray-400 pt-0.5">
          <div className="flex items-center gap-1 font-bold text-gray-900 dark:text-gray-100">
            <DollarSign className="w-3.5 h-3.5 text-[#9747FF]" />
            <span>{b.amount} {b.currency}</span>
          </div>

          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <span>Due {new Date(b.endDate).toLocaleDateString()}</span>
          </div>

          {b.status === 'completed' && b.review?.rating ? (
            <div className="flex items-center gap-1 text-amber-500 font-semibold">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>{b.review.rating}.0</span>
            </div>
          ) : deliverablesCount > 0 ? (
            <div className="flex items-center gap-1">
              <Package className="w-3.5 h-3.5 text-gray-400" />
              <span>{deliverablesCount} {deliverablesCount === 1 ? 'deliverable' : 'deliverables'}</span>
            </div>
          ) : null}
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
            Interactive Bookings Stream
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
          </div>

          {/* Bookings Stream - Clean Continuous List with Thin Ash-Gray Dividers */}
          <div className="flex flex-col">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-[#9747FF]" />
                <span className="text-xs text-gray-500">Loading bookings...</span>
              </div>
            ) : sortedBookings.length === 0 ? (
              <div className="py-14 px-4">
                <EmptyState
                  image="/images/empty-bookings.png"
                  title="No bookings found"
                  description="You haven't initiated or received any bookings yet."
                  actionLabel="Browse Creators"
                  onAction={() => (window.location.href = '/creators')}
                />
              </div>
            ) : (
              <div className="px-4">
                {sortedBookings.map(renderBookingItem)}
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
                <span className="text-gray-600 dark:text-gray-400">Active Bookings</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{activeCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Completed Bookings</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{completedCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Total Volume</span>
                <span className="font-bold text-[#9747FF]">{totalValue} USDC</span>
              </div>
            </div>
          </div>

          {/* Creators Shortcut */}
          <div className="pb-5 border-b border-[#DADDE1] dark:border-[#2f3032]">
            <a
              href="/creators"
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-[#1e1f20] transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-[#9747FF]" />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Browse Creators</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#9747FF] transition-colors" />
            </a>
          </div>

          <div className="px-1 text-xs text-gray-400">
            <p>© {new Date().getFullYear()} MyArteLab Inc.</p>
          </div>
        </aside>

      </div>

      {/* New Booking Modal (when navigating with ?creator=...) */}
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