import { api } from '@/contexts/AuthContext';

// Auth Service
export const authService = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  register: (data: any) =>
    api.post('/auth/register', data),

  verifyEmail: (code: string) =>
    api.post('/auth/verify-email', { code }),

  resendVerification: () =>
    api.post('/auth/resend-verification'),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, newPassword: string) =>
    api.post('/auth/reset-password', { token, newPassword }),

  getMe: () =>
    api.get('/auth/me'),

  logout: () =>
    api.post('/auth/logout'),

  updateProfile: (data: any) =>
    api.put('/auth/profile', data),

  refreshToken: () =>
    api.post('/auth/refresh-token'),
};

// HostFi Wallet Service
export const hostfiWalletService = {
  getWallet: () =>
    api.get('/hostfi/wallet'),

  getTransactions: (params?: { page?: number; limit?: number; type?: string }) =>
    api.get('/hostfi/wallet/transactions', { params }),

  createCryptoAddress: () =>
    api.post('/hostfi/collections/crypto/address'),

  createFiatChannel: (currency: string = 'NGN') =>
    api.post('/hostfi/collections/fiat/channel', { currency }),

  getBanks: (countryCode: string = 'NG') =>
    api.get(`/hostfi/banks/${countryCode}`),

  verifyAccount: (data: { bankId: string; accountNumber: string }) =>
    api.post('/hostfi/withdrawal/verify-account', data),

  initiateWithdrawal: (data: any) =>
    api.post('/hostfi/withdrawal/initiate', data),

  getWithdrawalStatus: (reference: string) =>
    api.get(`/hostfi/withdrawal/status/${reference}`),

  getBeneficiaries: () =>
    api.get('/hostfi/beneficiaries'),

  addBeneficiary: (data: any) =>
    api.post('/hostfi/beneficiaries', data),

  deleteBeneficiary: (id: string) =>
    api.delete(`/hostfi/beneficiaries/${id}`),
};

// Upload Service
export const uploadService = {
  uploadImage: (file: File, onProgress?: (progress: number) => void) => {
    const formData = new FormData();
    formData.append('image', file);

    return api.post('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
  },

  uploadMultiple: (files: File[], onProgress?: (progress: number) => void) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));

    return api.post('/upload/multiple', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
  },
};

// User Service
export const userService = {
  getProfile: () =>
    api.get('/users/profile'),

  updateProfile: (data: any) =>
    api.put('/users/profile', data),

  changePassword: (oldPassword: string, newPassword: string) =>
    api.put('/users/change-password', { oldPassword, newPassword }),

  getNotifications: (params?: { page?: number; limit?: number }) =>
    api.get('/users/notifications', { params }),

  markNotificationAsRead: (id: string) =>
    api.put(`/users/notifications/${id}/read`),

  markAllNotificationsAsRead: () =>
    api.put('/users/notifications/read-all'),
};

// Creator Service
export const creatorService = {
  getCreators: (params?: { page?: number; limit?: number; category?: string; search?: string }) =>
    api.get('/creators', { params }),

  getCreator: (id: string) =>
    api.get(`/creators/${id}`),

  getCreatorPortfolio: (id: string) =>
    api.get(`/creators/${id}/portfolio`),

  getCreatorReviews: (id: string, params?: { page?: number; limit?: number }) =>
    api.get(`/creators/${id}/reviews`, { params }),
};

// Booking Service
export const bookingService = {
  getBookings: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/bookings', { params }),

  getBooking: (id: string) =>
    api.get(`/bookings/${id}`),

  createBooking: (data: any) =>
    api.post('/bookings', data),

  updateBookingStatus: (id: string, status: string) =>
    api.put(`/bookings/${id}/status`, { status }),

  cancelBooking: (id: string, reason?: string) =>
    api.post(`/bookings/${id}/cancel`, { reason }),
};

// Project Service
export const projectService = {
  getProjects: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/projects', { params }),

  getProject: (id: string) =>
    api.get(`/projects/${id}`),

  createProject: (data: any) =>
    api.post('/projects', data),

  updateProject: (id: string, data: any) =>
    api.put(`/projects/${id}`, data),

  deleteProject: (id: string) =>
    api.delete(`/projects/${id}`),
};

// Message Service
export const messageService = {
  getConversations: () =>
    api.get('/messages/conversations'),

  getMessages: (conversationId: string, params?: { page?: number; limit?: number }) =>
    api.get(`/messages/conversations/${conversationId}/messages`, { params }),

  sendMessage: (conversationId: string, content: string) =>
    api.post(`/messages/conversations/${conversationId}/messages`, { content }),

  createConversation: (participantId: string) =>
    api.post('/messages/conversations', { participantId }),

  markAsRead: (conversationId: string) =>
    api.put(`/messages/conversations/${conversationId}/read`),
};

// Categories Service
export const categoryService = {
  getCategories: () =>
    api.get('/categories'),

  getCategory: (id: string) =>
    api.get(`/categories/${id}`),
};
