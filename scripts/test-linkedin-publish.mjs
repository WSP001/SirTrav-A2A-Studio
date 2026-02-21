#!/usr/bin/env node
// File: scripts/test-linkedin-publish.mjs
// Purpose: Test LinkedIn Publisher with No Fake Success pattern
// Pattern: Inherited from WSP2agent Golden Path principles
// Usage:
//   node scripts/test-linkedin-publish.mjs                          # Check-only mode
//   node scripts/test-linkedin-publish.mjs --dry-run                # Validate payload
//   node scripts/test-linkedin-publish.mjs --live                   # Post (auto-detect local→cloud)
//   node scripts/test-linkedin-publish.mjs --live --local           # Post via localhost:8888
//   node scripts/test-linkedin-publish.mjs --live --cloud           # Post via sirtrav-a2a-studio.netlify.app
//   node scripts/test-linkedin-publish.mjs --live --base-url <url>  # Post via explicit URL

const DRY_RUN = process.argv.includes('--dry-run');
const LIVE = process.argv.includes('--live');

// ── Target resolution: --base-url > --cloud > --local > auto-detect ──
const CLOUD_URL = 'https://sirtrav-a2a-studio.netlify.app';
const LOCAL_URL = 'http://localhost:8888';

function resolveBaseUrl() {
  const idx = process.argv.indexOf('--base-url');
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  if (process.argv.includes('--cloud')) return CLOUD_URL;
  if (process.argv.includes('--local')) return LOCAL_URL;
  return null; // auto-detect
}

async function autoDetectBaseUrl() {
  const explicit = resolveBaseUrl();
  if (explicit) return explicit;
  // auto: try local first, fallback to cloud
  try {
    const r = await fetch(`${LOCAL_URL}/.netlify/functions/healthcheck`, { signal: AbortSignal.timeout(2000) });
    if (r.ok) return LOCAL_URL;
  } catch { /* local not running */ }
  return CLOUD_URL;
}

console.log('🧪 LinkedIn Publisher Test');
console.log(`Mode: ${DRY_RUN ? 'DRY-RUN' : LIVE ? 'LIVE' : 'CHECK-ONLY'}`);
console.log('─'.repeat(50));

// Step 1: Verify env vars exist (No Fake Success pattern)
const requiredVars = [
  'LINKEDIN_CLIENT_ID',
  'LINKEDIN_CLIENT_SECRET',
  'LINKEDIN_ACCESS_TOKEN',
  'LINKEDIN_PERSON_URN'
];

console.log('\n📋 Environment Check:');
let allPresent = true;
const envStatus = {};

for (const v of requiredVars) {
  const exists = !!process.env[v];
  const status = exists ? '✅ configured' : '❌ missing';
  console.log(`  ${status}: ${v}`);
  envStatus[v] = exists ? 'configured' : 'missing';
  if (!exists) allPresent = false;
}

// Report structured status (No Fake Success)
const healthStatus = {
  service: 'linkedin',
  status: allPresent ? 'configured' : 'disabled',
  env: envStatus,
  timestamp: new Date().toISOString()
};

console.log('\n📊 Health Status (JSON):');
console.log(JSON.stringify(healthStatus, null, 2));

if (!allPresent && !DRY_RUN && !LIVE) {
  console.log('\n⚠️  LinkedIn is DISABLED (keys not configured locally)');
  console.log('   Add credentials to Netlify env vars or .env file');
  console.log('\n🏁 Test complete (CHECK-ONLY mode)');
  process.exit(0);
}
if (!allPresent && LIVE) {
  console.log('\n⚠️  Local env vars missing — proceeding to cloud (function has its own env)');
}

// Step 2: Dry-run (validate request shape)
if (DRY_RUN) {
  const payload = {
    text: '🧪 Test post from SirTrav-A2A-Studio #ForTheCommonsGood',
    runId: `test-${Date.now()}`,
    projectId: 'sirtrav-test',
    platform: 'linkedin',
    cost: {
      apiCalls: 1,
      estimatedCost: 0.001,
      markup: 0.20,
      total: 0.0012
    }
  };
  
  console.log('\n📦 Request Payload (Dry-Run):');
  console.log(JSON.stringify(payload, null, 2));
  
  // Validate payload shape
  const requiredFields = ['text', 'runId', 'projectId', 'platform'];
  const missingFields = requiredFields.filter(f => !payload[f]);
  
  if (missingFields.length > 0) {
    console.log(`\n❌ DRY-RUN FAIL: Missing fields: ${missingFields.join(', ')}`);
    process.exit(1);
  }
  
  console.log('\n✅ DRY-RUN PASS: Payload valid');
  console.log('   Ready for live test when credentials configured');
  process.exit(0);
}

// Step 3: Live test (local, cloud, or auto-detect)
if (LIVE) {
  const baseUrl = await autoDetectBaseUrl();
  const target = baseUrl === LOCAL_URL ? 'LOCAL' : baseUrl === CLOUD_URL ? 'CLOUD' : 'CUSTOM';
  console.log(`\n🚀 Target: ${target} → ${baseUrl}`);
  console.log(`   Calling ${baseUrl}/.netlify/functions/publish-linkedin...`);
  
  try {
    const response = await fetch(`${baseUrl}/.netlify/functions/publish-linkedin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: `sirtrav-live-test-${Date.now()}`,
        videoUrl: 'https://sirtrav-a2a-studio.netlify.app/test-assets/sample.mp4',
        title: 'SirTrav LinkedIn Integration Test',
        description: '🧪 Test post from SirTrav-A2A-Studio - validating LinkedIn integration #ForTheCommonsGood',
        visibility: 'PUBLIC',
        hashtags: ['SirTrav', 'FamilyTravel', 'ForTheCommonsGood'],
      }),
    });
    
    const data = await response.json();
    
    console.log('\n📥 Response:');
    console.log(JSON.stringify(data, null, 2));
    
    // No Fake Success validation
    const resolvedPostUrl = data.linkedinUrl || data.postUrl;
    if (data.success === true && resolvedPostUrl) {
      console.log(`\n✅ LIVE TEST PASS: ${resolvedPostUrl}`);
      if (data.cost) {
        console.log(`   Cost: $${data.cost.total.toFixed(4)} (includes 20% Commons Good markup)`);
      }
    } else if (data.disabled === true) {
      console.log('\n⚠️  LinkedIn DISABLED (No Fake Success pattern working correctly)');
      console.log(`   Reason: ${data.error || 'Keys not configured'}`);
      console.log('   Next: just linkedin-doc');
    } else {
      console.log(`\n❌ LIVE TEST FAIL: ${data.error || 'Unknown error'}`);
      process.exit(1);
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('\n❌ Connection refused. Is netlify dev running?');
      console.log('   Run: just dev (or: netlify dev)');
    } else {
      console.log(`\n❌ Error: ${error.message}`);
    }
    process.exit(1);
  }
}

console.log('\n🏁 Test complete');
