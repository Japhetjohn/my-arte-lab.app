#!/bin/bash
# MyArteLab Full Deploy Script

VPS_IP="72.61.97.210"
VPS_USER="root"

echo "🚀 Deploying MyArteLab to VPS..."

ssh ${VPS_USER}@${VPS_IP} << 'REMOTE_SCRIPT'
  set -e
  
  echo "📥 Pulling latest code from git..."
  cd /var/www/myartelab
  git reset --hard HEAD
  git clean -fd
  git pull origin main
  
  echo ""
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
