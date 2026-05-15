/**
 * Solana Direct Transfer Service
 * Bypasses HostFi's minimum withdrawal by using native Solana SPL Token transfers
 * Can send any amount (no minimum) of USDC to any Solana address
 */

const { Connection, Keypair, PublicKey, Transaction } = require('@solana/web3.js');
const {
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction,
  getAssociatedTokenAddress
} = require('@solana/spl-token');
const bs58 = require('bs58').default;

// USDC SPL Token mint address on Solana mainnet
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

// Solana RPC endpoint
const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

class SolanaTransferService {
  constructor() {
    this.connection = new Connection(SOLANA_RPC, 'confirmed');
    this.platformKeypair = null;
    this.initialized = false;
  }

  /**
   * Initialize the service with platform wallet private key
   */
  init() {
    try {
      const privateKey = process.env.PLATFORM_WALLET_PRIVATE_KEY;
      if (!privateKey) {
        console.warn('[SolanaTransfer] PLATFORM_WALLET_PRIVATE_KEY not set. Direct transfers disabled.');
        return false;
      }

      this.platformKeypair = Keypair.fromSecretKey(bs58.decode(privateKey));
      this.initialized = true;

      console.log(`[SolanaTransfer] Initialized with platform wallet: ${this.platformKeypair.publicKey.toString()}`);
      return true;
    } catch (error) {
      console.error('[SolanaTransfer] Failed to initialize:', error.message);
      return false;
    }
  }

  /**
   * Get platform wallet USDC balance
   */
  async getPlatformBalance() {
    if (!this.initialized) {
      throw new Error('SolanaTransferService not initialized');
    }

    try {
      const platformATA = await getAssociatedTokenAddress(
        USDC_MINT,
        this.platformKeypair.publicKey
      );

      const accountInfo = await this.connection.getTokenAccountBalance(platformATA);
      return parseFloat(accountInfo.value.uiAmountString || '0');
    } catch (error) {
      console.error('[SolanaTransfer] Failed to get balance:', error.message);
      return 0;
    }
  }

  /**
   * Transfer USDC from platform wallet to any Solana address
   * No minimum amount — can send 0.01 USDC
   * @param {string} recipientAddress - Solana public key (base58)
   * @param {number} amount - Amount in USDC (e.g., 0.5 for 50 cents)
   * @param {string} memo - Optional memo for the transaction
   * @returns {Promise<Object>} Transaction result with signature
   */
  async transferUSDC(recipientAddress, amount, memo = '') {
    if (!this.initialized) {
      throw new Error('SolanaTransferService not initialized. Set PLATFORM_WALLET_PRIVATE_KEY in .env');
    }

    if (!recipientAddress || !amount || amount <= 0) {
      throw new Error('Invalid recipient address or amount');
    }

    try {
      console.log(`[SolanaTransfer] Transferring ${amount} USDC to ${recipientAddress}`);

      const recipientPubkey = new PublicKey(recipientAddress);

      // Get or create Associated Token Accounts for USDC
      const platformATA = await getOrCreateAssociatedTokenAccount(
        this.connection,
        this.platformKeypair,
        USDC_MINT,
        this.platformKeypair.publicKey
      );

      const recipientATA = await getOrCreateAssociatedTokenAccount(
        this.connection,
        this.platformKeypair,
        USDC_MINT,
        recipientPubkey
      );

      // USDC has 6 decimals
      const amountInLamports = Math.round(amount * 1_000_000);

      // Create transfer instruction
      const transferInstruction = createTransferInstruction(
        platformATA.address,
        recipientATA.address,
        this.platformKeypair.publicKey,
        amountInLamports
      );

      // Build and sign transaction
      const transaction = new Transaction();
      transaction.add(transferInstruction);

      if (memo) {
        transaction.add(
          new Transaction().add(
            new (require('@solana/web3.js')).TransactionInstruction({
              keys: [],
              programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
              data: Buffer.from(memo)
            })
          )
        );
      }

      // Send transaction
      const signature = await this.connection.sendTransaction(
        transaction,
        [this.platformKeypair],
        { commitment: 'confirmed' }
      );

      // Wait for confirmation
      await this.connection.confirmTransaction(signature, 'confirmed');

      console.log(`[SolanaTransfer] ✓ Transfer successful: ${signature}`);

      return {
        success: true,
        signature,
        amount,
        recipient: recipientAddress,
        explorerUrl: `https://solscan.io/tx/${signature}`,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('[SolanaTransfer] Transfer failed:', error.message);
      throw error;
    }
  }

  /**
   * Batch transfer USDC to multiple recipients
   * Useful for paying out multiple creators at once
   * @param {Array<{address: string, amount: number}>} recipients
   * @returns {Promise<Array>} Results for each transfer
   */
  async batchTransfer(recipients) {
    const results = [];

    for (const { address, amount } of recipients) {
      try {
        const result = await this.transferUSDC(address, amount);
        results.push({ address, amount, ...result });
      } catch (error) {
        results.push({ address, amount, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Check if service is ready to use
   */
  isReady() {
    return this.initialized;
  }
}

module.exports = new SolanaTransferService();
