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
  type: 'deposit' | 'withdrawal' | 'payment' | 'earning';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  description: string;
  createdAt: string;
}

export interface Project {
  id: string;
  clientId: string;
  title: string;
  description: string;
  category: string;
  budget: {
    min: number;
    max: number;
  };
  status: 'open' | 'in_progress' | 'completed';
  createdAt: string;
  proposals: Proposal[];
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

export interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
  creatorCount: number;
}
