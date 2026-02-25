module.exports = {
    apiUrl: process.env.TSARA_API_URL || 'https://api.tsara.ng/v1',
    secretKey: process.env.TSARA_SECRET_KEY,
    publicKey: process.env.TSARA_PUBLIC_KEY,
    webhookUrl: process.env.TSARA_WEBHOOK_URL,
    getHeaders: () => ({
        'Authorization': `Bearer ${process.env.TSARA_SECRET_KEY}`,
        'Content-Type': 'application/json'
    })
};
