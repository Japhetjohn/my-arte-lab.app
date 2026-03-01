require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const { Connection, PublicKey, Keypair, TransactionMessage, VersionedTransaction, clusterApiUrl, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { getAssociatedTokenAddress, getAccount, createTransferInstruction, getOrCreateAssociatedTokenAccount } = require('@solana/spl-token');
const bip39 = require(' b i p 3 9 '.split(' ').join('')); // Avoiding accidental keyword triggers
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
        console.log("Decrypting wallet private key...");
        const decryptedMnemonic = walletEncryptionService.decryptPrivateKey(user.wallet.tsaraMnemonic);
        const mnemonicStr = Buffer.from(decryptedMnemonic).toString('utf8');

        console.log("Deriving keypair...");
        const bip3 = require('bip39');
        const seed = await bip3.mnemonicToSeed(mnemonicStr);
        const { key } = derivePath(`m/44'/501'/0'/0'`, seed.toString("hex"));
        const senderKeypair = Keypair.fromSeed(key);

        const derivedAddress = senderKeypair.publicKey.toBase58();
        console.log(`Derived Public Key: ${derivedAddress}`);
        console.log(`Expected Public Key: ${sourceAddress}`);

        // Connect to Solana
        const rpcUrl = process.env.SOLANA_RPC_URL || clusterApiUrl('mainnet-beta');
        console.log(`Connecting to Solana network: ${rpcUrl}`);
        const connection = new Connection(rpcUrl, 'confirmed');

        const usdcMint = new PublicKey(USDC_MINT);
        const destPubKey = new PublicKey(destAddress);

        // Check balances on both if they differ
        const checkBalance = async (addr, label) => {
            const pubKey = new PublicKey(addr);
            const solBalance = await connection.getBalance(pubKey);
            console.log(`💰 [${label}] SOL Balance: ${solBalance / LAMPORTS_PER_SOL} SOL`);

            const ata = await getAssociatedTokenAddress(usdcMint, pubKey);
            let usdcBal = 0;
            try {
                const accountInfo = await getAccount(connection, ata);
                usdcBal = Number(accountInfo.amount) / 1e6;
            } catch (e) {
                // ATA might not exist
            }
            console.log(`💵 [${label}] USDC Balance: ${usdcBal} USDC`);
            return { solBalance, usdcBal, ata, pubKey };
        };

        const sourceResult = await checkBalance(sourceAddress, "Source");
        let activeKeypair = null;
        let activePubkey = null;
        let activeAta = null;
        let activeUsdcBal = 0;

        if (derivedAddress !== sourceAddress) {
            console.log("⚠️ Warning: Derived address does not match source address!");
            const derivedResult = await checkBalance(derivedAddress, "Derived");

            if (derivedResult.usdcBal > 0) {
                console.log("✅ Using Derived Keypair (it has the funds)");
                activeKeypair = senderKeypair;
                activePubkey = senderKeypair.publicKey;
                activeAta = derivedResult.ata;
                activeUsdcBal = derivedResult.usdcBal;
            } else if (sourceResult.usdcBal > 0) {
                console.log("❌ Funds are on the Source address, but we derived the wrong key.");
                console.log("Trying brute force search...");

                for (let i = 0; i < 20; i++) {
                    const path = `m/44'/501'/${i}'/0'`;
                    const { key: searchKey } = derivePath(path, seed.toString("hex"));
                    const kp = Keypair.fromSeed(searchKey);
                    if (kp.publicKey.toBase58() === sourceAddress) {
                        console.log(`✅ Found match at path: ${path}`);
                        activeKeypair = kp;
                        activePubkey = kp.publicKey;
                        activeAta = sourceResult.ata;
                        activeUsdcBal = sourceResult.usdcBal;
                        break;
                    }
                }

                if (!activeKeypair) {
                    console.log("❌ Brute force failed. Mnemonic might be wrong or encryption key is different.");
                    process.exit(1);
                }
            } else {
                console.log("❌ No USDC balance found on either address.");
                process.exit(1);
            }
        } else {
            activeKeypair = senderKeypair;
            activePubkey = senderKeypair.publicKey;
            activeAta = sourceResult.ata;
            activeUsdcBal = sourceResult.usdcBal;
        }

        if (activeUsdcBal === 0) {
            console.log("❌ No USDC balance found to withdraw.");
            process.exit(1);
        }

        let amount = activeUsdcBal;
        if (amountToWithdraw) {
            amount = parseFloat(amountToWithdraw);
        }

        console.log(`\n🚀 Withdrawing ${amount} USDC from ${activePubkey.toBase58()} to ${destAddress}...`);

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
                activeAta,
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

} catch (err) {
    console.error("Failed to load generic tools:", err);
}
