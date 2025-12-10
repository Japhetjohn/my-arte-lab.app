const { Keypair } = require('@solana/web3.js');
const crypto = require('crypto');

/**
 * Solana Wallet Service
 * Handles generation and management of Solana wallets for users
 */
class SolanaWalletService {
  /**
   * Generate a new Solana wallet keypair
   * @returns {Object} Wallet object with address and encrypted private key
   */
  generateWallet() {
    // Generate a new Solana keypair
    const keypair = Keypair.generate();

    // Get the public key (wallet address)
    const address = keypair.publicKey.toBase58();

    // Get the secret key (private key) as array
    const secretKey = keypair.secretKey;

    // Encrypt the private key for secure storage
    const encryptedPrivateKey = this.encryptPrivateKey(secretKey);

    return {
      address,
      encryptedPrivateKey,
      balance: 0,
      currency: 'USDC'
    };
  }

  /**
   * Encrypt private key using AES-256-CBC
   * @param {Uint8Array} secretKey - The Solana secret key
   * @returns {string} Encrypted private key as hex string
   */
  encryptPrivateKey(secretKey) {
    // Use JWT_SECRET as encryption key (in production, use a dedicated encryption key)
    const encryptionKey = crypto
      .createHash('sha256')
      .update(process.env.JWT_SECRET)
      .digest();

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey, iv);

    let encrypted = cipher.update(Buffer.from(secretKey));
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    // Return IV + encrypted data as hex string
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  /**
   * Decrypt private key
   * @param {string} encryptedPrivateKey - Encrypted private key hex string
   * @returns {Uint8Array} Decrypted secret key
   */
  decryptPrivateKey(encryptedPrivateKey) {
    const encryptionKey = crypto
      .createHash('sha256')
      .update(process.env.JWT_SECRET)
      .digest();

    const parts = encryptedPrivateKey.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = Buffer.from(parts[1], 'hex');

    const decipher = crypto.createDecipheriv('aes-256-cbc', encryptionKey, iv);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return new Uint8Array(decrypted);
  }

  /**
   * Validate a Solana address
   * @param {string} address - Solana address to validate
   * @returns {boolean} True if valid
   */
  isValidAddress(address) {
    try {
      // Solana addresses are base58 encoded and typically 32-44 characters
      if (!address || typeof address !== 'string') {
        return false;
      }

      // Basic validation: check length and base58 characters
      const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
      return base58Regex.test(address);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get keypair from encrypted private key
   * @param {string} encryptedPrivateKey - Encrypted private key
   * @returns {Keypair} Solana keypair
   */
  getKeypairFromEncrypted(encryptedPrivateKey) {
    const secretKey = this.decryptPrivateKey(encryptedPrivateKey);
    return Keypair.fromSecretKey(secretKey);
  }
}

module.exports = new SolanaWalletService();
