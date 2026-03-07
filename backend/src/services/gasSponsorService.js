/**
 * Gas Sponsor Service
 * Handles gasless transactions by sponsoring gas fees for user USDC transactions
 *
 * How it works:
 * 1. User initiates USDC transaction
 * 2. Sponsor wallet pays the SOL gas fee
 * 3. User only needs USDC, no SOL required
 */

const { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { getAssociatedTokenAddress, createTransferInstruction, TOKEN_PROGRAM_ID } = require('@solana/spl-token');

class GasSponsorService {
  constructor() {
    this.sponsorWallet = process.env.GAS_SPONSOR_WALLET;
    this.sponsorPrivateKey = process.env.GAS_SPONSOR_PRIVATE_KEY;
    this.funderMnemonic = process.env.FUNDER_MNEMONIC;
    this.connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com', 'confirmed');

    this.usdcMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
  }

  /**
   * Internal helper to load sponsor keypair
   */
  async _loadSponsorKeypair() {
    if (this.sponsorPrivateKey) {
      const bs58 = require('bs58');
      const secretKey = bs58.decode(this.sponsorPrivateKey);
      return require('@solana/web3.js').Keypair.fromSecretKey(secretKey);
    }

    if (this.funderMnemonic) {
      const bip39 = require('bip39');
      const { derivePath } = require('ed25519-hd-key');
      const seed = await bip39.mnemonicToSeed(this.funderMnemonic);
      const { key } = derivePath(`m/44'/501'/0'/0'`, seed.toString("hex"));
      return require('@solana/web3.js').Keypair.fromSeed(key);
    }

    throw new Error('No sponsor credentials found (GAS_SPONSOR_PRIVATE_KEY or FUNDER_MNEMONIC)');
  }

  /**
   * Get sponsor public key
   */
  async _getSponsorPublicKey() {
    if (this.sponsorWallet) return new PublicKey(this.sponsorWallet);
    const kp = await this._loadSponsorKeypair();
    return kp.publicKey;
  }

  /**
   * Check if gas sponsorship is configured
   * @returns {boolean}
   */
  isConfigured() {
    return !!(
      (this.sponsorWallet && this.sponsorPrivateKey) ||
      this.funderMnemonic
    );
  }

  /**
   * Get sponsor wallet SOL balance
   * @returns {Promise<number>} Balance in SOL
   */
  async getSponsorBalance() {
    try {
      if (!this.isConfigured()) {
        return 0;
      }

      const publicKey = await this._getSponsorPublicKey();
      const balance = await this.connection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Estimate gas fee for a transaction
   * @returns {Promise<number>} Estimated fee in SOL
   */
  async estimateGasFee() {
    try {
      const { feeCalculator } = await this.connection.getRecentBlockhash();

      const estimatedFee = feeCalculator.lamportsPerSignature / LAMPORTS_PER_SOL;

      return estimatedFee;
    } catch (error) {
      return 0.000005;
    }
  }

  /**
   * Create a sponsored USDC transfer transaction
   *
   * @param {string} fromAddress - User's wallet address (sender)
   * @param {string} toAddress - Recipient wallet address
   * @param {number} amount - Amount of USDC to transfer
   * @param {Object} userKeypair - User's keypair (needed to sign transaction)
   * @returns {Promise<Object>} Transaction signature and details
   */
  async sponsorUSDCTransfer(fromAddress, toAddress, amount, userKeypair) {
    try {
      if (!this.isConfigured()) {
        throw new Error('Gas sponsorship not configured. Please set sponsor wallet credentials.');
      }

      const fromPubkey = new PublicKey(fromAddress);
      const toPubkey = new PublicKey(toAddress);
      const sponsorPubkey = await this._getSponsorPublicKey();

      const fromTokenAccount = await getAssociatedTokenAddress(
        this.usdcMint,
        fromPubkey
      );

      const toTokenAccount = await getAssociatedTokenAddress(
        this.usdcMint,
        toPubkey
      );

      const transaction = new Transaction();

      const transferAmount = Math.floor(amount * 1_000_000);

      transaction.add(
        createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          fromPubkey,
          transferAmount,
          [],
          TOKEN_PROGRAM_ID
        )
      );

      transaction.feePayer = sponsorPubkey;

      const { blockhash } = await this.connection.getRecentBlockhash();
      transaction.recentBlockhash = blockhash;


      return {
        success: true,
        message: 'Sponsored transaction created',
        transaction: transaction.serialize().toString('base64'),
        estimatedFee: await this.estimateGasFee(),
        note: 'Transaction must be signed by both user and sponsor before sending'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if sponsor wallet has sufficient SOL for gas
   * @param {number} requiredAmount - Required SOL amount
   * @returns {Promise<boolean>}
   */
  async hasSufficientGas(requiredAmount = 0.01) {
    try {
      const balance = await this.getSponsorBalance();
      return balance >= requiredAmount;
    } catch (error) {
      return false;
    }
  }

  /**
   * Transfer SOL from sponsor wallet to a recipient address.
   * @param {string} toAddress - Destination wallet address.
   * @param {number} amountSOL - Amount of SOL to transfer.
   * @returns {Promise<Object>} Result of the transfer.
   */
  async transferSOL(toAddress, amountSOL) {
    try {
      if (!this.isConfigured()) {
        throw new Error('Gas sponsorship not configured. Please set sponsor wallet credentials.');
      }

      const sponsorKeypair = await this._loadSponsorKeypair();

      const sponsorPubkey = sponsorKeypair.publicKey;
      const recipientPubkey = new PublicKey(toAddress);

      // Calculate buffer - slightly extra to ensure success
      const lamports = Math.round(amountSOL * LAMPORTS_PER_SOL);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: sponsorPubkey,
          toPubkey: recipientPubkey,
          lamports
        })
      );

      transaction.feePayer = sponsorPubkey;
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;

      transaction.sign(sponsorKeypair);
      const signature = await this.connection.sendRawTransaction(transaction.serialize());
      await this.connection.confirmTransaction(signature);

      return { success: true, signature };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get sponsor wallet status and stats
   * @returns {Promise<Object>}
   */
  async getStatus() {
    try {
      const isConfigured = this.isConfigured();

      if (!isConfigured) {
        return {
          configured: false,
          message: 'Gas sponsorship not configured',
          balance: 0,
          estimatedTransactions: 0
        };
      }

      const balance = await this.getSponsorBalance();
      const estimatedFee = await this.estimateGasFee();
      const estimatedTransactions = Math.floor(balance / estimatedFee);

      return {
        configured: true,
        balance: balance,
        balanceFormatted: `${balance.toFixed(6)} SOL`,
        estimatedFeePerTransaction: estimatedFee,
        estimatedTransactions: estimatedTransactions,
        lowBalanceWarning: balance < 0.1,
        message: balance < 0.1
          ? 'Warning: Low sponsor wallet balance. Please top up.'
          : 'Gas sponsorship active'
      };
    } catch (error) {
      return {
        configured: false,
        error: error.message
      };
    }
  }

  /**
   * Airdrop SOL to sponsor wallet (Testnet/Devnet only!)
   * NOT AVAILABLE ON MAINNET
   *
   * @param {number} amount - Amount of SOL to request
   * @returns {Promise<Object>}
   */
  async requestAirdrop(amount = 1) {
    try {
      const endpoint = this.connection.rpcEndpoint;
      if (endpoint.includes('mainnet')) {
        throw new Error('Airdrops not available on mainnet. Please fund sponsor wallet manually.');
      }

      const publicKey = await this._getSponsorPublicKey();
      const signature = await this.connection.requestAirdrop(
        publicKey,
        amount * LAMPORTS_PER_SOL
      );

      await this.connection.confirmTransaction(signature);

      return {
        success: true,
        signature,
        amount,
        message: `Airdropped ${amount} SOL to sponsor wallet`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new GasSponsorService();
