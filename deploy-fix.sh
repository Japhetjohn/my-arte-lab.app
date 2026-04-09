#!/bin/bash
# Quick fix script to deploy and fix the booking index issue

SERVER="root@72.61.97.210"
REMOTE_DIR="/var/www/myartelab"

echo "=== Fixing Booking Creation Issue ==="
echo ""

# 1. Sync the backend files
echo "1. Syncing backend files..."
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '.env' \
    --exclude 'uploads' \
    --exclude 'logs' \
    "/home/japhet/Desktop/my-arte-lab.app/backend/src/" \
    "$SERVER:$REMOTE_DIR/backend/src/"

if [ $? -ne 0 ]; then
    echo "❌ Backend sync failed!"
    exit 1
fi
echo "✅ Backend files synced"
echo ""

# 2. Copy the fix script to server
echo "2. Copying MongoDB fix script..."
scp "/home/japhet/Desktop/my-arte-lab.app/fix-booking-index.js" "$SERVER:$REMOTE_DIR/backend/"
echo "✅ Fix script copied"
echo ""

# 3. Fix the MongoDB index on the server
echo "3. Fixing MongoDB index..."
ssh "$SERVER" "cd $REMOTE_DIR/backend && node fix-booking-index.js"
echo ""

# 4. Restart the server
echo "4. Restarting PM2..."
ssh "$SERVER" "cd $REMOTE_DIR/backend && pm2 restart myartelab"
echo "✅ Server restarted"
echo ""

echo "=== Fix Complete ==="
echo ""
echo "Check logs: ssh $SERVER 'pm2 logs myartelab --lines 30'"
