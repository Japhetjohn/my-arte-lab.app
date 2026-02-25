const axios = require('axios');
const tsaraConfig = require('../config/tsara');

/**
 * Tsara Service - Stablecoin Infrastructure
 * Supports: Wallet Management, Transfers, Balance Checks, Webhooks
 * API Documentation: https://usetsara.readme.io/reference/introduction
 */
class TsaraService {
    constructor() {
        this.apiUrl = tsaraConfig.apiUrl;
        this.secretKey = tsaraConfig.secretKey;

        // Ensure apiUrl ends with /
        const baseURL = this.apiUrl.endsWith('/') ? this.apiUrl : `${this.apiUrl}/`;

        this.api = axios.create({
            baseURL,
            headers: tsaraConfig.getHeaders(),
            timeout: 30000
        });

        console.log(`[Tsara Service] Initialized with baseURL: ${baseURL}`);
    }

    /**
     * Create a virtual wallet for a user
     * @param {string} label - Label for the wallet (e.g., user name)
     * @param {string} reference - Your unique reference for the wallet
     * @param {Object} metadata - Optional metadata
     * @returns {Promise<Object>} Wallet details
     */
    async createWallet(label, reference, metadata = {}) {
        try {
            const payload = {
                type: 'stablecoin',
                network: 'solana',
                asset: 'USDC',
                label,
                reference,
                metadata
            };

            const response = await this.api.post('wallets', payload);
            return response.data;
        } catch (error) {
            this.handleError('createWallet', error);
        }
    }

    /**
     * Retrieve wallet details by reference or ID
     * @param {string} reference - Wallet reference
     * @param {string} id - Wallet ID
     * @returns {Promise<Object>} Wallet details
     */
    async getWallet({ reference, id }) {
        try {
            const params = {};
            if (reference) params.reference = reference;
            if (id) params.id = id;

            const response = await this.api.get('wallets', { params });
            return response.data;
        } catch (error) {
            this.handleError('getWallet', error);
        }
    }

    /**
     * Get wallet balance
     * @param {string} reference - Wallet reference
     * @returns {Promise<Object>} Balance details
     */
    async getBalance(reference) {
        try {
            const response = await this.api.get('wallets/balance', {
                params: { reference }
            });
            return response.data;
        } catch (error) {
            this.handleError('getBalance', error);
        }
    }

    /**
     * Transfer USDC
     * @param {Object} params - Transfer parameters
     * @returns {Promise<Object>} Transfer details
     */
    async transfer({ from_address, to_address, amount, reference, memo, metadata = {} }) {
        try {
            const payload = {
                from_address,
                to_address,
                amount: Number(amount),
                network: 'Solana', // Docs show capitalized 'Solana' for transfers
                asset: 'USDC',
                reference,
                memo,
                metadata
            };

            const response = await this.api.post('wallets/transfer', payload);
            return response.data;
        } catch (error) {
            this.handleError('transfer', error);
        }
    }

    /**
     * List transfers
     * @param {Object} filters - Query filters
     * @returns {Promise<Object>} Paginated transfers
     */
    async listTransfers(filters = {}) {
        try {
            const response = await this.api.get('wallets/transfers', { params: filters });
            return response.data;
        } catch (error) {
            this.handleError('listTransfers', error);
        }
    }

    /**
     * Handle API errors
     */
    handleError(method, error) {
        const status = error.response?.status;
        const data = error.response?.data;

        console.error(`[Tsara Service] ${method} failed:`, {
            status,
            message: error.message,
            data: data ? JSON.stringify(data) : 'No detail'
        });

        if (data && data.error) {
            throw new Error(data.error.message || `Tsara API error: ${data.error.code}`);
        }

        throw new Error(error.message || `Tsara API internal error during ${method}`);
    }
}

module.exports = new TsaraService();
