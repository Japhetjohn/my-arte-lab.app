#!/bin/bash
# Deploy script for MyArteLab updates

echo "=== MyArteLab Deployment Script ==="
echo ""

# Server details
SERVER="root@72.61.97.210"
REMOTE_DIR="/var/www/myartelab"

echo "1. Building frontend..."
cd backend/frontend/app
npm run build
if [ $? -ne 0 ]; then
    echo "Frontend build failed!"
    exit 1
fi
echo "✓ Frontend build successful"
echo ""

echo "2. Syncing backend files to server..."
cd ../../..
rsync -avz --exclude 'node_modules' --exclude '.env' --exclude 'uploads' \
    backend/src/ $SERVER:$REMOTE_DIR/backend/src/
if [ $? -ne 0 ]; then
    echo "Backend sync failed!"
    exit 1
fi
echo "✓ Backend files synced"
echo ""

echo "3. Syncing frontend dist to server..."
rsync -avz backend/frontend/app/dist/ $SERVER:$REMOTE_DIR/backend/frontend/dist/
if [ $? -ne 0 ]; then
    echo "Frontend sync failed!"
    exit 1
fi
echo "✓ Frontend dist synced"
echo ""

echo "4. Restarting server..."
ssh $SERVER "cd $REMOTE_DIR/backend && pm2 restart myartelab"
if [ $? -ne 0 ]; then
    echo "Server restart failed!"
    exit 1
fi
echo "✓ Server restarted"
echo ""

echo "=== Deployment Complete ==="
echo ""
echo "Check logs with: ssh $SERVER 'pm2 logs myartelab --lines 20'"
