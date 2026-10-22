#!/bin/bash
# MyArteLab Full Deploy Script

VPS_IP="72.61.97.210"
VPS_USER="root"
SSH_PASS="${SSHPASS:-@Kuulsinim45}"

echo "🚀 Deploying MyArteLab to VPS..."

# Setup SSH Askpass helper for non-interactive password authentication
ASKPASS_TMP=""
if [ -n "$SSH_PASS" ]; then
  ASKPASS_TMP=$(mktemp)
  chmod +x "$ASKPASS_TMP"
  cat << EOF > "$ASKPASS_TMP"
#!/bin/bash
echo '$SSH_PASS'
EOF
  export SSH_ASKPASS="$ASKPASS_TMP"
  export SSH_ASKPASS_REQUIRE=force
fi

ssh -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_IP} << 'REMOTE_SCRIPT'
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

if [ -n "$ASKPASS_TMP" ]; then
  rm -f "$ASKPASS_TMP"
fi

echo ""
echo "🎉 Deployment finished!"
