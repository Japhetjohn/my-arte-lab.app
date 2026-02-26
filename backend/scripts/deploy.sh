#!/bin/bash

# Deployment script for MyArteLab Backend
# Usage: ./scripts/deploy.sh [password]

SERVER="72.61.97.210"
USER="root"
APP_DIR="/var/www/myartelab"
BACKEND_DIR="$APP_DIR/backend"

if [ -z "$1" ]; then
  echo "Error: Password required."
  echo "Usage: ./scripts/deploy.sh [password]"
  exit 1
fi

PASSWORD=$1

echo "--- Starting Deployment to $SERVER ---"

# Use sshpass if available, otherwise this script will fail in automated environments
# For this agentic environment, we will attempt to use a heredoc or interactive-friendly command if possible,
# but usually, we rely on the system's ability to handle the password.

ssh_cmd() {
  sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no "$USER@$SERVER" "$@"
}

echo "1. Checking if sshpass is installed..."
if ! command -v sshpass &> /dev/null; then
    echo "sshpass could not be found. Please install it: sudo apt-get install sshpass"
    exit 1
fi

echo "2. Pulling latest code from main..."
ssh_cmd "cd $APP_DIR && git pull origin main"

echo "3. Installing backend dependencies..."
ssh_cmd "cd $BACKEND_DIR && npm install"

echo "4. Running Tsara wallet migration..."
ssh_cmd "cd $BACKEND_DIR && node scripts/migrateTsaraWallets.js"

echo "5. Restarting application with PM2..."
ssh_cmd "pm2 restart myartelab"

echo "6. Checking logs..."
ssh_cmd "pm2 logs myartelab --lines 20 --no-daemon"

echo "--- Deployment Complete ---"
