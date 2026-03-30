#!/bin/bash
# Run this on the server after git pull

echo "🔨 Building frontend on server..."

cd /var/www/myartelab/backend/frontend/app || exit 1

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building..."
npm run build

echo "📂 Copying build files to frontend root..."
cp -r dist/* ..
cp -r dist/assets ..

echo "🖼️ Copying images..."
cp -r ../app-images/* ../images/ 2>/dev/null || cp -r ../app-images ../images/ 2>/dev/null || echo "Images handled"

echo "✅ Build complete!"
echo ""
echo "📁 Files in frontend folder:"
ls -la /var/www/myartelab/backend/frontend/

echo ""
echo "🔄 Restarting nginx..."
systemctl restart nginx

echo ""
echo "✅ Deployment complete! Check https://app.myartelab.com"
