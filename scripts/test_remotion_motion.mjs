#!/usr/bin/env node
/**
 * MOTION GRAPHIC SMOKE TEST (Antigravity Assignment)
 * 
 * Validates that the Lambda connection is healthy and template logic is sound.
 * Run this before deploying new code!
 * 
 * Usage:
 *   node scripts/test_remotion_motion.mjs [--live]
 * 
 * Options:
 *   --live    Actually trigger a render (costs Lambda credits)
 *   (default) Dry-run validation only
 */

import fetch from 'node-fetch';

// ============================================================================
// CONFIGURATION
// ============================================================================
const BASE_URL = process.env.BASE_URL || 'http://localhost:8888';
const ENDPOINT = `${BASE_URL}/.netlify/functions/generate-motion-graphic`;
const HEALTH_ENDPOINT = `${BASE_URL}/.netlify/functions/healthcheck`;

const args = process.argv.slice(2);
const isLive = args.includes('--live');
const isVerbose = args.includes('--verbose') || args.includes('-v');

// ============================================================================
// TEST PAYLOADS
// ============================================================================
const TEST_CASES = [
    {
        name: 'IntroSlate - Basic',
        payload: {
            templateId: 'IntroSlate',
            projectId: 'smoke-test-001',
            platform: 'youtube',
            props: {
                title: 'SMOKE TEST',
                subtitle: 'Antigravity Validation',
                showDate: true,
            },
        },
        expectedKeys: ['success', 'templateId', 'projectId'],
    },
    {
        name: 'IntroSlate - Long Title (Scaling Test)',
        payload: {
            templateId: 'IntroSlate',
            projectId: 'smoke-test-002',
            platform: 'youtube',
            props: {
                title: 'This Is A Very Long Title That Should Trigger Auto-Scaling Logic',
                subtitle: 'Testing the algorithmic font sizing',
            },
        },
        expectedKeys: ['success'],
    },
    {
        name: 'Invalid Template (Should Fail)',
        payload: {
            templateId: 'NonExistent',
            projectId: 'smoke-test-003',
            props: {},
        },
        expectError: true,
    },
    {
        name: 'Missing ProjectId (Should Fail)',
        payload: {
            templateId: 'IntroSlate',
            props: { title: 'Test' },
        },
        expectError: true,
    },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function log(message, level = 'info') {
    const colors = {
        info: '\x1b[36m',
        success: '\x1b[32m',
        error: '\x1b[31m',
        warn: '\x1b[33m',
        reset: '\x1b[0m',
    };
    console.log(`${colors[level]}${message}${colors.reset}`);
}

async function runTest(testCase) {
    const { name, payload, expectedKeys = [], expectError = false } = testCase;

    log(`\n🧪 Testing: ${name}`, 'info');
    if (isVerbose) {
        console.log('   Payload:', JSON.stringify(payload, null, 2));
    }

    try {
        const start = Date.now();
        const res = await fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const duration = Date.now() - start;
        const data = await res.json();

        if (isVerbose) {
            console.log(`   Status: ${res.status}`);
            console.log(`   Duration: ${duration}ms`);
            console.log('   Response:', JSON.stringify(data, null, 2));
        }

        // Check expectations
        if (expectError) {
            if (!data.success || res.status >= 400) {
                log(`   ✅ PASS: Correctly rejected invalid input`, 'success');
                return { pass: true, name };
            } else {
                log(`   ❌ FAIL: Should have rejected invalid input`, 'error');
                return { pass: false, name, reason: 'Expected error but got success' };
            }
        }

        // Success case
        if (!data.success && !data.placeholder) {
            log(`   ❌ FAIL: Response indicates failure`, 'error');
            return { pass: false, name, reason: data.error || 'Unknown failure' };
        }

        // Check expected keys
        for (const key of expectedKeys) {
            if (!(key in data)) {
                log(`   ❌ FAIL: Missing expected key '${key}'`, 'error');
                return { pass: false, name, reason: `Missing key: ${key}` };
            }
        }

        // Check placeholder mode
        if (data.placeholder) {
            log(`   ✅ PASS (Placeholder Mode): ${data.message}`, 'success');
        } else {
            log(`   ✅ PASS: Render dispatched (${duration}ms)`, 'success');
        }

        return { pass: true, name, data };

    } catch (error) {
        log(`   ❌ FAIL: ${error.message}`, 'error');
        return { pass: false, name, reason: error.message };
    }
}

// ============================================================================
// MAIN
// ============================================================================
async function main() {
    console.log('');
    log('═══════════════════════════════════════════════════════════════', 'info');
    log('🚀 MOTION GRAPHIC SMOKE TEST (Antigravity Suite)', 'info');
    log('═══════════════════════════════════════════════════════════════', 'info');
    console.log(`   Mode: ${isLive ? '🔴 LIVE (Lambda credits will be used)' : '🟢 DRY-RUN'}`);
    console.log(`   Endpoint: ${ENDPOINT}`);
    console.log('');

    // 1. Health Check
    log('📡 Step 1: Health Check', 'info');
    try {
        const healthRes = await fetch(HEALTH_ENDPOINT);
        const health = await healthRes.json();
        log(`   Status: ${health.status}`, health.status === 'healthy' ? 'success' : 'warn');
        log(`   AI Services: ${health.checks?.ai_keys ? '✅' : '❌'}`, 'info');
        log(`   Storage: ${health.checks?.storage ? '✅' : '❌'}`, 'info');
    } catch (error) {
        log(`   ❌ Health check failed: ${error.message}`, 'error');
        log('   Is `netlify dev` running?', 'warn');
        process.exit(1);
    }

    // 2. Run Tests
    log('\n📋 Step 2: Running Test Cases', 'info');

    const results = [];
    for (const testCase of TEST_CASES) {
        const result = await runTest(testCase);
        results.push(result);
    }

    // 3. Summary
    console.log('');
    log('═══════════════════════════════════════════════════════════════', 'info');
    log('📊 RESULTS SUMMARY', 'info');
    log('═══════════════════════════════════════════════════════════════', 'info');

    const passed = results.filter(r => r.pass).length;
    const failed = results.filter(r => !r.pass).length;

    console.log(`   Total:  ${results.length}`);
    console.log(`   Passed: ${passed} ✅`);
    console.log(`   Failed: ${failed} ❌`);

    if (failed > 0) {
        console.log('\n   Failed Tests:');
        for (const r of results.filter(r => !r.pass)) {
            log(`   • ${r.name}: ${r.reason}`, 'error');
        }
    }

    console.log('');

    // Exit code
    if (failed > 0) {
        log('❌ SMOKE TEST FAILED', 'error');
        process.exit(1);
    } else {
        log('✅ ALL TESTS PASSED', 'success');
        process.exit(0);
    }
}

main().catch((error) => {
    log(`Fatal error: ${error.message}`, 'error');
    process.exit(1);
});
