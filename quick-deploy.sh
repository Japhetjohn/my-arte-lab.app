#!/bin/bash
# Quick deploy script for the booking service fix

SERVER="root@72.61.97.210"
REMOTE_DIR="/var/www/myartelab"

echo "=== Deploying Booking Service Fix ==="
echo ""

# Sync the fixed files
echo "Syncing fixed services..."
rsync -avz backend/src/services/switchService.js "$SERVER:$REMOTE_DIR/backend/src/services/"
rsync -avz backend/src/controllers/hostfiWalletController.js "$SERVER:$REMOTE_DIR/backend/src/controllers/"
rsync -avz backend/src/config/switch.js "$SERVER:$REMOTE_DIR/backend/src/config/"
rsync -avz backend/.env "$SERVER:$REMOTE_DIR/backend/"

if [ $? -ne 0 ]; then
    echo "❌ Sync failed!"
    exit 1
fi
echo "✅ Files synced"
echo ""

# Restart the server
echo "Restarting PM2..."
ssh "$SERVER" "pm2 restart myartelab"

if [ $? -ne 0 ]; then
    echo "❌ PM2 restart failed!"
    exit 1
fi
echo "✅ Server restarted"
echo ""

echo "=== Deployment Complete ==="
echo ""
echo "Check logs: ssh $SERVER 'pm2 logs myartelab --lines 30'"
