export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name?: string; // computed getter
  avatar?: string;
  coverImage?: string;
  role: 'client' | 'creator' | 'admin';
  isEmailVerified: boolean;
  isVerified?: boolean;
  location?: {
    localArea?: string;
    state?: string;
    country?: string;
  };
  category?: string;
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
  category: string;
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

export interface Transaction {
  id: string;
  _id?: string;
  type: 'deposit' | 'withdrawal' | 'payment' | 'earning' | 'refund';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  description: string;
  createdAt: string;
  updatedAt?: string;
  metadata?: Record<string, any>;
}

export interface Project {
  id: string;
  clientId: string | {
    _id: string;
    firstName: string;
    lastName: string;
    name?: string;
    avatar?: string;
    email?: string;
  };
  title: string;
  description: string;
  category: string;
  budget: {
    min: number;
    max: number;
  };
  status: 'open' | 'in_progress' | 'completed' | 'awaiting_payment' | 'delivered';
  createdAt: string;
  applicationsCount?: number;
  selectedCreatorId?: string | {
    _id: string;
    firstName: string;
    lastName: string;
    name?: string;
    avatar?: string;
    category?: string;
  };
  proposals?: Proposal[];
}

export interface Proposal {
  id: string;
  projectId: string;
  creatorId: string;
  creator: Creator;
  message: string;
  price: number;
  timeline: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface Application {
  id: string;
  _id?: string;
  projectId: string | Project;
  creatorId: string | {
    _id: string;
    firstName: string;
    lastName: string;
    name?: string;
    avatar?: string;
    category?: string;
    bio?: string;
    email?: string;
  };
  coverLetter: string;
  proposedBudget: {
    amount: number;
    currency: string;
  };
  proposedTimeline: string;
  portfolioLinks?: string[];
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
  creatorCount: number;
}
