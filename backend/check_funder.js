const bip39 = require('bip39');
const { derivePath } = require('ed25519-hd-key');
const { Keypair, Connection, clusterApiUrl } = require('@solana/web3.js');
require('dotenv').config();

async function checkFunder() {
    const mnemonic = process.env.FUNDER_MNEMONIC;
    if (!mnemonic) {
        console.error('FUNDER_MNEMONIC not found in .env');
        return;
    }

    const seed = await bip39.mnemonicToSeed(mnemonic);
    const { key } = derivePath("m/44'/501'/0'", seed.toString("hex"));
    const keypair = Keypair.fromSeed(key);
    const publicKey = keypair.publicKey.toBase58();

    console.log('Funder Public Key:', publicKey);

    const connection = new Connection(process.env.SOLANA_RPC_URL || clusterApiUrl('mainnet-beta'), 'confirmed');
    const balance = await connection.getBalance(keypair.publicKey);
    console.log('Balance:', balance / 1e9, 'SOL');
}

checkFunder().catch(console.error);
