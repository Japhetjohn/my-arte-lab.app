require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const { Connection, PublicKey, Keypair, SystemProgram, Transaction, clusterApiUrl, LAMPORTS_PER_SOL, sendAndConfirmTransaction } = require('@solana/web3.js');

const User = require('../src/models/User');
const tsaraServiceClass = require('../src/services/tsaraService');
const tsaraService = new tsaraServiceClass();

async function main() {
    const sourceAddress = process.argv[2];
    const destAddress = process.argv[3];

    if (!sourceAddress || !destAddress) {
        console.log("Usage: node sweep_sol.js <source_address> <destination_address>");
        process.exit(1);
    }

    console.log("Connecting to database...");
    await mongoose.connect(process.env.MONGODB_URI);

    console.log(`Looking up user with address: ${sourceAddress}...`);
    const user = await User.findOne({ 'wallet.tsaraAddress': sourceAddress }).select('+wallet.tsaraMnemonic +wallet.tsaraEncryptedPrivateKey +encryptedPrivateKey');

    if (!user) {
        console.log("❌ User not found.");
        process.exit(1);
    }

    console.log("Retrieving keypair...");
    const senderKeypair = await tsaraService.getKeypairFromAnySource(user.wallet);
    console.log(`✅ Keypair verified: ${senderKeypair.publicKey.toBase58()}`);

    const rpcUrl = process.env.SOLANA_RPC_URL || clusterApiUrl('mainnet-beta');
    const connection = new Connection(rpcUrl, 'confirmed');

    const balance = await connection.getBalance(senderKeypair.publicKey);
    console.log(`💰 Current Balance: ${balance / LAMPORTS_PER_SOL} SOL`);

    if (balance < 5000) {
        console.log("❌ Balance too low to even pay fees.");
        process.exit(1);
    }

    // Sweep all minus standard priority fee
    const fee = 5000;
    const amountToSend = balance - fee;

    console.log(`🚀 Sweeping ${amountToSend / LAMPORTS_PER_SOL} SOL to ${destAddress}...`);

    const transaction = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: senderKeypair.publicKey,
            toPubkey: new PublicKey(destAddress),
            lamports: amountToSend,
        })
    );

    try {
        const signature = await sendAndConfirmTransaction(connection, transaction, [senderKeypair]);
        console.log(`✅ Success! Signature: ${signature}`);
        console.log(`🔗 Explorer: https://explorer.solana.com/tx/${signature}`);
    } catch (err) {
        console.error("❌ Transfer failed:", err.message);
    }

    process.exit(0);
}

main().catch(console.error);
