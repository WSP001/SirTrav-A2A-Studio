#!/usr/bin/env node
// File: scripts/linkedin-setup-helper.mjs
// Purpose: LinkedIn OAuth setup assistant — test token, generate auth URL,
//          exchange code, fetch PERSON_URN, set Netlify env vars.
// Usage:
//   node scripts/linkedin-setup-helper.mjs test-token          # Test current token
//   node scripts/linkedin-setup-helper.mjs auth-url            # Generate OAuth URL
//   node scripts/linkedin-setup-helper.mjs exchange <code>     # Exchange code → token
//   node scripts/linkedin-setup-helper.mjs fetch-urn           # Get PERSON_URN from token
//   node scripts/linkedin-setup-helper.mjs full-setup <code>   # Exchange + fetch URN + print env
//
// Reads from environment (or .env file via dotenv if available):
//   LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, LINKEDIN_ACCESS_TOKEN

import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Load .env if present ────────────────────────────────────────────────────
function loadDotenv() {
  try {
    const envPath = resolve(process.cwd(), '.env');
    const lines = readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  } catch { /* no .env file, that's fine */ }
}
loadDotenv();

// ── Constants ───────────────────────────────────────────────────────────────
const REDIRECT_URI = 'https://sirtrav-a2a-studio.netlify.app/auth/linkedin/callback';
const SCOPES = 'openid profile w_member_social';

const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;

// ── Helpers ─────────────────────────────────────────────────────────────────
function requireVar(name, value) {
  if (!value) {
    console.error(`\n❌ ${name} not set. Add it to your .env file or shell environment.`);
    process.exit(1);
  }
  return value;
}

function mask(secret) {
  if (!secret) return '(not set)';
  if (secret.length <= 8) return '****';
  return secret.slice(0, 4) + '...' + secret.slice(-4);
}

// ── Command: test-token ─────────────────────────────────────────────────────
async function testToken() {
  const token = requireVar('LINKEDIN_ACCESS_TOKEN', ACCESS_TOKEN);
  console.log(`\n🔑 Testing token: ${mask(token)}`);
  console.log('─'.repeat(50));

  // Try /v2/userinfo first (requires openid scope)
  console.log('\n📡 Trying /v2/userinfo (requires openid scope)...');
  try {
    const r1 = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (r1.ok) {
      const data = await r1.json();
      console.log('✅ /v2/userinfo SUCCESS');
      console.log(`   sub:   ${data.sub}`);
      console.log(`   name:  ${data.name || '(not returned)'}`);
      console.log(`   email: ${data.email || '(not returned)'}`);
      console.log(`\n🎯 LINKEDIN_PERSON_URN=urn:li:person:${data.sub}`);
      return { source: 'userinfo', personId: data.sub };
    }
    console.log(`⚠️  /v2/userinfo returned ${r1.status}: ${r1.statusText}`);
    const err1 = await r1.text();
    console.log(`   Body: ${err1.slice(0, 200)}`);
  } catch (e) {
    console.log(`⚠️  /v2/userinfo error: ${e.message}`);
  }

  // Fallback: /v2/me (older endpoint, different scopes)
  console.log('\n📡 Trying /v2/me (fallback, requires profile scope)...');
  try {
    const r2 = await fetch('https://api.linkedin.com/v2/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (r2.ok) {
      const data = await r2.json();
      const personId = data.id;
      console.log('✅ /v2/me SUCCESS');
      console.log(`   id: ${personId}`);
      console.log(`\n🎯 LINKEDIN_PERSON_URN=urn:li:person:${personId}`);
      return { source: 'me', personId };
    }
    console.log(`❌ /v2/me returned ${r2.status}: ${r2.statusText}`);
    const err2 = await r2.text();
    console.log(`   Body: ${err2.slice(0, 200)}`);
  } catch (e) {
    console.log(`❌ /v2/me error: ${e.message}`);
  }

  console.log('\n❌ BOTH endpoints failed. Your token likely:');
  console.log('   1. Is expired (check token age vs 2-month TTL)');
  console.log('   2. Lacks required scopes (openid, profile)');
  console.log('   3. Was revoked when you rotated secrets');
  console.log('\n👉 Run: node scripts/linkedin-setup-helper.mjs auth-url');
  console.log('   Then: node scripts/linkedin-setup-helper.mjs exchange <code>');
  return null;
}

