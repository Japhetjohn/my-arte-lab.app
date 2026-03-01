require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const { Connection, PublicKey, Keypair, TransactionMessage, VersionedTransaction, clusterApiUrl, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { getAssociatedTokenAddress, getAccount, createTransferInstruction, getOrCreateAssociatedTokenAccount } = require('@solana/spl-token');
const bip39 = require('bip39');
const { derivePath } = require('ed25519-hd-key');

// Use the project's models and services
const User = require('../src/models/User');
const walletEncryptionService = require('../src/services/walletEncryption');

const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

async function main() {
    const sourceAddress = process.argv[2];
    const destAddress = process.argv[3];
    const amountToWithdraw = process.argv[4];

    if (!sourceAddress || !destAddress) {
        console.log("Usage: node emergency_withdraw.js <source_address> <destination_address> [amount_usdc]");
        process.exit(1);
    }

    console.log("Connecting to database...");
    await mongoose.connect(process.env.MONGODB_URI);

    console.log(`Looking up user with Tsara address: ${sourceAddress}...`);
    const user = await User.findOne({ 'wallet.tsaraAddress': sourceAddress }).select('+wallet.tsaraMnemonic +wallet.tsaraEncryptedPrivateKey +encryptedPrivateKey');
    if (!user) {
        console.log("❌ User not found for address:", sourceAddress);
        process.exit(1);
    }

    console.log(`✅ Found user: ${user.email}`);

    let activeKeypair = null;

    // Try decrypting each potential key source
    const tryKeySources = async () => {
        // Source 1: tsaraEncryptedPrivateKey (stored as hex string)
        if (user.wallet.tsaraEncryptedPrivateKey) {
            console.log("Checking tsaraEncryptedPrivateKey...");
            try {
                const decrypted = walletEncryptionService.decryptPrivateKey(user.wallet.tsaraEncryptedPrivateKey);
                const secretKeyStr = Buffer.from(decrypted).toString('utf8');
                const secretKeyBytes = new Uint8Array(Buffer.from(secretKeyStr, 'hex'));
                if (secretKeyBytes.length === 64) {
                    const kp = Keypair.fromSecretKey(secretKeyBytes);
                    if (kp.publicKey.toBase58() === sourceAddress) {
                        console.log("✅ Found match in tsaraEncryptedPrivateKey!");
                        return kp;
                    }
                }
                // Try raw bytes too
                if (decrypted.length === 64) {
                    const kp = Keypair.fromSecretKey(decrypted);
                    if (kp.publicKey.toBase58() === sourceAddress) {
                        console.log("✅ Found match in tsaraEncryptedPrivateKey (raw bytes)!");
                        return kp;
                    }
                }
            } catch (e) {
                console.log(`  Failed: ${e.message}`);
            }
        }

        // Source 2: Legacy encryptedPrivateKey
        if (user.encryptedPrivateKey) {
            console.log("Checking legacy encryptedPrivateKey...");
            try {
                const decrypted = walletEncryptionService.decryptPrivateKey(user.encryptedPrivateKey);
                if (decrypted.length === 64) {
                    const kp = Keypair.fromSecretKey(decrypted);
                    if (kp.publicKey.toBase58() === sourceAddress) {
                        console.log("✅ Found match in legacy encryptedPrivateKey!");
                        return kp;
                    }
                }
                const secretKeyStr = Buffer.from(decrypted).toString('utf8');
                if (secretKeyStr.length === 128) {
                    const secretKeyBytes = new Uint8Array(Buffer.from(secretKeyStr, 'hex'));
                    const kp = Keypair.fromSecretKey(secretKeyBytes);
                    if (kp.publicKey.toBase58() === sourceAddress) {
                        console.log("✅ Found match in legacy encryptedPrivateKey (hex)!");
                        return kp;
                    }
                }
            } catch (e) {
                console.log(`  Failed: ${e.message}`);
            }
        }

        // Source 3: tsaraMnemonic
        if (user.wallet.tsaraMnemonic) {
            console.log("Checking tsaraMnemonic...");
            try {
                const mnemonicText = Buffer.from(walletEncryptionService.decryptPrivateKey(user.wallet.tsaraMnemonic)).toString('utf8');
                const seed = await bip39.mnemonicToSeed(mnemonicText);

                const paths = [
                    `m/44'/501'/0'/0'`,
                    `m/44'/501'/0'`,
                    `m/44'/501'/1'/0'`,
                    `m/44'/501'/0'/0`,
                    `m/44'/501'/1'`,
                    `m/501'/0'/0'/0'`,
                    `m/501'/0'/0/0`
                ];

                for (const path of paths) {
                    try {
                        const { key } = derivePath(path, seed.toString("hex"));
                        const kp = Keypair.fromSeed(key);
                        if (kp.publicKey.toBase58() === sourceAddress) {
                            console.log(`✅ Found match in mnemonic with path ${path}!`);
                            return kp;
                        }
                    } catch (e) { }
                }
            } catch (e) {
                console.log(`  Failed: ${e.message}`);
            }
        }

        return null;
    };

    activeKeypair = await tryKeySources();

    if (!activeKeypair) {
        console.log("❌ Could not find any private key matching the source address.");
        process.exit(1);
    }

    const activePubkey = activeKeypair.publicKey;
    console.log(`✅ Keypair verified for: ${activePubkey.toBase58()}`);

    // Connect to Solana
    const rpcUrl = process.env.SOLANA_RPC_URL || clusterApiUrl('mainnet-beta');
    console.log(`Connecting to Solana network: ${rpcUrl}`);
    const connection = new Connection(rpcUrl, 'confirmed');

    const usdcMint = new PublicKey(USDC_MINT);
    const destPubKey = new PublicKey(destAddress);

    // Check balances
    const solBalance = await connection.getBalance(activePubkey);
    console.log(`💰 SOL Balance: ${solBalance / LAMPORTS_PER_SOL} SOL`);

    const ata = await getAssociatedTokenAddress(usdcMint, activePubkey);
    let usdcBal = 0;
    try {
        const accountInfo = await getAccount(connection, ata);
        usdcBal = Number(accountInfo.amount) / 1e6;
    } catch (e) {
        // ATA might not exist
    }
    console.log(`💵 USDC Balance: ${usdcBal} USDC`);

    if (usdcBal === 0) {
        console.log("❌ No USDC balance found to withdraw.");
        process.exit(1);
    }

    let amount = usdcBal;
    if (amountToWithdraw) {
        amount = parseFloat(amountToWithdraw);
    }

    if (solBalance < 0.0001 * LAMPORTS_PER_SOL) {
        console.log("❌ Insufficient SOL for transaction fees. Need ~0.0001 SOL.");
        process.exit(1);
    }

    console.log(`\n🚀 Withdrawing ${amount} USDC to ${destAddress}...`);

    // Ensure destination has USDC ATA
    console.log("Ensuring destination has USDC token account...");
    const toTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        activeKeypair,
        usdcMint,
        destPubKey
    );
    console.log(`✅ Destination Token Account: ${toTokenAccount.address.toBase58()}`);

    const instructions = [
        createTransferInstruction(
            ata,
            toTokenAccount.address,
            activePubkey,
            BigInt(Math.round(amount * 1e6))
        )
    ];

    console.log("Submitting transaction...");
    const { blockhash } = await connection.getLatestBlockhash();
    const message = new TransactionMessage({
        payerKey: activePubkey,
        recentBlockhash: blockhash,
        instructions
    });

    const tx = new VersionedTransaction(message.compileToV0Message());
    tx.sign([activeKeypair]);

    try {
        const signature = await connection.sendTransaction(tx);
        console.log(`✅ Transaction sent! Signature: ${signature}`);
        console.log(`🔗 Explorer: https://explorer.solana.com/tx/${signature}`);

        console.log("Waiting for confirmation...");
        await connection.confirmTransaction(signature, "confirmed");
        console.log("✅ Transaction fully confirmed!");
    } catch (err) {
        console.error("❌ Transaction failed:", err.message);
    }

    process.exit(0);
}

main().catch(console.error);
