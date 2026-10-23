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
import { VerifiedBadge } from '@/components/shared/VerifiedBadge';
import { useAuth } from '@/contexts/AuthContext';
import { getAvatarUrl, getImageUrl } from '@/lib/imageUrl';
import {
  bookingWorkflowService,
  type BookingWorkflowItem,
} from '@/lib/bookingWorkflow';
import { uploadService } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/sonner';
import {
  ArrowLeft,
  Calendar,
  MessageSquare,
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
  FileText,
  X,
  FileCheck,
  Send,
  Eye,
  Plus,
} from 'lucide-react';

interface BookingDetailProps {
  bookingId?: string;
}

export function BookingDetail({ bookingId: propBookingId }: BookingDetailProps = {}) {
  const { user } = useAuth();
  const urlMatch = typeof window !== 'undefined' ? window.location.pathname.match(/\/bookings\/(.+)/) : null;
  const id = propBookingId || urlMatch?.[1];

  const [booking, setBooking] = useState<BookingWorkflowItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const isClient = user?.id === booking?.client?._id;
  const isCreator = user?.id === booking?.creator?._id;
  const otherParty = isClient ? booking?.creator : booking?.client;

  // Actions
  const handleAcceptRequest = async () => {
    if (!booking) return;
    try {
      await bookingWorkflowService.acceptBooking(booking._id);
      await bookingWorkflowService.startWork(booking._id);
      toast.success('Booking accepted! Project is now In Progress.');
      fetchBookingDetails();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to accept booking');
    }
  };

  const handleDeclineRequest = async () => {
    if (!booking) return;
    const reason = prompt('Please specify a reason for declining:');
    if (reason === null) return;
    try {
      await bookingWorkflowService.rejectBooking(booking._id, reason || 'Declined by creator');
      toast.success('Booking declined');
      fetchBookingDetails();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to decline booking');
    }
  };

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
      toast.success('Counter proposal sent!');
      setIsCounterModalOpen(false);
      fetchBookingDetails();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to send counter proposal');
    } finally {
      setIsSubmittingCounter(false);
    }
  };

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
          // Fallback to local preview URL
          setSubmissionFiles((prev) => [...prev, URL.createObjectURL(file)]);
        }
      }
    } finally {
      setIsUploadingFile(false);
    }
  };

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

      toast.success('Work submitted successfully! Client has been notified.');
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

  const handleApproveProject = async () => {
    if (!booking) return;
    try {
      setIsSubmittingApproval(true);
      await bookingWorkflowService.approveAndComplete(booking._id, {
        rating,
        comment: reviewComment.trim(),
      });

      toast.success('Project approved and completed! Thank you for your review.');
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
          className="bg-[#9747FF] hover:bg-[#8534f0] text-white text-xs rounded-xl"
        >
          Return to My Bookings
        </Button>
      </div>
    );
  }

  // Stepper phase mapping
  const getTimelineSteps = () => {
    const isRevision = (booking.revisionRequests && booking.revisionRequests.length > 0) && booking.status === 'in_progress';

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
        id: 'in_progress',
        label: isRevision ? 'Revision Underway' : 'In Progress',
        active: ['in_progress', 'confirmed', 'delivered', 'completed'].includes(booking.status),
        done: ['delivered', 'completed'].includes(booking.status),
      },
      {
        id: 'delivered',
        label: 'Delivered',
        active: ['delivered', 'completed'].includes(booking.status),
        done: booking.status === 'completed',
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
  const deliverables = booking.expectedDeliverables || [];
  const submissions = booking.submissions || [];
  const referenceImages = booking.attachments || [];

  return (
    <div className="w-full relative">
      {/* 3-Column Booking Detail Layout */}
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
            Interactive Project Workspace, Timeline, Deliverables, & Submissions
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
                className="h-7 text-xs rounded-lg border-[#DADDE1] dark:border-[#2f3032] text-gray-700 dark:text-gray-200"
              >
                <MessageSquare className="w-3.5 h-3.5 mr-1" />
                Message {otherParty?.name?.split(' ')[0]}
              </Button>
            </div>
          </div>

          {/* Project Title & Status Hero */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-[#9747FF] border border-purple-200/50 dark:border-purple-800/40">
                {booking.category}
              </span>
              <span className="text-xs text-gray-400">
                Created on {new Date(booking.createdAt).toLocaleDateString()}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight leading-snug">
              {booking.serviceTitle}
            </h1>
          </div>

          {/* Visual Progress Timeline */}
          <div className="p-4 rounded-2xl bg-gray-50/70 dark:bg-white/[0.02] border border-[#DADDE1] dark:border-[#2f3032] space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Project Milestone Tracker
            </h4>

            <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1">
              {timelineSteps.map((step, idx) => (
                <div key={step.id} className="flex items-center flex-1 min-w-[70px]">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                        step.done && 'bg-[#9747FF] text-white',
                        step.active && !step.done && 'bg-purple-100 dark:bg-purple-950 text-[#9747FF] ring-2 ring-[#9747FF]',
                        !step.active && 'bg-gray-200 dark:bg-gray-800 text-gray-400'
                      )}
                    >
                      {step.done ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                    </div>
                    <span
                      className={cn(
                        'text-[10px] mt-1 text-center font-medium',
                        step.active ? 'text-gray-900 dark:text-gray-100 font-semibold' : 'text-gray-400'
                      )}
                    >
                      {step.label}
                    </span>
                  </div>

                  {idx < timelineSteps.length - 1 && (
                    <div
                      className={cn(
                        'flex-1 h-0.5 mx-1.5 rounded-full',
                        step.done ? 'bg-[#9747FF]' : 'bg-[#DADDE1] dark:bg-[#2f3032]'
                      )}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* In-Progress Dev Preview Notice */}
            {['awaiting_payment', 'in_progress', 'confirmed'].includes(booking.status) && (
              <div className="p-2.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/50 dark:border-purple-800/30 flex items-center gap-2 text-xs text-[#9747FF]">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>
                  <strong>Dev Preview:</strong> Project terms agreed. Ready for work without upfront wallet deduction.
                </span>
              </div>
            )}
          </div>

          {/* Incoming Request Actions (if Creator & Pending) */}
          {isCreator && booking.status === 'pending' && (
            <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/40 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#9747FF]" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#9747FF]">
                  Action Required: Incoming Booking Request
                </h4>
              </div>
              <p className="text-xs text-gray-700 dark:text-gray-300">
                {booking.client.name} has requested your creative services for {booking.amount} {booking.currency}. Review the deliverables and timeline below before responding.
              </p>
              <div className="flex items-center gap-2.5 pt-1">
                <Button
                  size="sm"
                  onClick={handleAcceptRequest}
                  className="bg-[#9747FF] hover:bg-[#8534f0] text-white text-xs font-semibold rounded-xl px-4 shadow-xs"
                >
                  Accept Booking Request
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setCounterAmount(String(booking.amount));
                    setIsCounterModalOpen(true);
                  }}
                  className="rounded-xl border-[#DADDE1] dark:border-[#2f3032] text-xs font-semibold text-[#9747FF]"
                >
                  Propose Counter Offer
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDeclineRequest}
                  className="text-xs text-gray-500 hover:text-red-600 rounded-xl"
                >
                  Decline
                </Button>
              </div>
            </div>
          )}

          {/* Work Delivered Review Banner (if Client & Delivered) */}
          {isClient && booking.status === 'delivered' && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 space-y-3">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <FileCheck className="w-5 h-5 shrink-0" />
                <h4 className="font-bold text-xs uppercase tracking-wider">
                  Deliverables Ready For Review
                </h4>
              </div>
              <p className="text-xs text-gray-700 dark:text-gray-300">
                {booking.creator.name} has submitted deliverables for your project. Please inspect the files and links below. If satisfied, approve to complete the project and leave a review.
              </p>
              <div className="flex items-center gap-3 pt-1">
                <Button
                  size="sm"
                  onClick={() => setIsApprovalModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl px-5 shadow-xs"
                >
                  Approve Delivery &amp; Rate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsRevisionModalOpen(true)}
                  className="rounded-xl border-emerald-300 dark:border-emerald-700 text-xs text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/50"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Request Revision
                </Button>
              </div>
            </div>
          )}

          {/* Revision Requested Notice */}
          {booking.revisionRequests && booking.revisionRequests.length > 0 && booking.status === 'in_progress' && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 space-y-2">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <RotateCcw className="w-4 h-4 shrink-0" />
                <h4 className="font-bold text-xs uppercase tracking-wider">
                  Revision In Progress
                </h4>
              </div>
              <p className="text-xs text-gray-700 dark:text-gray-300">
                <strong>Feedback from {booking.client.name}:</strong> "
                {booking.revisionRequests[booking.revisionRequests.length - 1].notes}"
              </p>
              {isCreator && (
                <div className="pt-2">
                  <Button
                    size="sm"
                    onClick={() => setIsSubmitModalOpen(true)}
                    className="bg-[#9747FF] hover:bg-[#8534f0] text-white text-xs font-semibold rounded-xl px-4"
                  >
                    Submit Revised Work
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Project Brief & Scope */}
          <div className="space-y-3 pb-5 border-b border-[#DADDE1] dark:border-[#2f3032]">
            <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 uppercase tracking-wider">
              Project Description &amp; Scope
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {booking.serviceDescription}
            </p>

            {booking.metadata?.notes && (
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-[#DADDE1] dark:border-[#2f3032] text-xs">
                <span className="font-semibold text-gray-600 dark:text-gray-400">Additional Client Notes:</span>
                <p className="italic text-gray-700 dark:text-gray-300 mt-0.5">{booking.metadata.notes}</p>
              </div>
            )}
          </div>

          {/* Agreed Deliverables Checklist */}
          <div className="space-y-3 pb-5 border-b border-[#DADDE1] dark:border-[#2f3032]">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                Agreed Deliverables ({deliverables.length})
              </h3>
              {isCreator && ['in_progress', 'confirmed'].includes(booking.status) && (
                <Button
                  size="sm"
                  onClick={() => setIsSubmitModalOpen(true)}
                  className="h-7 text-xs bg-[#9747FF] hover:bg-[#8534f0] text-white rounded-lg shadow-2xs"
                >
                  <UploadCloud className="w-3.5 h-3.5 mr-1" />
                  Submit Deliverables
                </Button>
              )}
            </div>

            <div className="space-y-2">
              {deliverables.map((del) => (
                <div
                  key={del.id}
                  className="p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-[#DADDE1] dark:border-[#2f3032] flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <Package className="w-4 h-4 text-[#9747FF] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                        {del.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Format: <span className="font-medium text-gray-700 dark:text-gray-300">{del.format}</span>
                      </p>
                      {del.description && (
                        <p className="text-xs text-gray-400 mt-0.5">{del.description}</p>
                      )}
                    </div>
                  </div>

                  <span
                    className={cn(
                      'text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 uppercase',
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
          </div>

          {/* Reference Files & Moodboards Gallery */}
          {referenceImages.length > 0 && (
            <div className="space-y-3 pb-5 border-b border-[#DADDE1] dark:border-[#2f3032]">
              <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                Reference Files &amp; Moodboards ({referenceImages.length})
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
                      <Eye className="w-5 h-5" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submissions & Deliverables History */}
          <div className="space-y-4 pb-5 border-b border-[#DADDE1] dark:border-[#2f3032]">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                Submissions &amp; Work Packages ({submissions.length})
              </h3>
              {isCreator && ['in_progress', 'confirmed', 'delivered'].includes(booking.status) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsSubmitModalOpen(true)}
                  className="h-7 text-xs rounded-lg border-[#DADDE1] dark:border-[#2f3032] text-[#9747FF]"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  New Submission
                </Button>
              )}
            </div>

            {submissions.length > 0 ? (
              <div className="space-y-3">
                {submissions.map((sub, idx) => (
                  <div
                    key={sub.id || idx}
                    className="p-4 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-[#DADDE1] dark:border-[#2f3032] space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/50 text-[#9747FF]">
                          Version {sub.version || idx + 1}
                        </span>
                        <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">
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
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-semibold text-gray-500 uppercase">Attached Files:</span>
                        <div className="flex flex-wrap gap-2">
                          {sub.files.map((file, fIdx) => (
                            <a
                              key={fIdx}
                              href={getImageUrl(file)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-[#DADDE1] dark:border-[#2f3032] text-xs font-medium text-gray-800 dark:text-gray-200 hover:text-[#9747FF] transition-colors"
                            >
                              <Download className="w-3.5 h-3.5 text-[#9747FF]" />
                              <span>Deliverable File #{fIdx + 1}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* External Links */}
                    {sub.links && sub.links.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-semibold text-gray-500 uppercase">External Links:</span>
                        <div className="flex flex-wrap gap-2">
                          {sub.links.map((link, lIdx) => (
                            <a
                              key={lIdx}
                              href={link}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-xs font-semibold text-[#9747FF] hover:underline"
                            >
                              <span>{link.replace(/^https?:\/\//, '').split('/')[0]}</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center border border-dashed border-[#DADDE1] dark:border-[#2f3032] rounded-xl text-gray-400 space-y-1">
                <FileText className="w-8 h-8 mx-auto stroke-1" />
                <p className="text-xs font-medium">No work packages submitted yet.</p>
                <p className="text-[11px]">When the creator delivers milestones or finals, they will appear here.</p>
              </div>
            )}
          </div>

          {/* Completed Review Card */}
          {booking.status === 'completed' && booking.review && (
            <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
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
            Contextual Project Summary: Counterparts, Escrow & Timeline
           ========================================================================= */}
        <aside className="hidden lg:flex flex-col gap-6 lg:col-span-3 sticky top-20">
          
          {/* Client & Creator Profile Strip */}
          <div className="p-4 rounded-2xl bg-gray-50/70 dark:bg-white/[0.02] border border-[#DADDE1] dark:border-[#2f3032] space-y-4">
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

          {/* Financial Summary */}
          <div className="p-4 rounded-2xl bg-gray-50/70 dark:bg-white/[0.02] border border-[#DADDE1] dark:border-[#2f3032] space-y-3 text-xs">
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

              <div className="pt-2 text-[11px] text-gray-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#9747FF]" />
                <span>Escrow Protected (Preview Mode)</span>
              </div>
            </div>
          </div>

          {/* Timeline Summary */}
          <div className="p-4 rounded-2xl bg-gray-50/70 dark:bg-white/[0.02] border border-[#DADDE1] dark:border-[#2f3032] space-y-2 text-xs">
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
          MODALS: Submission, Revision, Approval & Rating, Counter, Lightbox
         ========================================================================= */}

      {/* Creator Submit Deliverables Modal */}
      <Dialog open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
        <DialogContent className="max-w-lg rounded-2xl bg-white dark:bg-[#18191a] border border-[#DADDE1] dark:border-[#2f3032] p-5">
          <DialogHeader>
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
                  className="text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-purple-50 file:text-[#9747FF] hover:file:bg-purple-100"
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
                className="rounded-xl border-[#DADDE1] dark:border-[#2f3032] text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmitWork}
                disabled={isSubmittingWork}
                className="bg-[#9747FF] hover:bg-[#8534f0] text-white text-xs font-semibold rounded-xl"
              >
                {isSubmittingWork ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                Submit Work Package
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Client Request Revision Modal */}
      <Dialog open={isRevisionModalOpen} onOpenChange={setIsRevisionModalOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-[#18191a] border border-[#DADDE1] dark:border-[#2f3032] p-5">
          <DialogHeader>
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
                className="rounded-xl border-[#DADDE1] dark:border-[#2f3032] text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleRequestRevision}
                disabled={isSubmittingRevision}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl"
              >
                {isSubmittingRevision ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <RotateCcw className="w-3.5 h-3.5 mr-1" />}
                Send Revision Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Client Approval & Rating Modal */}
      <Dialog open={isApprovalModalOpen} onOpenChange={setIsApprovalModalOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-[#18191a] border border-[#DADDE1] dark:border-[#2f3032] p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900 dark:text-gray-100">
              Approve Deliverables &amp; Complete Project
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Confirm your satisfaction with the deliverables and rate your experience with {booking.creator.name}.
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
                className="rounded-xl border-[#DADDE1] dark:border-[#2f3032] text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleApproveProject}
                disabled={isSubmittingApproval}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl"
              >
                {isSubmittingApproval ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                Confirm &amp; Complete Project
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Counter Proposal Modal */}
      <Dialog open={isCounterModalOpen} onOpenChange={setIsCounterModalOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-[#18191a] border border-[#DADDE1] dark:border-[#2f3032] p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900 dark:text-gray-100">
              Send Counter Offer
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Propose revised budget terms for this project.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                Counter Budget (USDC)
              </label>
              <Input
                type="number"
                min="1"
                value={counterAmount}
                onChange={(e) => setCounterAmount(e.target.value)}
                className="h-10 text-sm rounded-xl border-[#DADDE1] dark:border-[#2f3032] dark:bg-[#121212] focus-visible:ring-[#9747FF]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#DADDE1] dark:border-[#2f3032]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCounterModalOpen(false)}
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

      {/* Lightbox Preview Modal */}
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
