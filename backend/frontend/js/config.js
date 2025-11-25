// Application Configuration
// Last Updated: 2025-11-24 - Cleaned up debug logging

// API Configuration - Auto-detect environment
const isDevelopment = window.location.hostname === 'localhost' ||
                      window.location.hostname === '127.0.0.1' ||
                      window.location.hostname.startsWith('192.168') ||
                      window.location.hostname === '0.0.0.0';

// In production, API is served from the same domain
export const API_BASE_URL = isDevelopment
    ? 'http://localhost:5000/api'
    : '/api';

export const API_ENDPOINTS = {
    // Auth
    register: '/auth/register',
    login: '/auth/login',
    logout: '/auth/logout',
    verifyEmail: '/auth/verify-email',
    resendVerification: '/auth/resend-verification',
    me: '/auth/me',

    // Creators
    creators: '/creators',
    creatorProfile: (id) => `/creators/${id}`,

    // Bookings
    bookings: '/bookings',
    createBooking: '/bookings',
    bookingDetails: (id) => `/bookings/${id}`,
    completeBooking: (id) => `/bookings/${id}/complete`,
    cancelBooking: (id) => `/bookings/${id}/cancel`,
    releasePayment: (id) => `/bookings/${id}/release-payment`,

    // Wallet
    wallet: '/wallet',
    transactions: '/wallet/transactions',
    withdraw: '/wallet/withdraw',
    balanceSummary: '/wallet/balance-summary',

    // Reviews
    reviews: '/reviews',
    createReview: '/reviews',

    // Profile
    updateProfile: '/auth/update-profile',
    updatePassword: '/auth/update-password',
    deleteAccount: '/auth/delete-account'
};
