/**
 * Phase 1 Link Preview Diagnostic Script
 * Tests all 7 required User-Agents across the 5 test URLs
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

const USER_AGENTS = [
  'WhatsApp/2.23.20.0',
  'facebookexternalhit/1.1',
  'Twitterbot/1.0',
  'TelegramBot',
  'LinkedInBot/1.0',
  'Slackbot-LinkExpanding 1.0',
  'Discordbot/2.0'
];

const TARGET_URLS = {
  homepage: 'https://app.myartelab.com/',
  post: 'https://app.myartelab.com/post/6985392972cb0a50da1f589a',
  profile_with_pic: 'https://app.myartelab.com/creator/ebuka-esiobu',
  profile_no_pic: 'https://app.myartelab.com/creator/gabriel-ateboh',
  profile_nonexistent: 'https://app.myartelab.com/creator/nonexistent-slug-xyz123'
};

function fetchUrl(targetUrl, userAgent) {
  return new Promise((resolve) => {
    const parsed = new URL(targetUrl);
    const start = Date.now();
    const req = https.get(
      targetUrl,
      {
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        timeout: 10000
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({
            url: targetUrl,
            userAgent,
            statusCode: res.statusCode,
            headers: res.headers,
            timeMs: Date.now() - start,
            body: data
          });
        });
      }
    );
    req.on('error', (err) => {
      resolve({
        url: targetUrl,
        userAgent,
        error: err.message,
        timeMs: Date.now() - start
      });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({
        url: targetUrl,
        userAgent,
        error: 'TIMEOUT',
        timeMs: Date.now() - start
      });
    });
  });
}

function checkImage(imageUrl) {
  return new Promise((resolve) => {
    if (!imageUrl || !imageUrl.startsWith('http')) {
      return resolve({ url: imageUrl, valid: false, error: 'Not an absolute HTTP(S) URL' });
    }
    const start = Date.now();
    const req = https.get(
      imageUrl,
      {
        headers: { 'User-Agent': 'WhatsApp/2.23.20.0' },
        timeout: 10000
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve({
            url: imageUrl,
            statusCode: res.statusCode,
            contentType: res.headers['content-type'],
            contentLength: buffer.length,
            timeMs: Date.now() - start,
            buffer
          });
        });
      }
    );
    req.on('error', (err) => {
      resolve({ url: imageUrl, error: err.message });
    });
  });
}

function extractMetaTags(html) {
  const getTag = (pattern) => {
    const m = html.match(pattern);
    return m ? m[1] : null;
  };

  return {
    title: getTag(/<title[^>]*>([^<]*)<\/title>/i),
    description: getTag(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i) || getTag(/<meta\s+content=["']([^"']*)["']\s+name=["']description["']/i),
    canonical: getTag(/<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i),
    og_title: getTag(/<meta\s+property=["']og:title["']\s+content=["']([^"']*)["']/i) || getTag(/<meta\s+content=["']([^"']*)["']\s+property=["']og:title["']/i),
    og_description: getTag(/<meta\s+property=["']og:description["']\s+content=["']([^"']*)["']/i) || getTag(/<meta\s+content=["']([^"']*)["']\s+property=["']og:description["']/i),
    og_image: getTag(/<meta\s+property=["']og:image["']\s+content=["']([^"']*)["']/i) || getTag(/<meta\s+content=["']([^"']*)["']\s+property=["']og:image["']/i),
    og_url: getTag(/<meta\s+property=["']og:url["']\s+content=["']([^"']*)["']/i) || getTag(/<meta\s+content=["']([^"']*)["']\s+property=["']og:url["']/i),
    og_type: getTag(/<meta\s+property=["']og:type["']\s+content=["']([^"']*)["']/i) || getTag(/<meta\s+content=["']([^"']*)["']\s+property=["']og:type["']/i),
    og_site_name: getTag(/<meta\s+property=["']og:site_name["']\s+content=["']([^"']*)["']/i) || getTag(/<meta\s+content=["']([^"']*)["']\s+property=["']og:site_name["']/i),
    og_image_secure_url: getTag(/<meta\s+property=["']og:image:secure_url["']\s+content=["']([^"']*)["']/i),
    og_image_type: getTag(/<meta\s+property=["']og:image:type["']\s+content=["']([^"']*)["']/i),
    og_image_width: getTag(/<meta\s+property=["']og:image:width["']\s+content=["']([^"']*)["']/i),
    og_image_height: getTag(/<meta\s+property=["']og:image:height["']\s+content=["']([^"']*)["']/i),
    og_image_alt: getTag(/<meta\s+property=["']og:image:alt["']\s+content=["']([^"']*)["']/i),
    twitter_card: getTag(/<meta\s+name=["']twitter:card["']\s+content=["']([^"']*)["']/i) || getTag(/<meta\s+content=["']([^"']*)["']\s+name=["']twitter:card["']/i),
    twitter_title: getTag(/<meta\s+name=["']twitter:title["']\s+content=["']([^"']*)["']/i) || getTag(/<meta\s+content=["']([^"']*)["']\s+name=["']twitter:title["']/i),
    twitter_description: getTag(/<meta\s+name=["']twitter:description["']\s+content=["']([^"']*)["']/i) || getTag(/<meta\s+content=["']([^"']*)["']\s+name=["']twitter:description["']/i),
    twitter_image: getTag(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']*)["']/i) || getTag(/<meta\s+content=["']([^"']*)["']\s+name=["']twitter:image["']/i)
  };
}

async function run() {
  console.log('🔍 Starting Phase 1 Live Diagnostics...\n');
  const results = {};

  for (const [pageKey, pageUrl] of Object.entries(TARGET_URLS)) {
    console.log(`================================================================`);
    console.log(`Testing Route [${pageKey}]: ${pageUrl}`);
    console.log(`================================================================`);
    results[pageKey] = {};

    for (const ua of USER_AGENTS) {
      const res = await fetchUrl(pageUrl, ua);
      const meta = res.body ? extractMetaTags(res.body) : {};
      results[pageKey][ua] = {
        statusCode: res.statusCode,
        timeMs: res.timeMs,
        meta
      };
      console.log(`[${ua}] -> HTTP ${res.statusCode} (${res.timeMs}ms)`);
      console.log(`   og:title: ${meta.og_title}`);
      console.log(`   og:image: ${meta.og_image}`);
      console.log(`   twitter:card: ${meta.twitter_card}`);
    }
  }

  // Now check the discovered image URLs
  console.log('\n================================================================');
  console.log('Checking og:image assets...');
  console.log('================================================================');
  const checkedImages = new Set();
  const imageResults = {};

  for (const pageKey of Object.keys(results)) {
    for (const ua of USER_AGENTS) {
      const img = results[pageKey][ua].meta.og_image;
      if (img && !checkedImages.has(img)) {
        checkedImages.add(img);
        console.log(`Inspecting image: ${img}`);
        const imgRes = await checkImage(img);
        let dimensions = null;
        if (imgRes.buffer) {
          try {
            const sharp = require('../backend/node_modules/sharp');
            const meta = await sharp(imgRes.buffer).metadata();
            dimensions = { width: meta.width, height: meta.height, format: meta.format, space: meta.space };
          } catch (e) {
            dimensions = { error: e.message };
          }
        }
        imageResults[img] = {
          statusCode: imgRes.statusCode,
          contentType: imgRes.contentType,
          bytes: imgRes.contentLength,
          timeMs: imgRes.timeMs,
          dimensions
        };
        console.log(`   HTTP: ${imgRes.statusCode}, Content-Type: ${imgRes.contentType}, Size: ${(imgRes.contentLength / 1024).toFixed(1)} KB, Dims: ${dimensions?.width}x${dimensions?.height}`);
      }
    }
  }

  const finalOutput = {
    pages: results,
    images: imageResults
  };

  const fs = require('fs');
  fs.writeFileSync('scripts/preview-audit-results.json', JSON.stringify(finalOutput, null, 2));
  console.log('\n✅ Diagnostics complete. Saved to scripts/preview-audit-results.json');
}

run().catch(console.error);
