#!/usr/bin/env node
/**
 * X/Twitter Key Diagnostic
 * Tests OAuth credentials step by step to identify the exact failure.
 *
 * Usage: node scripts/diagnose-x-keys.mjs
 * Requires: netlify dev running (to pull env vars) OR .env file with keys
 *
 * Cost: FREE (only reads user profile, does NOT post)
 */

import { TwitterApi } from 'twitter-api-v2';

// Load env vars from .env if present
import { config } from 'dotenv';
config();

console.log('🔍 X/Twitter Key Diagnostic Tool');
console.log('=================================\n');

// Step 1: Check env vars exist
const appKey = process.env.TWITTER_API_KEY;
const appSecret = process.env.TWITTER_API_SECRET;
const accessToken = process.env.TWITTER_ACCESS_TOKEN;
const accessSecret = process.env.TWITTER_ACCESS_SECRET;

const keys = { TWITTER_API_KEY: appKey, TWITTER_API_SECRET: appSecret, TWITTER_ACCESS_TOKEN: accessToken, TWITTER_ACCESS_SECRET: accessSecret };

console.log('Step 1: Environment Variables');
let allPresent = true;
for (const [name, val] of Object.entries(keys)) {
    if (val) {
        console.log(`  ✅ ${name} = ${val.substring(0, 6)}...${val.substring(val.length - 4)} (${val.length} chars)`);
    } else {
        console.log(`  ❌ ${name} = MISSING`);
        allPresent = false;
    }
}

if (!allPresent) {
    console.log('\n❌ FAIL: Missing keys. Set them in .env or run via netlify dev.');
    console.log('   Tip: Run "netlify env:list" to check Netlify env vars');
    process.exit(1);
}

// Step 2: Create client
console.log('\nStep 2: Creating OAuth 1.0a Client...');
const client = new TwitterApi({ appKey, appSecret, accessToken, accessSecret });

// Step 3: Test read-only endpoint (GET /2/users/me) - FREE, no posting
console.log('\nStep 3: Testing GET /2/users/me (read-only, no posting)...');
try {
    const me = await client.v2.me();
    console.log(`  ✅ SUCCESS! Authenticated as: @${me.data.username} (${me.data.name})`);
    console.log(`  User ID: ${me.data.id}`);
    console.log('\n✅ OAuth credentials are VALID. Ready for live posting.');
    console.log('   Run: node scripts/test-x-publish.mjs --live');
} catch (error) {
    console.log(`  ❌ FAILED: ${error.message}`);

    if (error.code === 401 || error.data?.status === 401) {
        console.log('\n🔴 DIAGNOSIS: 401 Unauthorized');
        console.log('   Possible causes:');
        console.log('   1. App permissions: Must be "Read and Write" (not just "Read")');
        console.log('   2. Access token generated BEFORE permissions upgrade (regenerate it)');
        console.log('   3. Keys from wrong app (all 4 must come from SAME app)');
        console.log('   4. Free tier restrictions (some endpoints need Basic/Pro)');
        console.log('\n   Fix Steps:');
        console.log('   1. Go to https://developer.x.com/en/portal/dashboard');
        console.log('   2. Select your app → Settings → App permissions');
        console.log('   3. Set to "Read and Write"');
        console.log('   4. Go to "Keys and tokens" tab');
        console.log('   5. Click "Regenerate" on BOTH Consumer Keys AND Access Tokens');
        console.log('   6. Copy ALL 4 fresh keys');
        console.log('   7. Update in Netlify: netlify env:set TWITTER_API_KEY "new_value"');
    } else if (error.code === 403) {
        console.log('\n🔴 DIAGNOSIS: 403 Forbidden');
        console.log('   Your app needs the "Read and Write" permission.');
        console.log('   Or: Your developer account may need to apply for Elevated access.');
        console.log('   Go to: https://developer.x.com/en/portal/dashboard');
    } else if (error.code === 429) {
        console.log('\n🟡 DIAGNOSIS: 429 Rate Limited');
        console.log('   Try again in 15 minutes.');
    } else {
        console.log('\n🔴 DIAGNOSIS: Unexpected error');
        console.log('   Full error:', JSON.stringify(error.data || error, null, 2));
    }

    process.exit(1);
}
