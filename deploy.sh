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

# Sync backend files
echo ""
echo "📦 Syncing backend files..."
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '.env' \
    --exclude 'uploads' \
    --exclude 'logs' \
    ${LOCAL_DIR}/backend/src/ \
    ${VPS_USER}@${VPS_IP}:${REMOTE_DIR}/backend/src/

# Sync frontend build
echo ""
echo "📂 Syncing frontend build..."
rsync -avz --delete \
    ${LOCAL_DIR}/backend/frontend/app/dist/ \
    ${VPS_USER}@${VPS_IP}:${REMOTE_DIR}/backend/frontend/dist/

# Sync nginx config
echo ""
echo "📋 Syncing nginx config..."
rsync -avz \
    ${LOCAL_DIR}/nginx-myartelab.conf \
    ${VPS_USER}@${VPS_IP}:/etc/nginx/sites-available/myartelab

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
