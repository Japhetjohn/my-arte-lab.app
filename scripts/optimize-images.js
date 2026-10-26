/**
 * Optimize Static PNG Images for Core Web Vitals
 * Compresses oversized 1.4MB UI assets down to ~15KB-30KB
 */

const fs = require('fs');
const path = require('path');
const sharp = require('../backend/node_modules/sharp');

const DIRS = [
  path.join(__dirname, '../backend/frontend/images'),
  path.join(__dirname, '../backend/frontend/app/public/images'),
  path.join(__dirname, '../backend/frontend/app-images')
];

async function optimizeDir(dir) {
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (!file.endsWith('.png')) continue;
    // Don't touch icons or tiny favicons
    if (file.startsWith('favicon') || file.startsWith('icon-') || file.startsWith('apple-touch')) continue;

    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    // Only optimize if larger than 100KB
    if (stat.size > 100 * 1024) {
      console.log(`Optimizing ${file} (${(stat.size / 1024 / 1024).toFixed(2)} MB)...`);
      try {
        const metadata = await sharp(filePath).metadata();
        const maxDim = 640;

        let pipeline = sharp(filePath);
        if (metadata.width > maxDim || metadata.height > maxDim) {
          pipeline = pipeline.resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true });
        }

        const optimizedBuffer = await pipeline
          .png({ quality: 85, compressionLevel: 9, palette: true })
          .toBuffer();

        fs.writeFileSync(filePath, optimizedBuffer);
        const newSize = fs.statSync(filePath).size;
        console.log(`  -> Saved as ${(newSize / 1024).toFixed(1)} KB (-${(((stat.size - newSize) / stat.size) * 100).toFixed(1)}%)`);

        // Also generate webp
        const webpPath = filePath.replace(/\.png$/, '.webp');
        await sharp(optimizedBuffer).webp({ quality: 85 }).toFile(webpPath);
      } catch (err) {
        console.error(`  Error optimizing ${file}:`, err.message);
      }
    }
  }
}

async function run() {
  console.log('🚀 Optimizing static images for LCP & CWV...');
  for (const dir of DIRS) {
    console.log(`\nScanning ${dir}...`);
    await optimizeDir(dir);
  }
  console.log('\n🎉 Image optimization complete!');
}

run().catch(console.error);
