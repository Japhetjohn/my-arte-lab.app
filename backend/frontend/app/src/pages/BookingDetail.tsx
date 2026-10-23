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
import { VerifiedBadge } from '@/components/shared/VerifiedBadge';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/contexts/AuthContext';
import { getAvatarUrl, getImageUrl } from '@/lib/imageUrl';
import {
  bookingWorkflowService,
  type BookingWorkflowItem,
} from '@/lib/bookingWorkflow';
import { uploadService } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  ArrowLeft,
  Calendar,
  MessageSquare,
  Check,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  ExternalLink,
  Download,
  Star,
  Package,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Compass,
  Wallet,
  Settings,
  Loader2,
  Send,
  Eye,
  Lock,
  DollarSign,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface BookingDetailProps {
  bookingId?: string;
}

export function BookingDetail({ bookingId: propBookingId }: BookingDetailProps = {}) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const urlMatch = typeof window !== 'undefined' ? window.location.pathname.match(/\/bookings\/(.+)/) : null;
  const id = propBookingId || urlMatch?.[1];

  const [booking, setBooking] = useState<BookingWorkflowItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Escrow Funding Modal state
  const [isFundingModalOpen, setIsFundingModalOpen] = useState(false);
  const [walletAvailableBalance, setWalletAvailableBalance] = useState<number | null>(null);
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);
  const [isSubmittingFunding, setIsSubmittingFunding] = useState(false);

  // Submission Modal state
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submissionTitle, setSubmissionTitle] = useState('');
  const [submissionDesc, setSubmissionDesc] = useState('');
  const [submissionLinks, setSubmissionLinks] = useState('');
  const [submissionFiles, setSubmissionFiles] = useState<string[]>([]);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isSubmittingWork, setIsSubmittingWork] = useState(false);

  // Revision Modal state
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false);

  // Approval & Rating Modal state
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  // Counter proposal modal state
  const [isCounterModalOpen, setIsCounterModalOpen] = useState(false);
  const [counterAmount, setCounterAmount] = useState('');
  const [isSubmittingCounter, setIsSubmittingCounter] = useState(false);

  // Image lightbox preview modal
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Description show more/less state
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  useEffect(() => {
    if (id) {
      fetchBookingDetails();
    }
  }, [id]);

  // Check URL query parameters for direct modal triggers (e.g., ?action=submit or ?action=review)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const action = params.get('action');
      if (action === 'submit') {
        setIsSubmitModalOpen(true);
      } else if (action === 'review') {
        setIsApprovalModalOpen(true);
      }
    }
  }, []);

  const fetchBookingDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const item = await bookingWorkflowService.getBooking(id!);
      setBooking(item);
    } catch (err: any) {
      console.error('Error loading booking:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load booking');
      toast.error('Could not load booking details');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWalletBalance = async () => {
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

  const isClient = user?.id === booking?.client?._id;
  const isCreator = user?.id === booking?.creator?._id;
  const otherParty = isClient ? booking?.creator : booking?.client;

  // Escrow Funding
  const handleConfirmFunding = async () => {
    if (!booking) return;
    try {
      setIsSubmittingFunding(true);
      await bookingWorkflowService.payBooking(booking._id);
      toast.success('Funds locked in escrow! The creator has been notified to begin work.');
      setIsFundingModalOpen(false);
      fetchBookingDetails();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to fund escrow';
      toast.error(msg);
    } finally {
      setIsSubmittingFunding(false);
    }
  };

  // Creator Accepts Booking Request -> moves to awaiting_payment
  const handleAcceptRequest = async () => {
    if (!booking) return;
    try {
      setIsProcessingAction(true);
      await bookingWorkflowService.acceptBooking(booking._id);
      toast.success('Booking accepted! Client has been notified to deposit funds into escrow.');
      fetchBookingDetails();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to accept booking');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Creator Declines Booking Request
  const handleDeclineRequest = async () => {
    if (!booking) return;
    const reason = prompt('Please specify a reason for declining:');
    if (reason === null) return;
    try {
      setIsProcessingAction(true);
      await bookingWorkflowService.rejectBooking(booking._id, reason || 'Declined by creator');
      toast.success('Booking declined');
      fetchBookingDetails();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to decline booking');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Client Accepts Counter Offer -> moves to awaiting_payment at new amount
  const handleAcceptCounter = async () => {
    if (!booking) return;
    try {
      setIsProcessingAction(true);
      await bookingWorkflowService.acceptCounterProposal(booking._id);
      toast.success('Counter offer accepted! Ready for escrow funding.');
      fetchBookingDetails();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to accept counter offer');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Client Declines Counter Offer
  const handleRejectCounter = async () => {
    if (!booking) return;
    try {
      setIsProcessingAction(true);
      await bookingWorkflowService.rejectCounterProposal(booking._id);
      toast.success('Counter offer declined');
      fetchBookingDetails();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to decline counter offer');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Creator Sends Counter Offer
  const handleSendCounter = async () => {
    if (!booking) return;
    const amountNum = parseFloat(counterAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    try {
      setIsSubmittingCounter(true);
      await bookingWorkflowService.counterProposal(booking._id, amountNum);
      toast.success(`Counter offer of ${amountNum} USDC sent!`);
      setIsCounterModalOpen(false);
      fetchBookingDetails();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to send counter proposal');
    } finally {
      setIsSubmittingCounter(false);
    }
  };

  // File Upload for Deliverables
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingFile(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const res = await uploadService.uploadImage(file);
          const url = res.data?.data?.url || res.data?.url;
          if (url) {
            setSubmissionFiles((prev) => [...prev, url]);
          }
        } catch {
          setSubmissionFiles((prev) => [...prev, URL.createObjectURL(file)]);
        }
      }
    } finally {
      setIsUploadingFile(false);
    }
  };

  // Creator Submits Work
  const handleSubmitWork = async () => {
    if (!booking) return;
    if (!submissionTitle.trim()) {
      toast.error('Please provide a title for this delivery');
      return;
    }

    const linksArray = submissionLinks
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    try {
      setIsSubmittingWork(true);
      await bookingWorkflowService.submitDeliverables(booking._id, {
        title: submissionTitle.trim(),
        description: submissionDesc.trim(),
        files: submissionFiles,
        fileUrl: submissionFiles[0] || '',
        links: linksArray,
      });

      toast.success('Work submitted successfully! Client has been notified for review.');
      setIsSubmitModalOpen(false);
      setSubmissionTitle('');
      setSubmissionDesc('');
      setSubmissionLinks('');
      setSubmissionFiles([]);
      fetchBookingDetails();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit deliverables');
    } finally {
      setIsSubmittingWork(false);
    }
  };

  // Client Requests Revision
  const handleRequestRevision = async () => {
    if (!booking) return;
    if (!revisionNotes.trim()) {
      toast.error('Please describe what revisions or modifications are required');
      return;
    }

    try {
      setIsSubmittingRevision(true);
      await bookingWorkflowService.requestRevision(booking._id, revisionNotes.trim());
      toast.success('Revision requested. Creator has been notified.');
      setIsRevisionModalOpen(false);
      setRevisionNotes('');
      fetchBookingDetails();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to request revision');
    } finally {
      setIsSubmittingRevision(false);
    }
  };

  // Client Approves Project & Releases Escrow
  const handleApproveProject = async () => {
    if (!booking) return;
    try {
      setIsSubmittingApproval(true);
      await bookingWorkflowService.approveAndComplete(booking._id, {
        rating,
        comment: reviewComment.trim(),
      });

      toast.success('Deliverables approved! Escrow funds released to creator.');
      setIsApprovalModalOpen(false);
      fetchBookingDetails();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to approve project');
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 text-gray-400 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#9747FF]" />
        <p className="text-xs">Loading booking workspace...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Booking Workspace Unavailable</h2>
        <p className="text-xs text-gray-500">{error || 'Booking could not be found'}</p>
        <Button
          onClick={() => (window.location.href = '/bookings')}
          className="rounded-full bg-[#9747FF] hover:bg-[#8534f0] text-white text-xs font-semibold px-5"
        >
          Return to My Bookings
        </Button>
      </div>
    );
  }

  // Stepper phase mapping (5 unified phases)
  const getTimelineSteps = () => {
    const isRevision = !!(booking.revisionRequests && booking.revisionRequests.length > 0) && booking.status === 'in_progress';
    const isFundedOrBeyond = ['confirmed', 'in_progress', 'delivered', 'completed'].includes(booking.status);
    const isDeliveredOrDone = ['delivered', 'completed'].includes(booking.status);

    return [
      {
        id: 'submitted',
        label: 'Request Sent',
        active: true,
        done: true,
      },
      {
        id: 'accepted',
        label: 'Accepted',
        active: booking.status !== 'pending',
        done: booking.status !== 'pending',
      },
      {
        id: 'funded',
        label: 'Escrow Funded',
        active: isFundedOrBeyond || booking.status === 'awaiting_payment',
        done: isFundedOrBeyond,
      },
      {
        id: 'in_progress',
        label: isRevision ? 'Revision Underway' : 'In Production',
        active: isFundedOrBeyond,
        done: isDeliveredOrDone,
      },
      {
        id: 'completed',
        label: 'Completed',
        active: booking.status === 'completed',
        done: booking.status === 'completed',
      },
    ];
  };

  const timelineSteps = getTimelineSteps();
  const completedStepsCount = timelineSteps.filter((s) => s.done).length;
  const firstIncompleteIdx = timelineSteps.findIndex((s) => !s.done);
  const activeStepIdx = firstIncompleteIdx !== -1 ? firstIncompleteIdx : timelineSteps.length - 1;
  const currentStep = timelineSteps[activeStepIdx];
  const progressPercentage = (completedStepsCount / (timelineSteps.length - 1)) * 100;

  const deliverables = booking.expectedDeliverables || [];
  const submissions = booking.submissions || [];
  const referenceImages = booking.attachments || [];
  const hasActiveCounterOffer = !!(
    booking.counterProposal &&
    !booking.counterProposal.applied &&
    booking.counterProposal.amount
  );
  const latestRevision = booking.revisionRequests && booking.revisionRequests.length > 0
    ? booking.revisionRequests[booking.revisionRequests.length - 1]
    : null;
  const isLongDescription = (booking.serviceDescription || '').length > 240;
  const deliverablesCount = deliverables.length;

  const getStatusBadge = () => {
    const isRevision = !!(booking.revisionRequests && booking.revisionRequests.length > 0) && booking.status === 'in_progress';
    if (hasActiveCounterOffer) {
      return {
        label: isClient ? 'Counter Offer Received' : 'Counter Offer Sent',
        className: 'bg-purple-100 text-[#9747FF] dark:bg-purple-950/60 dark:text-purple-300',
      };
    }
    if (isRevision) {
      return {
        label: 'Revision Requested',
        className: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
      };
    }
    switch (booking.status) {
      case 'pending':
        return {
          label: 'Pending Response',
          className: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
        };
      case 'awaiting_payment':
        return {
          label: 'Awaiting Escrow Deposit',
          className: 'bg-purple-100 text-[#9747FF] dark:bg-purple-950/60 dark:text-purple-300',
        };
      case 'confirmed':
      case 'in_progress':
        return {
          label: 'In Progress',
          className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300',
        };
      case 'delivered':
        return {
          label: 'Delivered / In Review',
          className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
        };
      case 'completed':
        return {
          label: 'Completed',
          className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
        };
      case 'disputed':
        return {
          label: 'Disputed',
          className: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
        };
      default:
        return {
          label: booking.status,
          className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
        };
    }
  };

  const statusBadge = getStatusBadge();

  const renderStatusAction = () => {
    // 1. Creator - Pending request
    if (isCreator && booking.status === 'pending') {
      return (
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/40">
          <div className="text-xs text-gray-700 dark:text-gray-300">
            <span className="font-semibold text-gray-900 dark:text-gray-100">{booking.client.name}</span> requested your creative services for <strong className="text-[#9747FF]">{booking.amount} {booking.currency}</strong>.
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={handleAcceptRequest}
              disabled={isProcessingAction}
              className="h-8 px-4 text-xs font-semibold rounded-full bg-[#9747FF] hover:bg-[#8534f0] text-white shadow-2xs cursor-pointer"
            >
              {isProcessingAction ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Accept Booking
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setCounterAmount(String(booking.amount));
                setIsCounterModalOpen(true);
              }}
              disabled={isProcessingAction}
              className="h-8 px-3 text-xs font-semibold rounded-full border border-[#DADDE1] dark:border-[#2f3032] text-[#9747FF] hover:bg-purple-50 dark:hover:bg-purple-950/30 cursor-pointer"
            >
              Counter Offer
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDeclineRequest}
              disabled={isProcessingAction}
              className="h-8 px-2.5 text-xs rounded-full text-gray-500 hover:text-rose-600 cursor-pointer"
            >
              Decline
            </Button>
          </div>
        </div>
      );
    }

    // 2. Client - Counter offer received
    if (isClient && hasActiveCounterOffer) {
      return (
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/40">
          <div className="text-xs text-gray-700 dark:text-gray-300">
            <span className="font-semibold text-gray-900 dark:text-gray-100">{booking.creator.name}</span> proposed a counter offer of <strong className="text-[#9747FF]">{booking.counterProposal?.amount} {booking.currency}</strong> (originally {booking.amount} {booking.currency}).
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={handleAcceptCounter}
              disabled={isProcessingAction}
              className="h-8 px-4 text-xs font-semibold rounded-full bg-[#9747FF] hover:bg-[#8534f0] text-white shadow-2xs cursor-pointer"
            >
              {isProcessingAction ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Accept Counter
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRejectCounter}
              disabled={isProcessingAction}
              className="h-8 px-3 text-xs font-semibold rounded-full border border-[#DADDE1] dark:border-[#2f3032] text-gray-700 dark:text-gray-300 cursor-pointer"
            >
              Decline
            </Button>
          </div>
        </div>
      );
    }

    // 3. Client - Escrow funding required
    if (isClient && booking.status === 'awaiting_payment') {
      return (
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/40">
          <div className="text-xs text-gray-700 dark:text-gray-300">
            Creator accepted! Deposit <strong className="text-gray-900 dark:text-gray-100">{booking.amount} {booking.currency}</strong> into smart escrow to initiate production.
          </div>
          <Button
            size="sm"
            onClick={() => {
              fetchWalletBalance();
              setIsFundingModalOpen(true);
            }}
            className="h-8 px-4 text-xs font-semibold rounded-full bg-[#9747FF] hover:bg-[#8534f0] text-white shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Deposit &amp; Fund Escrow</span>
          </Button>
        </div>
      );
    }

    // 4. Creator - Awaiting client escrow deposit
    if (isCreator && booking.status === 'awaiting_payment') {
      return (
        <div className="pt-2 p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>Accepted! Awaiting client escrow deposit of {booking.amount} {booking.currency} before work begins.</span>
        </div>
      );
    }

    // 5. Revision requested
    if (latestRevision && booking.status === 'in_progress') {
      return (
        <div className="pt-2 p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-300">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Revision Requested by {booking.client.name}</span>
            </div>
            {isCreator && (
              <Button
                size="sm"
                onClick={() => setIsSubmitModalOpen(true)}
                className="h-7 px-3 text-xs font-semibold rounded-full bg-[#9747FF] hover:bg-[#8534f0] text-white shadow-2xs cursor-pointer"
              >
                Submit Revised Work
              </Button>
            )}
          </div>
          <p className="text-gray-700 dark:text-gray-300 italic">
            "{latestRevision.notes}"
          </p>
        </div>
      );
    }

    // 6. Client - Deliverables ready for review
    if (isClient && booking.status === 'delivered') {
      return (
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40">
          <div className="text-xs text-gray-700 dark:text-gray-300">
            Deliverables ready for your inspection! Review files below, then approve or request revisions.
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={() => setIsApprovalModalOpen(true)}
              className="h-8 px-4 text-xs font-semibold rounded-full bg-[#9747FF] hover:bg-[#8534f0] text-white shadow-2xs cursor-pointer"
            >
              Approve &amp; Release Funds
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsRevisionModalOpen(true)}
              className="h-8 px-3 text-xs font-semibold rounded-full border border-[#DADDE1] dark:border-[#2f3032] text-gray-700 dark:text-gray-300 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Request Revision
            </Button>
          </div>
        </div>
      );
    }

    // 7. Client - Completed but not rated yet
    if (booking.status === 'completed' && isClient && !booking.review) {
      return (
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40">
          <div className="text-xs text-gray-700 dark:text-gray-300">
            Project completed! Rate your experience with {booking.creator.name}.
          </div>
          <Button
            size="sm"
            onClick={() => setIsApprovalModalOpen(true)}
            className="h-8 px-4 text-xs font-semibold rounded-full bg-[#9747FF] hover:bg-[#8534f0] text-white shadow-2xs cursor-pointer"
          >
            <Star className="w-3.5 h-3.5 mr-1 fill-current" />
            Rate Creator
          </Button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="w-full relative">
      {/* 3-Column Desktop Layout (Preserved platform architecture) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* =========================================================================
            LEFT COLUMN (lg:col-span-3, hidden on mobile/tablet)
            Platform Navigation and User Context
           ========================================================================= */}
        <aside className="hidden lg:flex flex-col gap-6 lg:col-span-3 sticky top-20">
          <div className="pb-5 border-b border-[#DADDE1] dark:border-[#2f3032]">
            {user && (
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
            )}
          </div>

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
                href="/explore"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-gray-700 dark:text-gray-300 hover:text-[#9747FF] hover:bg-gray-100/70 dark:hover:bg-white/[0.04] transition-colors"
              >
                <Compass className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span>Explore</span>
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
            Interactive Project Workspace, Clean Horizontal Dividers
           ========================================================================= */}
        <section className="col-span-1 lg:col-span-6 flex flex-col gap-6">
          
          {/* Top Bar: Back & ID */}
          <div className="flex items-center justify-between pb-3 border-b border-[#DADDE1] dark:border-[#2f3032]">
            <a
              href="/bookings"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-[#9747FF] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Bookings</span>
            </a>

            <div className="flex items-center gap-2">
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                {booking.bookingId || booking._id.slice(-8)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => (window.location.href = `/messages?user=${otherParty?._id}`)}
                className="h-7 text-xs rounded-full border-[#DADDE1] dark:border-[#2f3032] text-gray-700 dark:text-gray-200"
              >
                <MessageSquare className="w-3.5 h-3.5 mr-1" />
                Message {otherParty?.name?.split(' ')[0]}
              </Button>
            </div>
          </div>

          {/* =========================================================================
              SECTION A: BOOKING SUMMARY & STATUS (Compact, Status-Aware, Contextual)
             ========================================================================= */}
          <div className="pb-5 border-b border-[#DADDE1] dark:border-[#2f3032] space-y-4">
            {/* Creator Identity & Metadata */}
            <div className="flex items-center gap-3">
              <a
                href={`/creators/${booking.creator._id}`}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden bg-purple-100 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/40 shrink-0 hover:opacity-90 transition-opacity"
              >
                {booking.creator.avatar ? (
                  <img src={getAvatarUrl(booking.creator.avatar)} alt={booking.creator.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-[#9747FF] text-sm">
                    {(booking.creator.name || 'C')[0]?.toUpperCase()}
                  </div>
                )}
              </a>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <a
                    href={`/creators/${booking.creator._id}`}
                    className="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100 hover:text-[#9747FF] transition-colors truncate"
                  >
                    {booking.creator.name}
                  </a>
                  {booking.creator.isVerified && <VerifiedBadge className="w-4 h-4" showTooltip={false} />}
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-[#9747FF] border border-purple-200/50 dark:border-purple-800/40">
                    Hired Creator
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Created on {new Date(booking.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Project Title & Category */}
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                {booking.category}
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight leading-snug">
                {booking.serviceTitle}
              </h1>
            </div>

            {/* Key Metrics in One Compact Clean Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-y border-[#DADDE1] dark:border-[#2f3032]">
              <div>
                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 block">Status</span>
                <span className={cn('inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full mt-0.5 capitalize', statusBadge.className)}>
                  {statusBadge.label}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 block">Agreed Budget</span>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-0.5 block">
                  {booking.amount} {booking.currency}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 block">Due Date</span>
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-0.5 block">
                  {new Date(booking.endDate).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 block">Deliverables</span>
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-0.5 block">
                  {deliverablesCount} item{deliverablesCount === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            {/* Milestone Progress Tracker */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Project Milestones
                  </h4>
                  <span className="text-gray-300 dark:text-gray-700">•</span>
                  <span className="text-xs font-semibold text-[#9747FF]">
                    {booking.status === 'completed'
                      ? 'All Milestones Completed'
                      : `Step ${activeStepIdx + 1} of ${timelineSteps.length}: ${currentStep?.label}`}
                  </span>
                </div>
                <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 hidden sm:inline-block">
                  {completedStepsCount} of {timelineSteps.length} complete
                </span>
              </div>

              {/* Stepper Track */}
              <div className="relative pt-1 pb-1">
                <div className="absolute top-[14px] sm:top-[16px] left-[10%] right-[10%] h-0.5 bg-gray-200 dark:bg-[#2f3032] -translate-y-1/2 z-0">
                  <div
                    className="h-full bg-[#9747FF] transition-all duration-500 ease-out"
                    style={{ width: `${Math.min(100, Math.max(0, progressPercentage))}%` }}
                  />
                </div>

                <div className="relative z-10 grid grid-cols-5 gap-1">
                  {timelineSteps.map((step, idx) => {
                    const isDone = step.done;
                    const isCurrent = idx === activeStepIdx && booking.status !== 'completed';

                    return (
                      <div key={step.id} className="flex flex-col items-center text-center">
                        <div
                          className={cn(
                            'w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                            isDone
                              ? 'bg-[#9747FF] text-white shadow-xs'
                              : isCurrent
                              ? 'bg-white dark:bg-[#18191a] border-2 border-[#9747FF] text-[#9747FF] ring-4 ring-[#9747FF]/15'
                              : 'bg-white dark:bg-[#18191a] border border-gray-300 dark:border-gray-700 text-gray-400 dark:text-gray-500'
                          )}
                        >
                          {isDone ? (
                            <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                          ) : (
                            <span className="text-[11px] sm:text-xs">{idx + 1}</span>
                          )}
                        </div>

                        <span
                          className={cn(
                            'text-[10px] sm:text-xs mt-2 text-center font-medium leading-tight max-w-[64px] sm:max-w-[85px] transition-colors',
                            isCurrent
                              ? 'text-[#9747FF] font-bold'
                              : isDone
                              ? 'text-gray-900 dark:text-gray-100 font-semibold'
                              : 'text-gray-400 dark:text-gray-500'
                          )}
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Contextual Action Callout (Display only the action relevant to current status) */}
            {renderStatusAction()}

            {/* Mobile Escrow Protection Indicator (visible only on mobile/tablet) */}
            <div className="lg:hidden flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-[#DADDE1] dark:border-[#2f3032] text-xs">
              <ShieldCheck className="w-4 h-4 text-[#9747FF] shrink-0" />
              <span className="text-gray-600 dark:text-gray-400 font-medium">
                {booking.paymentStatus === 'paid'
                  ? (booking.status === 'completed' ? 'Escrow Released to Creator' : 'Escrow Protected: Funds locked securely')
                  : (booking.status === 'awaiting_payment' ? 'Deposit Required to Fund Escrow' : 'Escrow Deposit Pending Acceptance')}
              </span>
            </div>
          </div>

          {/* =========================================================================
              SECTION B: PROJECT BRIEF & SCOPE (Unified Brief, Notes & Moodboards)
             ========================================================================= */}
          <div className="space-y-3 pb-5 border-b border-[#DADDE1] dark:border-[#2f3032]">
            <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Project Brief &amp; Scope
            </h3>

            {/* Description with Show More / Show Less */}
            <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              {isLongDescription && !isDescriptionExpanded ? (
                <>
                  <p>{booking.serviceDescription.slice(0, 240)}...</p>
                  <button
                    type="button"
                    onClick={() => setIsDescriptionExpanded(true)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#9747FF] hover:underline mt-1 cursor-pointer"
                  >
                    <span>Show more</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <p>{booking.serviceDescription}</p>
                  {isLongDescription && (
                    <button
                      type="button"
                      onClick={() => setIsDescriptionExpanded(false)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#9747FF] hover:underline mt-1 cursor-pointer"
                    >
                      <span>Show less</span>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Special Client Instructions / Notes */}
            {booking.metadata?.notes && (
              <div className="p-3 rounded-xl border-l-2 border-[#9747FF] bg-purple-50/40 dark:bg-purple-950/20 text-xs">
                <span className="font-semibold text-gray-900 dark:text-gray-100 block mb-0.5">Special Instructions:</span>
                <p className="italic text-gray-600 dark:text-gray-400">{booking.metadata.notes}</p>
              </div>
            )}

            {/* Reference Files & Moodboards Gallery (only if provided) */}
            {referenceImages.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                  Reference Files &amp; Moodboards ({referenceImages.length})
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {referenceImages.map((imgUrl, i) => (
                    <div
                      key={i}
                      onClick={() => setPreviewImageUrl(getImageUrl(imgUrl))}
                      className="relative rounded-xl overflow-hidden border border-[#DADDE1] dark:border-[#2f3032] aspect-video group cursor-pointer bg-gray-100 dark:bg-gray-800"
                    >
                      <img
                        src={getImageUrl(imgUrl)}
                        alt={`Reference ${i + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <Eye className="w-4 h-4" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* =========================================================================
              SECTION C: DELIVERABLES & SUBMISSIONS (Unified Deliverables & Stream)
             ========================================================================= */}
          <div className="space-y-4 pb-5 border-b border-[#DADDE1] dark:border-[#2f3032]">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Deliverables &amp; Submissions ({deliverablesCount})
              </h3>
              {isCreator && ['in_progress', 'confirmed', 'delivered'].includes(booking.status) && (
                <Button
                  size="sm"
                  onClick={() => setIsSubmitModalOpen(true)}
                  className="h-8 px-4 text-xs font-semibold rounded-full bg-[#9747FF] hover:bg-[#8534f0] text-white shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Submit Work</span>
                </Button>
              )}
            </div>

            {/* Deliverables Checklist */}
            <div className="divide-y divide-[#DADDE1] dark:divide-[#2f3032]">
              {deliverables.map((del) => (
                <div key={del.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <Package className="w-4 h-4 text-[#9747FF] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                        {del.title}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        Format: <span className="font-medium text-gray-700 dark:text-gray-300">{del.format}</span>
                      </p>
                      {del.description && (
                        <p className="text-xs text-gray-400 mt-0.5">{del.description}</p>
                      )}
                    </div>
                  </div>

                  <span
                    className={cn(
                      'text-[10px] font-semibold px-2.5 py-0.5 rounded-full shrink-0 uppercase',
                      del.status === 'approved' && 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300',
                      del.status === 'submitted' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
                      del.status === 'in_progress' && 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
                      del.status === 'pending' && 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    )}
                  >
                    {del.status}
                  </span>
                </div>
              ))}
            </div>

            {/* Work Submissions Stream */}
            {submissions.length > 0 ? (
              <div className="pt-2 space-y-3">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                  Work Submissions ({submissions.length})
                </span>

                <div className="divide-y divide-[#DADDE1] dark:divide-[#2f3032]">
                  {submissions.map((sub, idx) => (
                    <div key={sub.id || idx} className="py-3 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[11px] px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/50 text-[#9747FF]">
                            Version {sub.version || idx + 1}
                          </span>
                          <h4 className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                            {sub.title}
                          </h4>
                        </div>
                        <span className="text-[11px] text-gray-400">
                          {new Date(sub.uploadedAt).toLocaleDateString()}
                        </span>
                      </div>

                      {sub.description && (
                        <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                          {sub.description}
                        </p>
                      )}

                      {/* Files Attached */}
                      {sub.files && sub.files.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {sub.files.map((file, fIdx) => (
                            <a
                              key={fIdx}
                              href={getImageUrl(file)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-gray-800 border border-[#DADDE1] dark:border-[#2f3032] text-xs font-medium text-gray-800 dark:text-gray-200 hover:text-[#9747FF] transition-colors"
                            >
                              <Download className="w-3.5 h-3.5 text-[#9747FF]" />
                              <span>Deliverable File #{fIdx + 1}</span>
                            </a>
                          ))}
                        </div>
                      )}

                      {/* External Links */}
                      {sub.links && sub.links.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {sub.links.map((link, lIdx) => (
                            <a
                              key={lIdx}
                              href={link}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/40 text-xs font-semibold text-[#9747FF] hover:underline"
                            >
                              <span>{link.replace(/^https?:\/\//, '').split('/')[0]}</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                  No work submitted yet. Uploaded deliverables and files will appear here once submitted by the creator.
                </p>
              </div>
            )}
          </div>

          {/* =========================================================================
              SECTION D: COMPLETED REVIEW & RATING (When Project is Completed)
             ========================================================================= */}
          {booking.status === 'completed' && booking.review && (
            <div className="py-4 border-b border-[#DADDE1] dark:border-[#2f3032] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                    Project Completed &amp; Reviewed
                  </h4>
                </div>
                <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        'w-3.5 h-3.5',
                        i < booking.review!.rating ? 'fill-current text-amber-500' : 'text-gray-300'
                      )}
                    />
                  ))}
                  <span className="ml-1 text-gray-900 dark:text-gray-100">{booking.review.rating}.0</span>
                </div>
              </div>

              {booking.review.comment && (
                <p className="text-xs text-gray-700 dark:text-gray-300 italic leading-relaxed">
                  "{booking.review.comment}"
                </p>
              )}
            </div>
          )}
        </section>

        {/* =========================================================================
            RIGHT COLUMN (lg:col-span-3, hidden on mobile/tablet)
            Participants, Escrow Security & Timeline Summary
           ========================================================================= */}
        <aside className="hidden lg:flex flex-col gap-6 lg:col-span-3 sticky top-20">
          
          {/* Client & Creator Profile Strip */}
          <div className="pb-5 border-b border-[#DADDE1] dark:border-[#2f3032] space-y-4">
            <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Project Participants
            </h4>

            {/* Creator */}
            <div className="flex items-center gap-3">
              <a
                href={`/creators/${booking.creator._id}`}
                className="w-10 h-10 rounded-full overflow-hidden bg-purple-100 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/40 shrink-0"
              >
                {booking.creator.avatar ? (
                  <img src={getAvatarUrl(booking.creator.avatar)} alt={booking.creator.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-[#9747FF] text-xs">
                    {(booking.creator.name || 'C')[0]?.toUpperCase()}
                  </div>
                )}
              </a>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-xs text-gray-900 dark:text-gray-100 truncate">
                    {booking.creator.name}
                  </span>
                  {booking.creator.isVerified && <VerifiedBadge className="w-3.5 h-3.5" showTooltip={false} />}
                </div>
                <p className="text-[11px] text-gray-500">Creator</p>
              </div>
            </div>

            {/* Client */}
            <div className="flex items-center gap-3 pt-2 border-t border-[#DADDE1] dark:border-[#2f3032]">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shrink-0">
                {booking.client.avatar ? (
                  <img src={getAvatarUrl(booking.client.avatar)} alt={booking.client.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-gray-600 dark:text-gray-300 text-xs">
                    {(booking.client.name || 'C')[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <span className="font-bold text-xs text-gray-900 dark:text-gray-100 truncate block">
                  {booking.client.name}
                </span>
                <p className="text-[11px] text-gray-500">Client / Buyer</p>
              </div>
            </div>
          </div>

          {/* Financial & Escrow Summary */}
          <div className="pb-5 border-b border-[#DADDE1] dark:border-[#2f3032] space-y-3 text-xs">
            <h4 className="font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Financial &amp; Escrow
            </h4>

            <div className="space-y-2">
              <div className="flex justify-between text-gray-600 dark:text-gray-300">
                <span>Agreed Budget:</span>
                <span className="font-bold text-gray-900 dark:text-gray-100">
                  {booking.amount} {booking.currency}
                </span>
              </div>

              <div className="flex justify-between text-gray-400 text-[11px]">
                <span>Platform Commission (10%):</span>
                <span>{booking.platformFee || (booking.amount * 0.1).toFixed(2)} {booking.currency}</span>
              </div>

              <div className="flex justify-between text-[#9747FF] font-semibold pt-1 border-t border-[#DADDE1] dark:border-[#2f3032]">
                <span>Creator Earnings:</span>
                <span>{booking.creatorAmount || (booking.amount * 0.9).toFixed(2)} {booking.currency}</span>
              </div>

              <div className="pt-2 text-[11px] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#9747FF] shrink-0" />
                <span className={cn(
                  'font-medium',
                  booking.paymentStatus === 'paid' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500'
                )}>
                  {booking.paymentStatus === 'paid'
                    ? (booking.status === 'completed' ? 'Escrow Released to Creator' : 'Funds Safely Locked in Escrow')
                    : (booking.status === 'awaiting_payment' ? 'Deposit Required to Fund Escrow' : 'Escrow Deposit Pending Acceptance')}
                </span>
              </div>
            </div>
          </div>

          {/* Key Dates Summary */}
          <div className="pb-5 border-b border-[#DADDE1] dark:border-[#2f3032] space-y-2 text-xs">
            <h4 className="font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Key Dates
            </h4>
            <div className="space-y-1.5 text-gray-600 dark:text-gray-300">
              <div className="flex justify-between">
                <span>Start Date:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {new Date(booking.startDate).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Due Date:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {new Date(booking.endDate).toLocaleDateString()}
                </span>
              </div>
              {booking.completedAt && (
                <div className="flex justify-between text-emerald-600">
                  <span>Completed At:</span>
                  <span className="font-medium">{new Date(booking.completedAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* =========================================================================
          MODALS & DRAWERS (Responsive mobile Drawer / desktop Dialog)
         ========================================================================= */}

      {/* 1. Escrow Funding Modal */}
      {isMobile ? (
        <Drawer open={isFundingModalOpen} onOpenChange={setIsFundingModalOpen}>
          <DrawerContent className="p-4 bg-white dark:bg-[#18191a] border-[#DADDE1] dark:border-[#2f3032]">
            <DrawerHeader className="text-left pb-3 border-b border-[#DADDE1] dark:border-[#2f3032]">
              <DrawerTitle className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#9747FF]" />
                <span>Fund Escrow Deposit</span>
              </DrawerTitle>
              <DrawerDescription className="text-xs text-gray-500">
                Lock payment for "{booking.serviceTitle}" in secure escrow.
              </DrawerDescription>
            </DrawerHeader>

            <div className="py-4 space-y-4">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-[#DADDE1]/60 dark:border-[#2f3032]">
                  <span className="text-gray-500">Creator:</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{booking.creator.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#DADDE1]/60 dark:border-[#2f3032]">
                  <span className="text-gray-500">Escrow Deposit:</span>
                  <span className="font-bold text-gray-900 dark:text-gray-100">{booking.amount} {booking.currency}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#DADDE1]/60 dark:border-[#2f3032]">
                  <span className="text-gray-500">Available Wallet Balance:</span>
                  <span className="font-semibold text-[#9747FF]">
                    {isLoadingWallet ? 'Checking...' : `${walletAvailableBalance ?? 0} ${booking.currency}`}
                  </span>
                </div>
              </div>

              {walletAvailableBalance !== null && walletAvailableBalance < booking.amount ? (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs space-y-2">
                  <p>Your wallet balance is lower than the required {booking.amount} {booking.currency}.</p>
                  <Button
                    size="sm"
                    onClick={() => (window.location.href = '/wallet')}
                    className="w-full rounded-full bg-[#9747FF] hover:bg-[#8534f0] text-white text-xs font-semibold"
                  >
                    Deposit Funds into Wallet
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-gray-500 leading-relaxed">
                  Funds will be deducted from your wallet and held in MyArteLab smart escrow. Funds are only transferred to the creator after you approve the final deliverables.
                </p>
              )}

              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setIsFundingModalOpen(false)}
                  disabled={isSubmittingFunding}
                  className="flex-1 rounded-full text-xs border-[#DADDE1] dark:border-[#2f3032]"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmFunding}
                  disabled={isSubmittingFunding || (walletAvailableBalance !== null && walletAvailableBalance < booking.amount)}
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
        <Dialog open={isFundingModalOpen} onOpenChange={setIsFundingModalOpen}>
          <DialogContent className="max-w-md bg-white dark:bg-[#18191a] border border-[#DADDE1] dark:border-[#2f3032] p-5 rounded-2xl">
            <DialogHeader className="pb-3 border-b border-[#DADDE1] dark:border-[#2f3032]">
              <DialogTitle className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#9747FF]" />
                <span>Fund Escrow Deposit</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Lock payment for "{booking.serviceTitle}" in secure escrow.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-[#DADDE1]/60 dark:border-[#2f3032]">
                  <span className="text-gray-500">Creator:</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{booking.creator.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#DADDE1]/60 dark:border-[#2f3032]">
                  <span className="text-gray-500">Escrow Deposit:</span>
                  <span className="font-bold text-gray-900 dark:text-gray-100">{booking.amount} {booking.currency}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#DADDE1]/60 dark:border-[#2f3032]">
                  <span className="text-gray-500">Your Available Balance:</span>
                  <span className="font-semibold text-[#9747FF]">
                    {isLoadingWallet ? 'Checking...' : `${walletAvailableBalance ?? 0} ${booking.currency}`}
                  </span>
                </div>
              </div>

              {walletAvailableBalance !== null && walletAvailableBalance < booking.amount ? (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs space-y-2">
                  <p>Your wallet balance is lower than the required {booking.amount} {booking.currency}.</p>
                  <Button
                    size="sm"
                    onClick={() => (window.location.href = '/wallet')}
                    className="w-full rounded-full bg-[#9747FF] hover:bg-[#8534f0] text-white text-xs font-semibold"
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
                  onClick={() => setIsFundingModalOpen(false)}
                  disabled={isSubmittingFunding}
                  className="rounded-full text-xs px-4 border-[#DADDE1] dark:border-[#2f3032]"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmFunding}
                  disabled={isSubmittingFunding || (walletAvailableBalance !== null && walletAvailableBalance < booking.amount)}
                  className="rounded-full bg-[#9747FF] hover:bg-[#8534f0] text-white text-xs font-semibold px-5"
                >
                  {isSubmittingFunding ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Lock className="w-3.5 h-3.5 mr-1" />}
                  Confirm &amp; Lock in Escrow
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 2. Creator Submit Deliverables Modal */}
      <Dialog open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
        <DialogContent className="max-w-lg rounded-2xl bg-white dark:bg-[#18191a] border border-[#DADDE1] dark:border-[#2f3032] p-5">
          <DialogHeader className="pb-3 border-b border-[#DADDE1] dark:border-[#2f3032]">
            <DialogTitle className="text-base font-bold text-gray-900 dark:text-gray-100">
              Submit Deliverables
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Deliver completed files, design assets, and external links for client review.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                Delivery Title <span className="text-[#9747FF]">*</span>
              </label>
              <Input
                placeholder="e.g. Final Vector Package & Style Guide v1"
                value={submissionTitle}
                onChange={(e) => setSubmissionTitle(e.target.value)}
                className="h-10 text-xs rounded-xl border-[#DADDE1] dark:border-[#2f3032] dark:bg-[#121212]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                Delivery Notes / Instructions
              </label>
              <Textarea
                rows={3}
                placeholder="Explain the changes made, file structure, or how to inspect the deliverables..."
                value={submissionDesc}
                onChange={(e) => setSubmissionDesc(e.target.value)}
                className="text-xs rounded-xl border-[#DADDE1] dark:border-[#2f3032] dark:bg-[#121212] resize-none"
              />
            </div>

            {/* File Upload */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                Upload Assets / Images / Files
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:bg-purple-50 file:text-[#9747FF] hover:file:bg-purple-100"
                />
                {isUploadingFile && <Loader2 className="w-4 h-4 animate-spin text-[#9747FF]" />}
              </div>
              {submissionFiles.length > 0 && (
                <p className="text-[11px] text-emerald-600 font-medium">
                  {submissionFiles.length} file(s) attached
                </p>
              )}
            </div>

            {/* Links */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                External Asset Links (One per line)
              </label>
              <Textarea
                rows={2}
                placeholder="https://www.figma.com/file/..., https://github.com/..."
                value={submissionLinks}
                onChange={(e) => setSubmissionLinks(e.target.value)}
                className="text-xs font-mono rounded-xl border-[#DADDE1] dark:border-[#2f3032] dark:bg-[#121212] resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#DADDE1] dark:border-[#2f3032]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSubmitModalOpen(false)}
                disabled={isSubmittingWork}
                className="rounded-full border-[#DADDE1] dark:border-[#2f3032] text-xs px-4"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmitWork}
                disabled={isSubmittingWork}
                className="rounded-full bg-[#9747FF] hover:bg-[#8534f0] text-white text-xs font-semibold px-5"
              >
                {isSubmittingWork ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                Submit Work Package
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 3. Client Request Revision Modal */}
      <Dialog open={isRevisionModalOpen} onOpenChange={setIsRevisionModalOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-[#18191a] border border-[#DADDE1] dark:border-[#2f3032] p-5">
          <DialogHeader className="pb-3 border-b border-[#DADDE1] dark:border-[#2f3032]">
            <DialogTitle className="text-base font-bold text-gray-900 dark:text-gray-100">
              Request Project Revision
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Specify changes or refinements you would like {booking.creator.name} to make.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                Revision Details &amp; Feedback <span className="text-[#9747FF]">*</span>
              </label>
              <Textarea
                rows={4}
                placeholder="Clearly describe what needs adjustment (e.g. color adjustments, missing asset format, revised copy)..."
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                className="text-xs rounded-xl border-[#DADDE1] dark:border-[#2f3032] dark:bg-[#121212] focus-visible:ring-[#9747FF] resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#DADDE1] dark:border-[#2f3032]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRevisionModalOpen(false)}
                disabled={isSubmittingRevision}
                className="rounded-full border-[#DADDE1] dark:border-[#2f3032] text-xs px-4"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleRequestRevision}
                disabled={isSubmittingRevision}
                className="rounded-full bg-[#9747FF] hover:bg-[#8534f0] text-white text-xs font-semibold px-5"
              >
                {isSubmittingRevision ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <RotateCcw className="w-3.5 h-3.5 mr-1" />}
                Send Revision Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 4. Client Approval & Rating Modal */}
      <Dialog open={isApprovalModalOpen} onOpenChange={setIsApprovalModalOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-[#18191a] border border-[#DADDE1] dark:border-[#2f3032] p-5">
          <DialogHeader className="pb-3 border-b border-[#DADDE1] dark:border-[#2f3032]">
            <DialogTitle className="text-base font-bold text-gray-900 dark:text-gray-100">
              Approve Deliverables &amp; Release Escrow
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Confirm your satisfaction with deliverables. Funds will be released from escrow to {booking.creator.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* Interactive Stars */}
            <div className="space-y-2 text-center py-2">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Rate Creator Performance:
              </span>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 hover:scale-110 transition-transform cursor-pointer"
                  >
                    <Star
                      className={cn(
                        'w-7 h-7',
                        star <= rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-gray-300 dark:text-gray-700'
                      )}
                    />
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 font-medium">
                {rating === 5 && 'Outstanding work! Highly recommended.'}
                {rating === 4 && 'Great results and communication.'}
                {rating === 3 && 'Met expectations.'}
                {rating < 3 && 'Needs improvement.'}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                Review &amp; Testimonial (Optional)
              </label>
              <Textarea
                rows={3}
                placeholder="Share your thoughts on the quality, turnaround time, and collaboration..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="text-xs rounded-xl border-[#DADDE1] dark:border-[#2f3032] dark:bg-[#121212] focus-visible:ring-[#9747FF] resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#DADDE1] dark:border-[#2f3032]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsApprovalModalOpen(false)}
                disabled={isSubmittingApproval}
                className="rounded-full border-[#DADDE1] dark:border-[#2f3032] text-xs px-4"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleApproveProject}
                disabled={isSubmittingApproval}
                className="rounded-full bg-[#9747FF] hover:bg-[#8534f0] text-white text-xs font-semibold px-5"
              >
                {isSubmittingApproval ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                Confirm &amp; Release Funds
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 5. Counter Proposal Modal */}
      <Dialog open={isCounterModalOpen} onOpenChange={setIsCounterModalOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-[#18191a] border border-[#DADDE1] dark:border-[#2f3032] p-5">
          <DialogHeader className="pb-3 border-b border-[#DADDE1] dark:border-[#2f3032]">
            <DialogTitle className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-[#9747FF]" />
              <span>Send Counter Offer</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Propose revised budget terms for this project.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="flex justify-between text-xs py-1 border-b border-[#DADDE1]/60 dark:border-[#2f3032]">
              <span className="text-gray-500">Original Proposed Budget:</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {booking.amount} {booking.currency}
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Your Proposed Amount ({booking.currency})
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
                  className="pl-9 text-xs rounded-xl border-[#DADDE1] dark:border-[#2f3032] dark:bg-[#121212] focus-visible:ring-[#9747FF]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DADDE1] dark:border-[#2f3032]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCounterModalOpen(false)}
                disabled={isSubmittingCounter}
                className="rounded-full border-[#DADDE1] dark:border-[#2f3032] text-xs px-4"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSendCounter}
                disabled={isSubmittingCounter}
                className="rounded-full bg-[#9747FF] hover:bg-[#8534f0] text-white text-xs font-semibold px-5"
              >
                {isSubmittingCounter ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                Submit Counter Offer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 6. Lightbox Preview Modal */}
      {previewImageUrl && (
        <Dialog open={!!previewImageUrl} onOpenChange={() => setPreviewImageUrl(null)}>
          <DialogContent className="max-w-3xl p-2 bg-black/95 border-none rounded-2xl overflow-hidden">
            <div className="relative flex items-center justify-center min-h-[300px]">
              <img
                src={previewImageUrl}
                alt="Enlarged preview"
                className="max-h-[80vh] w-auto object-contain rounded-lg"
              />
              <button
                type="button"
                onClick={() => setPreviewImageUrl(null)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
