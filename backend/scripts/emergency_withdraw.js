require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const { Connection, PublicKey, Keypair, TransactionMessage, VersionedTransaction, clusterApiUrl, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { getAssociatedTokenAddress, getAccount, createTransferInstruction, getOrCreateAssociatedTokenAccount } = require('@solana/spl-token');
const bip39 = require('bip39');
const { derivePath } = require('ed25519-hd-key');

// Try to use the project's models and services
try {
    const User = require('../src/models/User');
    const walletEncryptionService = require('../src/services/walletEncryption');

    const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

    async function main() {
        const sourceAddress = process.argv[2];
        const destAddress = process.argv[3];
        const amountToWithdraw = process.argv[4];

        if (!sourceAddress || !destAddress) {
            console.log("Usage: node emergency_withdraw.js <source_address> <destination_address> [amount_usdc]");
            console.log("Leave amount_usdc blank to withdraw max");
            process.exit(1);
        }

        console.log("Connecting to database...");
        await mongoose.connect(process.env.MONGODB_URI);

        console.log(`Looking up user with Tsara address: ${sourceAddress}...`);
        const user = await User.findOne({ 'wallet.tsaraAddress': sourceAddress }).select('+wallet.tsaraMnemonic');
        if (!user) {
            console.log("❌ User not found for address:", sourceAddress);
            process.exit(1);
        }

        console.log(`✅ Found user: ${user.email}`);

        // Decrypt Mnemonic exactly like TsaraService does
        const mnemonicBuffer = walletEncryptionService.decryptPrivateKey(user.wallet.tsaraMnemonic);
        const mnemonicStr = Buffer.from(mnemonicBuffer).toString('utf8');
        const seed = await bip39.mnemonicToSeed(mnemonicStr);

        let senderKeypair = null;
        let foundPath = null;
        console.log(`Searching for derivation path matching: ${sourceAddress}...`);

        // 1. Try standard paths
        for (let i = 0; i < 20; i++) {
            const pathsToTry = [
                `m/44'/501'/${i}'/0'`,
                `m/44'/501'/${i}'`,
                `m/501'/${i}'/0/0`
            ];

            for (const path of pathsToTry) {
                try {
                    const { key } = derivePath(path, seed.toString("hex"));
                    const kp = Keypair.fromSeed(key);
                    if (kp.publicKey.toBase58() === sourceAddress) {
                        senderKeypair = kp;
                        foundPath = path;
                        break;
                    }
                } catch (e) { }
            }
            if (senderKeypair) break;
        }

        // 2. Try raw seed (Phantom style)
        if (!senderKeypair) {
            try {
                const kp = Keypair.fromSeed(seed.slice(0, 32));
                if (kp.publicKey.toBase58() === sourceAddress) {
                    senderKeypair = kp;
                    foundPath = "Raw Seed (Phantom)";
                }
            } catch (e) { }
        }

        if (!senderKeypair) {
            console.log("❌ Could not derive matching public key from mnemonic!");
            process.exit(1);
        }
        console.log(`✅ Wallet unlocked using path ${foundPath}. Public Key matches: true`);

        console.log(`✅ Wallet unlocked. Public Key matches: ${senderKeypair.publicKey.toBase58() === sourceAddress}`);

        // Connect to Solana
        const rpcUrl = process.env.SOLANA_RPC_URL || clusterApiUrl('mainnet-beta');
        console.log("Connecting to Solana network...");
        const connection = new Connection(rpcUrl, 'confirmed');

        // Check SOL balance
        const solBalance = await connection.getBalance(senderKeypair.publicKey);
        console.log(`💰 SOL Balance: ${solBalance / LAMPORTS_PER_SOL} SOL`);

        if (solBalance === 0) {
            console.log("❌ Warning: Wallet has 0 SOL. You need SOL to pay for the transaction fee.");
        }

        const usdcMint = new PublicKey(USDC_MINT);
        const destPubKey = new PublicKey(destAddress);

        // Get source ATA
        const sourceAta = await getAssociatedTokenAddress(usdcMint, senderKeypair.publicKey);
        let balanceUSDC = 0;
        try {
            const accountInfo = await getAccount(connection, sourceAta);
            balanceUSDC = Number(accountInfo.amount) / 1e6;
        } catch (e) {
            console.log("❌ No USDC associated token account found for sender. Balance is 0.");
            process.exit(1);
        }

        console.log(`💵 USDC Balance: ${balanceUSDC} USDC`);

        let amount = balanceUSDC;
        if (amountToWithdraw) {
            amount = parseFloat(amountToWithdraw);
        }

        if (amount <= 0 || amount > balanceUSDC) {
            console.log(`❌ Invalid amount to withdraw: ${amount}. Max available: ${balanceUSDC}`);
            process.exit(1);
        }

        console.log(`\n🚀 Preparing to withdraw ${amount} USDC to ${destAddress}...`);
        console.log(`(Fee payer: Sender - ${senderKeypair.publicKey.toBase58()})`);

        // Get or Create Dest ATA (Requires SOL for rent if creation is needed)
        console.log("Ensuring destination has USDC token account...");
        const toTokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            senderKeypair, // Payer of rent
            usdcMint,
            destPubKey
        );
        console.log(`✅ Destination Token Account: ${toTokenAccount.address.toBase58()}`);

        const instructions = [
            createTransferInstruction(
                sourceAta,
                toTokenAccount.address,
                senderKeypair.publicKey,
                BigInt(Math.round(amount * 1e6))
            )
        ];

        console.log("Submitting transaction...");
        const { blockhash } = await connection.getLatestBlockhash();
        const message = new TransactionMessage({
            payerKey: senderKeypair.publicKey,
            recentBlockhash: blockhash,
            instructions
        });

        const tx = new VersionedTransaction(message.compileToV0Message());
        tx.sign([senderKeypair]);

        try {
            const signature = await connection.sendTransaction(tx);
            console.log(`✅ Transaction sent! Signature: ${signature}`);
            console.log(`🔗 Explorer: https://explorer.solana.com/tx/${signature}`);

            console.log("Waiting for confirmation (this may take a few seconds)...");
            await connection.confirmTransaction(signature, "confirmed");
            console.log("✅ Transaction fully confirmed!");
        } catch (err) {
            console.error("❌ Transaction failed:", err.message);
        }

        process.exit(0);
    }

    main().catch(console.error);

} catch (err) {
    console.error("Failed to load generic tools:", err);
}
