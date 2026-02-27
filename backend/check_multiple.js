const { Connection, PublicKey, clusterApiUrl } = require('@solana/web3.js');
require('dotenv').config();

async function checkAddresses() {
    const addresses = [
        'HwVuUw29yahLycP7LiL2Lz9ZnLVF1uHjR7saqaXzgysF',
        'CpFf7PMWhbgVgyL1spwP6mzNRJCsi7GRskyCsu6W59UJ'
    ];

    const connection = new Connection(process.env.SOLANA_RPC_URL || clusterApiUrl('mainnet-beta'), 'confirmed');

    for (const addr of addresses) {
        try {
            const pubKey = new PublicKey(addr);
            const balance = await connection.getBalance(pubKey);
            console.log(`Address: ${addr} | Balance: ${balance / 1e9} SOL`);
        } catch (e) {
            console.log(`Address: ${addr} | Error: ${e.message}`);
        }
    }
}

checkAddresses().catch(console.error);
