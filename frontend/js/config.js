// Application Configuration
// Last Updated: 2025-11-09 - Fixed localhost API detection

// Debug: Check hostname detection
console.log('🌐 window.location.hostname:', window.location.hostname);
console.log('🔍 Is localhost?', window.location.hostname === 'localhost');
console.log('🔍 Is 127.0.0.1?', window.location.hostname === '127.0.0.1');
console.log('🔍 Starts with 192.168?', window.location.hostname.startsWith('192.168'));

// API Configuration - FORCE localhost for development
const isDevelopment = window.location.hostname === 'localhost' ||
                      window.location.hostname === '127.0.0.1' ||
                      window.location.hostname.startsWith('192.168') ||
                      window.location.hostname === '0.0.0.0';

export const API_BASE_URL = isDevelopment
    ? 'http://localhost:5000/api'
    : 'https://api.myartelab.com/api';

// Debug: Log API URL on load
console.log('🔗 API Base URL:', API_BASE_URL);
console.log('🔗 Backend should be at:', 'http://localhost:5000');

export const API_ENDPOINTS = {
    // Auth
    register: '/auth/register',
    login: '/auth/login',
    logout: '/auth/logout',
    verifyEmail: '/auth/verify-email',
    me: '/auth/me',

    // Creators
    creators: '/creators',
    creatorProfile: (id) => `/creators/${id}`,

    // Bookings
    bookings: '/bookings',
    createBooking: '/bookings',
    bookingDetails: (id) => `/bookings/${id}`,
    acceptBooking: (id) => `/bookings/${id}/accept`,
    completeBooking: (id) => `/bookings/${id}/complete`,
    cancelBooking: (id) => `/bookings/${id}/cancel`,
    releasePayment: (id) => `/bookings/${id}/release-funds`,

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
    updatePassword: '/auth/update-password'
};
