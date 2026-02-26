const axios = require('axios');
const bip39 = require('bip39');
const { derivePath } = require('ed25519-hd-key');
const {
    Keypair,
    Connection,
    PublicKey,
    LAMPORTS_PER_SOL,
    clusterApiUrl
} = require('@solana/web3.js');
const {
    getAssociatedTokenAddress,
    getAccount,
    TokenAccountNotFoundError
} = require('@solana/spl-token');
const tsaraConfig = require('../config/tsara');
const walletEncryptionService = require('./walletEncryption');
const constants = require('../utils/constants');

// USDC Constants
const USDC_MINT_MAINNET = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const USDC_MINT_DEVNET = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';

/**
 * Tsara Service - Stablecoin Infrastructure (Local Management)
 * Supports: Local Wallet Management, Transfers, Balance Checks
 * Derived from tsara.node project pattern.
 */
class TsaraService {
    constructor() {
        // this.apiUrl = tsaraConfig.apiUrl; // Removed
        // this.secretKey = tsaraConfig.secretKey; // Removed

        const cluster = process.env.SOLANA_CLUSTER || 'mainnet-beta';
        let rpcUrl = process.env.SOLANA_RPC_URL;

        if (!rpcUrl) {
            try {
                rpcUrl = clusterApiUrl(cluster);
            } catch (e) {
                console.warn('[Tsara Service] Failed to get cluster API URL, falling back to mainnet-beta default');
                rpcUrl = 'https://api.mainnet-beta.solana.com';
            }
        }

        this.connection = new Connection(rpcUrl, 'confirmed');

        this.usdcMint = new PublicKey(constants.TOKENS?.USDC?.MINT || USDC_MINT_MAINNET);

        this.api = axios.create({
            baseURL: tsaraConfig.apiUrl,
            headers: {
                'Authorization': `Bearer ${tsaraConfig.secretKey}`,
                'Content-Type': 'application/json'
            }
            // timeout: 30000 // Removed
        });

        console.log(`[Tsara Service] Initialized local management for Solana ${cluster}`);
    }

    /**
     * Create a virtual wallet locally
     * @param {string} label - Label for the wallet
     * @param {string} reference - Your unique reference
     * @param {Object} metadata - Optional metadata
     * @returns {Promise<Object>} Wallet details
     */
    async createWallet(label, reference, metadata = {}) {
        try {
            const mnemonic = bip39.generateMnemonic();
            const seed = await bip39.mnemonicToSeed(mnemonic);
            const { key } = derivePath(`m/44'/501'/0'`, seed.toString("hex"));
            const keypair = Keypair.fromSeed(key);

            const publicKey = keypair.publicKey.toBase58();
            const encryptedMnemonic = walletEncryptionService.encryptPrivateKey(mnemonic);
            const encryptedSecretKey = walletEncryptionService.encryptPrivateKey(Buffer.from(keypair.secretKey).toString("hex"));

            // Returning structure that matches original API expectations where possible
            return {
                success: true,
                data: {
                    id: reference,
                    reference,
                    label,
                    primary_address: publicKey,
                    mnemonic: encryptedMnemonic, // Saved to DB by controller
                    secretKey: encryptedSecretKey,
                    metadata
                }
            };
        } catch (error) {
            this.handleError('createWallet', error);
        }
    }

    /**
     * Get wallet balance locally via Solana RPC
     * @param {string} address - Wallet address
     * @returns {Promise<Object>} Balance details
     */
    async getBalance(address) {
        try {
            const pubKey = new PublicKey(address);

            // SOL Balance
            const solBalance = await this.connection.getBalance(pubKey);

            // USDC Balance
            let usdcBalance = '0';
            try {
                const ata = await getAssociatedTokenAddress(this.usdcMint, pubKey);
                const account = await getAccount(this.connection, ata);
                usdcBalance = (Number(account.amount) / 1e6).toString();
            } catch (e) {
                // If account not found, balance is 0
                if (e.name !== 'TokenAccountNotFoundError' && !e.message.includes('could not find account')) {
                    console.error('[Tsara Service] USDC balance check warning:', e.message);
                }
            }

            const totalBalance = parseFloat(usdcBalance);

            return {
                success: true,
                data: {
                    address: address,
                    balance: totalBalance,
                    sol_balance: solBalance / LAMPORTS_PER_SOL,
                    currency: 'USDC',
                    status: 'active'
                },
                counter: {
                    total_balance: totalBalance
                }
            };
        } catch (error) {
            this.handleError('getBalance', error);
        }
    }

    /**
     * Transfer USDC (Simplified local implementation)
     * For full implementation, would require signing with locally stored keys.
     */
    async transfer(params) {
        // This would involve loading the user's encrypted key, decrypting it,
        // and building/signing a Solana transaction.
        // For now, we return a message that this is handled via local wallet.
        console.log('[Tsara Service] Transfer requested:', params.reference);
        throw new Error('Local transfer logic pending implementation - requires private key decryption');
    }

    /**
     * Handle errors
     */
    handleError(method, error) {
        console.error(`[Tsara Service] ${method} error:`, error.message);
        throw error;
    }
}

module.exports = new TsaraService();
