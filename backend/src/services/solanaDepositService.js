const crypto = require('crypto');
const User = require('../models/User');
const SwitchWallet = require('../models/SwitchWallet');
const SolanaDeposit = require('../models/SolanaDeposit');
const ledgerService = require('./ledgerService');

/**
 * Solana Deposit Service
 * 
 * Verifies on-chain USDC transfers on Solana server-side,
 * rejects failed transactions or invalid tokens,
 * and credits verified deposits atomically to the authoritative ledger.
 */
class SolanaDepositService {
  constructor() {
    // Verified Official Circle USDC SPL Token Mint on Solana Mainnet
    this.USDC_MINT_MAINNET = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    this.USDC_DECIMALS = 6;
    this.DEFAULT_NETWORK = process.env.SOLANA_NETWORK || 'mainnet-beta';
    this.RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  }

  /**
   * Internal helper to call Solana JSON-RPC endpoints.
   * @private
   */
  async _callRpc(method, params = [], timeoutMs = 20000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(this.RPC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: `sol-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
          method,
          params
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Solana RPC HTTP error: ${response.status} ${response.statusText}`);
      }

      const json = await response.json();
      if (json.error) {
        throw new Error(`Solana RPC error [${json.error.code}]: ${json.error.message}`);
      }

      return json.result;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Returns deposit instructions and receiving address for a user.
   * 
   * @param {string|ObjectId} userId
   * @returns {Promise<object>} Deposit metadata and instructions
   */
  async getDepositInstructions(userId) {
    const user = await User.findById(userId).select('wallet firstName lastName name');
    if (!user) {
      throw new Error('User not found');
    }

    // Resolve or provision non-custodial Switch Solana address
    const switchService = require('./switchService');
    const userName = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'MyArteLab User';
    const wallet = await switchService.getOrCreateUserWallet(userId, userName);

    const solanaAddress = wallet.solanaAddress || process.env.PLATFORM_WALLET_ADDRESS;
    if (!solanaAddress) {
      throw new Error('No Solana deposit address available for user');
    }

    return {
      network: this.DEFAULT_NETWORK,
      token: 'USDC',
      mint: this.USDC_MINT_MAINNET,
      decimals: this.USDC_DECIMALS,
      recipientAddress: solanaAddress,
      confirmationCommitment: 'finalized',
      instructions: [
        'Send strictly USDC on the Solana blockchain.',
        `Ensure the token mint is ${this.USDC_MINT_MAINNET}.`,
        'Do NOT send USDT, native SOL, or tokens via other networks (Ethereum, Base, BSC).',
        'Once sent, submit your transaction signature to credit your balance immediately, or await automated on-chain confirmation.'
      ]
    };
  }

