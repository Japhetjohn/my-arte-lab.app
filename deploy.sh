#!/bin/bash
# MyArteLab Full Deploy Script - Syncs local changes to production

VPS_IP="72.61.97.210"
VPS_USER="root"
LOCAL_DIR="/home/japhet/Desktop/my-arte-lab.app"
REMOTE_DIR="/var/www/myartelab"

echo "🚀 Deploying MyArteLab to VPS..."

# Build frontend locally first
echo "🔨 Building frontend locally..."
cd ${LOCAL_DIR}/backend/frontend/app
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed!"
    exit 1
fi
echo "✅ Frontend build successful"

# Check if rsync is available, otherwise use scp
if command -v rsync &> /dev/null; then
    USE_RSYNC=true
else
    USE_RSYNC=false
    echo "⚠️  rsync not found, using scp instead..."
fi

# Sync backend files
echo ""
echo "📦 Syncing backend files..."
if [ "$USE_RSYNC" = true ]; then
    rsync -avz --delete \
        --exclude 'node_modules' \
        --exclude '.env' \
        --exclude 'uploads' \
        --exclude 'logs' \
        ${LOCAL_DIR}/backend/src/ \
        ${VPS_USER}@${VPS_IP}:${REMOTE_DIR}/backend/src/
else
    # Use scp with tar for directories
    cd ${LOCAL_DIR}/backend/src
    tar -czf /tmp/backend-src.tar.gz .
    scp /tmp/backend-src.tar.gz ${VPS_USER}@${VPS_IP}:/tmp/
    ssh ${VPS_USER}@${VPS_IP} "cd ${REMOTE_DIR}/backend/src && tar -xzf /tmp/backend-src.tar.gz --overwrite && rm /tmp/backend-src.tar.gz"
    rm /tmp/backend-src.tar.gz
fi

# Sync frontend build
echo ""
echo "📂 Syncing frontend build..."
if [ "$USE_RSYNC" = true ]; then
    rsync -avz --delete \
        ${LOCAL_DIR}/backend/frontend/app/dist/ \
        ${VPS_USER}@${VPS_IP}:${REMOTE_DIR}/backend/frontend/dist/
else
    cd ${LOCAL_DIR}/backend/frontend/app/dist
    tar -czf /tmp/frontend-dist.tar.gz .
    scp /tmp/frontend-dist.tar.gz ${VPS_USER}@${VPS_IP}:/tmp/
    ssh ${VPS_USER}@${VPS_IP} "mkdir -p ${REMOTE_DIR}/backend/frontend/dist && cd ${REMOTE_DIR}/backend/frontend/dist && rm -rf * && tar -xzf /tmp/frontend-dist.tar.gz && rm /tmp/frontend-dist.tar.gz"
    rm /tmp/frontend-dist.tar.gz
fi

# Sync nginx config
echo ""
echo "📋 Syncing nginx config..."
scp ${LOCAL_DIR}/nginx-myartelab.conf ${VPS_USER}@${VPS_IP}:/etc/nginx/sites-available/myartelab

# Remote commands
echo ""
echo "🔧 Running remote setup..."
ssh ${VPS_USER}@${VPS_IP} << 'REMOTE_SCRIPT'
  set -e
  
  echo "📦 Installing backend dependencies..."
  cd /var/www/myartelab/backend
  npm install --production
  
  echo ""
  echo "🔄 Testing nginx configuration..."
  nginx -t
  
  echo ""
  echo "🔄 Reloading nginx..."
  systemctl reload nginx
  
  echo ""
  echo "🔄 Restarting backend server..."
  pm2 restart myartelab
  
  echo ""
  echo "✅ Deploy complete!"
  echo "🌐 Check your site at: https://app.myartelab.com"
REMOTE_SCRIPT

echo ""
echo "🎉 Deployment finished!"
