export interface User {
  id: string;
  email: string;
  username?: string;
  firstName: string;
  lastName: string;
  name?: string; // computed getter
  seoSlug?: string;
  avatar?: string;
  coverImage?: string;
  role: 'client' | 'creator' | 'admin';
  isEmailVerified: boolean;
  isVerified?: boolean;
  verificationSubscription?: {
    active: boolean;
    subscribedAt?: string;
    expiresAt?: string;
    lastRenewalAt?: string;
    autoRenew?: boolean;
  };
  location?: {
    localArea?: string;
    state?: string;
    country?: string;
  };
  category?: string | string[];
  bio?: string;
  skills?: string[];
  rating?: number;
  reviewCount?: number;
  joinedAt?: string;
  createdAt?: string;
  privacy?: {
    publicProfile: boolean;
    showActivity: boolean;
    allowMessages: boolean;
  };
}

export interface Creator extends User {
  role: 'creator';
  category: string | string[];
  skills: string[];
  portfolio: PortfolioItem[];
  startingPrice: number;
  availability: 'available' | 'busy' | 'unavailable';
}

export interface PortfolioItem {
  id: string;
  title: string;
  image: string;
  description: string;
}

export interface Booking {
  id: string;
  clientId: string;
  creatorId: string;
  creator: Creator;
  status: 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled';
  title: string;
  description: string;
  price: number;
  createdAt: string;
  updatedAt: string;
  deadline?: string;
  milestones: Milestone[];
}

export interface Milestone {
  id: string;
  title: string;
  status: 'pending' | 'completed';
  completedAt?: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  isRead: boolean;
}

export interface Conversation {
  id: string;
  participant: User;
  lastMessage: Message;
  unreadCount: number;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'booking' | 'message' | 'payment' | 'system';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  link?: string;
}

export interface Wallet {
  userId: string;
  balance: number;
  currency: string;
  transactions: Transaction[];
}

export interface TransactionTimelineEvent {
  title: string;
  description: string;
  timestamp: string;
  status: 'completed' | 'processing' | 'failed' | 'pending';
  hash?: string;
}

export interface Transaction {
  id: string;
  _id?: string;
  transactionId?: string;
  type: 'deposit' | 'withdrawal' | 'payment' | 'earning' | 'refund' | 'platform_fee' | 'escrow' | 'verification' | 'transfer_in' | 'transfer_out' | string;
  amount: number;
  fee?: number;
  netAmount?: number;
  currency: string;
  status: 'pending' | 'processing' | 'reserved' | 'completed' | 'failed' | 'cancelled' | 'reversed' | string;
  description: string;
  createdAt: string;
  updatedAt?: string;
  reference?: string;
  paymentMethod?: string;
  fromAddress?: string;
  toAddress?: string;
  transactionHash?: string;
  blockchainNetwork?: string;
  completedAt?: string;
  failedAt?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
  beneficiary?: {
    bankName?: string;
    accountNumberMasked?: string;
    accountName?: string;
  };
  destinationAmount?: number;
  destinationCurrency?: string;
  exchangeRate?: number;
  fiatAmount?: number;
  fiatCurrency?: string;
  quotedUsdcAmount?: number;
  quoteRate?: number;
  switchStatus?: string;
  failureReason?: string;
  solscanUrl?: string;
  counterparty?: {
    name?: string;
    email?: string;
    note?: string;
  };
  timeline?: TransactionTimelineEvent[];
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
  creatorCount: number;
}

export interface ProjectApplication {
  _id: string;
  projectId: string | Project;
  creatorId: {
    _id: string;
    id?: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
    category?: string | string[];
    isVerified?: boolean;
    rating?: number;
    email?: string;
  };
  coverLetter: string;
  proposedBudget: {
    amount: number;
    currency: string;
  };
  proposedTimeline: string;
  portfolioLinks?: Array<{
    url: string;
    title?: string;
  }>;
  attachments?: Array<{
    url: string;
    filename?: string;
    uploadedAt?: string;
  }>;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  reviewedAt?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Project {
  _id: string;
  title: string;
  description: string;
  category: string;
  budget: {
    min: number;
    max: number;
    currency: string;
    negotiable?: boolean;
  };
  timeline: string;
  deadline?: string;
  skillsRequired?: string[];
  deliverables?: string[];
  projectType?: 'one-time' | 'ongoing' | 'contract';
  coverImage?: string;
  clientId: {
    _id: string;
    id?: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    avatar?: string;
    email?: string;
  };
  selectedCreatorId?: {
    _id: string;
    id?: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    avatar?: string;
    category?: string | string[];
  };
  status: 'open' | 'in_review' | 'awaiting_payment' | 'in_progress' | 'delivered' | 'completed' | 'cancelled';
  paymentStatus: 'unpaid' | 'paid' | 'escrow' | 'released' | 'refunded';
  acceptedAmount?: number;
  platformCommission?: number;
  platformFee?: number;
  creatorAmount?: number;
  views?: number;
  applicantCount?: number;
  attachments?: Array<{
    url: string;
    filename?: string;
    uploadedAt?: string;
  }>;
  createdAt: string;
  updatedAt?: string;
}