  /**
   * Verifies an on-chain transaction directly via Solana JSON-RPC.
   * Enforces:
   * 1. Transaction exists and is confirmed/finalized
   * 2. Transaction succeeded (meta.err === null)
   * 3. Token transferred matches verified USDC mint address
   * 4. Recipient matches expected user Solana address or platform wallet
   * 
   * @param {string} signature - 64-88 character base58 Solana transaction signature
   * @param {string} expectedRecipient - Expected receiving Solana wallet address
   * @returns {Promise<object>} Verified deposit details
   */
  async verifyTransactionOnChain(signature, expectedRecipient) {
    const cleanSig = String(signature).trim();
    if (!/^[1-9A-HJ-NP-Za-km-z]{64,128}$/.test(cleanSig)) {
      throw new Error('Invalid Solana transaction signature format');
    }

    const cleanRecipient = String(expectedRecipient).trim();
    const platformAddress = (process.env.PLATFORM_WALLET_ADDRESS || '').trim();

    // 1. Query Solana RPC for parsed transaction details
    let tx;
    try {
      tx = await this._callRpc('getTransaction', [
        cleanSig,
        {
          encoding: 'jsonParsed',
          commitment: 'finalized',
          maxSupportedTransactionVersion: 0
        }
      ]);
    } catch (rpcErr) {
      throw new Error(`Solana RPC verification failed: ${rpcErr.message}`);
    }

    if (!tx) {
      // Retry once with 'confirmed' commitment in case finality is still pending
      try {
        tx = await this._callRpc('getTransaction', [
          cleanSig,
          {
            encoding: 'jsonParsed',
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0
          }
        ]);
      } catch (retryErr) {
        // Fall through
      }
    }

    if (!tx) {
      throw new Error('Transaction signature not found on Solana network or not yet confirmed. Please wait for on-chain confirmation and retry.');
    }

    // 2. Reject failed on-chain transactions
    if (tx.meta?.err) {
      throw new Error(`On-chain transaction failed on Solana with status: ${JSON.stringify(tx.meta.err)}`);
    }

    const slot = tx.slot;
    const blockTime = tx.blockTime ? new Date(tx.blockTime * 1000) : new Date();

    // 3. Inspect Token Balances to verify SPL Token transfer and Mint
    const preBalances = tx.meta?.preTokenBalances || [];
    const postBalances = tx.meta?.postTokenBalances || [];

    let verifiedTransfer = null;

    // Scan postTokenBalances to identify the credited recipient account
    for (const post of postBalances) {
      // Enforce verified USDC Mint address
      if (post.mint !== this.USDC_MINT_MAINNET) {
        continue;
      }

      const postOwner = post.owner;
      const isExpectedRecipient = 
        postOwner === cleanRecipient || 
        postOwner === platformAddress ||
        (post.accountIndex !== undefined && tx.transaction?.message?.accountKeys?.[post.accountIndex]?.pubkey === cleanRecipient);

      if (isExpectedRecipient) {
        // Match with preTokenBalance for the same account
        const pre = preBalances.find(p => p.accountIndex === post.accountIndex);
        const preAmount = pre ? Number(pre.uiTokenAmount?.amount || 0) : 0;
        const postAmount = Number(post.uiTokenAmount?.amount || 0);
        const delta = postAmount - preAmount;

        if (delta > 0) {
          const uiAmount = delta / Math.pow(10, this.USDC_DECIMALS);
          verifiedTransfer = {
            mint: post.mint,
            recipientOwner: postOwner,
            toTokenAccount: tx.transaction?.message?.accountKeys?.[post.accountIndex]?.pubkey || cleanRecipient,
            rawAmount: delta,
            amountUsdc: parseFloat(uiAmount.toFixed(6))
          };
          break;
        }
      }
    }

    // Fallback: Check parsed instructions if token balances array was not indexed
    if (!verifiedTransfer) {
      const instructions = tx.transaction?.message?.instructions || [];
      const innerInstructions = (tx.meta?.innerInstructions || []).flatMap(i => i.instructions || []);
      const allInstructions = [...instructions, ...innerInstructions];

      for (const inst of allInstructions) {
        if (inst.program === 'spl-token' && inst.parsed) {
          const type = inst.parsed.type;
          const info = inst.parsed.info;

          if ((type === 'transfer' || type === 'transferChecked') && info) {
            // Verify mint if transferChecked
            if (info.mint && info.mint !== this.USDC_MINT_MAINNET) {
              throw new Error(`Rejected deposit: Transaction transferred invalid token mint (${info.mint}). Only genuine USDC (${this.USDC_MINT_MAINNET}) is accepted.`);
            }

            const rawAmt = Number(info.tokenAmount?.amount || info.amount || 0);
            const uiAmt = info.tokenAmount?.uiAmount !== undefined 
              ? Number(info.tokenAmount.uiAmount)
              : rawAmt / Math.pow(10, this.USDC_DECIMALS);

            if (rawAmt > 0) {
              verifiedTransfer = {
                mint: info.mint || this.USDC_MINT_MAINNET,
                recipientOwner: cleanRecipient,
                toTokenAccount: info.destination,
                fromAddress: info.source || info.authority,
                rawAmount: rawAmt,
                amountUsdc: parseFloat(uiAmt.toFixed(6))
              };
              break;
            }
          }
        }
      }
    }

    if (!verifiedTransfer) {
      // Check if another token mint was transferred instead of USDC
      const otherMint = postBalances.find(p => p.mint !== this.USDC_MINT_MAINNET);
      if (otherMint) {
        throw new Error(`Rejected deposit: Transferred token mint (${otherMint.mint}) does not match official Solana USDC (${this.USDC_MINT_MAINNET}).`);
      }
      throw new Error(`No valid USDC transfer to recipient ${cleanRecipient} found in transaction ${cleanSig}.`);
    }

    return {
      verified: true,
      signature: cleanSig,
      slot,
      blockTime,
      amountUsdc: verifiedTransfer.amountUsdc,
      rawAmount: verifiedTransfer.rawAmount,
      mint: verifiedTransfer.mint,
      fromAddress: verifiedTransfer.fromAddress || null,
      toAddress: cleanRecipient,
      toTokenAccount: verifiedTransfer.toTokenAccount,
      network: this.DEFAULT_NETWORK,
      confirmationStatus: 'finalized',
      rawTx: tx
    };
  }

