/**
 * MyArteLab Sitemap Generator
 * 
 * Generates sitemap.xml adhering to sitemaps.org protocol.
 * Includes all public indexable routes, visual creator categories,
 * public creators, and showcase posts.
 * 
 * Can run offline (static fallback) or online (querying MongoDB).
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const DOMAIN = 'https://app.myartelab.com';

const CATEGORIES = [
  'photography',
  'videography',
  'graphic_design',
  'ui_ux_design',
  'content_creation',
  'ugc_creators',
  'creative_direction',
  'motion_graphics',
  'crafts_handmade'
];

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

function buildUrlEntry(loc, lastmod, changefreq, priority) {
  const dateStr = lastmod ? (lastmod instanceof Date ? lastmod.toISOString().split('T')[0] : lastmod) : new Date().toISOString().split('T')[0];
  return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${dateStr}</lastmod>
    <changefreq>${changefreq || 'weekly'}</changefreq>
    <priority>${priority || '0.7'}</priority>
  </url>`;
}

async function fetchDynamicEntries() {
  const creatorEntries = [];
  const postEntries = [];

  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.log('ℹ️ No MONGODB_URI in environment; building base sitemap.');
      return { creatorEntries, postEntries };
    }

    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
    console.log('✅ Connected to MongoDB for dynamic sitemap extraction');

    const User = require('../src/models/User');
    const creators = await User.find({
      role: 'creator',
      isActive: true
    }).select('seoSlug _id updatedAt services');

    console.log(`🔍 Found ${creators.length} active creators for sitemap`);

    for (const c of creators) {
      const slugOrId = c.seoSlug || c._id.toString();
      const profileUrl = `${DOMAIN}/creator/${slugOrId}`;
      const lastMod = c.updatedAt || new Date();
      creatorEntries.push({ loc: profileUrl, lastmod: lastMod, changefreq: 'weekly', priority: '0.8' });

      if (Array.isArray(c.services)) {
        for (const s of c.services) {
          if (s._id) {
            postEntries.push({
              loc: `${DOMAIN}/post/${s._id.toString()}`,
              lastmod: s.updatedAt || s.createdAt || lastMod,
              changefreq: 'monthly',
              priority: '0.7'
            });
          }
        }
      }
    }

    await mongoose.disconnect();
  } catch (err) {
    console.log(`ℹ️ MongoDB connection not available in current environment (${err.message}). Using base sitemap generation.`);
  }

  return { creatorEntries, postEntries };
}

async function generate() {
  console.log('🚀 Generating MyArteLab Sitemap...');

  const today = new Date().toISOString().split('T')[0];
  const urls = [];

  // 1. Core High-Priority Public Landing Pages
  urls.push(buildUrlEntry(`${DOMAIN}/`, today, 'daily', '1.0'));
  urls.push(buildUrlEntry(`${DOMAIN}/home`, today, 'daily', '0.9'));
  urls.push(buildUrlEntry(`${DOMAIN}/creators`, today, 'daily', '0.9'));

  // 2. Visual Creative Category Directories
  for (const cat of CATEGORIES) {
    urls.push(buildUrlEntry(`${DOMAIN}/creators?category=${cat}`, today, 'weekly', '0.85'));
  }

  // 3. Legal & Compliance Pages
  urls.push(buildUrlEntry(`${DOMAIN}/legal`, '2026-10-01', 'monthly', '0.5'));
  urls.push(buildUrlEntry(`${DOMAIN}/privacy-policy`, '2026-10-01', 'monthly', '0.5'));

  // 4. Dynamic Visual Creators & Showcase Posts
  const { creatorEntries, postEntries } = await fetchDynamicEntries();

  for (const item of creatorEntries) {
    urls.push(buildUrlEntry(item.loc, item.lastmod, item.changefreq, item.priority));
  }

  for (const item of postEntries) {
    urls.push(buildUrlEntry(item.loc, item.lastmod, item.changefreq, item.priority));
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;

  // Write to locations:
  const targetPaths = [
    path.join(__dirname, '../frontend/app/public/sitemap.xml'),
    path.join(__dirname, '../frontend/sitemap.xml')
  ];

  for (const p of targetPaths) {
    try {
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, xml, 'utf8');
      console.log(`✅ Saved sitemap to: ${p} (${urls.length} URLs)`);
    } catch (e) {
      console.warn(`⚠️ Could not write to ${p}:`, e.message);
    }
  }

  console.log('🎉 Sitemap generation complete!');
}

if (require.main === module) {
  generate().then(() => process.exit(0)).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { generate };
