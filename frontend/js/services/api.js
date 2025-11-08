/**
 * API Service Layer
 * Handles all HTTP requests to the backend API
 */

import { API_BASE_URL, API_ENDPOINTS } from '../config.js';

class ApiService {
    constructor() {
        this.baseUrl = API_BASE_URL;
        this.token = localStorage.getItem('token');
    }

    /**
     * Set authentication token
     */
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
        }
    }

    /**
     * Get authentication token
     */
    getToken() {
        return this.token || localStorage.getItem('token');
    }

    /**
     * Get headers for API requests
     */
    getHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (includeAuth && this.getToken()) {
            headers['Authorization'] = `Bearer ${this.getToken()}`;
        }

        return headers;
    }

    /**
     * Handle API response
     */
    async handleResponse(response) {
        const data = await response.json();

        if (!response.ok) {
            // Handle authentication errors
            if (response.status === 401) {
                this.setToken(null);
                window.location.href = '/';
                throw new Error('Session expired. Please login again.');
            }

            throw new Error(data.message || data.error || 'An error occurred');
        }

        return data;
    }

    /**
     * Make API request
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            ...options,
            headers: this.getHeaders(options.auth !== false)
        };

        try {
            const response = await fetch(url, config);
            return await this.handleResponse(response);
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    /**
     * GET request
     */
    async get(endpoint, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'GET'
        });
    }

    /**
     * POST request
     */
    async post(endpoint, data, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    /**
     * PUT request
     */
    async put(endpoint, data, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    /**
     * DELETE request
     */
    async delete(endpoint, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'DELETE'
        });
    }

    // ==================== Auth Endpoints ====================

    async register(userData) {
        const response = await this.post(API_ENDPOINTS.register, userData, { auth: false });
        if (response.data?.token) {
            this.setToken(response.data.token);
        }
        return response;
    }

    async login(credentials) {
        const response = await this.post(API_ENDPOINTS.login, credentials, { auth: false });
        if (response.data?.token) {
            this.setToken(response.data.token);
        }
        return response;
    }

    async logout() {
        try {
            await this.post(API_ENDPOINTS.logout);
        } finally {
            this.setToken(null);
        }
    }

    async verifyEmail(token) {
        return this.get(`${API_ENDPOINTS.verifyEmail}/${token}`, { auth: false });
    }

    async getMe() {
        return this.get(API_ENDPOINTS.me);
    }

    async updateProfile(profileData) {
        return this.put(API_ENDPOINTS.updateProfile, profileData);
    }

    async updatePassword(passwordData) {
        return this.put(API_ENDPOINTS.updatePassword, passwordData);
    }

    // ==================== Creator Endpoints ====================

    async getCreators(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        const endpoint = queryParams ? `${API_ENDPOINTS.creators}?${queryParams}` : API_ENDPOINTS.creators;
        return this.get(endpoint, { auth: false });
    }

    async getCreatorProfile(creatorId) {
        return this.get(API_ENDPOINTS.creatorProfile(creatorId), { auth: false });
    }

    // ==================== Booking Endpoints ====================

    async getBookings(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        const endpoint = queryParams ? `${API_ENDPOINTS.bookings}?${queryParams}` : API_ENDPOINTS.bookings;
        return this.get(endpoint);
    }

    async createBooking(bookingData) {
        return this.post(API_ENDPOINTS.createBooking, bookingData);
    }

    async getBookingDetails(bookingId) {
        return this.get(API_ENDPOINTS.bookingDetails(bookingId));
    }

    async completeBooking(bookingId) {
        return this.post(API_ENDPOINTS.completeBooking(bookingId));
    }

    async cancelBooking(bookingId, reason) {
        return this.post(API_ENDPOINTS.cancelBooking(bookingId), { reason });
    }

    async releasePayment(bookingId) {
        return this.post(API_ENDPOINTS.releasePayment(bookingId));
    }

    // ==================== Wallet Endpoints ====================

    async getWallet() {
        return this.get(API_ENDPOINTS.wallet);
    }

    async getTransactions(page = 1, limit = 20) {
        return this.get(`${API_ENDPOINTS.transactions}?page=${page}&limit=${limit}`);
    }

    async requestWithdrawal(withdrawalData) {
        return this.post(API_ENDPOINTS.withdraw, withdrawalData);
    }

    async getBalanceSummary() {
        return this.get(API_ENDPOINTS.balanceSummary);
    }

    // ==================== Review Endpoints ====================

    async getReviews(creatorId) {
        return this.get(`${API_ENDPOINTS.reviews}?creator=${creatorId}`, { auth: false });
    }

    async createReview(reviewData) {
        return this.post(API_ENDPOINTS.createReview, reviewData);
    }
}

// Export singleton instance
export default new ApiService();