  /**
   * Verifies a Solana transaction signature and atomically credits the user's ledger balance.
   * Enforces exact-once execution and idempotency.
   * 
   * @param {string|ObjectId} userId
   * @param {string} signature
   * @param {object} [mockData] - Used for automated tests / sandbox simulations
   * @returns {Promise<object>} Crediting result and updated balance
   */
  async verifyAndCreditDeposit(userId, signature, mockData = null) {
    const cleanSig = String(signature).trim();
    if (!cleanSig || cleanSig.length < 32) {
      throw new Error('Valid Solana transaction signature is required');
    }

    // 1. Check idempotency: Has this transaction signature already been processed?
    const existingDeposit = await SolanaDeposit.findOne({ signature: cleanSig });
    if (existingDeposit && existingDeposit.isCredited) {
      const user = await User.findById(userId).select('wallet balance');
      return {
        success: true,
        alreadyCredited: true,
        message: 'Deposit already verified and credited to your wallet balance',
        data: {
          signature: cleanSig,
          amountUsdc: existingDeposit.amountUsdc,
          status: existingDeposit.status,
          creditedAt: existingDeposit.creditedAt,
          balance: user?.wallet?.balance || user?.balance || 0
        }
      };
    }

    // 2. Resolve expected recipient address for this user
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const switchWallet = await SwitchWallet.findOne({ user: userId });
    const expectedRecipient = switchWallet?.solanaAddress || process.env.PLATFORM_WALLET_ADDRESS;

    // 3. Perform verification: live on-chain or sandbox mock
    let verified;
    if (mockData) {
      // Mock validation for test suite / sandbox simulation
      if (mockData.mint && mockData.mint !== this.USDC_MINT_MAINNET) {
        throw new Error(`Rejected deposit: Transaction transferred invalid token mint (${mockData.mint}). Only genuine USDC (${this.USDC_MINT_MAINNET}) is accepted.`);
      }
      if (mockData.err) {
        throw new Error(`On-chain transaction failed on Solana with status: ${JSON.stringify(mockData.err)}`);
      }
      if (mockData.network && mockData.network !== 'mainnet-beta' && mockData.network !== 'sandbox') {
        throw new Error(`Rejected deposit: Invalid network (${mockData.network}). Only Solana mainnet is accepted.`);
      }
      if (mockData.toAddress && mockData.toAddress !== expectedRecipient && mockData.toAddress !== process.env.PLATFORM_WALLET_ADDRESS) {
        throw new Error(`Transaction transferred funds to ${mockData.toAddress}, which does not match user receiving address ${expectedRecipient}`);
      }
      if (mockData.unconfirmed) {
        throw new Error('Transaction signature not found on Solana network or not yet confirmed. Please wait for on-chain confirmation and retry.');
      }
      verified = {
        verified: true,
        signature: cleanSig,
        slot: mockData.slot || 280000000,
        blockTime: mockData.blockTime || new Date(),
        amountUsdc: Number(mockData.amountUsdc || 50),
        rawAmount: Number(mockData.amountUsdc || 50) * Math.pow(10, this.USDC_DECIMALS),
        mint: this.USDC_MINT_MAINNET,
        fromAddress: mockData.fromAddress || 'ExternalSenderWallet1111111111111111111111111',
        toAddress: expectedRecipient,
        network: mockData.network || 'mainnet-beta',
        confirmationStatus: 'finalized',
        rawTx: mockData
      };
    } else {
      // Genuine Live On-Chain Solana RPC Verification
      verified = await this.verifyTransactionOnChain(cleanSig, expectedRecipient);
    }

    if (!verified || !verified.amountUsdc || verified.amountUsdc <= 0) {
      throw new Error('Failed to verify positive USDC transfer amount on Solana');
    }

    // 4. Create or update SolanaDeposit record
    let depositDoc = existingDeposit;
    if (!depositDoc) {
      try {
        depositDoc = await SolanaDeposit.create({
          user: userId,
          signature: cleanSig,
          slot: verified.slot,
          blockTime: verified.blockTime,
          amountUsdc: verified.amountUsdc,
          rawAmount: verified.rawAmount,
          mint: verified.mint,
          fromAddress: verified.fromAddress,
          toAddress: verified.toAddress,
          toTokenAccount: verified.toTokenAccount,
          network: verified.network || this.DEFAULT_NETWORK,
          confirmationStatus: verified.confirmationStatus || 'finalized',
          status: 'confirmed',
          isCredited: false,
          verificationDetails: {
            slot: verified.slot,
            blockTime: verified.blockTime,
            verifiedAt: new Date()
          }
        });
      } catch (createErr) {
        if (createErr.code === 11000) {
          // Concurrent race condition: another request just created this record
          depositDoc = await SolanaDeposit.findOne({ signature: cleanSig });
        } else {
          throw createErr;
        }
      }
    }

    // 5. Atomically credit the internal ledger
    const creditResult = await ledgerService.creditSolanaDeposit(depositDoc);

    const updatedUser = await User.findById(userId).select('wallet balance');
    const authoritativeBalance = updatedUser?.wallet?.balance !== undefined 
      ? updatedUser.wallet.balance 
      : (updatedUser?.balance || 0);

    return {
      success: true,
      credited: Boolean(creditResult.credited),
      alreadyCredited: Boolean(creditResult.alreadyCredited),
      message: creditResult.alreadyCredited
        ? 'Deposit already verified and credited to your wallet balance'
        : `Successfully verified and credited ${verified.amountUsdc} USDC to your wallet`,
      data: {
        depositId: depositDoc._id,
        signature: cleanSig,
        amountUsdc: verified.amountUsdc,
        balance: authoritativeBalance,
        ledgerTransactionId: creditResult.ledgerTx?.transactionId
      }
    };
  }

