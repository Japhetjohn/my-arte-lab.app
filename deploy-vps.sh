#!/bin/bash

# MyArteLab VPS Deployment Script
# This script sets up everything needed to deploy MyArteLab on Ubuntu

set -e  # Exit on any error

echo "========================================="
echo "MyArteLab VPS Deployment Starting..."
echo "========================================="

# Step 1: Update system
echo "[1/15] Updating system packages..."
apt-get update -y
apt-get upgrade -y

# Step 2: Install security essentials and dependencies
echo "[2/15] Installing security essentials..."
apt-get install -y curl wget git ufw fail2ban build-essential

# Step 3: Install Node.js 18.x LTS
echo "[3/15] Installing Node.js 18.x LTS..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

echo "Node.js version: $(node --version)"
echo "NPM version: $(npm --version)"

# Step 4: Install MongoDB
echo "[4/15] Installing MongoDB..."
curl -fsSL https://www.mongodb.org/static/pgp/server-6.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-archive-keyring.gpg
echo "deb [arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-archive-keyring.gpg] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
apt-get update -y
apt-get install -y mongodb-org

# Start and enable MongoDB
systemctl start mongod
systemctl enable mongod
echo "MongoDB status: $(systemctl is-active mongod)"

# Step 5: Install Nginx
echo "[5/15] Installing Nginx..."
apt-get install -y nginx

# Step 6: Install PM2 globally
echo "[6/15] Installing PM2..."
npm install -g pm2

# Step 7: Configure firewall (UFW)
echo "[7/15] Configuring firewall..."
ufw --force enable
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw allow 80/tcp
ufw allow 443/tcp
ufw status

# Step 8: Clone repository
echo "[8/15] Setting up application directory..."
cd /var/www
if [ -d "myartelab" ]; then
    echo "Directory exists, pulling latest changes..."
    cd myartelab
    git pull
else
    echo "Cloning repository..."
    # We'll need to set this up manually with credentials
    mkdir -p myartelab
fi

echo "========================================="
echo "Basic server setup complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Clone your repository to /var/www/myartelab"
echo "2. Set up environment variables"
echo "3. Install dependencies"
echo "4. Configure Nginx"
echo "5. Set up domain and SSL"
echo ""
