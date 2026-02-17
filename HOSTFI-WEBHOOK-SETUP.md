# HostFi Webhook Configuration Guide

## Production Webhook URLs

Configure these webhook URLs in your HostFi dashboard:

### 1. Address Generated Webhook
**URL:** `https://app.myartelab.com/api/hostfi/webhooks/address-generated`
**Method:** POST
**Purpose:** Triggered when a new collection address is created for users

### 2. Fiat Deposit Webhook
**URL:** `https://app.myartelab.com/api/hostfi/webhooks/fiat-deposit`
**Method:** POST
**Purpose:** Triggered when user deposits fiat money (bank transfer)

### 3. Crypto Deposit Webhook
**URL:** `https://app.myartelab.com/api/hostfi/webhooks/crypto-deposit`
**Method:** POST
**Purpose:** Triggered when user deposits cryptocurrency

### 4. Fiat Payout Webhook
**URL:** `https://app.myartelab.com/api/hostfi/webhooks/fiat-payout`
**Method:** POST
**Purpose:** Triggered when fiat withdrawal completes or fails

### 5. Crypto Payout Webhook
**URL:** `https://app.myartelab.com/api/hostfi/webhooks/crypto-payout`
**Method:** POST
**Purpose:** Triggered when crypto withdrawal completes or fails

---

## How to Configure in HostFi Dashboard

### Step 1: Access HostFi Dashboard
1. Go to: https://dashboard.hostcap.io (or your HostFi dashboard URL)
2. Login with your credentials

### Step 2: Navigate to Webhook Settings
1. Look for **Settings** or **Webhooks** section
2. Usually found under: **Settings → Webhooks** or **API → Webhooks**

### Step 3: Add Webhook URLs
For each webhook type, add the corresponding URL:

1. **Collection Address Created**
   - URL: `https://app.myartelab.com/api/hostfi/webhooks/address-generated`

2. **Fiat Deposit Received**
   - URL: `https://app.myartelab.com/api/hostfi/webhooks/fiat-deposit`

3. **Crypto Deposit Received**
   - URL: `https://app.myartelab.com/api/hostfi/webhooks/crypto-deposit`

4. **Fiat Payout Status**
   - URL: `https://app.myartelab.com/api/hostfi/webhooks/fiat-payout`

5. **Crypto Payout Status**
   - URL: `https://app.myartelab.com/api/hostfi/webhooks/crypto-payout`

### Step 4: Configure Webhook Secret (if available)
- If HostFi provides a webhook secret/signing key, copy it
- Add it to your `.env` file: `HOSTFI_WEBHOOK_SECRET=your_secret_here`

### Step 5: Save & Test
- Click **Save** or **Update** for each webhook
- Use HostFi's "Test Webhook" feature if available

---

## Security Features

Our webhook endpoints include:

✅ **Signature Verification** - Validates that webhooks come from HostFi
✅ **Duplicate Prevention** - Prevents processing the same event twice
✅ **Error Logging** - All webhook events are logged for debugging
✅ **Automatic Retries** - Failed webhooks are logged and can be retried

---

## What Happens When Webhooks Are Triggered?

### Deposit Webhooks (Fiat & Crypto)
1. ✅ Verify webhook signature
2. ✅ Calculate platform fee (10%)
3. ✅ Credit user's wallet (amount - fee)
4. ✅ Create transaction record
5. ✅ Sync HostFi wallet balances
6. ✅ Log event in WebhookEvent model

### Withdrawal Webhooks (Fiat & Crypto)
1. ✅ Verify webhook signature
2. ✅ Find transaction by reference
3. ✅ If successful: Remove from pending balance
4. ✅ If failed: Refund to user's balance
5. ✅ Update transaction status
6. ✅ Sync wallet balances

---

## Testing Webhooks

### Method 1: Use HostFi Dashboard Test Feature
Most webhook platforms have a "Test" or "Send Test Event" button