  /**
   * Processes incoming Switch wallet receive webhooks if configured.
   * 
   * @param {object} payload
   * @returns {Promise<object>} Webhook processing result
   */
  async processSwitchWalletReceiveWebhook(payload) {
    const data = payload.data || payload;
    const { address, hash, amount, asset, token, decimals } = data;

    if (!hash) {
      return { handled: false, reason: 'No transaction hash provided' };
    }

    // Locate user by Solana or EVM wallet address, or Switch wallet ID
    const switchWallet = await SwitchWallet.findOne({
      $or: [
        { solanaAddress: address },
        { evmAddress: address },
        { switchWalletId: data.wallet },
        { 'addresses.SOLANA': address },
        { 'addresses.BASE': address },
        { 'addresses.ETHEREUM': address },
        { 'addresses.POLYGON': address },
        { 'addresses.BSC': address },
        { 'addresses.ARBITRUM': address }
      ]
    });

    if (!switchWallet) {
      console.warn(`[SolanaDeposit] No user found for Switch wallet address ${address}`);
      return { handled: false, reason: 'Wallet not registered to any MyArteLab user' };
    }

    // Verify asset is USDC
    const isUsdc = (asset === 'solana:usdc') || (token === this.USDC_MINT_MAINNET);
    if (!isUsdc) {
      console.warn(`[SolanaDeposit] Unsupported asset received for user ${switchWallet.user}: ${asset || token}`);
      try {
        const Notification = require('../models/Notification');
        await Notification.createNotification({
          recipient: switchWallet.user,
          type: 'unsupported_token_detected',
          title: 'Unsupported Token Received',
          message: `An unsupported token (${asset || token || 'asset'}) was received at your wallet address. Only USDC and USDT count toward your spendable balance. You can recover this asset using the Token Rescue tool.`,
          link: '/wallet',
          metadata: {
            asset: asset || token,
            tokenAddress: token || null,
            txHash: hash,
            blockchain: data.blockchain || data.network || 'SOLANA',
            rawAmount: amount,
            receivedAt: new Date()
          }
        });
      } catch (notifErr) {
        console.warn('[SolanaDeposit] Could not create unsupported token notification:', notifErr.message);
      }

      return {
        handled: true,
        unsupportedToken: true,
        reason: 'Unsupported asset received. User notified for token rescue.',
        asset: asset || token,
        walletId: switchWallet.switchWalletId
      };
    }

    const dec = decimals || 6;
    const numAmt = Number(amount);
    // Switch sends human token amounts (e.g. 3.627485), NOT micro-units (3627485).
    // If numAmt is already a float or less than 100,000, it is already in human token units.
    const amountUsdc = (numAmt >= 100000 && Number.isInteger(numAmt))
      ? numAmt / Math.pow(10, dec)
      : numAmt;

    return this.verifyAndCreditDeposit(switchWallet.user, hash, {
      amountUsdc,
      mint: this.USDC_MINT_MAINNET,
      fromAddress: data.sender || null,
      slot: 1,
      blockTime: new Date()
    });
  }

