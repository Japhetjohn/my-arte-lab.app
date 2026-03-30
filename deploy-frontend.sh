#!/bin/bash
# Deploy frontend to VPS

echo "🚀 Deploying frontend to VPS..."

# VPS details
VPS_IP="72.61.97.210"
VPS_USER="root"
REMOTE_DIR="/var/www/myartelab/backend/frontend"

echo "📁 Copying build files to VPS..."
rsync -avz --delete dist/ ${VPS_USER}@${VPS_IP}:${REMOTE_DIR}/

echo "✅ Frontend deployed!"
echo ""
echo "To verify, visit: https://app.myartelab.com"
