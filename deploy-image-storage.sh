#!/bin/bash
# Deploy Image Storage Updates to VPS

echo "🚀 Deploying image storage updates to VPS..."

# SSH and deploy
ssh -o StrictHostKeyChecking=no root@72.61.97.210 << 'ENDSSH'
cd /var/www/myartelab/backend

echo "📥 Pulling latest changes from GitHub..."
git pull origin main

echo "📦 Installing dependencies (sharp for image processing)..."
npm install

echo "📁 Creating upload directories..."
mkdir -p uploads/avatars uploads/covers uploads/portfolio uploads/services
chmod -R 755 uploads
chown -R www-data:www-data uploads

echo "🔄 Restarting application with PM2..."
pm2 restart myartelab

echo "✅ Deployment complete!"
echo ""
echo "📊 PM2 Status:"
pm2 list

echo ""
echo "📂 Upload directories created:"
ls -la uploads/

ENDSSH

echo ""
echo "🎉 Image storage deployment complete!"
echo "📝 Next step: Configure Nginx to serve /uploads"
