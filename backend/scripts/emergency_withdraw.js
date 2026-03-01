require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const { Connection, PublicKey, Keypair, TransactionMessage, VersionedTransaction, clusterApiUrl, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { getAssociatedTokenAddress, getAccount, createTransferInstruction, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const bip39 = require('bip39');
const { derivePath } = require('ed25519-hd-key');

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

    let activeKeypair = null;
    const tryKeySources = async () => {
        if (user.wallet.tsaraEncryptedPrivateKey) {
            try {
                const decrypted = walletEncryptionService.decryptPrivateKey(user.wallet.tsaraEncryptedPrivateKey);
                const secretKeyStr = Buffer.from(decrypted).toString('utf8');
                const secretKeyBytes = new Uint8Array(Buffer.from(secretKeyStr, 'hex'));
                if (secretKeyBytes.length === 64) {
                    const kp = Keypair.fromSecretKey(secretKeyBytes);
                    if (kp.publicKey.toBase58() === sourceAddress) return kp;
                }
            } catch (e) { }
        }
        if (user.wallet.tsaraMnemonic) {
            try {
                const mnemonicText = Buffer.from(walletEncryptionService.decryptPrivateKey(user.wallet.tsaraMnemonic)).toString('utf8');
                const seed = await bip39.mnemonicToSeed(mnemonicText);
                const path = `m/44'/501'/0'/0'`;
                const { key } = derivePath(path, seed.toString("hex"));
                const kp = Keypair.fromSeed(key);
                if (kp.publicKey.toBase58() === sourceAddress) return kp;
            } catch (e) { }
        }
        return null;
    };

    activeKeypair = await tryKeySources();
    if (!activeKeypair) {
        console.log("❌ Could not find private key.");
        process.exit(1);
    }

    const activePubkey = activeKeypair.publicKey;
    const rpcUrl = process.env.SOLANA_RPC_URL || clusterApiUrl('mainnet-beta');
    const connection = new Connection(rpcUrl, 'confirmed');

    const usdcMint = new PublicKey(USDC_MINT);
    const destPubKey = new PublicKey(destAddress);

    const solBalance = await connection.getBalance(activePubkey);
    console.log(`💰 SOL Balance: ${solBalance / LAMPORTS_PER_SOL} SOL`);

    const sourceAta = await getAssociatedTokenAddress(usdcMint, activePubkey);
    let usdcBal = 0;
    try {
        const accountInfo = await getAccount(connection, sourceAta);
        usdcBal = Number(accountInfo.amount) / 1e6;
    } catch (e) { }
    console.log(`💵 USDC Balance: ${usdcBal} USDC`);

    if (usdcBal === 0) {
        console.log("❌ No USDC balance found.");
        process.exit(1);
    }

    let amount = usdcBal;
    if (amountToWithdraw) amount = parseFloat(amountToWithdraw);

    console.log("Checking destination account type...");
    const destInfo = await connection.getAccountInfo(destPubKey);

    let destAta = null;
    let needsCreation = false;

    if (destInfo && destInfo.owner.equals(TOKEN_PROGRAM_ID)) {
        console.log("✅ Destination appears to be a Token Account already. Using it directly.");
        destAta = destPubKey;
    } else {
        console.log("Destination is a wallet address. Checking for its USDC Associated Token Account...");
        destAta = await getAssociatedTokenAddress(usdcMint, destPubKey);
        try {
            await getAccount(connection, destAta);
            console.log("✅ Destination USDC account already exists.");
        } catch (e) {
            console.log("⚠️ Destination USDC account DOES NOT exist.");
            needsCreation = true;
        }
    }

    const instructions = [];
    if (needsCreation) {
        const RENT_MIN = 0.00203928;
        console.log(`\n🚨 COST BREAKDOWN:`);
        console.log(`- Token Account Creation Rent: ${RENT_MIN} SOL`);
        console.log(`- Your Wallet SOL Balance:    ${solBalance / LAMPORTS_PER_SOL} SOL`);
        console.log(`- Shortfall:                  ${(RENT_MIN - (solBalance / LAMPORTS_PER_SOL)).toFixed(6)} SOL`);

        console.log("\n❌ Withdrawal Failed: Insufficient SOL to create the receiver's USDC account.");
        console.log("To fix this, either:");
        console.log("1. Send at least 0.0015 SOL ($0.25) to: " + activePubkey.toBase58());
        console.log("2. OR provide a destination address that already has a USDC account.");
        process.exit(1);
    }

    instructions.push(
        createTransferInstruction(
            sourceAta,
            destAta,
            activePubkey,
            BigInt(Math.round(amount * 1e6))
        )
    );

    console.log(`\n🚀 Sending transaction to withdraw ${amount} USDC...`);
    const { blockhash } = await connection.getLatestBlockhash();
    const message = new TransactionMessage({
        payerKey: activePubkey,
        recentBlockhash: blockhash,
        instructions
    }).compileToV0Message();

    const tx = new VersionedTransaction(message);
    tx.sign([activeKeypair]);

    try {
        const signature = await connection.sendTransaction(tx);
        console.log(`✅ Transaction sent! Signature: ${signature}`);
        console.log(`🔗 Explorer: https://explorer.solana.com/tx/${signature}`);
        await connection.confirmTransaction(signature, "confirmed");
        console.log("✅ Transaction fully confirmed!");
    } catch (err) {
        console.error("❌ Transaction failed:", err.message);
    }

    process.exit(0);
}

main().catch(console.error);
