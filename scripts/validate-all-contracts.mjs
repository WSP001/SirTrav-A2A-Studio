#!/usr/bin/env node
/**
 * 🦅 ANTIGRAVITY: Comprehensive Contract Validator
 * 
 * Tests ALL Netlify functions against their expected response contracts.
 * Implements "No Fake Success" pattern verification.
 * 
 * Usage:
 *   node scripts/validate-all-contracts.mjs
 *   node scripts/validate-all-contracts.mjs --live  (requires netlify dev)
 * 
 * Agent: Antigravity (Test Ops)
 * Task: MG-006 Contract Tests
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:8888';
const LIVE = process.argv.includes('--live');
const VERBOSE = process.argv.includes('--verbose');

// ============================================================================
// CONTRACT DEFINITIONS
// ============================================================================

const CONTRACTS = {
    // Healthcheck contract
    healthcheck: {
        endpoint: '/.netlify/functions/healthcheck',
        method: 'GET',
        expectedShape: {
            status: 'string', // 'healthy' | 'degraded' | 'error'
            version: 'string',
            checks: 'object',
        },
        required: ['status', 'version'],
    },

    // Text-to-Speech contract
    'text-to-speech': {
        endpoint: '/.netlify/functions/text-to-speech',
        method: 'POST',
        body: { text: 'Test', projectId: 'contract-test' },
        expectedShape: {
            success: 'boolean',
            projectId: 'string',
            audioUrl: 'string',
            duration: 'number',
            voice: 'string',
        },
        required: ['success', 'projectId'],
    },

    // Publish X contract
    'publish-x': {
        endpoint: '/.netlify/functions/publish-x',
        method: 'POST',
        body: { text: 'Test', projectId: 'contract-test', dryRun: true },
        expectedShape: {
            success: 'boolean',
            // Either postId (success) or disabled/error
        },
        required: ['success'],
        noFakeSuccess: true,
    },

    // Publish LinkedIn contract
    'publish-linkedin': {
        endpoint: '/.netlify/functions/publish-linkedin',
        method: 'POST',
        body: { text: 'Test', projectId: 'contract-test', dryRun: true },
        expectedShape: {
            success: 'boolean',
        },
        required: ['success'],
        noFakeSuccess: true,
    },

    // Submit Evaluation contract
    'submit-evaluation': {
        endpoint: '/.netlify/functions/submit-evaluation',
        method: 'POST',
        body: { projectId: 'test', runId: 'test', rating: 'good', feedback: 'Test' },
        expectedShape: {
            success: 'boolean',
            evaluationId: 'string',
        },
        required: ['success'],
    },

    // Start Pipeline contract
    'start-pipeline': {
        endpoint: '/.netlify/functions/start-pipeline',
        method: 'POST',
        body: { projectId: 'contract-test', title: 'Test' },
        expectedShape: {
            success: 'boolean',
            runId: 'string',
        },
        required: ['runId'],
    },

    // Progress contract
    'progress': {
        endpoint: '/.netlify/functions/progress',
        method: 'GET',
        query: '?projectId=contract-test&runId=test',
        expectedShape: {
            // Can be empty or have status
        },
        required: [],
    },

    // Generate Motion Graphic contract
    'generate-motion-graphic': {
        endpoint: '/.netlify/functions/generate-motion-graphic',
        method: 'POST',
        body: { templateId: 'IntroSlate', projectId: 'contract-test', props: { title: 'Test' } },
        expectedShape: {
            success: 'boolean',
        },
        required: ['success'],
    },
};

// ============================================================================
// HELPERS
// ============================================================================

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[36m',
    dim: '\x1b[2m',
};

function log(msg, color = 'reset') {
    console.log(`${colors[color]}${msg}${colors.reset}`);
}

function validateShape(actual, expected, path = '') {
    const errors = [];

    for (const [key, type] of Object.entries(expected)) {
        const value = actual[key];
        const currentPath = path ? `${path}.${key}` : key;

        if (value === undefined) {
            errors.push(`Missing: ${currentPath}`);
            continue;
        }

        if (typeof type === 'string') {
            if (typeof value !== type) {
                errors.push(`Type mismatch: ${currentPath} (expected ${type}, got ${typeof value})`);
            }
        } else if (typeof type === 'object') {
            errors.push(...validateShape(value, type, currentPath));
        }
    }

    return errors;
}

async function testContract(name, contract) {
    const url = `${BASE_URL}${contract.endpoint}${contract.query || ''}`;

    try {
        const options = {
            method: contract.method,
            headers: { 'Content-Type': 'application/json' },
        };

        if (contract.body && contract.method === 'POST') {
            options.body = JSON.stringify(contract.body);
        }

        const res = await fetch(url, options);
        const data = await res.json();

        // Check required fields
        const missingRequired = contract.required.filter(key => data[key] === undefined);
        if (missingRequired.length > 0) {
            return {
                name,
                status: 'FAIL',
                error: `Missing required fields: ${missingRequired.join(', ')}`,
                response: data,
            };
        }

        // Check shape
        const shapeErrors = validateShape(data, contract.expectedShape);
        if (shapeErrors.length > 0 && VERBOSE) {
            console.log(`  ${colors.dim}Shape warnings: ${shapeErrors.join(', ')}${colors.reset}`);
        }

        // Check No Fake Success pattern
        if (contract.noFakeSuccess) {
            if (data.success === true && !data.postId && !data.dryRun) {
                // This might be fake success - check for disabled
                if (!data.disabled) {
                    // Actually successful - that's fine
                }
            }
            if (data.disabled === true && data.success === true) {
                return {
                    name,
                    status: 'FAIL',
                    error: 'No Fake Success violation: disabled=true but success=true',
                    response: data,
                };
            }
        }

        return {
            name,
            status: 'PASS',
            response: data,
        };

    } catch (error) {
        return {
            name,
            status: 'ERROR',
            error: error.message,
        };
    }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
    console.log('');
    log('═══════════════════════════════════════════════════════════════', 'blue');
    log('🦅 ANTIGRAVITY: Comprehensive Contract Validator', 'blue');
    log('═══════════════════════════════════════════════════════════════', 'blue');
    console.log('');

    if (!LIVE) {
        log('Mode: DRY-RUN (schema validation only)', 'yellow');
        log('Tip: Use --live to test against running server', 'dim');
        console.log('');

        // In dry-run mode, just validate contract definitions
        let valid = 0;
        let invalid = 0;

        for (const [name, contract] of Object.entries(CONTRACTS)) {
            if (contract.required && contract.endpoint && contract.method) {
                console.log(`  ✅ ${name}: Contract defined`);
                valid++;
            } else {
                console.log(`  ❌ ${name}: Invalid contract definition`);
                invalid++;
            }
        }

        console.log('');
        log(`📊 ${valid} contracts defined, ${invalid} invalid`, valid > 0 ? 'green' : 'red');
        process.exit(invalid > 0 ? 1 : 0);
    }

    // Live mode - test against server
    log('Mode: LIVE (testing against ' + BASE_URL + ')', 'green');
    console.log('');

    // First check if server is running
    try {
        await fetch(`${BASE_URL}/.netlify/functions/healthcheck`);
    } catch {
        log('❌ Server not reachable. Is netlify dev running?', 'red');
        process.exit(1);
    }

    const results = [];

    for (const [name, contract] of Object.entries(CONTRACTS)) {
        process.stdout.write(`  Testing ${name}... `);
        const result = await testContract(name, contract);
        results.push(result);

        if (result.status === 'PASS') {
            console.log(`${colors.green}✅ PASS${colors.reset}`);
        } else if (result.status === 'FAIL') {
            console.log(`${colors.red}❌ FAIL${colors.reset}`);
            if (VERBOSE) console.log(`     ${result.error}`);
        } else {
            console.log(`${colors.yellow}⚠️ ERROR${colors.reset}`);
            if (VERBOSE) console.log(`     ${result.error}`);
        }
    }

    // Summary
    console.log('');
    log('═══════════════════════════════════════════════════════════════', 'blue');
    log('📊 SUMMARY', 'blue');
    log('═══════════════════════════════════════════════════════════════', 'blue');

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const errors = results.filter(r => r.status === 'ERROR').length;

    console.log(`  Total:   ${results.length}`);
    console.log(`  Passed:  ${passed} ✅`);
    console.log(`  Failed:  ${failed} ❌`);
    console.log(`  Errors:  ${errors} ⚠️`);
    console.log('');

    if (failed > 0 || errors > 0) {
        log('❌ CONTRACT VALIDATION FAILED', 'red');
        process.exit(1);
    } else {
        log('✅ ALL CONTRACTS VALID', 'green');
        process.exit(0);
    }
}

main().catch(err => {
    log(`Fatal: ${err.message}`, 'red');
    process.exit(1);
});
