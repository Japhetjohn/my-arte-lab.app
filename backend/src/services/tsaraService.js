const axios = require('axios');
const bip39 = require('bip39');
const { derivePath } = require('ed25519-hd-key');
const {
    Keypair,
    Connection,
    PublicKey,
    SystemProgram,
    TransactionMessage,
    VersionedTransaction,
    LAMPORTS_PER_SOL,
    clusterApiUrl
} = require('@solana/web3.js');
const {
    getAssociatedTokenAddress,
    getAccount,
    TokenAccountNotFoundError,
    getOrCreateAssociatedTokenAccount,
    createTransferInstruction
} = require('@solana/spl-token');
const tsaraConfig = require('../config/tsara');
const walletEncryptionService = require('./walletEncryption');
const constants = require('../utils/constants');

// USDC Constants
const USDC_MINT_MAINNET = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const USDC_MINT_DEVNET = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
const USDC_DECIMALS = 6;

/**
 * Tsara Service - Stablecoin Infrastructure (Local Management)
 * Supports: Local Wallet Management, Transfers (Gasless), Balance Checks
 * Derived from tsara.node project pattern.
 */
class TsaraService {
    constructor() {
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
        });

        console.log(`[Tsara Service] Initialized local management for Solana ${cluster}`);
    }

    /**
     * Create a virtual wallet locally
     */
    async createWallet(label, reference, metadata = {}) {
        try {
            const mnemonic = bip39.generateMnemonic();
            const seed = await bip39.mnemonicToSeed(mnemonic);
            const { key } = derivePath(`m/44'/501'/0'/0'`, seed.toString("hex"));
            const keypair = Keypair.fromSeed(key);

            const publicKey = keypair.publicKey.toBase58();
            const encryptedMnemonic = walletEncryptionService.encryptPrivateKey(mnemonic);
            const encryptedSecretKey = walletEncryptionService.encryptPrivateKey(Buffer.from(keypair.secretKey).toString("hex"));

            return {
                success: true,
                data: {
                    id: reference,
                    reference,
                    label,
                    primary_address: publicKey,
                    mnemonic: encryptedMnemonic,
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
                usdcBalance = (Number(account.amount) / Math.pow(10, USDC_DECIMALS)).toString();
            } catch (e) {
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
     * Get Keypair from local encrypted storage
     */
    async getKeypairFromEncrypted(encryptedMnemonic) {
        const mnemonic = walletEncryptionService.decryptPrivateKey(encryptedMnemonic);
        const mnemonicStr = Buffer.from(mnemonic).toString('utf8');
        const seed = await bip39.mnemonicToSeed(mnemonicStr);
        const { key } = derivePath(`m/44'/501'/0'/0'`, seed.toString("hex"));
        return Keypair.fromSeed(key);
    }

    /**
     * Get Funder/Gas Sponsor Keypair from environment
     * Uses GAS_SPONSOR_PRIVATE_KEY (byte array) preferentially,
     * falls back to GAS_SPONSOR_SEED or FUNDER_MNEMONIC
     */
    async getFunderKeypair() {
        // Method 1: Use private key bytes directly (most reliable)
        const privateKeyEnv = process.env.GAS_SPONSOR_PRIVATE_KEY;
        if (privateKeyEnv) {
            try {
                const keyBytes = JSON.parse(privateKeyEnv);
                const keypair = Keypair.fromSecretKey(Uint8Array.from(keyBytes));
                console.log(`[Tsara Service] Gas sponsor loaded from private key: ${keypair.publicKey.toBase58()}`);
                return keypair;
            } catch (e) {
                console.warn('[Tsara Service] Failed to parse GAS_SPONSOR_PRIVATE_KEY, trying mnemonic...');
            }
        }

        // Method 2: Use mnemonic / seed phrase
        const funderMnemonic = process.env.GAS_SPONSOR_SEED || process.env.FUNDER_MNEMONIC;
        if (funderMnemonic) {
            const seed = await bip39.mnemonicToSeed(funderMnemonic);
            const { key } = derivePath(`m/44'/501'/0'/0'`, seed.toString("hex"));
            return Keypair.fromSeed(key);
        }

        throw new Error("Gas sponsor wallet not configured. Set GAS_SPONSOR_PRIVATE_KEY or GAS_SPONSOR_SEED in environment.");
    }

    /**
     * Gasless USDC Transfer
     */
    async sendUSDCTransaction(params) {
        const { recipientAddress, amountToSend, senderMnemonic, transactionFee = "0", payFeesWithFunder = true } = params;

        try {
            const amount = parseFloat(amountToSend);
            const fee = parseFloat(transactionFee);

            if (amount <= 0) throw new Error("Amount must be greater than 0");

            const senderKeypair = await this.getKeypairFromEncrypted(senderMnemonic);
            const funderKeypair = payFeesWithFunder ? await this.getFunderKeypair() : senderKeypair;
            const recipientPublicKey = new PublicKey(recipientAddress);

            // Check fee payer's SOL balance
            const solBalance = await this.connection.getBalance(funderKeypair.publicKey);
            const minSolNeeded = 0.002 * LAMPORTS_PER_SOL; // Rough estimate for ATA + Transmit

            if (solBalance < minSolNeeded) {
                throw new Error(`Fee payer has insufficient SOL. Needed: ${minSolNeeded / LAMPORTS_PER_SOL} SOL`);
            }

            // Sync/Create ATAs
            // Sender ATA
            const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
                this.connection,
                funderKeypair,
                this.usdcMint,
                senderKeypair.publicKey
            );

            // Recipient ATA
            const toTokenAccount = await getOrCreateAssociatedTokenAccount(
                this.connection,
                funderKeypair,
                this.usdcMint,
                recipientPublicKey
            );

            // Check USDC balance
            const senderUsdcBalance = Number(fromTokenAccount.amount) / Math.pow(10, USDC_DECIMALS);
            if (senderUsdcBalance < (amount + fee)) {
                throw new Error(`Insufficient USDC. Available: ${senderUsdcBalance}, Needed: ${amount + fee}`);
            }

            const amountBase = BigInt(Math.round(amount * Math.pow(10, USDC_DECIMALS)));
            const instructions = [
                createTransferInstruction(
                    fromTokenAccount.address,
                    toTokenAccount.address,
                    senderKeypair.publicKey,
                    amountBase
                )
            ];

            // Handle fee if applicable
            if (fee > 0) {
                const platformWallet = new PublicKey(constants.PLATFORM_CONFIG.PLATFORM_WALLET_ADDRESS);
                const platformAta = await getOrCreateAssociatedTokenAccount(
                    this.connection,
                    funderKeypair,
                    this.usdcMint,
                    platformWallet
                );
                const feeBase = BigInt(Math.round(fee * Math.pow(10, USDC_DECIMALS)));
                instructions.push(
                    createTransferInstruction(
                        fromTokenAccount.address,
                        platformAta.address,
                        senderKeypair.publicKey,
                        feeBase
                    )
                );
            }

            const { blockhash } = await this.connection.getLatestBlockhash();
            const message = new TransactionMessage({
                payerKey: funderKeypair.publicKey,
                recentBlockhash: blockhash,
                instructions
            });

            const tx = new VersionedTransaction(message.compileToV0Message());

            // Signers: sender (authority) + funder (fee payer)
            if (payFeesWithFunder) {
                tx.sign([senderKeypair, funderKeypair]);
            } else {
                tx.sign([senderKeypair]);
            }

            const signature = await this.connection.sendTransaction(tx, {
                skipPreflight: false,
                maxRetries: 3
            });

            await this.connection.confirmTransaction(signature, "confirmed");

            return {
                success: true,
                signature,
                transactionHash: signature,
                url: `https://explorer.solana.com/tx/${signature}`
            };

        } catch (error) {
            console.error('[Tsara Service] sendUSDCTransaction error:', error);
            throw error;
        }
    }

    /**
     * Transfer Implementation
     */
    async transfer(params) {
        // params: { to, amount, currency, senderMnemonic, userId }
        if (params.currency !== 'USDC') {
            throw new Error('Only USDC transfers are supported via Tsara currently');
        }

        return await this.sendUSDCTransaction({
            recipientAddress: params.to,
            amountToSend: params.amount,
            senderMnemonic: params.senderMnemonic,
            transactionFee: params.fee || "0",
            payFeesWithFunder: true
        });
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
