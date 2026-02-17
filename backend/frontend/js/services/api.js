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
     * Set user data in localStorage
     */
    setUserData(user) {
        if (user) {
            localStorage.setItem('userData', JSON.stringify(user));
        } else {
            localStorage.removeItem('userData');
        }
    }

    /**
     * Get user data from localStorage
     */
    getUserData() {
        const userData = localStorage.getItem('userData');
        return userData ? JSON.parse(userData) : null;
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
            if (response.status === 401) {
                this.setToken(null);
                this.setUserData(null);
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
            const result = await this.handleResponse(response);
            return result;
        } catch (error) {
            console.error('API request failed:', error.message);
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
    async delete(endpoint, data, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'DELETE',
            body: data ? JSON.stringify(data) : undefined
        });
    }


    async register(userData) {
        const response = await this.post(API_ENDPOINTS.register, userData, { auth: false });
        if (response.data?.token) {
            this.setToken(response.data.token);
        }
        if (response.data?.user) {
            this.setUserData(response.data.user);
        }
        return response;
    }

    async login(credentials) {
        const response = await this.post(API_ENDPOINTS.login, credentials, { auth: false });
        if (response.data?.token) {
            this.setToken(response.data.token);
        }
        if (response.data?.user) {
            this.setUserData(response.data.user);
        }
        return response;
    }

    async logout() {
        try {
            await this.post(API_ENDPOINTS.logout);
        } finally {
            this.setToken(null);
            this.setUserData(null);
        }
    }

    async verifyEmail(code) {
        return this.post(API_ENDPOINTS.verifyEmail, { code }, { auth: false });
    }

    async resendVerification() {
        return this.post(API_ENDPOINTS.resendVerification);
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

    async deleteAccount(password) {
        const result = await this.delete(API_ENDPOINTS.deleteAccount, { password });
        return result;
    }


    async getCreators(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        const endpoint = queryParams ? `${API_ENDPOINTS.creators}?${queryParams}` : API_ENDPOINTS.creators;
        return this.get(endpoint, { auth: false });
    }

    async getCreatorProfile(creatorId) {
        return this.get(API_ENDPOINTS.creatorProfile(creatorId), { auth: false });
    }


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


    // ==========================================
    // HOSTFI INTEGRATION
    // ==========================================

    async getHostfiSupportedCurrencies() {
        return this.get('/hostfi/currencies/supported');
    }

    async getHostfiBanks(countryCode) {
        return this.get(`/hostfi/banks/${countryCode}`);
    }

    async verifyHostfiBankAccount(data) {
        return this.post('/hostfi/withdrawal/verify-account', data);
    }

    async initiateHostfiWithdrawal(withdrawalData) {
        return this.post('/hostfi/withdrawal/initiate', withdrawalData);
    }

    async getHostfiWithdrawalStatus(reference) {
        return this.get(`/hostfi/withdrawal/status/${reference}`);
    }

    async createHostfiFiatChannel(data) {
        return this.post('/hostfi/collections/fiat/channel', data);
    }

    async getHostfiFiatChannels() {
        return this.get('/hostfi/collections/fiat/channels');
    }

    async createHostfiCryptoAddress(data) {
        return this.post('/hostfi/collections/crypto/address', data);
    }

    async getHostfiCryptoAddresses() {
        return this.get('/hostfi/collections/crypto/addresses');
    }

    async swapAssets(data) {
        return this.post('/hostfi/assets/swap', data);
    }

    /*
    async getHostfiExchangeRates(fromCurrency, toCurrency) {
        return this.get(`/hostfi/rates/exchange?from=${fromCurrency}&to=${toCurrency}`);
    }

    async getHostfiExchangeFees(fromCurrency, toCurrency) {
        return this.get(`/hostfi/fees/exchange?from=${fromCurrency}&to=${toCurrency}`);
    }

    async swapAssets(data) {
        return this.post('/hostfi/assets/swap', data);
    }
    */

    async getHostfiWallet() {
        return this.get('/hostfi/wallet');
    }

    async getHostfiTransactions(page = 1, limit = 10) {
        return this.get(`/hostfi/wallet/transactions?page=${page}&limit=${limit}`);
    }

    async getReviews(creatorId) {
        return this.get(`${API_ENDPOINTS.reviews}?creator=${creatorId}`, { auth: false });
    }

    async createReview(reviewData) {
        return this.post(API_ENDPOINTS.createReview, reviewData);
    }


    /**
     * Upload file (generic method for FormData)
     */
    async uploadFile(endpoint, file, additionalData = {}) {
        const formData = new FormData();
        formData.append('file', file);

        Object.keys(additionalData).forEach(key => {
            formData.append(key, additionalData[key]);
        });

        const url = `${this.baseUrl}${endpoint}`;
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

    async payBooking(bookingId) {
        return this.post(`/bookings/${bookingId}/pay`);
    }

    async submitBookingDeliverable(bookingId, deliverableData) {
        return this.post(`/bookings/${bookingId}/submit`, deliverableData);
    }


    async getPlatformStats() {
        return this.get('/stats/platform', { auth: false });
    }

    async getFeaturedCreators(limit = 8) {
        return this.get(`/stats/featured-creators?limit=${limit}`, { auth: false });
    }


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


    async getNotifications(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        const endpoint = queryParams ? `/notifications?${queryParams}` : '/notifications';
        return this.get(endpoint);
    }

    async getUnreadNotificationCount() {
        return this.get('/notifications/unread-count');
    }

    async markNotificationAsRead(notificationId) {
        return this.request(`/notifications/${notificationId}/read`, { method: 'PATCH' });
    }

    async markAllNotificationsAsRead() {
        return this.request('/notifications/mark-all-read', { method: 'PATCH' });
    }

    async deleteNotification(notificationId) {
        return this.delete(`/notifications/${notificationId}`);
    }

    async deleteAllReadNotifications() {
        return this.delete('/notifications/read/all');
    }

    // Projects API
    async getProjects(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        const endpoint = queryParams ? `/projects?${queryParams}` : '/projects';
        return this.get(endpoint);
    }

    async getProject(projectId) {
        return this.get(`/projects/${projectId}`);
    }

    async createProject(projectData) {
        return this.post('/projects', projectData);
    }

    async updateProject(projectId, updates) {
        return this.request(`/projects/${projectId}`, {
            method: 'PATCH',
            body: JSON.stringify(updates)
        });
    }

    async getMyPostedProjects() {
        return this.get('/projects/my/posted');
    }

    async getMyProjects() {
        // Get both posted projects and accepted applications
        return this.get('/projects/my/posted');
    }

    async getProjectApplications(projectId) {
        return this.get(`/projects/${projectId}/applications`);
    }

    // Applications API
    async applyToProject(projectId, applicationData) {
        return this.post(`/projects/${projectId}/apply`, applicationData);
    }

    async getMyApplications() {
        return this.get('/projects/my/applications');
    }

    async updateApplicationStatus(applicationId, status, reviewNotes = '') {
        return this.request(`/projects/applications/${applicationId}`, {
            method: 'PATCH',
            body: JSON.stringify({ status, reviewNotes })
        });
    }

    async payProject(projectId) {
        return this.post(`/projects/${projectId}/pay`);
    }

    async submitProjectDeliverable(projectId, deliverableData) {
        return this.post(`/projects/${projectId}/submit`, deliverableData);
    }

    async releaseProjectFunds(projectId) {
        return this.post(`/projects/${projectId}/release-funds`);
    }

    async addProjectMessage(projectId, message) {
        return this.post(`/projects/${projectId}/messages`, { message });
    }
}

export default new ApiService();
