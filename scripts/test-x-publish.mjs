import fetch from 'node-fetch';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Parse args
const args = process.argv.slice(2);
const help = args.includes('--help');
const live = args.includes('--live');
const dryRun = args.includes('--dry-run');
const verifyOnly = args.includes('--verify-only');
const useProd = args.includes('--prod');

if (help) {
    console.log(`
  Usage: node scripts/test-x-publish.mjs [options]

  Options:
    --dry-run        Test against localhost without posting (default)
    --live           Actually post to X/Twitter
    --verify-only    Only check configuration, do not attempt post
    --prod           Test against production (sirtrav-a2a-studio.netlify.app)
    --help           Show this help

  Workflow:
    1. just x-healthcheck    (check keys configured)
    2. just x-dry-run        (runs this with --dry-run)
    3. just x-live-test      (runs this with --live)
  `);
    process.exit(0);
}

// Auto-detect: try localhost first, fall back to cloud
const LOCAL_BASE = 'http://localhost:8888';
const CLOUD_BASE = 'https://sirtrav-a2a-studio.netlify.app';

async function resolveBase() {
    if (useProd) return CLOUD_BASE;
    // Try localhost with 2s timeout
    try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`${LOCAL_BASE}/.netlify/functions/healthcheck`, { signal: controller.signal });
        clearTimeout(t);
        if (res.ok) { console.log('🔍 Auto-detect: localhost:8888 UP → local'); return LOCAL_BASE; }
    } catch (_) { /* not available */ }
    console.log('🔍 Auto-detect: localhost:8888 DOWN → cloud');
    return CLOUD_BASE;
}

const BASE_URL = await resolveBase();
const ENDPOINT = `${BASE_URL}/.netlify/functions/publish-x`;
const HEALTH_ENDPOINT = `${BASE_URL}/.netlify/functions/healthcheck`;

async function testXPublish() {
    console.log('🦅 Antigravity: X (Twitter) Publishing Verification');
    console.log('==================================================');
    console.log(`📍 Target: ${BASE_URL}`);

    // 1. Healthcheck Ping
    console.log('\n1. Checking Health & Configuration...');
    try {
        const health = await fetch(HEALTH_ENDPOINT).then(res => res.json());
        const xConfig = health.services?.social?.x || health.services?.social?.twitter || 'unknown';

        console.log(`- Healthcheck Status: ${health.status}`);
        console.log(`- X Configuration: ${xConfig}`);

        if (xConfig !== 'configured') {
            console.warn('⚠️  X is NOT configured in healthcheck. Expect failure or disabled state.');
            if (!live && !verifyOnly) {
                console.log('ℹ️  Proceeding to verify "Disabled" state response...');
            }
        } else {
            console.log('✅ X keys detected.');
        }
    } catch (err) {
        console.error('❌ Failed to reach healthcheck at:', HEALTH_ENDPOINT);
        console.error('   Try: --prod to test against cloud, or start netlify dev');
        process.exit(1);
    }

    if (verifyOnly) return;

    // 2. Publish Test
    if (dryRun) {
        console.log('\n2. DRY-RUN: Validating payload (no actual post)...');
    } else if (live) {
        console.log('\n2. LIVE MODE: Attempting actual post to X...');
    } else {
        console.log('\n2. Attempting Publish (test mode)...');
    }

    const testText = live
        ? `🦅 Commons Good Live Test [${new Date().toISOString().slice(0,19)}] #SirTrav`
        : `Commons Good Dry-Run Validation [${new Date().toISOString()}]`;

    const payload = {
        text: testText,
        userId: 'Sechols002_Test'
    };

    // Dry-run: just validate the payload shape without hitting the API
    if (dryRun) {
        console.log('- Payload:', JSON.stringify(payload, null, 2));
        if (payload.text && payload.text.length <= 280) {
            console.log(`- Text length: ${payload.text.length}/280 ✓`);
            console.log('\n✅ PASS: Payload validation successful (dry-run)');
            console.log('   ➡️  Next: run with --live to post for real');
            return;
        } else {
            console.log('\n❌ FAIL: Invalid payload');
            process.exit(1);
        }
    }

    try {
        const start = Date.now();
        const response = await fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const duration = Date.now() - start;
        const data = await response.json();

        console.log(`- Status: ${response.status}`);
        console.log(`- Duration: ${duration}ms`);
        console.log(`- Response:`, JSON.stringify(data, null, 2));

        // Assertions
        if (data.disabled) {
            console.log('\n✅ PASS: Gracefully handled "Disabled" state (No Fake Success).');
        } else if (data.success) {
            console.log('\n✅ PASS: Successfully posted via OAuth 1.0a!');
            if (data.invoice) {
                console.log(`- Job Cost: $${data.invoice.total_due.toFixed(4)}`);
            }
        } else if (data.error) {
            if (data.error.includes('Auth') || data.error.includes('401') || data.keysPresent) {
                console.log('\n✅ PASS: Correctly identified Auth Error (Keys present but invalid/expired).');
                console.log('   ➡️  Action: Regenerate keys at https://developer.x.com/en/portal/dashboard');
            } else {
                console.log('\n⚠️  FAIL: Unexpected error type.');
            }
        }

    } catch (err) {
        console.error('❌ Publish Request Failed:', err);
    }
}

testXPublish();
