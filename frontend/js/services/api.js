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

    // ==================== Upload Endpoints ====================

    /**
     * Upload file (generic method for FormData)
     */
    async uploadFile(endpoint, file, additionalData = {}) {
        const formData = new FormData();
        formData.append('file', file);

        // Add any additional data
        Object.keys(additionalData).forEach(key => {
            formData.append(key, additionalData[key]);
        });

        const url = `${this.baseUrl}${endpoint}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.getToken()}`
                // Don't set Content-Type - browser will set it with boundary
            },
            body: formData
        });

        return await this.handleResponse(response);
    }

    /**
     * Upload avatar
     */
    async uploadAvatar(file) {
        const formData = new FormData();
        formData.append('avatar', file);

        const url = `${this.baseUrl}/upload/avatar`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.getToken()}`
            },
            body: formData
        });

        return await this.handleResponse(response);
    }

    /**
     * Upload cover image
     */
    async uploadCover(file) {
        const formData = new FormData();
        formData.append('cover', file);

        const url = `${this.baseUrl}/upload/cover`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.getToken()}`
            },
            body: formData
        });

        return await this.handleResponse(response);
    }

    /**
     * Upload portfolio image
     */
    async uploadPortfolio(file, title, description) {
        const formData = new FormData();
        formData.append('portfolio', file);
        if (title) formData.append('title', title);
        if (description) formData.append('description', description);

        const url = `${this.baseUrl}/upload/portfolio`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.getToken()}`
            },
            body: formData
        });

        return await this.handleResponse(response);
    }

    /**
     * Delete portfolio image
     */
    async deletePortfolioImage(index) {
        return this.delete(`/upload/portfolio/${index}`);
    }

    // ==================== Services Endpoints ====================

    async getMyServices() {
        return this.get('/services');
    }

    async addService(serviceData) {
        return this.post('/services', serviceData);
    }

    async updateService(serviceId, serviceData) {
        return this.put(`/services/${serviceId}`, serviceData);
    }

    async deleteService(serviceId) {
        return this.delete(`/services/${serviceId}`);
    }

    async uploadServiceImage(serviceId, file) {
        const formData = new FormData();
        formData.append('image', file);

        const url = `${this.baseUrl}/services/${serviceId}/images`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.getToken()}`
            },
            body: formData
        });

        return await this.handleResponse(response);
    }

    async deleteServiceImage(serviceId, imageIndex) {
        return this.delete(`/services/${serviceId}/images/${imageIndex}`);
    }

    // ==================== Booking Messages Endpoints ====================

    async addBookingMessage(bookingId, message) {
        return this.post(`/bookings/${bookingId}/messages`, { message });
    }

    async acceptBooking(bookingId) {
        return this.post(`/bookings/${bookingId}/accept`);
    }

    async rejectBooking(bookingId, reason) {
        return this.post(`/bookings/${bookingId}/reject`, { reason });
    }

    async counterProposal(bookingId, amount) {
        return this.post(`/bookings/${bookingId}/counter-proposal`, { amount });
    }

    // ==================== Stats Endpoints ====================

    async getPlatformStats() {
        return this.get('/stats/platform', { auth: false });
    }

    async getFeaturedCreators(limit = 8) {
        return this.get(`/stats/featured-creators?limit=${limit}`, { auth: false });
    }

    // ==================== Favorites Endpoints ====================

    async getFavorites() {
        return this.get('/favorites');
    }

    async addToFavorites(creatorId) {
        return this.post(`/favorites/${creatorId}`);
    }

    async removeFromFavorites(creatorId) {
        return this.delete(`/favorites/${creatorId}`);
    }

    async isFavorited(creatorId) {
        return this.get(`/favorites/${creatorId}/status`);
    }
}

// Export singleton instance
export default new ApiService();
