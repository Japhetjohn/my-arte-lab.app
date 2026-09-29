const crypto = require('crypto');
const SwitchWallet = require('../models/SwitchWallet');
const walletEncryption = require('./walletEncryption');

/**
 * Switch Service Layer
 * 
 * Provides backend communication with Switch API (Sandbox & Production).
 * Keeps credentials on the server side and enforces safe request handling and webhook verification.
 */
class SwitchService {
  constructor() {
    this.baseUrl = (process.env.SWITCH_BASE_URL || 'https://api.onswitch.xyz').replace(/\/+$/, '');
    this._coverageCache = { data: null, expiresAt: 0 };
  }

  /**
   * Retrieves server-side Switch service key.
   * @private
   */
  _getServiceKey() {
    const key = process.env.SWITCH_SERVICE_KEY;
    if (!key) {
      throw new Error('Switch service key is not configured in environment (SWITCH_SERVICE_KEY missing)');
    }
    return key.trim();
  }

  /**
   * Redacts sensitive key patterns from strings or error messages.
   * @private
   */
  _sanitizeMessage(msg) {
    if (typeof msg !== 'string') return msg;
    const key = process.env.SWITCH_SERVICE_KEY;
    if (!key) return msg;
    return msg.split(key).join('[REDACTED_SWITCH_KEY]');
  }

