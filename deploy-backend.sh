#!/bin/bash
# Deploy backend files to production

SERVER="root@72.61.97.210"
REMOTE_DIR="/var/www/myartelab"
LOCAL_DIR="/home/japhet/Desktop/my-arte-lab.app"

echo "=== Deploying Backend Files ==="
echo ""

# Check if rsync is available
if command -v rsync &> /dev/null; then
    echo "Syncing backend/src..."
    rsync -avz --delete \
        --exclude 'node_modules' \
        --exclude '.env' \
        --exclude 'uploads' \
        --exclude 'logs' \
        "$LOCAL_DIR/backend/src/" \
        "$SERVER:$REMOTE_DIR/backend/src/"
else
    echo "⚠️  rsync not found, using scp + tar..."
    cd "$LOCAL_DIR/backend/src"
    tar -czf /tmp/backend-src.tar.gz .
    scp /tmp/backend-src.tar.gz "$SERVER:/tmp/"
    ssh "$SERVER" "cd $REMOTE_DIR/backend/src && tar -xzf /tmp/backend-src.tar.gz --overwrite && rm /tmp/backend-src.tar.gz"
    rm /tmp/backend-src.tar.gz
fi

if [ $? -ne 0 ]; then
    echo "❌ Backend sync failed!"
    exit 1
fi
echo "✅ Backend files synced"
echo ""

# Restart the server
echo "Restarting PM2..."
ssh "$SERVER" "cd $REMOTE_DIR/backend && pm2 restart myartelab"

if [ $? -ne 0 ]; then
    echo "❌ PM2 restart failed!"
    exit 1
fi
echo "✅ Server restarted"
echo ""

echo "=== Deployment Complete ==="
echo ""
echo "Check logs: ssh $SERVER 'pm2 logs myartelab --lines 30'"