### Method 2: Manual Testing with curl

**Test Crypto Deposit:**
```bash
curl -X POST https://app.myartelab.com/api/hostfi/webhooks/crypto-deposit \
  -H "Content-Type: application/json" \
  -H "x-hostfi-signature: test_signature" \
  -d '{
    "id": "test_123",
    "customId": "USER_ID_HERE",
    "amount": 10,
    "currency": "USDC",
    "txHash": "0x123abc...",
    "network": "Solana",
    "confirmations": 12
  }'
```

**Test Fiat Deposit:**
```bash
curl -X POST https://app.myartelab.com/api/hostfi/webhooks/fiat-deposit \
  -H "Content-Type: application/json" \
  -H "x-hostfi-signature: test_signature" \
  -d '{
    "id": "test_456",
    "customId": "USER_ID_HERE",
    "amount": 50,
    "currency": "NGN",
    "channelId": "channel_123"
  }'
```

### Method 3: Monitor Webhook Logs

Check PM2 logs on your VPS:
```bash
pm2 logs myartelab --lines 100
```

Look for webhook events:
```
Fiat deposit webhook received: { ... }
Crypto deposit webhook received: { ... }
```

---

## Troubleshooting

### Webhook Not Working?

1. **Check Nginx Configuration**
   ```bash
   sudo nginx -t
   sudo systemctl status nginx
   ```

2. **Check PM2 Application**
   ```bash
   pm2 status
   pm2 logs myartelab --lines 50
   ```

3. **Check Firewall**
   ```bash
   sudo ufw status
   # Ensure port 443 (HTTPS) is open
   ```

4. **Test Webhook Endpoint**
   ```bash
   curl -I https://app.myartelab.com/api/hostfi/webhooks/test
   # Should return 200 OK (in development) or 403 (in production)
   ```

5. **Check Webhook Event Logs**
   - Webhooks are stored in MongoDB `webhookevents` collection
   - Check for failed webhooks with error messages

### Common Issues

**401 Invalid Signature**
- Webhook secret is incorrect or missing
- Check `HOSTFI_WEBHOOK_SECRET` in .env

**404 Not Found**
- URL is incorrect
- Check that webhook routes are properly registered in server.js

**500 Internal Error**
- Check PM2 logs for error details
- Usually database or validation errors

---

## Environment Variables Required

Ensure these are in your `.env` file:

```env
# HostFi Configuration
HOSTFI_API_URL=https://api.hostcap.io
HOSTFI_CLIENT_ID=QYR6YHCA1H
HOSTFI_SECRET_KEY=I31n5-xTI6fL_e9KOv1wurHL-mtHv6bTE5cNxVDM
HOSTFI_WEBHOOK_SECRET=your_webhook_secret_here

# Platform Settings
PLATFORM_COMMISSION=10
API_URL=https://app.myartelab.com
```

---

## Webhook Event Monitoring

All webhooks are logged in the database. You can query them:

```javascript
// Get all webhook events
db.webhookevents.find().sort({ createdAt: -1 }).limit(20)

// Get failed webhooks
db.webhookevents.find({ processed: false })

// Get webhooks for specific user
db.webhookevents.find({ "payload.customId": "USER_ID_HERE" })
```

---

## Next Steps

1. ✅ Configure webhooks in HostFi dashboard
2. ✅ Copy webhook secret to `.env` (if provided)
3. ✅ Test each webhook type
4. ✅ Monitor PM2 logs for incoming webhooks
5. ✅ Test deposit and withdrawal flows end-to-end

---

## Support

If you encounter issues:
- Check PM2 logs: `pm2 logs myartelab`
- Check Nginx error logs: `sudo tail -f /var/log/nginx/error.log`
- Check webhook events in MongoDB
- Contact HostFi support for webhook delivery issues

---

**Last Updated:** February 5, 2026
**Production URL:** https://app.myartelab.com
**API Base:** https://app.myartelab.com/api