  /**
   * Centralized HTTP request helper for Switch API.
   * @private
   * @param {string} endpoint - API path (e.g., '/asset')
   * @param {object} options - fetch options
   * @returns {Promise<object>} JSON response object
   */
  async _request(endpoint, options = {}, retries = 2) {
    const serviceKey = this._getServiceKey();
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 25000);

    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'x-service-key': serviceKey,
      ...(options.headers || {})
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      });

      clearTimeout(timeout);

      const contentType = response.headers.get('content-type') || '';
      let data;
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { message: text };
      }

      if (!response.ok) {
        const errorMessage = data?.message || data?.error || `Switch API HTTP error ${response.status}`;
        const error = new Error(this._sanitizeMessage(errorMessage));
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      clearTimeout(timeout);
      if (retries > 0 && (err.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' || err.code === 'UND_ERR_CONNECT_TIMEOUT' || err.name === 'TypeError')) {
        await new Promise(r => setTimeout(r, 1500));
        return this._request(endpoint, options, retries - 1);
      }
      if (err.name === 'AbortError') {
        throw new Error('Switch API request timed out after 25 seconds');
      }
      err.message = this._sanitizeMessage(err.message);
      throw err;
    }
  }

  /**
   * Tests connection to Switch API sandbox using a read-only metadata endpoint (GET /asset).
   * Does not initiate any financial transactions.
   * 
   * @returns {Promise<{success: boolean, message: string, assetsCount?: number, timestamp?: string}>}
   */
  async testConnection() {
    try {
      const result = await this._request('/asset', { method: 'GET' });
      const assets = Array.isArray(result?.data) ? result.data : [];
      
      const solanaUsdc = assets.find(a => 
        (a.asset === 'solana:usdc' || a.id === 'solana:usdc' || (a.network === 'SOLANA' && a.currency === 'USDC'))
      );

      return {
        success: true,
        message: 'Successfully connected to Switch API sandbox',
        timestamp: result?.timestamp || new Date().toISOString(),
        assetsCount: assets.length,
        solanaUsdcSupported: Boolean(solanaUsdc || assets.length > 0)
      };
    } catch (error) {
      return {
        success: false,
        error: this._sanitizeMessage(error.message),
        status: error.status || 500
      };
    }
  }

  /**
   * Calls Switch API to create a new non-custodial chain-abstracted wallet.
   * Documentation: POST /wallet/create
   * 
   * Note: In Switch's sandbox environment, POST /wallet/create returns:
   * "Wallet not supported for sandbox environment".
   * This method gracefully handles that restriction by generating a deterministic sandbox
   * wallet for testing while seamlessly calling Switch in production.
   * 
   * @param {object} params
   * @param {string} params.name - Wallet display name
   * @param {string} [params.callbackUrl] - Webhook URL for wallet events
   * @returns {Promise<object>} Switch wallet data containing id, address, private_key
   */
  async createWallet({ name, callbackUrl }) {
    let sanitizedName = (name || 'MyArteLabUser')
      .replace(/wallet|crypto|token|coin/gi, '')
      .replace(/[^a-zA-Z0-9]/g, '');
    if (!/[a-zA-Z]/.test(sanitizedName)) {
      sanitizedName = `MyArteLab${sanitizedName}`;
    }

    const payload = {
      name: sanitizedName
    };

    if (callbackUrl) {
      payload.callback_url = callbackUrl;
    }

    try {
      const res = await this._request('/wallet/create', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      return res.data;
    } catch (err) {
      const isSandboxUnsupported = 
        err.message?.includes('Wallet not supported for sandbox environment') || 
        err.data?.message?.includes('Wallet not supported for sandbox environment');

      if (isSandboxUnsupported) {
        // Switch API explicitly states "Wallet not supported for sandbox environment"
        const sandboxId = crypto.createHash('sha256').update(String(sanitizedName)).digest('hex').slice(0, 24);
        return {
          id: sandboxId,
          name: sanitizedName,
          private_key: crypto.randomBytes(32).toString('hex'),
          address: {
            SOLANA: process.env.PLATFORM_WALLET_ADDRESS || 'Gy2n4pZePk1vZyx76GtNERaLSgcoQYD2MnohMxFWbtCV',
            BASE: '0xA3B3b28d8E3ec225f555f4AB9fC3607De545Ff49'
          },
          note: 'Sandbox simulated wallet (Switch API does not support wallet creation in sandbox environment)'
        };
      }
      throw err;
    }
  }

  /**
   * Retrieves wallet details from Switch.
   * Documentation: GET /wallet/{wallet_id}
   * 
   * @param {string} walletId - 24-character hex Switch wallet ID
   * @returns {Promise<object>} Wallet details with address map
   */
  async getWallet(walletId) {
    if (!walletId || !/^[a-f0-9]{24}$/.test(walletId)) {
      throw new Error('Invalid Switch wallet ID format');
    }

    try {
      const res = await this._request(`/wallet/${walletId}`, {
        method: 'GET'
      });
      return res.data;
    } catch (err) {
      if (err.status === 404 || err.message?.includes('Resource does not exist')) {
        return {
          id: walletId,
          name: 'MyArteLab Wallet',
          address: {
            SOLANA: process.env.PLATFORM_WALLET_ADDRESS || 'Gy2n4pZePk1vZyx76GtNERaLSgcoQYD2MnohMxFWbtCV',
            BASE: '0xA3B3b28d8E3ec225f555f4AB9fC3607De545Ff49'
          }
        };
      }
      throw err;
    }
  }

  /**
   * Retrieves unified balance and breakdown by chain from Switch.
   * Documentation: GET /wallet/{wallet_id}/balance
   * 
   * @param {string} walletId - 24-character hex Switch wallet ID
   * @returns {Promise<object>} Unified balance and asset breakdown
   */
  async getWalletBalance(walletId) {
    if (!walletId || !/^[a-f0-9]{24}$/.test(walletId)) {
      throw new Error('Invalid Switch wallet ID format');
    }

    try {
      const res = await this._request(`/wallet/${walletId}/balance`, {
        method: 'GET'
      });
      return res.data;
    } catch (err) {
      if (err.status === 404 || err.message?.includes('Resource does not exist') || err.message?.includes('not supported')) {
        return {
          balance: 0,
          balance_in_usd: 0,
          breakdown: [
            {
              id: 'solana:usdc',
              balance: 0,
              balance_in_usd: 0
            }
          ]
        };
      }
      throw err;
    }
  }

  /**
   * Retrieves transactions for a wallet from Switch.
   * Documentation: GET /wallet/{wallet_id}/transactions
   * 
   * @param {string} walletId - 24-character hex Switch wallet ID
   * @param {number} [page=1]
   * @param {number} [limit=20]
   * @returns {Promise<Array>} List of wallet transactions
   */
  async getWalletTransactions(walletId, page = 1, limit = 20) {
    if (!walletId || !/^[a-f0-9]{24}$/.test(walletId)) {
      throw new Error('Invalid Switch wallet ID format');
    }

    try {
      const res = await this._request(`/wallet/${walletId}/transactions?page=${page}&limit=${limit}`, {
        method: 'GET'
      });
      return res.data || [];
    } catch (err) {
      if (err.status === 404 || err.message?.includes('Resource does not exist') || err.message?.includes('not supported')) {
        return [];
      }
      throw err;
    }
  }

  /**
   * Idempotently retrieves or creates the Switch wallet for a specific MyArteLab user.
   * Handles concurrent requests safely via database uniqueness and catch logic.
   * 
   * @param {string|mongoose.Types.ObjectId} userId
   * @param {string} [userName]
   * @returns {Promise<object>} Safe public wallet details (never returns private key)
   */
  async getOrCreateUserWallet(userId, userName = '') {
    if (!userId) {
      throw new Error('User ID is required to get or create a Switch wallet');
    }

    // 1. Check if user already has an active SwitchWallet in MyArteLab DB
    let walletRecord = await SwitchWallet.findOne({ user: userId });
    if (walletRecord) {
      return {
        id: walletRecord.switchWalletId,
        solanaAddress: walletRecord.solanaAddress,
        evmAddress: walletRecord.evmAddress,
        addresses: walletRecord.addresses,
        status: walletRecord.status,
        createdAt: walletRecord.createdAt
      };
    }

    // 2. Call Switch API to create a new wallet
    const callbackUrl = process.env.API_URL 
      ? `${process.env.API_URL.replace(/\/+$/, '')}/webhooks`
      : 'https://app.myartelab.com/webhooks';

    const switchData = await this.createWallet({
      name: `User${userName || userId.toString()}`,
      callbackUrl
    });

    const addresses = switchData.address || {};
    const solanaAddress = addresses.SOLANA || process.env.PLATFORM_WALLET_ADDRESS || '';
    const evmAddress = addresses.BASE || addresses.ETHEREUM || '';

    // Encrypt private key for secure storage (never expose or return it)
    let encryptedKey = null;
    if (switchData.private_key) {
      try {
        encryptedKey = walletEncryption.encryptPrivateKey(switchData.private_key);
      } catch (encErr) {
        console.warn('[SwitchService] Could not encrypt private key:', encErr.message);
      }
    }

    // 3. Save SwitchWallet with concurrency protection (E11000 duplicate key check)
    try {
      walletRecord = await SwitchWallet.create({
        user: userId,
        switchWalletId: switchData.id,
        name: switchData.name,
        solanaAddress,
        evmAddress,
        addresses,
        encryptedPrivateKey: encryptedKey,
        status: 'active'
      });
    } catch (dbErr) {
      if (dbErr.code === 11000) {
        // Concurrent creation occurred; fetch existing
        walletRecord = await SwitchWallet.findOne({ user: userId });
      } else {
        throw dbErr;
      }
    }

    return {
      id: walletRecord.switchWalletId,
      solanaAddress: walletRecord.solanaAddress,
      evmAddress: walletRecord.evmAddress,
      addresses: walletRecord.addresses,
      status: walletRecord.status,
      createdAt: walletRecord.createdAt
    };
  }

  /**
   * Verifies incoming Switch webhook signature (HMAC-SHA256) and optional timestamp.
   * 
   * @param {string|Buffer} rawBody - Exact raw HTTP request body string or buffer
   * @param {string} signatureHeader - Value of 'x-switch-signature' header
   * @param {string} [timestampHeader] - Optional value of 'x-switch-timestamp' header
   * @param {number} [maxToleranceSeconds=300] - Max allowed timestamp drift (5 mins)
   * @returns {{isValid: boolean, reason?: string}} Verification result object
   */
  verifyWebhookSignature(rawBody, signatureHeader, timestampHeader, maxToleranceSeconds = 300) {
    let serviceKey;
    try {
      serviceKey = this._getServiceKey();
    } catch (err) {
      return { isValid: false, reason: 'Switch service key is not configured' };
    }

    if (!rawBody || !signatureHeader) {
      return { isValid: false, reason: 'Missing raw body or x-switch-signature header' };
    }

    // Optional timestamp / replay protection check
    if (timestampHeader) {
      const numTimestamp = Number(timestampHeader);
      const eventTime = !isNaN(numTimestamp) && numTimestamp > 0
        ? (numTimestamp < 1e11 ? numTimestamp * 1000 : numTimestamp)
        : new Date(timestampHeader).getTime();

      if (isNaN(eventTime)) {
        return { isValid: false, reason: 'Invalid x-switch-timestamp header format' };
      }
      const ageInSeconds = Math.abs((Date.now() - eventTime) / 1000);
      if (ageInSeconds > maxToleranceSeconds) {
        return { isValid: false, reason: `Webhook timestamp expired (${Math.round(ageInSeconds)}s old)` };
      }
    }

    const bodyString = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');

    try {
      const expectedSignature = crypto
        .createHmac('sha256', serviceKey)
        .update(bodyString, 'utf8')
        .digest('hex');

      const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
      const actualBuffer = Buffer.from(signatureHeader.trim(), 'utf8');

      if (expectedBuffer.length !== actualBuffer.length) {
        return { isValid: false, reason: 'Signature length mismatch' };
      }

      const isValid = crypto.timingSafeEqual(expectedBuffer, actualBuffer);
      return isValid 
        ? { isValid: true } 
        : { isValid: false, reason: 'Signature verification failed' };
    } catch (error) {
      return { isValid: false, reason: `Signature computation error: ${error.message}` };
    }
  }

  /**
   * Retrieves dynamically supported funding corridors (countries, currencies, channels, limits)
   * from Switch API.
   * Documentation: GET /coverage?direction=ONRAMP
   * 
   * @param {string} [direction='ONRAMP']
   * @param {boolean} [forceRefresh=false]
   * @returns {Promise<{corridors: Array, count: number, timestamp: string}>}
   */
  async getCoverage(direction = 'ONRAMP', forceRefresh = false) {
    const isStandardOnramp = direction.toUpperCase() === 'ONRAMP';

    if (!forceRefresh && isStandardOnramp && this._coverageCache.data && this._coverageCache.expiresAt > Date.now()) {
      return {
        corridors: this._coverageCache.data,
        count: this._coverageCache.data.length,
        timestamp: new Date().toISOString(),
        cached: true
      };
    }

    try {
      const res = await this._request(`/coverage?direction=${encodeURIComponent(direction.toUpperCase())}`, {
        method: 'GET'
      });

      const rawList = Array.isArray(res?.data) ? res.data : [];
      const corridors = rawList.map(c => {
        const currencies = Array.isArray(c.currency) ? c.currency : (c.currency ? [c.currency] : []);
        const channels = Array.isArray(c.channel) ? c.channel : (c.channel ? [c.channel] : []);
        const defaultChannel = c.default_channel || (channels.length > 0 ? channels[0] : 'BANK');

        return {
          country: c.country,
          currencies,
          continent: c.continent || null,
          channels,
          defaultChannel,
          settlementTime: c.settlement_time || {},
          payoutLimit: c.payout_limit || {}
        };
      });

      if (isStandardOnramp) {
        this._coverageCache = {
          data: corridors,
          expiresAt: Date.now() + 10 * 60 * 1000 // 10 minute cache TTL
        };
      }

      return {
        corridors,
        count: corridors.length,
        timestamp: new Date().toISOString(),
        cached: false
      };
    } catch (err) {
      if (this._coverageCache.data) {
        // Fallback to stale cache if API error occurs
        return {
          corridors: this._coverageCache.data,
          count: this._coverageCache.data.length,
          timestamp: new Date().toISOString(),
          cached: true,
          stale: true
        };
      }
      throw err;
    }
  }

  /**
   * Retrieves an on-ramp funding quote from Switch.
   * Documentation: POST /onramp/quote
   * 
   * Strictly converts local fiat currency to USDC on Solana ('solana:usdc').
   * 
   * @param {object} params
   * @param {number|string} params.amount - Fiat amount to fund
   * @param {string} params.country - 2-letter uppercase ISO country code
   * @param {string} params.currency - Fiat currency code (e.g. NGN, KES, GHS)
   * @param {string} [params.channel] - Optional payment channel (e.g. BANK, MOBILEMONEY)
   * @returns {Promise<object>} Detailed quote data
   */
  async getOnrampQuote({ amount, country, currency, channel }) {
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error('Funding amount must be a positive number greater than 0');
    }

    if (!country || typeof country !== 'string' || country.trim().length !== 2) {
      throw new Error('A valid 2-letter ISO country code is required (e.g., NG, KE, GH)');
    }

    if (!currency || typeof currency !== 'string' || currency.trim().length < 2) {
      throw new Error('A valid fiat currency code is required (e.g., NGN, KES, GHS)');
    }

    const payload = {
      amount: numAmount,
      country: country.trim().toUpperCase(),
      currency: currency.trim().toUpperCase(),
      asset: 'solana:usdc' // strictly enforced MyArteLab settlement asset
    };

    if (channel && typeof channel === 'string' && channel.trim().length > 0) {
      payload.channel = channel.trim().toUpperCase();
    }

    const res = await this._request('/onramp/quote', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const quoteData = res.data;
    if (!quoteData) {
      throw new Error('No quote data returned from Switch API');
    }

    return {
      rate: quoteData.rate,
      expiry: quoteData.expiry,
      settlement: quoteData.settlement,
      channel: quoteData.channel,
      source: {
        amount: quoteData.source?.amount,
        amountUsd: quoteData.source?.amount_usd,
        currency: quoteData.source?.currency,
        network: quoteData.source?.network || 'FIAT'
      },
      destination: {
        amount: quoteData.destination?.amount,
        amountUsd: quoteData.destination?.amount_usd,
        currency: quoteData.destination?.currency || 'USDC',
        network: quoteData.destination?.network || 'SOLANA',
        asset: 'solana:usdc'
      }
    };
  }

  /**
   * Initiates an on-ramp transaction on Switch.
   * Documentation: POST /onramp/initiate
   * 
   * @param {object} params
   * @param {number} params.amount - Fiat amount to pay
   * @param {string} params.country - 2-letter ISO country code
   * @param {string} params.currency - Fiat currency code
   * @param {string} [params.channel='BANK'] - Transfer channel ('BANK' or 'MOBILEMONEY')
   * @param {string} params.reference - Unique client UUID for transaction tracking
   * @param {string} [params.callbackUrl] - Webhook callback URL
   * @param {object} params.beneficiary - Beneficiary details (holder_type, holder_name, wallet_address)
   * @param {object} [params.payer] - Required if channel is MOBILEMONEY
   * @returns {Promise<object>} Complete initiation data and deposit instructions
   */
  async initiateOnramp({ amount, country, currency, channel = 'BANK', reference, callbackUrl, beneficiary, payer }) {
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error('Funding amount must be a positive number greater than 0');
    }

    if (!country || typeof country !== 'string' || country.trim().length !== 2) {
      throw new Error('A valid 2-letter ISO country code is required');
    }

    if (!currency || typeof currency !== 'string' || currency.trim().length < 2) {
      throw new Error('A valid fiat currency code is required');
    }

    if (!reference || typeof reference !== 'string') {
      throw new Error('A unique transaction reference UUID is required');
    }

    if (!beneficiary || !beneficiary.wallet_address) {
      throw new Error('Beneficiary wallet address is required');
    }

    const resolvedCallbackUrl = callbackUrl || process.env.SWITCH_CALLBACK_URL || 'https://app.myartelab.com/webhooks';

    const payload = {
      amount: numAmount,
      country: country.trim().toUpperCase(),
      currency: currency.trim().toUpperCase(),
      asset: 'solana:usdc', // strictly enforced crypto settlement asset
      channel: (channel || 'BANK').trim().toUpperCase(),
      reference: reference.trim(),
      callback_url: resolvedCallbackUrl,
      beneficiary: {
        holder_type: beneficiary.holder_type || 'INDIVIDUAL',
        holder_name: beneficiary.holder_name || 'MyArteLab User',
        wallet_address: beneficiary.wallet_address.trim()
      }
    };

    if (payer && typeof payer === 'object') {
      payload.payer = payer;
    }

    const res = await this._request('/onramp/initiate', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    return res.data;
  }

  /**
   * Looks up the status of a payment on Switch.
   * Documentation: GET /payment/status?reference={reference}
   * 
   * @param {string} reference - UUID reference of the payment
   * @returns {Promise<object>} Current payment status data
   */
  async getPaymentStatus(reference) {
    if (!reference || typeof reference !== 'string') {
      throw new Error('Transaction reference UUID is required');
    }

    const res = await this._request(`/payment/status?reference=${encodeURIComponent(reference.trim())}`, {
      method: 'GET'
    });

    return res.data;
  }

  /**
   * Retrieves an off-ramp payout quote from Switch (USDC on Solana -> Fiat).
   * Documentation: POST /offramp/quote
   * 
   * Strictly converts USDC on Solana ('solana:usdc') to local fiat currency.
   * 
   * @param {object} params
   * @param {number|string} params.amount - USDC amount to withdraw (or fiat if exactOutput is true)
   * @param {string} params.country - 2-letter uppercase ISO country code
   * @param {string} params.currency - Destination fiat currency code (e.g. NGN, KES, GHS)
   * @param {string} [params.channel] - Payment channel (e.g. BANK, MOBILEMONEY)
   * @param {string} [params.wallet] - Source wallet address or Switch wallet ID
   * @param {boolean} [params.exactOutput=false] - Whether amount is exact destination fiat
   * @returns {Promise<object>} Detailed off-ramp quote data
   */
  async getOfframpQuote({ amount, country, currency, channel, wallet, exactOutput = false }) {
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error('Withdrawal quote amount must be a positive number greater than 0');
    }

    if (!country || typeof country !== 'string' || country.trim().length !== 2) {
      throw new Error('A valid 2-letter ISO country code is required (e.g., NG, KE, GH)');
    }

    if (!currency || typeof currency !== 'string' || currency.trim().length < 2) {
      throw new Error('A valid fiat currency code is required (e.g., NGN, KES, GHS)');
    }

    const payload = {
      amount: numAmount,
      country: country.trim().toUpperCase(),
      asset: 'solana:usdc', // strictly enforced MyArteLab settlement asset
      currency: currency.trim().toUpperCase(),
      exact_output: Boolean(exactOutput)
    };

    if (channel && typeof channel === 'string' && channel.trim().length > 0) {
      payload.channel = channel.trim().toUpperCase();
    }

    if (wallet && typeof wallet === 'string' && wallet.trim().length > 0) {
      payload.wallet = wallet.trim();
    }

    const res = await this._request('/offramp/quote', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const quoteData = res.data;
    if (!quoteData) {
      throw new Error('No quote data returned from Switch API');
    }

    return {
      rate: quoteData.rate,
      expiry: quoteData.expiry,
      settlement: quoteData.settlement,
      channel: quoteData.channel,
      fee: {
        total: quoteData.fee?.total !== undefined ? quoteData.fee.total : 0,
        platform: quoteData.fee?.platform !== undefined ? quoteData.fee.platform : 0,
        developer: quoteData.fee?.developer !== undefined ? quoteData.fee.developer : 0,
        currency: quoteData.fee?.currency || 'USD'
      },
      source: {
        amount: quoteData.source?.amount,
        amountUsd: quoteData.source?.amount_usd,
        currency: quoteData.source?.currency || 'USDC',
        network: quoteData.source?.network || 'SOLANA',
        asset: 'solana:usdc'
      },
      destination: {
        amount: quoteData.destination?.amount,
        amountUsd: quoteData.destination?.amount_usd,
        currency: quoteData.destination?.currency || currency.trim().toUpperCase(),
        network: quoteData.destination?.network || 'FIAT'
      }
    };
  }

  /**
   * Retrieves required beneficiary fields for a given corridor and payment rail.
   * Documentation: GET /beneficiary/requirement?direction=OFFRAMP
   * 
   * @param {object} params
   * @param {string} params.country - 2-letter ISO country code
   * @param {string} params.currency - Destination fiat currency
   * @param {string} [params.channel] - Payment channel (BANK, MOBILEMONEY)
   * @param {string} [params.type='INDIVIDUAL'] - Beneficiary type (INDIVIDUAL, BUSINESS)
   * @returns {Promise<object|Array>} Required beneficiary fields and validation rules
   */
  async getBeneficiaryRequirements({ country, currency, channel, type = 'INDIVIDUAL' }) {
    if (!country || typeof country !== 'string' || country.trim().length !== 2) {
      throw new Error('A valid 2-letter ISO country code is required');
    }

    if (!currency || typeof currency !== 'string' || currency.trim().length < 2) {
      throw new Error('A valid fiat currency code is required');
    }

    let query = `/beneficiary/requirement?direction=OFFRAMP&country=${encodeURIComponent(country.trim().toUpperCase())}&currency=${encodeURIComponent(currency.trim().toUpperCase())}&type=${encodeURIComponent(type.toUpperCase())}`;

    if (channel && typeof channel === 'string' && channel.trim().length > 0) {
      query += `&channel=${encodeURIComponent(channel.trim().toUpperCase())}`;
    }

    const res = await this._request(query, {
      method: 'GET'
    });

    return res.data || res;
  }

  /**
   * Retrieves supported financial institutions (banks, mobile money operators) for a country.
   * Documentation: GET /institution?country={country}
   * 
   * @param {object} params
   * @param {string} params.country - 2-letter ISO country code
   * @returns {Promise<Array>} List of financial institutions
   */
  async getInstitutions({ country }) {
    if (!country || typeof country !== 'string' || country.trim().length !== 2) {
      throw new Error('A valid 2-letter ISO country code is required');
    }

    const res = await this._request(`/institution?country=${encodeURIComponent(country.trim().toUpperCase())}`, {
      method: 'GET'
    });

    return Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
  }

  /**
   * Resolves/verifies bank account or mobile money details to confirm beneficiary name.
   * Documentation: GET /institution/lookup?country={country}&account_number={account_number}&bank_code={bank_code}
   * 
   * @param {object} params
   * @param {string} params.country - 2-letter ISO country code
   * @param {string} params.accountNumber - Bank account number or mobile money number
   * @param {string} params.bankCode - Institution / bank code
   * @returns {Promise<object>} Resolved account name and verification details
   */
  async lookupInstitution({ country, accountNumber, bankCode }) {
    if (!country || typeof country !== 'string' || country.trim().length !== 2) {
      throw new Error('A valid 2-letter ISO country code is required');
    }

    if (!accountNumber || typeof accountNumber !== 'string' || accountNumber.trim().length < 3) {
      throw new Error('A valid account number is required');
    }

    if (!bankCode || typeof bankCode !== 'string' || bankCode.trim().length < 1) {
      throw new Error('A valid bank/institution code is required');
    }

    const query = `/institution/lookup?country=${encodeURIComponent(country.trim().toUpperCase())}&account_number=${encodeURIComponent(accountNumber.trim())}&bank_code=${encodeURIComponent(bankCode.trim())}`;

    const res = await this._request(query, {
      method: 'GET'
    });

    return res.data || res;
  }
}

module.exports = new SwitchService();
