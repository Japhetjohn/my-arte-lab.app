import { api } from '@/contexts/AuthContext';

export interface DeliverableRequirement {
  id: string;
  title: string;
  format?: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'submitted' | 'approved';
}

export interface WorkSubmission {
  id: string;
  version: number;
  title: string;
  description?: string;
  fileUrl?: string;
  files?: string[];
  links?: string[];
  deliverablesCovered?: string[];
  uploadedAt: string;
}

export interface RevisionRequest {
  id: string;
  requestedAt: string;
  notes: string;
  requestedBy?: string;
}

export interface BookingWorkflowItem {
  _id: string;
  bookingId: string;
  serviceTitle: string;
  serviceDescription: string;
  category: string;
  amount: number;
  currency: string;
  platformCommission?: number;
  platformFee?: number;
  creatorAmount?: number;
  status: 'pending' | 'awaiting_payment' | 'confirmed' | 'in_progress' | 'delivered' | 'completed' | 'cancelled' | 'disputed';
  paymentStatus: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  completedAt?: string;
  cancellationReason?: string;
  counterProposal?: {
    amount: number;
    creatorAmount?: number;
    platformFee?: number;
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
    isVerified?: boolean;
  };
  creator: {
    _id: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
    email?: string;
    category?: string | string[];
    isVerified?: boolean;
  };
  attachments?: string[];
  expectedDeliverables?: DeliverableRequirement[];
  deliverables?: Array<{
    title: string;
    description?: string;
    fileUrl?: string;
    links?: string[];
    uploadedAt: string;
  }>;
  submissions?: WorkSubmission[];
  revisionRequests?: RevisionRequest[];
  review?: {
    rating: number;
    comment: string;
    createdAt?: string;
  };
  metadata?: {
    notes?: string;
    [key: string]: any;
  };
}

// Local cache helper to hydrate rich workflow extensions across sessions
function getWorkflowCache(bookingId: string): Partial<BookingWorkflowItem> | null {
  try {
    const raw = localStorage.getItem(`myartelab_booking_ext_${bookingId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setWorkflowCache(bookingId: string, data: Partial<BookingWorkflowItem>) {
  try {
    const existing = getWorkflowCache(bookingId) || {};
    localStorage.setItem(
      `myartelab_booking_ext_${bookingId}`,
      JSON.stringify({ ...existing, ...data })
    );
  } catch (err) {
    console.warn('Failed to save booking workflow cache', err);
  }
}

/**
 * Merges backend booking data with local workflow extensions (deliverables list, submissions, revisions)
 */
export function mergeBookingWithWorkflow(rawBooking: any): BookingWorkflowItem {
  const id = rawBooking._id || rawBooking.id;
  const cached = id ? getWorkflowCache(id) : null;

  // Normalize client & creator names
  const client = {
    ...rawBooking.client,
    name:
      rawBooking.client?.name ||
      `${rawBooking.client?.firstName || ''} ${rawBooking.client?.lastName || ''}`.trim() ||
      'Client',
  };

  const creator = {
    ...rawBooking.creator,
    name:
      rawBooking.creator?.name ||
      `${rawBooking.creator?.firstName || ''} ${rawBooking.creator?.lastName || ''}`.trim() ||
      'Creator',
  };

  // Expected deliverables: prefer backend expectedDeliverables, then cached, then fallback
  let expectedDeliverables: DeliverableRequirement[] =
    rawBooking.expectedDeliverables && rawBooking.expectedDeliverables.length > 0
      ? rawBooking.expectedDeliverables
      : cached?.expectedDeliverables || [];

  // If no expected deliverables exist, synthesize a default one from serviceTitle
  if (expectedDeliverables.length === 0) {
    expectedDeliverables = [
      {
        id: 'del-1',
        title: rawBooking.serviceTitle || 'Project Deliverable',
        format: 'Digital assets',
        description: rawBooking.serviceDescription || 'Agreed project scope',
        status:
          rawBooking.status === 'completed'
            ? 'approved'
            : rawBooking.status === 'delivered'
            ? 'submitted'
            : rawBooking.status === 'in_progress'
            ? 'in_progress'
            : 'pending',
      },
    ];
  }

  // Submissions: normalize backend deliverables array into submissions
  const submissions: WorkSubmission[] = (cached?.submissions || []).length > 0
    ? cached!.submissions!
    : (rawBooking.deliverables || []).map((d: any, idx: number) => ({
        id: `sub-${idx + 1}`,
        version: idx + 1,
        title: d.title || `Submission #${idx + 1}`,
        description: d.description || '',
        fileUrl: d.fileUrl || '',
        files: d.fileUrl ? [d.fileUrl] : [],
        links: d.links || [],
        uploadedAt: d.uploadedAt || new Date().toISOString(),
      }));

  // Revisions
  const revisionRequests: RevisionRequest[] =
    rawBooking.revisionRequests && rawBooking.revisionRequests.length > 0
      ? rawBooking.revisionRequests
      : cached?.revisionRequests || [];

  // Reference attachments
  const attachments =
    rawBooking.attachments && rawBooking.attachments.length > 0
      ? rawBooking.attachments
      : cached?.attachments || [];

  // Counter proposal: only valid if active and has an amount
  const counterProposal =
    rawBooking.counterProposal && rawBooking.counterProposal.amount && !rawBooking.counterProposal.applied
      ? rawBooking.counterProposal
      : undefined;

  return {
    ...rawBooking,
    client,
    creator,
    expectedDeliverables,
    submissions,
    revisionRequests,
    attachments,
    counterProposal,
    review: rawBooking.review || cached?.review,
  };
}

