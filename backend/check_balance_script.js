const { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL } = require('@solana/web3.js');
async function run() {
    const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
    const bal = await connection.getBalance(new PublicKey('Gy2n4pZePk1vZyx76GtNERaLSgcoQYD2MnohMxFWbtCV'));
    console.log(`Gas Sponsor Wallet Balance: ${bal / LAMPORTS_PER_SOL} SOL`);
}
run();
