/**
 * Switch Live Key & Readiness Verification Script
 * 
 * Safely tests authentication, read-only metadata endpoints, and non-monetary capability checks.
 * NEVER prints or logs sensitive keys or secrets.
 */

const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const BASE_URL = (process.env.SWITCH_BASE_URL || 'https://api.onswitch.xyz').replace(/\/+$/, '');
const SERVICE_KEY = (process.env.SWITCH_SERVICE_KEY || '').trim();

function maskKey(key) {
  if (!key) return '(not set)';
  if (key.length <= 8) return key.slice(0, 2) + '***';
  return key.slice(0, 7) + '...' + key.slice(-4) + ` (len=${key.length})`;
}

async function safeFetch(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'x-service-key': SERVICE_KEY,
    ...(options.headers || {})
  };

  const start = Date.now();
  try {
    const res = await fetch(url, { ...options, headers });
    const elapsed = Date.now() - start;
    const contentType = res.headers.get('content-type') || '';
    let data;
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = { rawText: await res.text() };
    }

    return {
      endpoint,
      url,
      status: res.status,
      ok: res.ok,
      elapsedMs: elapsed,
      data
    };
  } catch (err) {
    return {
      endpoint,
      url,
      status: 'FETCH_ERROR',
      ok: false,
      data: null,
      error: err.message
    };
  }
}

async function run() {
  console.log('====================================================');
  console.log('   Switch Live Credential & Capabilities Verification');
  console.log('====================================================');
  console.log(`Base URL:    ${BASE_URL}`);
  console.log(`Service Key: ${maskKey(SERVICE_KEY)}`);
  console.log(`Key Prefix:  ${SERVICE_KEY ? SERVICE_KEY.split('_')[0] : 'none'}`);
  console.log('----------------------------------------------------');

  if (!SERVICE_KEY) {
    console.error('ERROR: SWITCH_SERVICE_KEY is empty in backend/.env');
    process.exit(1);
  }

  // Check 1: GET /asset (documented basic read-only health/auth check)
  console.log('\n[Check 1] GET /asset (Testing Authentication & Assets)...');
  const assetRes = await safeFetch('/asset');
  console.log(`HTTP Status: ${assetRes.status}`);
  if (assetRes.ok) {
    const assets = Array.isArray(assetRes.data?.data) ? assetRes.data.data : [];
    console.log(`Auth Succeeded: YES`);
    console.log(`Total Assets returned: ${assets.length}`);
    const networks = [...new Set(assets.map(a => a.network || a.chain))].filter(Boolean);
    console.log(`Supported Networks: ${networks.join(', ')}`);
  } else {
    console.log(`Auth Succeeded: NO`);
    console.log(`Response message:`, JSON.stringify(assetRes.data, null, 2));
  }

  // Check 2: GET /coverage (Coverage of countries and corridors)
  console.log('\n[Check 2] GET /coverage (Testing Country & Rails Coverage)...');
  const covRes = await safeFetch('/coverage');
  console.log(`HTTP Status: ${covRes.status}`);
  if (covRes.ok) {
    const coverage = covRes.data?.data || covRes.data || {};
    const countries = Array.isArray(coverage) ? coverage : (coverage.countries || Object.keys(coverage));
    console.log(`Coverage Countries Count: ${countries.length}`);
    if (Array.isArray(countries) && typeof countries[0] === 'object') {
      const codes = countries.map(c => c.country || c.code || c.name);
      console.log(`Countries: ${codes.slice(0, 15).join(', ')}...`);
    } else {
      console.log(`Sample:`, JSON.stringify(countries).slice(0, 150));
    }
  } else {
    console.log(`Coverage request failed:`, JSON.stringify(covRes.data));
  }

  // Check 3: GET /wallet (Inspect account wallets / status)
  console.log('\n[Check 3] GET /wallet (Testing Wallet API Permissions)...');
  const walletRes = await safeFetch('/wallet');
  console.log(`HTTP Status: ${walletRes.status}`);
  console.log(`Response:`, (JSON.stringify(walletRes.data || walletRes.error, null, 2) || '').slice(0, 400));

  // Check 4: Non-monetary quote check for onramp (NGN -> USDC)
  console.log('\n[Check 4] POST /onramp/quote (Testing Onramp Quote Generation)...');
  const onrampQuoteRes = await safeFetch('/onramp/quote', {
    method: 'POST',
    body: JSON.stringify({
      amount: 10000,
      country: 'NG',
      currency: 'NGN',
      asset: 'solana:usdc'
    })
  });
  console.log(`HTTP Status: ${onrampQuoteRes.status}`);
  console.log(`Onramp Quote Result:`, (JSON.stringify(onrampQuoteRes.data || onrampQuoteRes.error, null, 2) || '').slice(0, 400));

  // Check 5: Non-monetary quote check for offramp (USDC -> NGN)
  console.log('\n[Check 5] POST /offramp/quote (Testing Offramp Quote Generation)...');
  const offrampQuoteRes = await safeFetch('/offramp/quote', {
    method: 'POST',
    body: JSON.stringify({
      amount: 10,
      country: 'NG',
      currency: 'NGN',
      asset: 'solana:usdc'
    })
  });
  console.log(`HTTP Status: ${offrampQuoteRes.status}`);
  console.log(`Offramp Quote Result:`, (JSON.stringify(offrampQuoteRes.data || offrampQuoteRes.error, null, 2) || '').slice(0, 400));

  console.log('\n====================================================');
  console.log('   Verification Complete');
  console.log('====================================================');
}

run().catch(err => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});
