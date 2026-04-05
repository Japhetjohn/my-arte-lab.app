#!/bin/bash
# MyArteLab Manual Deploy Script (bypasses git issues on VPS)

VPS_IP="72.61.97.210"
VPS_USER="root"

echo "🚀 Deploying MyArteLab to VPS (Manual)..."

# First, sync local files to VPS via rsync
echo "📤 Syncing local files to VPS..."
rsync -avz --delete --exclude='node_modules' --exclude='.git' \
  /home/japhet/Desktop/my-arte-lab.app/ \
  ${VPS_USER}@${VPS_IP}:/var/www/myartelab/

# Then run deployment commands on VPS
ssh ${VPS_USER}@${VPS_IP} << 'REMOTE_SCRIPT'
  set -e
  
  echo "📦 Installing backend dependencies..."
  cd /var/www/myartelab/backend
  npm install --production
  
  echo ""
  echo "🔨 Building frontend..."
  cd /var/www/myartelab/backend/frontend/app
  npm install
  npm run build
  
  echo ""
  echo "📂 Copying build files to web root..."
  cp -r dist/* /var/www/myartelab/backend/frontend/
  cp -r dist/assets /var/www/myartelab/backend/frontend/
  
  echo ""
  echo "🔄 Restarting backend server..."
  pm2 restart myartelab
  
  echo ""
  echo "✅ Deploy complete!"
  echo "🌐 Check your site at: https://app.myartelab.com"
REMOTE_SCRIPT

echo ""
echo "🎉 Deployment finished!"
