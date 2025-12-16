const { Keypair } = require('@solana/web3.js');
const walletEncryption = require('./walletEncryption');
const { isValidWalletAddress } = require('../utils/validators');

class SolanaWalletService {
  generateWallet() {
    const keypair = Keypair.generate();
    const address = keypair.publicKey.toBase58();
    const secretKey = keypair.secretKey;
    const encryptedPrivateKey = walletEncryption.encryptPrivateKey(secretKey);

    return {
      address,
      encryptedPrivateKey,
      balance: 0,
      currency: 'USDC'
    };
  }

  encryptPrivateKey(secretKey) {
    return walletEncryption.encryptPrivateKey(secretKey);
  }

  decryptPrivateKey(encryptedPrivateKey) {
    return walletEncryption.decryptPrivateKey(encryptedPrivateKey);
  }

  isValidAddress(address) {
    return isValidWalletAddress(address, 'Solana');
  }

  getKeypairFromEncrypted(encryptedPrivateKey) {
    const secretKey = this.decryptPrivateKey(encryptedPrivateKey);
    return Keypair.fromSecretKey(secretKey);
  }

  migrateToNewEncryption(oldEncryptedKey) {
    return walletEncryption.migrateToNewEncryption(oldEncryptedKey);
  }

  isLegacyFormat(encryptedPrivateKey) {
    return walletEncryption.isLegacyFormat(encryptedPrivateKey);
  }
}

module.exports = new SolanaWalletService();
