#!/bin/bash
# Update Nginx configuration for SPA routing

VPS_IP="72.61.97.210"
VPS_USER="root"

echo "🚀 Updating Nginx configuration on VPS..."

# Copy nginx config to VPS
scp nginx-myartelab.conf ${VPS_USER}@${VPS_IP}:/tmp/

# SSH into VPS and update nginx
ssh ${VPS_USER}@${VPS_IP} << 'REMOTE_SCRIPT'
  echo "📋 Backing up current nginx config..."
  cp /etc/nginx/sites-available/myartelab /etc/nginx/sites-available/myartelab.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
  
  echo "📝 Installing new nginx config..."
  cp /tmp/nginx-myartelab.conf /etc/nginx/sites-available/myartelab
  
  echo "🔍 Testing nginx configuration..."
  nginx -t
  
  if [ $? -eq 0 ]; then
    echo "✅ Nginx config valid. Reloading..."
    systemctl reload nginx
    echo "✅ Nginx reloaded successfully!"
  else
    echo "❌ Nginx config test failed! Restoring backup..."
    cp /etc/nginx/sites-available/myartelab.backup.* /etc/nginx/sites-available/myartelab
    exit 1
  fi
  
  echo ""
  echo "🧹 Cleaning up..."
  rm -f /tmp/nginx-myartelab.conf
REMOTE_SCRIPT

echo ""
echo "✅ Nginx configuration updated!"
echo "🌐 SPA routes like /bookings/:id should now load instantly"