// ── Command: auth-url ───────────────────────────────────────────────────────
function authUrl() {
  const clientId = requireVar('LINKEDIN_CLIENT_ID', CLIENT_ID);
  const encodedRedirect = encodeURIComponent(REDIRECT_URI);
  const encodedScopes = encodeURIComponent(SCOPES);

  const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodedRedirect}&scope=${encodedScopes}&state=sirtrav-setup-${Date.now()}`;

  console.log('\n🔗 LinkedIn Authorization URL');
  console.log('─'.repeat(50));
  console.log('\n1) Open this URL in your browser:\n');
  console.log(url);
  console.log('\n2) Click "Allow" on the LinkedIn consent screen.');
  console.log('3) You will be redirected to:');
  console.log(`   ${REDIRECT_URI}?code=XXXXXX&state=...`);
  console.log('\n4) Copy ONLY the code= value from the URL bar.');
  console.log('   (Everything after code= and before the next &)');
  console.log('\n5) Run:');
  console.log('   node scripts/linkedin-setup-helper.mjs exchange PASTE_CODE_HERE');
  console.log('\n📋 Scopes requested: ' + SCOPES);
  console.log('📋 Redirect URI: ' + REDIRECT_URI);
  return url;
}

// ── Command: exchange ───────────────────────────────────────────────────────
async function exchangeCode(code) {
  const clientId = requireVar('LINKEDIN_CLIENT_ID', CLIENT_ID);
  const clientSecret = requireVar('LINKEDIN_CLIENT_SECRET', CLIENT_SECRET);

  if (!code || code === 'PASTE_CODE_HERE') {
    console.error('\n❌ Provide the authorization code as an argument.');
    console.error('   Usage: node scripts/linkedin-setup-helper.mjs exchange AQR...xxx');
    process.exit(1);
  }

  console.log('\n🔄 Exchanging authorization code for access token...');
  console.log(`   Code: ${mask(code)}`);

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    client_id: clientId,
    client_secret: clientSecret,
  });

  try {
    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`\n❌ Token exchange failed (${response.status}):`);
      console.error(JSON.stringify(data, null, 2));
      console.error('\nCommon causes:');
      console.error('  - Code already used (each code is single-use)');
      console.error('  - Code expired (codes last ~30 seconds)');
      console.error('  - redirect_uri mismatch');
      console.error('\n👉 Run: node scripts/linkedin-setup-helper.mjs auth-url');
      console.error('   Get a FRESH code and exchange it immediately.');
      process.exit(1);
    }

    console.log('\n✅ Token exchange SUCCESS');
    console.log(`   access_token: ${mask(data.access_token)}`);
    console.log(`   expires_in:   ${data.expires_in} seconds (${Math.round(data.expires_in / 86400)} days)`);
    console.log(`   scope:        ${data.scope || '(not returned)'}`);

    console.log('\n━━━ COPY THESE VALUES ━━━');
    console.log(`LINKEDIN_ACCESS_TOKEN=${data.access_token}`);
    if (data.refresh_token) {
      console.log(`LINKEDIN_REFRESH_TOKEN=${data.refresh_token}`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━');

    return data.access_token;
  } catch (e) {
    console.error(`\n❌ Network error: ${e.message}`);
    process.exit(1);
  }
}

// ── Command: fetch-urn ──────────────────────────────────────────────────────
async function fetchUrn(token) {
  const t = token || requireVar('LINKEDIN_ACCESS_TOKEN', ACCESS_TOKEN);
  const result = await testTokenWith(t);
  return result;
}

async function testTokenWith(token) {
  // Same logic as testToken but accepts explicit token
  try {
    const r1 = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (r1.ok) {
      const data = await r1.json();
      return { source: 'userinfo', personId: data.sub, name: data.name };
    }
  } catch { /* continue */ }

  try {
    const r2 = await fetch('https://api.linkedin.com/v2/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (r2.ok) {
      const data = await r2.json();
      return { source: 'me', personId: data.id };
    }
  } catch { /* continue */ }

  return null;
}

// ── Command: full-setup ─────────────────────────────────────────────────────
async function fullSetup(code) {
  console.log('\n🚀 FULL SETUP: Exchange code → Fetch URN → Print env vars');
  console.log('═'.repeat(50));

  // Step 1: Exchange
  const token = await exchangeCode(code);

  // Step 2: Fetch URN
  console.log('\n📡 Fetching your Person URN...');
  const result = await testTokenWith(token);

  if (!result) {
    console.error('\n❌ Could not fetch Person URN with new token.');
    console.error('   The token may lack openid/profile scope.');
    console.error('   Check LinkedIn Dev Portal → Products tab.');
    process.exit(1);
  }

  const personUrn = `urn:li:person:${result.personId}`;
  console.log(`\n✅ Person URN: ${personUrn}`);
  if (result.name) console.log(`   Name: ${result.name}`);

  // Step 3: Print all env vars
  console.log('\n' + '═'.repeat(50));
  console.log('📋 SET THESE IN NETLIFY (Dashboard → Environment variables):');
  console.log('═'.repeat(50));
  console.log(`LINKEDIN_CLIENT_ID=${CLIENT_ID}`);
  console.log(`LINKEDIN_CLIENT_SECRET=${mask(CLIENT_SECRET)} ← use your real secret`);
  console.log(`LINKEDIN_ACCESS_TOKEN=${token}`);
  console.log(`LINKEDIN_PERSON_URN=${personUrn}`);
  console.log('═'.repeat(50));

  console.log('\n📋 OR use Netlify CLI (paste one at a time):');
  console.log(`netlify env:set LINKEDIN_CLIENT_ID "${CLIENT_ID}"`);
  console.log(`netlify env:set LINKEDIN_CLIENT_SECRET "YOUR_SECRET_HERE"`);
  console.log(`netlify env:set LINKEDIN_ACCESS_TOKEN "${token}"`);
  console.log(`netlify env:set LINKEDIN_PERSON_URN "${personUrn}"`);

  console.log('\n📋 OR for your local .env file:');
  console.log(`LINKEDIN_CLIENT_ID=${CLIENT_ID}`);
  console.log(`LINKEDIN_CLIENT_SECRET=YOUR_SECRET_HERE`);
  console.log(`LINKEDIN_ACCESS_TOKEN=${token}`);
  console.log(`LINKEDIN_PERSON_URN=${personUrn}`);

  console.log('\n✅ After setting env vars + redeploy, run:');
  console.log('   just council-flash-linkedin');
}

// ── Command: status ─────────────────────────────────────────────────────────
function status() {
  console.log('\n📊 LinkedIn Setup Status');
  console.log('─'.repeat(50));
  console.log(`  LINKEDIN_CLIENT_ID:     ${CLIENT_ID ? '✅ ' + mask(CLIENT_ID) : '❌ not set'}`);
  console.log(`  LINKEDIN_CLIENT_SECRET: ${CLIENT_SECRET ? '✅ ' + mask(CLIENT_SECRET) : '❌ not set'}`);
  console.log(`  LINKEDIN_ACCESS_TOKEN:  ${ACCESS_TOKEN ? '✅ ' + mask(ACCESS_TOKEN) : '❌ not set'}`);
  console.log(`  LINKEDIN_PERSON_URN:    ${process.env.LINKEDIN_PERSON_URN || '❌ not set'}`);
  console.log(`  Redirect URI:           ${REDIRECT_URI}`);
  console.log(`  Scopes:                 ${SCOPES}`);
}

// ── Router ──────────────────────────────────────────────────────────────────
const command = process.argv[2] || 'status';
const arg = process.argv[3];

console.log('🔧 LinkedIn Setup Helper — SirTrav-A2A-Studio');
console.log('─'.repeat(50));

switch (command) {
  case 'status':
    status();
    break;
  case 'test-token':
    await testToken();
    break;
  case 'auth-url':
    authUrl();
    break;
  case 'exchange':
    await exchangeCode(arg);
    break;
  case 'fetch-urn':
    await fetchUrn();
    break;
  case 'full-setup':
    await fullSetup(arg);
    break;
  default:
    console.log('\nCommands:');
    console.log('  status      Show current env var status');
    console.log('  test-token  Test if current LINKEDIN_ACCESS_TOKEN works');
    console.log('  auth-url    Generate OAuth authorization URL');
    console.log('  exchange    Exchange auth code for access token');
    console.log('  fetch-urn   Fetch LINKEDIN_PERSON_URN from token');
    console.log('  full-setup  Exchange code + fetch URN + print all env vars');
    break;
}
