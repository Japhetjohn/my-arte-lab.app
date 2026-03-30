import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// User API
export const userService = {
  getCurrentUser: async () => {
    const response = await api.get('/auth/current-user');
    return response.data;
  },
  updateProfile: async (data: any) => {
    const response = await api.put('/auth/profile', data);
    return response.data;
  },
};

// Creators API
export const creatorService = {
  getCreators: async (params?: any) => {
    const response = await api.get('/creators', { params });
    return response.data;
  },
  getCreatorById: async (id: string) => {
    const response = await api.get(`/creators/${id}`);
    return response.data;
  },
};

// Bookings API
export const bookingService = {
  getBookings: async () => {
    const response = await api.get('/bookings');
    return response.data;
  },
  createBooking: async (data: any) => {
    const response = await api.post('/bookings', data);
    return response.data;
  },
};

// Wallet API
export const walletService = {
  getWallet: async () => {
    const response = await api.get('/wallet/balance');
    return response.data;
  },
  getTransactions: async () => {
    const response = await api.get('/wallet/transactions');
    return response.data;
  },
};

// Notifications API
export const notificationService = {
  getNotifications: async () => {
    const response = await api.get('/notifications');
    return response.data;
  },
  markAsRead: async (id: string) => {
    const response = await api.put(`/notifications/${id}/read`);
    return response.data;
  },
};

export default api;
