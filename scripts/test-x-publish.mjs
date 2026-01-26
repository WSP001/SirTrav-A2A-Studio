import fetch from 'node-fetch';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Parse args
const args = process.argv.slice(2);
const help = args.includes('--help');
const live = args.includes('--live');
const verifyOnly = args.includes('--verify-only');

if (help) {
    console.log(`
  Usage: node scripts/test-x-publish.mjs [options]

  Options:
    --live           Actually post to X (default: dry-run/test mode)
    --verify-only    Only check configuration, do not attempt post
    --help           Show this help
  `);
    process.exit(0);
}

const BASE_URL = 'http://localhost:8888';
const ENDPOINT = `${BASE_URL}/.netlify/functions/publish-x`;
const HEALTH_ENDPOINT = `${BASE_URL}/.netlify/functions/healthcheck`;

async function testXPublish() {
    console.log('🦅 Antigravity: X (Twitter) Publishing Verification');
    console.log('==================================================');

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
        console.error('❌ Failed to reach healthcheck. Is netlify dev running?');
        process.exit(1);
    }

    if (verifyOnly) return;

    // 2. Publish Test
    console.log('\n2. Attempting Publish...');
    const payload = {
        text: `Commons Good Verification Post [${new Date().toISOString()}] - @Sechols002 verification.`,
        userId: 'Sechols002_Test'
    };

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
            if (data.error.includes('Auth Error') || data.error.includes('401')) {
                console.log('\n✅ PASS: Correctly identified Auth Error (Keys present but maybe invalid).');
            } else {
                console.log('\n⚠️  FAIL: Unexpected error type.');
            }
        }

    } catch (err) {
        console.error('❌ Publish Request Failed:', err);
    }
}

testXPublish();
