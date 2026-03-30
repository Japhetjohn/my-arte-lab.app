#!/bin/bash

echo "🚀 Rebuilding MyArteLab Frontend..."

cd backend/frontend/app

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building..."
npm run build

echo "📂 Copying build files..."
cp -r dist/* ..
cp -r dist/assets ..

echo "🖼️ Copying images..."
cp -r ../app-images/* ../images/ 2>/dev/null || cp -r ../app-images ../images/ 2>/dev/null || echo "Images already in place"

echo "✅ Frontend rebuilt successfully!"
echo ""
echo "To test locally: npm run start"
echo "To deploy: sudo systemctl reload nginx"
