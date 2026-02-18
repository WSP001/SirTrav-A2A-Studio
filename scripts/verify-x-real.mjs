#!/usr/bin/env node
/**
 * verify-x-real.mjs — North Star Verification (Commit 098f384 Logic)
 * SeaTrace "Packet Switch" — Public Logic / Private Keys
 *
 * This script proves REAL X/Twitter integration with NO mock behavior.
 * It reads keys from the Private Vault (Netlify env / .env) and
 * authenticates + optionally posts a REAL tweet.
 *
 * Usage:
 *   node scripts/verify-x-real.mjs              # Auth check only (FREE, no post)
 *   node scripts/verify-x-real.mjs --post       # Auth + LIVE tweet (costs 1 API call)
 *   node scripts/verify-x-real.mjs --dry-run    # Vault key existence check only
 *
 * CORRECT Netlify Vault Key Names (verified 2026-02-17):
 *   TWITTER_API_KEY           (not APP_KEY, not X_API_KEY)
 *   TWITTER_API_SECRET        (not APP_SECRET)
 *   TWITTER_ACCESS_TOKEN
 *   TWITTER_ACCESS_SECRET     (NOT TWITTER_ACCESS_TOKEN_SECRET — this was the persistent bug)
 *
 * Cost: FREE for auth check | $0.001 + 20% for live post
 */

import { TwitterApi } from 'twitter-api-v2';
import { config } from 'dotenv';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

config(); // Load .env if present

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const COSTING_DIR = join(ROOT, 'artifacts', 'costing');

const args = process.argv.slice(2);
const doPost = args.includes('--post');
const isDryRun = args.includes('--dry-run');

// ─── Packet Switch: ON ──────────────────────────────────────────────
console.log('=== PACKET SWITCH: ON (Public Logic / Private Keys) ===\n');

// ─── Step 1: Vault Key Check ────────────────────────────────────────
// TRUTH: These are the EXACT names in our Netlify vault.
// The persistent false positive was caused by agents using
// TWITTER_ACCESS_TOKEN_SECRET instead of TWITTER_ACCESS_SECRET.
const VAULT_KEYS = {
  TWITTER_API_KEY:       process.env.TWITTER_API_KEY,
  TWITTER_API_SECRET:    process.env.TWITTER_API_SECRET,
  TWITTER_ACCESS_TOKEN:  process.env.TWITTER_ACCESS_TOKEN,
  TWITTER_ACCESS_SECRET: process.env.TWITTER_ACCESS_SECRET,
};

console.log('Step 1: Private Vault Access');
let allPresent = true;
for (const [name, val] of Object.entries(VAULT_KEYS)) {
  if (val && val.length > 5) {
    console.log(`  PASS: ${name} = ${val.substring(0, 4)}...${val.substring(val.length - 3)} (${val.length} chars)`);
  } else {
    console.log(`  FAIL: ${name} = ${val ? 'TOO SHORT' : 'MISSING'}`);
    allPresent = false;
  }
}

// CRITICAL: Check for the WRONG key name that causes persistent 401
if (process.env.TWITTER_ACCESS_TOKEN_SECRET && !process.env.TWITTER_ACCESS_SECRET) {
  console.log('\n  WARNING: Found TWITTER_ACCESS_TOKEN_SECRET but NOT TWITTER_ACCESS_SECRET');
  console.log('  This is the persistent false positive bug. The correct name is TWITTER_ACCESS_SECRET.');
  console.log('  Fix: netlify env:set TWITTER_ACCESS_SECRET "your_value"');
}

if (!allPresent) {
  console.log('\n  FAIL: Missing vault keys. Run: netlify env:list | grep TWITTER');
  process.exit(1);
}

if (isDryRun) {
  console.log('\n=== DRY-RUN: All 4 vault keys present. Packet Switch READY. ===');
  process.exit(0);
}

// ─── Step 2: The Handshake (Auth Check — FREE) ─────────────────────
console.log('\nStep 2: OAuth 1.0a Handshake (FREE — no post)');

