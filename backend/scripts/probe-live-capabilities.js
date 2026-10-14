/**
 * Comprehensive Switch Live Capabilities Prober
 * 
 * Tests all corridors, coverage, quotes, beneficiaries, institutions, and wallet APIs
 * on the production live key safely (strictly read-only / non-monetary).
 */

const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const BASE_URL = (process.env.SWITCH_BASE_URL || 'https://api.onswitch.xyz').replace(/\/+$/, '');
const SERVICE_KEY = (process.env.SWITCH_SERVICE_KEY || '').trim();

function maskKey(key) {
  if (!key) return '(not set)';
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
  console.log('================================================================');
  console.log('       Switch Production Comprehensive Capability Probe');
  console.log('================================================================');
  console.log(`Base URL:    ${BASE_URL}`);
  console.log(`Key:         ${maskKey(SERVICE_KEY)}`);
  console.log(`Timestamp:   ${new Date().toISOString()}`);
  console.log('----------------------------------------------------------------\n');

  // 1. GET /coverage?direction=ONRAMP
  console.log('1. Probing ONRAMP Coverage...');
  const onrampCov = await safeFetch('/coverage?direction=ONRAMP');
  console.log(`Status: ${onrampCov.status} ${onrampCov.ok ? 'OK' : 'FAIL'}`);
  const onrampCountries = onrampCov.data?.data || [];
  console.log(`Supported Onramp Corridors: ${onrampCountries.length}`);
  onrampCountries.forEach(c => {
    console.log(`   - ${c.country} (${(c.currency || []).join(', ')}): rails=${(c.channel || []).join(', ')}`);
  });

  // 2. GET /coverage?direction=OFFRAMP
  console.log('\n2. Probing OFFRAMP Coverage...');
  const offrampCov = await safeFetch('/coverage?direction=OFFRAMP');
  console.log(`Status: ${offrampCov.status} ${offrampCov.ok ? 'OK' : 'FAIL'}`);
  const offrampCountries = offrampCov.data?.data || [];
  console.log(`Supported Offramp Corridors: ${offrampCountries.length}`);
  offrampCountries.forEach(c => {
    console.log(`   - ${c.country} (${(c.currency || []).join(', ')}): rails=${(c.channel || []).join(', ')}`);
  });

  // 3. GET /wallets
  console.log('\n3. Probing Wallets API...');
  const walletsRes = await safeFetch('/wallets');
  console.log(`Status: ${walletsRes.status} ${walletsRes.ok ? 'OK' : 'FAIL'}`);
  if (walletsRes.ok) {
    const list = Array.isArray(walletsRes.data?.data) ? walletsRes.data.data : [];
    console.log(`Existing wallets count on live account: ${list.length}`);
  } else {
    console.log(`Wallets error: ${JSON.stringify(walletsRes.data)}`);
  }

  // 4. Probing Quotes across major corridors
  const corridorsToTest = [
    { country: 'NG', currency: 'NGN', onrampAmt: 10000, offrampAmt: 10 },
    { country: 'GH', currency: 'GHS', onrampAmt: 100, offrampAmt: 10 },
    { country: 'KE', currency: 'KES', onrampAmt: 1000, offrampAmt: 10 },
    { country: 'ZA', currency: 'ZAR', onrampAmt: 200, offrampAmt: 10 },
    { country: 'UG', currency: 'UGX', onrampAmt: 35000, offrampAmt: 10 },
    { country: 'RW', currency: 'RWF', onrampAmt: 13000, offrampAmt: 10 },
    { country: 'TZ', currency: 'TZS', onrampAmt: 26000, offrampAmt: 10 },
    { country: 'CI', currency: 'XOF', onrampAmt: 6000, offrampAmt: 10 },
    { country: 'SN', currency: 'XOF', onrampAmt: 6000, offrampAmt: 10 },
    { country: 'CM', currency: 'XAF', onrampAmt: 6000, offrampAmt: 10 }
  ];

  console.log('\n4. Probing Live Quotes (Onramp & Offramp)...');
  for (const c of corridorsToTest) {
    process.stdout.write(`Testing ${c.country} (${c.currency}): `);
    
    // Onramp Quote
    const onRes = await safeFetch('/onramp/quote', {
      method: 'POST',
      body: JSON.stringify({
        amount: c.onrampAmt,
        country: c.country,
        currency: c.currency,
        asset: 'solana:usdc'
      })
    });

    const onStatus = onRes.ok 
      ? `ONRAMP: OK (rate=${onRes.data?.data?.rate}, min/channel=${onRes.data?.data?.channel})`
      : `ONRAMP: ${onRes.status} (${onRes.data?.message || 'Error'})`;

    // Offramp Quote
    const offRes = await safeFetch('/offramp/quote', {
      method: 'POST',
      body: JSON.stringify({
        amount: c.offrampAmt,
        country: c.country,
        currency: c.currency,
        asset: 'solana:usdc'
      })
    });

    const offStatus = offRes.ok
      ? `OFFRAMP: OK (rate=${offRes.data?.data?.rate}, channel=${offRes.data?.data?.channel})`
      : `OFFRAMP: ${offRes.status} (${offRes.data?.message || 'Error'})`;

    console.log(`\n   ${onStatus}\n   ${offStatus}`);
  }

  // 5. Beneficiary Requirements
  console.log('\n5. Probing Beneficiary Requirements (NG, GH, KE, ZA)...');
  for (const country of ['NG', 'GH', 'KE', 'ZA']) {
    const benRes = await safeFetch(`/beneficiary/requirements?country=${country}`);
    console.log(`Country ${country}: ${benRes.status} ${benRes.ok ? 'OK' : benRes.data?.message}`);
    if (benRes.ok && benRes.data?.data) {
      console.log(`   Requirements:`, JSON.stringify(benRes.data.data));
    }
  }

  // 6. Institution Lookup
  console.log('\n6. Probing Institutions (Banks/Mobile Money)...');
  for (const country of ['NG', 'GH', 'KE']) {
    const instRes = await safeFetch(`/institution?country=${country}`);
    console.log(`Country ${country}: ${instRes.status} ${instRes.ok ? 'OK' : instRes.data?.message}`);
    if (instRes.ok && Array.isArray(instRes.data?.data)) {
      console.log(`   Count: ${instRes.data.data.length} institutions (e.g. ${instRes.data.data.slice(0, 3).map(i => i.name).join(', ')})`);
    }
  }

  console.log('\n================================================================');
  console.log('       Probe Complete');
  console.log('================================================================');
}

run().catch(err => {
  console.error('Fatal probe error:', err);
  process.exit(1);
});
