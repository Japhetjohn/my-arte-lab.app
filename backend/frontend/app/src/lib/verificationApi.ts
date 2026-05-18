import { api } from '@/contexts/AuthContext';

export interface VerificationStatus {
  isVerified: boolean;
  subscription: {
    active: boolean;
    subscribedAt?: string;
    expiresAt?: string;
    gracePeriodEndsAt?: string;
    inGracePeriod: boolean;
    autoRenew: boolean;
  };
  price: number;
  currency: string;
}

export const verificationService = {
  getStatus: async (): Promise<VerificationStatus> => {
    const response = await api.get('/verification/status');
    return response.data.data;
  },

  subscribe: async (): Promise<{ message: string; expiresAt: string; balance: number }> => {
    const response = await api.post('/verification/subscribe');
    return response.data.data;
  },

  cancel: async (): Promise<{ message: string }> => {
    const response = await api.delete('/verification/cancel');
    return response.data.data;
  },
};