const client = new TwitterApi({
  appKey:       VAULT_KEYS.TWITTER_API_KEY,
  appSecret:    VAULT_KEYS.TWITTER_API_SECRET,
  accessToken:  VAULT_KEYS.TWITTER_ACCESS_TOKEN,
  accessSecret: VAULT_KEYS.TWITTER_ACCESS_SECRET,
});

let username, userId;
try {
  const me = await client.v2.me();
  username = me.data.username;
  userId = me.data.id;
  console.log(`  PASS: Authenticated as @${username} (ID: ${userId})`);
} catch (error) {
  console.log(`  FAIL: Authentication failed`);

  if (error.code === 401 || error.data?.status === 401) {
    console.log('\n  DIAGNOSIS: 401 Unauthorized');
    console.log('  Possible causes:');
    console.log('  1. App permissions must be "Read and Write" (not just "Read")');
    console.log('  2. Access token generated BEFORE permissions upgrade (regenerate it)');
    console.log('  3. Keys from wrong app (all 4 must come from SAME app)');
    console.log('\n  Fix: X Portal > User authentication settings > App permissions > "Read and Write"');
    console.log('  Then regenerate ALL 4 keys and update Netlify.');
  } else if (error.code === 403) {
    console.log('\n  DIAGNOSIS: 403 Forbidden');
    console.log('  App needs "Read and Write" permission or Elevated access.');
  } else {
    console.log('  Error:', error.message || error);
  }
  process.exit(1);
}

// ─── Step 3: The Commons Good Proof (Write — costs 1 API call) ──────
if (doPost) {
  console.log('\nStep 3: Write Packet (LIVE tweet)');
  try {
    const tweetText = `System Audit: SirTrav-A2A-Studio Real-Agent Integration Active. #CommonsGood ${Date.now()}`;
    const result = await client.v2.tweet(tweetText);
    const tweetId = result.data.id;

    // INVARIANT: Real tweetId must exist
    if (!tweetId || tweetId.length < 5) {
      console.log('  FAIL: INVARIANT VIOLATION — API returned but no valid tweetId');
      process.exit(1);
    }

    console.log(`  PASS: Tweet posted — ID: ${tweetId}`);
    console.log(`  URL: https://x.com/${username}/status/${tweetId}`);
    console.log('  STATUS: 100% PRODUCTION READY. Mock mode disabled.');

    // ─── Step 4: Packet Switch Cost Log (Private) ───────────────────
    const invoice = {
      packet: 'verify-x-real',
      jobType: 'X/Twitter Verification',
      logicVersion: '098f384',
      publicResult: { success: true, tweetId, username },
      costBreakdown: {
        apiCalls: 2,
        authCall: { endpoint: 'GET /2/users/me', cost: 0 },
        writeCall: { endpoint: 'POST /2/tweets', cost: 0.001 },
        baseCost: 0.001,
        markup: 0.0002,
        totalDue: 0.0012,
      },
      timestamp: new Date().toISOString(),
      buildId: process.env.BUILD_ID || 'local',
    };

    // Write to private costing directory (gitignored)
    if (!existsSync(COSTING_DIR)) mkdirSync(COSTING_DIR, { recursive: true });
    const costFile = join(COSTING_DIR, `verify-x-${Date.now()}.json`);
    writeFileSync(costFile, JSON.stringify(invoice, null, 2));
    console.log(`\n  INVOICE: 2 API calls | Base: $0.001 | +20%: $0.0012 | Logged: ${costFile}`);
  } catch (error) {
    console.log(`  FAIL: Tweet post failed — ${error.message}`);
    if (error.code === 403) {
      console.log('  App permissions must be "Read and Write" in X Portal.');
    }
    process.exit(1);
  }
} else {
  console.log('\nStep 3: Write Packet SKIPPED (use --post to send a real tweet)');
  console.log('  Auth verified. To prove write access: node scripts/verify-x-real.mjs --post');
}

// ─── Packet Switch: OFF ─────────────────────────────────────────────
console.log('\n=== PACKET SWITCH: OFF ===');
console.log(`  Agent: @${username} (${userId})`);
console.log(`  Vault: 4/4 keys present`);
console.log(`  Auth: REAL (not mock)`);
console.log(`  Write: ${doPost ? 'VERIFIED' : 'READY (use --post)'}`);
console.log(`  Status: PRODUCTION READY`);