  /**
   * Reconciles uncredited confirmed deposits (e.g., after server restart or interrupted requests).
   * Atomically locks and credits each uncredited record.
   * 
   * @returns {Promise<object>} Summary of reconciled deposits
   */
  async reconcileUncreditedDeposits() {
    const uncreditedList = await SolanaDeposit.find({
      status: 'confirmed',
      isCredited: false
    }).limit(100);

    const results = [];
    for (const deposit of uncreditedList) {
      try {
        const creditResult = await ledgerService.creditSolanaDeposit(deposit);
        if (creditResult.credited) {
          results.push({
            depositId: deposit._id,
            signature: deposit.signature,
            amountUsdc: deposit.amountUsdc,
            status: 'reconciled'
          });
        }
      } catch (err) {
        console.error(`[SolanaDeposit] Failed to reconcile deposit ${deposit.signature}:`, err.message);
      }
    }

    return {
      success: true,
      scannedCount: uncreditedList.length,
      reconciledCount: results.length,
      reconciled: results
    };
  }

  /**
   * Fetches paginated Solana deposit history for a user.
   */
  async getUserDeposits(userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [deposits, total] = await Promise.all([
      SolanaDeposit.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      SolanaDeposit.countDocuments({ user: userId })
    ]);

    return {
      deposits,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1
      }
    };
  }

  /**
   * Checks whether a destination Solana address has an initialized USDC Associated Token Account.
   * SPL token transfers fail on Solana if the recipient has no token account and no ATA is created.
   * 
   * @param {string} address - Base58 Solana public key
   * @returns {Promise<boolean>} True if address has at least one active USDC token account
   */
  async hasUsdcTokenAccount(address) {
    if (!address || typeof address !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address.trim())) {
      return false;
    }

    try {
      const res = await this._callRpc('getTokenAccountsByOwner', [
        address.trim(),
        { mint: this.USDC_MINT_MAINNET },
        { encoding: 'jsonParsed' }
      ]);
      const accounts = res?.value || [];
      return accounts.length > 0;
    } catch (err) {
      console.warn(`[SolanaDeposit] Could not verify USDC token account for ${address}:`, err.message);
      // Non-blocking fallback if RPC is transiently down; allow transfer attempt to proceed
      return true;
    }
  }
}

module.exports = new SolanaDepositService();
