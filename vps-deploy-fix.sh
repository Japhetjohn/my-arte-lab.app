#!/bin/bash
# VPS Deployment Script - Fix Platform Fee & Image Upload
# Run this on VPS after pushing code to GitHub

set -e

echo "🚀 Starting VPS deployment..."

# Navigate to project directory
cd /var/www/myartelab/backend

echo "📥 Pulling latest code from GitHub..."
git pull origin main

echo "📦 Installing dependencies..."
npm install --production

echo "📝 Updating .env file..."
# Add UPLOAD_DIR if not exists
if ! grep -q "UPLOAD_DIR" .env; then
    echo "" >> .env
    echo "# Image Upload Directory" >> .env
    echo "UPLOAD_DIR=/var/www/myartelab/backend/uploads" >> .env
    echo "✅ Added UPLOAD_DIR to .env"
else
    echo "ℹ️  UPLOAD_DIR already exists in .env"
fi

# Update Zoho password
sed -i 's/EMAIL_PASSWORD=.*/EMAIL_PASSWORD=B09kSRmLv03i/' .env
echo "✅ Updated Zoho email password"

# Add Gas Sponsor Wallet
if ! grep -q "GAS_SPONSOR_WALLET=CpFf7PMWhbgVgyL1spwP6mzNRJCsi7GRskyCsu6W59UJ" .env; then
    sed -i 's|GAS_SPONSOR_WALLET=.*|GAS_SPONSOR_WALLET=CpFf7PMWhbgVgyL1spwP6mzNRJCsi7GRskyCsu6W59UJ|' .env
    sed -i 's|GAS_SPONSOR_PRIVATE_KEY=.*|GAS_SPONSOR_PRIVATE_KEY=[226,161,9,165,66,146,30,81,119,63,187,161,233,71,189,32,120,133,71,154,141,52,146,87,207,223,166,144,54,43,57,220,175,139,109,81,28,232,164,118,196,21,94,248,29,228,53,242,63,197,71,183,81,135,16,161,184,99,158,158,91,176,231,223]|' .env
    if ! grep -q "GAS_SPONSOR_SEED" .env; then
        sed -i '/GAS_SPONSOR_PRIVATE_KEY/a GAS_SPONSOR_SEED=obscure letter obvious truth lion empower odor own tape panic drop palm' .env
    fi
    echo "✅ Updated gas sponsor wallet credentials"
else
    echo "ℹ️  Gas sponsor wallet already configured"
fi

echo "📁 Creating upload directories..."
mkdir -p /var/www/myartelab/backend/uploads/{avatars,covers,portfolio,services}
chown -R www-data:www-data /var/www/myartelab/backend/uploads
chmod -R 755 /var/www/myartelab/backend/uploads
echo "✅ Upload directories created with correct permissions"

echo "🔄 Restarting PM2 application..."
pm2 restart myartelab

echo "📊 Checking PM2 status..."
pm2 status

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Run wallet migration: node scripts/initializeExistingWallets.js"
echo "2. Test registration with email verification"
echo "3. Test image upload functionality"
echo ""
echo "📋 Check logs: pm2 logs myartelab --lines 100"