export const bookingWorkflowService = {
  /**
   * Client funds booking into escrow from authoritative wallet
   */
  async payBooking(id: string): Promise<BookingWorkflowItem> {
    const res = await api.post(`/bookings/${id}/pay`);
    const booking = res.data?.data?.booking;
    return mergeBookingWithWorkflow(booking);
  },

  /**
   * Client accepts creator's counter proposal
   */
  async acceptCounterProposal(id: string): Promise<BookingWorkflowItem> {
    const res = await api.post(`/bookings/${id}/accept-counter`);
    const booking = res.data?.data?.booking;
    return mergeBookingWithWorkflow(booking);
  },

  /**
   * Client rejects creator's counter proposal
   */
  async rejectCounterProposal(id: string, reason?: string): Promise<BookingWorkflowItem> {
    const res = await api.post(`/bookings/${id}/reject-counter`, { reason });
    const booking = res.data?.data?.booking;
    return mergeBookingWithWorkflow(booking);
  },
  /**
   * Fetch all user bookings and merge with workflow data
   */
  async getMyBookings(): Promise<BookingWorkflowItem[]> {
    const res = await api.get('/bookings');
    const list = res.data?.data?.bookings || [];
    return list.map(mergeBookingWithWorkflow);
  },

  /**
   * Fetch single booking by ID and merge with workflow data
   */
  async getBooking(id: string): Promise<BookingWorkflowItem> {
    const res = await api.get(`/bookings/${id}`);
    const booking = res.data?.data?.booking;
    if (!booking) throw new Error('Booking not found');
    return mergeBookingWithWorkflow(booking);
  },

  /**
   * Create a new booking request with deliverables, dates, budget, and reference attachments
   */
  async createBooking(payload: {
    creatorId: string;
    serviceTitle: string;
    serviceDescription: string;
    category: string;
    amount: number;
    currency?: string;
    startDate?: string;
    endDate?: string;
    expectedDeliverables?: Array<{
      title: string;
      format?: string;
      description?: string;
    }>;
    attachments?: string[];
    metadata?: Record<string, any>;
  }): Promise<BookingWorkflowItem> {
    const formattedDeliverables = (payload.expectedDeliverables || []).map((item, i) => ({
      id: `del-${Date.now()}-${i}`,
      title: item.title,
      format: item.format || 'Digital Asset',
      description: item.description || '',
      status: 'pending' as const,
    }));

    const res = await api.post('/bookings', {
      creatorId: payload.creatorId,
      serviceTitle: payload.serviceTitle,
      serviceDescription: payload.serviceDescription,
      category: payload.category,
      amount: payload.amount,
      currency: payload.currency || 'USDC',
      startDate: payload.startDate || new Date().toISOString(),
      endDate: payload.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      attachments: payload.attachments || [],
      expectedDeliverables: formattedDeliverables,
      metadata: payload.metadata || {},
    });

    const booking = res.data?.data?.booking;
    if (booking?._id) {
      setWorkflowCache(booking._id, {
        expectedDeliverables: formattedDeliverables,
        attachments: payload.attachments || [],
        metadata: payload.metadata || {},
      });
    }

    return mergeBookingWithWorkflow(booking);
  },

  /**
   * Creator accepts booking request
   */
  async acceptBooking(id: string): Promise<BookingWorkflowItem> {
    const res = await api.post(`/bookings/${id}/accept`);
    const booking = res.data?.data?.booking;
    return mergeBookingWithWorkflow(booking);
  },

  /**
   * Move project directly to In Progress (Dev preview / ready for work)
   */
  async startWork(id: string): Promise<BookingWorkflowItem> {
    try {
      const res = await api.post(`/bookings/${id}/start-work`);
      const booking = res.data?.data?.booking;
      return mergeBookingWithWorkflow(booking);
    } catch {
      // Fallback local update if offline
      setWorkflowCache(id, { status: 'in_progress' } as any);
      return this.getBooking(id);
    }
  },

  /**
   * Creator submits deliverables / work package
   */
  async submitDeliverables(
    id: string,
    submission: {
      title: string;
      description: string;
      fileUrl?: string;
      files?: string[];
      links?: string[];
      deliverablesCovered?: string[];
    }
  ): Promise<BookingWorkflowItem> {
    // Send to backend submit deliverable endpoint
    const res = await api.post(`/bookings/${id}/submit`, {
      title: submission.title,
      description: submission.description,
      fileUrl: submission.fileUrl || (submission.files && submission.files[0]) || '',
      links: submission.links || [],
    });

    const currentCache = getWorkflowCache(id) || {};
    const existingSubmissions = currentCache.submissions || [];
    const newVersion = existingSubmissions.length + 1;

    const newSubmissionItem: WorkSubmission = {
      id: `sub-${Date.now()}`,
      version: newVersion,
      title: submission.title,
      description: submission.description,
      fileUrl: submission.fileUrl,
      files: submission.files || (submission.fileUrl ? [submission.fileUrl] : []),
      links: submission.links || [],
      deliverablesCovered: submission.deliverablesCovered || [],
      uploadedAt: new Date().toISOString(),
    };

    // Update deliverable requirement statuses to submitted
    const updatedDeliverables = (currentCache.expectedDeliverables || []).map((del) => {
      if (
        !submission.deliverablesCovered ||
        submission.deliverablesCovered.length === 0 ||
        submission.deliverablesCovered.includes(del.id)
      ) {
        return { ...del, status: 'submitted' as const };
      }
      return del;
    });

    setWorkflowCache(id, {
      submissions: [...existingSubmissions, newSubmissionItem],
      expectedDeliverables: updatedDeliverables,
    });

    const booking = res.data?.data?.booking || (await api.get(`/bookings/${id}`)).data?.data?.booking;
    return mergeBookingWithWorkflow(booking);
  },

  /**
   * Client requests a revision
   */
  async requestRevision(id: string, notes: string): Promise<BookingWorkflowItem> {
    try {
      const res = await api.post(`/bookings/${id}/request-revision`, { notes });
      const currentCache = getWorkflowCache(id) || {};
      const revisions = currentCache.revisionRequests || [];
      const newRev: RevisionRequest = {
        id: `rev-${Date.now()}`,
        requestedAt: new Date().toISOString(),
        notes,
      };

      setWorkflowCache(id, {
        revisionRequests: [...revisions, newRev],
      });

      const booking = res.data?.data?.booking || (await api.get(`/bookings/${id}`)).data?.data?.booking;
      return mergeBookingWithWorkflow(booking);
    } catch {
      // Fallback if backend route had issue
      const currentCache = getWorkflowCache(id) || {};
      const revisions = currentCache.revisionRequests || [];
      const newRev: RevisionRequest = {
        id: `rev-${Date.now()}`,
        requestedAt: new Date().toISOString(),
        notes,
      };
      setWorkflowCache(id, {
        revisionRequests: [...revisions, newRev],
        status: 'in_progress' as any,
      });
      return this.getBooking(id);
    }
  },

  /**
   * Client approves deliverables and completes project with rating & review
   */
  async approveAndComplete(
    id: string,
    review?: { rating: number; comment: string }
  ): Promise<BookingWorkflowItem> {
    try {
      const res = await api.post(`/bookings/${id}/approve`, review || {});
      const booking = res.data?.data?.booking;

      const currentCache = getWorkflowCache(id) || {};
      const updatedDeliverables = (currentCache.expectedDeliverables || []).map((del) => ({
        ...del,
        status: 'approved' as const,
      }));

      setWorkflowCache(id, {
        expectedDeliverables: updatedDeliverables,
        review: review ? { ...review, createdAt: new Date().toISOString() } : undefined,
      });

      return mergeBookingWithWorkflow(booking);
    } catch {
      // Fallback
      setWorkflowCache(id, {
        status: 'completed' as any,
        review: review ? { ...review, createdAt: new Date().toISOString() } : undefined,
      });
      return this.getBooking(id);
    }
  },

  /**
   * Creator sends counter proposal
   */
  async counterProposal(id: string, amount: number): Promise<BookingWorkflowItem> {
    const res = await api.post(`/bookings/${id}/counter-proposal`, { amount });
    const booking = res.data?.data?.booking;
    return mergeBookingWithWorkflow(booking);
  },

  /**
   * Creator rejects booking request
   */
  async rejectBooking(id: string, reason: string): Promise<BookingWorkflowItem> {
    const res = await api.post(`/bookings/${id}/reject`, { reason });
    const booking = res.data?.data?.booking;
    return mergeBookingWithWorkflow(booking);
  },

  /**
   * Cancel booking
   */
  async cancelBooking(id: string, reason: string): Promise<BookingWorkflowItem> {
    const res = await api.post(`/bookings/${id}/cancel`, { reason });
    const booking = res.data?.data?.booking;
    return mergeBookingWithWorkflow(booking);
  },
};
