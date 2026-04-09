#!/bin/bash
# Quick deploy script for the booking service fix

SERVER="root@72.61.97.210"
REMOTE_DIR="/var/www/myartelab"

echo "=== Deploying Booking Service Fix ==="
echo ""

# Sync only the fixed file
echo "Syncing bookingService.js..."
rsync -avz backend/src/services/bookingService.js "$SERVER:$REMOTE_DIR/backend/src/services/"

if [ $? -ne 0 ]; then
    echo "❌ Sync failed!"
    exit 1
fi
echo "✅ File synced"
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
