const crypto = require('crypto');
const { WALLET_ENCRYPTION } = require('../utils/constants');

class WalletEncryptionService {
  constructor() {
    this.validateConfiguration();
  }

  validateConfiguration() {
    if (!process.env.WALLET_ENCRYPTION_KEY) {
      throw new Error('WALLET_ENCRYPTION_KEY is not set in environment variables');
    }

    if (process.env.WALLET_ENCRYPTION_KEY === process.env.JWT_SECRET) {
      throw new Error('WALLET_ENCRYPTION_KEY must be different from JWT_SECRET');
    }

    if (process.env.WALLET_ENCRYPTION_KEY.length < 32) {
      throw new Error('WALLET_ENCRYPTION_KEY must be at least 32 characters');
    }
  }

  getEncryptionKey() {
    return crypto
      .createHash('sha256')
      .update(process.env.WALLET_ENCRYPTION_KEY)
      .digest();
  }

  encryptPrivateKey(secretKey) {
    try {
      const key = this.getEncryptionKey();
      const iv = crypto.randomBytes(WALLET_ENCRYPTION.IV_LENGTH);
      const cipher = crypto.createCipheriv(
        WALLET_ENCRYPTION.ALGORITHM,
        key,
        iv
      );

      let encrypted = cipher.update(Buffer.from(secretKey));
      encrypted = Buffer.concat([encrypted, cipher.final()]);

      return `${WALLET_ENCRYPTION.VERSION}:${iv.toString('hex')}:${encrypted.toString('hex')}`;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt private key');
    }
  }

  decryptPrivateKey(encryptedPrivateKey) {
    try {
      const parts = encryptedPrivateKey.split(':');

      if (parts.length !== 3) {
        throw new Error('Invalid encrypted private key format');
      }

      const [version, ivHex, encryptedHex] = parts;

      if (version !== WALLET_ENCRYPTION.VERSION) {
        return this.decryptLegacyKey(encryptedPrivateKey);
      }

      const key = this.getEncryptionKey();
      const iv = Buffer.from(ivHex, 'hex');
      const encrypted = Buffer.from(encryptedHex, 'hex');

      const decipher = crypto.createDecipheriv(
        WALLET_ENCRYPTION.ALGORITHM,
        key,
        iv
      );

      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return new Uint8Array(decrypted);
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt private key');
    }
  }

  decryptLegacyKey(encryptedPrivateKey) {
    try {
      const parts = encryptedPrivateKey.split(':');

      if (parts.length !== 2) {
        throw new Error('Invalid legacy encrypted private key format');
      }

      const encryptionKey = crypto
        .createHash('sha256')
        .update(process.env.JWT_SECRET)
        .digest();

      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = Buffer.from(parts[1], 'hex');

      const decipher = crypto.createDecipheriv(
        WALLET_ENCRYPTION.ALGORITHM,
        encryptionKey,
        iv
      );

      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return new Uint8Array(decrypted);
    } catch (error) {
      console.error('Legacy decryption error:', error);
      throw new Error('Failed to decrypt legacy private key');
    }
  }

  migrateToNewEncryption(oldEncryptedKey) {
    try {
      const decrypted = this.decryptLegacyKey(oldEncryptedKey);
      return this.encryptPrivateKey(decrypted);
    } catch (error) {
      console.error('Migration error:', error);
      throw new Error('Failed to migrate encryption');
    }
  }

  isLegacyFormat(encryptedPrivateKey) {
    const parts = encryptedPrivateKey.split(':');
    return parts.length === 2;
  }

  isNewFormat(encryptedPrivateKey) {
    const parts = encryptedPrivateKey.split(':');
    return parts.length === 3 && parts[0] === WALLET_ENCRYPTION.VERSION;
  }
}

module.exports = new WalletEncryptionService();
