require("dotenv").config();
const bip39 = require("bip39");
const { derivePath } = require("ed25519-hd-key");
const { Keypair } = require("@solana/web3.js");
const walletEncryptionService = require("./src/services/walletEncryption");

async function run() {
    const mnemonic = bip39.generateMnemonic();
    console.log("Original mnemonic:", mnemonic);

    const seed = await bip39.mnemonicToSeed(mnemonic);
    const { key } = derivePath(`m/44'/501'/0'/0'`, seed.toString("hex"));
    const keypair = Keypair.fromSeed(key);
    console.log("Original address:", keypair.publicKey.toBase58());

    const encryptedMnemonic = walletEncryptionService.encryptPrivateKey(mnemonic);

    const decryptedBytes = walletEncryptionService.decryptPrivateKey(encryptedMnemonic);
    const decryptedStr = Buffer.from(decryptedBytes).toString("utf8");
    console.log("Decrypted mnemonic:", decryptedStr);

    const seed2 = await bip39.mnemonicToSeed(decryptedStr);
    const { key: key2 } = derivePath(`m/44'/501'/0'/0'`, seed2.toString("hex"));
    const kp2 = Keypair.fromSeed(key2);
    console.log("Re-derived address:", kp2.publicKey.toBase58());
}
run();
