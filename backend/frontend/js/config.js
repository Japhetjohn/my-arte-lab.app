
const isDevelopment = window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.startsWith('192.168') ||
    window.location.hostname === '0.0.0.0';

export const API_BASE_URL = isDevelopment
    ? 'http://localhost:5000/api'
    : '/api';

export const API_ENDPOINTS = {
    register: '/auth/register',
    login: '/auth/login',
    logout: '/auth/logout',
    verifyEmail: '/auth/verify-email',
    resendVerification: '/auth/resend-verification',
    me: '/auth/me',

    creators: '/creators',
    creatorProfile: (id) => `/creators/${id}`,

    bookings: '/bookings',
    createBooking: '/bookings',
    bookingDetails: (id) => `/bookings/${id}`,
    completeBooking: (id) => `/bookings/${id}/complete`,
    cancelBooking: (id) => `/bookings/${id}/cancel`,
    releasePayment: (id) => `/bookings/${id}/release-payment`,

    wallet: '/wallet',
    transactions: '/wallet/transactions',
    withdraw: '/wallet/withdraw',
    balanceSummary: '/wallet/balance-summary',

    reviews: '/reviews',
    createReview: '/reviews',

    updateProfile: '/auth/update-profile',
    updatePassword: '/auth/update-password',
    deleteAccount: '/auth/delete-account'
};
