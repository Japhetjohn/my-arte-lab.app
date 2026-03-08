require('dotenv').config();
const { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL, Keypair } = require('@solana/web3.js');
const bip39 = require('bip39');
const { derivePath } = require('ed25519-hd-key');

async function run() {
    console.log("FUNDER_MNEMONIC exists:", !!process.env.FUNDER_MNEMONIC);
    if (!process.env.FUNDER_MNEMONIC) return;

    const seed = await bip39.mnemonicToSeed(process.env.FUNDER_MNEMONIC);
    const { key } = derivePath("m/44'/501'/0'/0'", seed.toString("hex"));
    const keypair = Keypair.fromSeed(key);
    const pubkey = keypair.publicKey.toBase58();
    console.log("Sponsor Pubkey:", pubkey);

    const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
    const bal = await connection.getBalance(new PublicKey(pubkey));
    console.log("Sponsor Balance:", bal / LAMPORTS_PER_SOL, "SOL");
}
run();
