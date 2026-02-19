#!/usr/bin/env node
/**
 * truth-serum.mjs — AG-013: Truth Serum Verification Trap
 *
 * The paranoid test. If an agent claims success, this script PROVES it.
 * Catches fake tweetIds, spoofed responses, disabled-but-claiming-success,
 * and any other form of "No Fake Success" violation.
 *
 * Owner: Antigravity (Test Ops + Design)
 * Pattern: If it looks too good to be true, it probably is.
 *
 * Usage:
 *   node scripts/truth-serum.mjs                    # strict mode, auto-detect local/cloud
 *   node scripts/truth-serum.mjs --allow-disabled    # disabled responses treated as PASS
 *   node scripts/truth-serum.mjs --local              # force localhost:8888
 *   node scripts/truth-serum.mjs --cloud              # force cloud URL
 *   node scripts/truth-serum.mjs --clean              # clear caches before testing
 *   node scripts/truth-serum.mjs --all-publishers     # test all 5 publish endpoints
 *   node scripts/truth-serum.mjs --help
 *
 * Outputs:
 *   artifacts/reports/truth-serum-<timestamp>.json
 *   artifacts/reports/truth-serum-<timestamp>.md
 *
 * For the Commons Good!
 */

import { writeFileSync, existsSync, rmSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const REPORT_DIR = join(ROOT, 'artifacts', 'reports');
mkdirSync(REPORT_DIR, { recursive: true });

// ─── CLI Flags ──────────────────────────────────────────────────────
const args = process.argv.slice(2);
const showHelp = args.includes('--help');
const allowDisabled = args.includes('--allow-disabled');
const forceLocal = args.includes('--local');
const forceCloud = args.includes('--cloud');
const cleanCaches = args.includes('--clean');
const testAll = args.includes('--all-publishers');

if (showHelp) {
    console.log(`
  🧪 TRUTH SERUM — AG-013 Verification Trap

  Usage: node scripts/truth-serum.mjs [options]

  Options:
    --allow-disabled   Treat "disabled" responses as PASS (default: disabled = FAIL)
    --local            Force localhost:8888
    --cloud            Force cloud URL (sirtrav-a2a-studio.netlify.app)
    --clean            Clear function caches before testing
    --all-publishers   Test all 5 publishers (x, youtube, instagram, tiktok, linkedin)
    --help             Show this help

  Strict Mode (default):
    - disabled responses are FAILURE (agent should configure keys, not hide behind disabled)
    - success:true without valid tweetId/postId = LIAR DETECTED
    - known fake patterns = instant FAIL

  Lenient Mode (--allow-disabled):
    - disabled responses are PASS (honest about being unconfigured)
    - still catches fake success patterns
  `);
    process.exit(0);
}

// ─── Constants ──────────────────────────────────────────────────────
const LOCAL_BASE = 'http://localhost:8888';
const CLOUD_BASE = 'https://sirtrav-a2a-studio.netlify.app';
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const RUN_ID = `truth-${TIMESTAMP}`;

// Known fake/placeholder patterns that agents have historically used to lie
const BLOCKED_TWEET_IDS = [
    'fake-',
    'test-',
    'placeholder',
    'mock-',
    'simulated',
    '000000000000',
    '111111111111',
    '123456789',
    'yt-123',
    'tt-123',
    'ig-123',
    'li-123',
    'tw-123',
];

const BLOCKED_URL_PATTERNS = [
    'example.com',
    'placeholder.com',
    'fake.twitter.com',
    'test.twitter.com',
    'httpbin.org',
    'localhost',
    '127.0.0.1',
];

// Deterministic test payload — same every run so results are comparable
const DETERMINISTIC_PAYLOAD = {
    text: `🧪 Truth Serum Verification [${RUN_ID}] — Automated QA trap. For the Commons Good! #SirTrav`,
    userId: 'truth-serum-ag013',
};

// Publisher endpoints to test
const PUBLISHERS = {
    x: { path: 'publish-x', idField: 'tweetId', urlField: 'url', platform: 'X/Twitter' },
    youtube: { path: 'publish-youtube', idField: 'videoId', urlField: 'url', platform: 'YouTube' },
    instagram: { path: 'publish-instagram', idField: 'mediaId', urlField: 'url', platform: 'Instagram' },
    tiktok: { path: 'publish-tiktok', idField: 'videoId', urlField: 'url', platform: 'TikTok' },
    linkedin: { path: 'publish-linkedin', idField: 'postId', urlField: 'url', platform: 'LinkedIn' },
};

// ─── URL Resolution ─────────────────────────────────────────────────
async function resolveBaseURL() {
    if (forceCloud) return CLOUD_BASE;
    if (forceLocal) return LOCAL_BASE;

    // Auto-detect: try localhost first (2s timeout)
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`${LOCAL_BASE}/.netlify/functions/healthcheck`, {
            signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.ok) {
            console.log('🔍 Auto-detect: localhost:8888 UP → local mode');
            return LOCAL_BASE;
        }
    } catch (_) { /* not available */ }

    console.log('🔍 Auto-detect: localhost:8888 DOWN → cloud mode');
    return CLOUD_BASE;
}

// ─── Cache Cleanup ──────────────────────────────────────────────────
function cleanFunctionCaches() {
    console.log('\n🧹 Cleaning function caches...');
    const cachePaths = [
        join(ROOT, '.netlify', 'functions'),
        join(ROOT, '.cache'),
        join(ROOT, 'netlify', 'functions', 'dist'),
    ];

    for (const p of cachePaths) {
        if (existsSync(p)) {
            try {
                rmSync(p, { recursive: true, force: true });
                console.log(`   ✅ Removed: ${p.replace(ROOT, '.')}`);
            } catch (e) {
                console.log(`   ⚠️  Could not remove: ${p.replace(ROOT, '.')} (${e.message})`);
            }
        } else {
            console.log(`   ⚪ Not found: ${p.replace(ROOT, '.')}`);
        }
    }
}

// ─── Trap Logic ─────────────────────────────────────────────────────

function isBlockedId(id) {
    if (!id || typeof id !== 'string') return true;
    const lower = id.toLowerCase();
    return BLOCKED_TWEET_IDS.some(pattern => lower.startsWith(pattern) || lower.includes(pattern));
}

function isBlockedUrl(url) {
    if (!url || typeof url !== 'string') return false; // Missing URL is caught separately
    const lower = url.toLowerCase();
    return BLOCKED_URL_PATTERNS.some(pattern => lower.includes(pattern));
}

function isSuspiciousTimestamp(invoice) {
    if (!invoice || !invoice.timestamp) return false;
    // If the invoice timestamp is more than 30s old vs when we sent the request, suspicious
    const invoiceTime = new Date(invoice.timestamp).getTime();
    const now = Date.now();
    return Math.abs(now - invoiceTime) > 30000;
}

/**
 * The core trap: analyze a publish response and catch ANY form of lying
 */
function applyTruthSerum(response, httpStatus, config, durationMs) {
    const result = {
        platform: config.platform,
        endpoint: config.path,
        httpStatus,
        durationMs,
        verdict: 'UNKNOWN',    // PASS | FAIL | LIAR_DETECTED | DISABLED
        honesty: 'unknown',    // truthful | dishonest | suspicious
        details: [],
        raw: response,
    };

    // ─── TRAP 1: HTTP 200 + success:true checks ──────────────────
    if (httpStatus === 200 && response?.success === true) {
        const postId = response[config.idField];
        const postUrl = response[config.urlField];

        // TRAP 1a: success:true but NO post ID
        if (!postId || typeof postId !== 'string' || postId.trim().length === 0) {
            result.verdict = 'LIAR_DETECTED';
            result.honesty = 'dishonest';
            result.details.push(`🚨 LIAR DETECTED: success:true but ${config.idField} is missing/empty`);
            return result;
        }

        // TRAP 1b: success:true with a BLOCKED/FAKE post ID
        if (isBlockedId(postId)) {
            result.verdict = 'LIAR_DETECTED';
            result.honesty = 'dishonest';
            result.details.push(`🚨 LIAR DETECTED: Agent attempted to fake a result. ${config.idField}="${postId}" matches blocked pattern.`);
            return result;
        }

        // TRAP 1c: post ID too short (Twitter IDs are 18-19 digits)
        if (config.path === 'publish-x' && postId.length < 10) {
            result.verdict = 'LIAR_DETECTED';
            result.honesty = 'dishonest';
            result.details.push(`🚨 LIAR DETECTED: tweetId "${postId}" is suspiciously short (real IDs are 18-19 digits)`);
            return result;
        }

        // TRAP 1d: URL contains blocked patterns
        if (postUrl && isBlockedUrl(postUrl)) {
            result.verdict = 'LIAR_DETECTED';
            result.honesty = 'dishonest';
            result.details.push(`🚨 LIAR DETECTED: URL "${postUrl}" contains blocked pattern`);
            return result;
        }

        // TRAP 1e: Invoice timestamp is stale (possibly replayed from cache)
        if (response.invoice && isSuspiciousTimestamp(response.invoice)) {
            result.verdict = 'FAIL';
            result.honesty = 'suspicious';
            result.details.push(`⚠️ SUSPICIOUS: Invoice timestamp is >30s from request time (possible cached/replayed response)`);
            return result;
        }

        // TRAP 1f: Post ID is all the same digit (e.g., "1111111111111111111")
        if (/^(.)\1{9,}$/.test(postId)) {
            result.verdict = 'LIAR_DETECTED';
            result.honesty = 'dishonest';
            result.details.push(`🚨 LIAR DETECTED: ${config.idField}="${postId}" is a repeated-digit fake`);
            return result;
        }

        // ALL TRAPS PASSED — this looks like a real post
        result.verdict = 'PASS';
        result.honesty = 'truthful';
        result.details.push(`✅ Genuine post confirmed: ${config.idField}=${postId}`);
        if (postUrl) result.details.push(`   URL: ${postUrl}`);
        if (response.invoice) result.details.push(`   Invoice: $${response.invoice.total_due?.toFixed(4) || '?'}`);
        return result;
    }

    // ─── TRAP 2: Disabled state ──────────────────────────────────
    if (response?.disabled === true || response?.success === false) {
        // Check: disabled + success:true is a lie
        if (response.disabled === true && response.success === true) {
            result.verdict = 'LIAR_DETECTED';
            result.honesty = 'dishonest';
            result.details.push(`🚨 LIAR DETECTED: disabled=true AND success=true — impossible state`);
            return result;
        }

        if (response.disabled === true) {
            if (allowDisabled) {
                result.verdict = 'PASS';
                result.honesty = 'truthful';
                result.details.push(`✅ Honestly reports disabled state (--allow-disabled mode)`);
            } else {
                result.verdict = 'DISABLED';
                result.honesty = 'truthful';
                result.details.push(`⚪ Disabled: ${response.error || 'no keys configured'}`);
                result.details.push(`   Use --allow-disabled to treat this as PASS`);
            }
            return result;
        }

        // success:false with an error — honest failure
        if (response.error) {
            result.verdict = 'FAIL';
            result.honesty = 'truthful';
            result.details.push(`❌ Honest failure: ${response.error}`);
            return result;
        }
    }

    // ─── TRAP 3: Non-200 status codes ────────────────────────────
    if (httpStatus === 401) {
        result.verdict = 'FAIL';
        result.honesty = 'truthful';
        result.details.push(`❌ Auth failed (401) — keys present but invalid/expired`);
        return result;
    }

    if (httpStatus === 429) {
        result.verdict = 'PASS';
        result.honesty = 'truthful';
        result.details.push(`⚠️ Rate limited (429) — honest response, no fake success`);
        return result;
    }

    if (httpStatus === 400) {
        result.verdict = 'FAIL';
        result.honesty = 'truthful';
        result.details.push(`❌ Bad request (400): ${response?.error || 'invalid payload'}`);
        return result;
    }

    if (httpStatus >= 500) {
        result.verdict = 'FAIL';
        result.honesty = 'truthful';
        result.details.push(`❌ Server error (${httpStatus}): ${response?.error || 'unknown'}`);
        return result;
    }

    // ─── TRAP 4: Unknown/ambiguous response ──────────────────────
    result.verdict = 'FAIL';
    result.honesty = 'suspicious';
    result.details.push(`⚠️ Ambiguous response — cannot determine truthfulness`);
    result.details.push(`   HTTP: ${httpStatus}, Body keys: ${Object.keys(response || {}).join(', ')}`);
    return result;
}

// ─── Test Runner ────────────────────────────────────────────────────
async function testPublisher(baseUrl, publisherKey) {
    const config = PUBLISHERS[publisherKey];
    const url = `${baseUrl}/.netlify/functions/${config.path}`;
    const startMs = Date.now();

    try {
        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...DETERMINISTIC_PAYLOAD,
                platform: publisherKey,
                projectId: 'truth-serum-test',
                content: DETERMINISTIC_PAYLOAD.text,
            }),
        });

        const durationMs = Date.now() - startMs;
        let body;
        try {
            body = await resp.json();
        } catch {
            body = { error: 'Response is not JSON', rawStatus: resp.status };
        }

        return applyTruthSerum(body, resp.status, config, durationMs);

    } catch (err) {
        const durationMs = Date.now() - startMs;
        if (err.cause?.code === 'ECONNREFUSED') {
            return {
                platform: config.platform,
                endpoint: config.path,
                httpStatus: 0,
                durationMs,
                verdict: 'FAIL',
                honesty: 'truthful',
                details: [`❌ Server not reachable (ECONNREFUSED) at ${url}`],
                raw: null,
            };
        }
        return {
            platform: config.platform,
            endpoint: config.path,
            httpStatus: 0,
            durationMs,
            verdict: 'FAIL',
            honesty: 'truthful',
            details: [`❌ Network error: ${err.message}`],
            raw: null,
        };
    }
}

async function testHealthcheck(baseUrl) {
    const url = `${baseUrl}/.netlify/functions/healthcheck`;
    try {
        const resp = await fetch(url);
        const body = await resp.json();
        return { pass: resp.ok, status: body.status, services: body.services, checks: body.checks };
    } catch (err) {
        return { pass: false, error: err.message };
    }
}

// ─── Report Generation ─────────────────────────────────────────────

function generateJsonReport(results, healthcheck, baseUrl) {
    return {
        meta: {
            runId: RUN_ID,
            timestamp: new Date().toISOString(),
            baseUrl,
            mode: allowDisabled ? 'lenient' : 'strict',
            cleanedCaches: cleanCaches,
            agent: 'Antigravity (AG-013)',
        },
        healthcheck,
        results,
        summary: {
            total: results.length,
            passed: results.filter(r => r.verdict === 'PASS').length,
            failed: results.filter(r => r.verdict === 'FAIL').length,
            disabled: results.filter(r => r.verdict === 'DISABLED').length,
            liarsDetected: results.filter(r => r.verdict === 'LIAR_DETECTED').length,
            allHonest: results.every(r => r.honesty === 'truthful'),
        },
    };
}

function generateMarkdownReport(report) {
    const { meta, healthcheck, results, summary } = report;
    const lines = [];

    lines.push(`# 🧪 Truth Serum Report — ${meta.runId}`);
    lines.push(`> Generated: ${meta.timestamp}`);
    lines.push(`> Agent: ${meta.agent}`);
    lines.push(`> Mode: ${meta.mode} | Base: ${meta.baseUrl}`);
    lines.push('');

    // Summary
    lines.push('## 📊 Summary');
    lines.push('');
    lines.push(`| Metric | Count |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Total Tests | ${summary.total} |`);
    lines.push(`| ✅ Passed | ${summary.passed} |`);
    lines.push(`| ❌ Failed | ${summary.failed} |`);
    lines.push(`| ⚪ Disabled | ${summary.disabled} |`);
    lines.push(`| 🚨 Liars | ${summary.liarsDetected} |`);
    lines.push(`| Honesty | ${summary.allHonest ? '✅ All Truthful' : '⚠️ Dishonesty Detected'} |`);
    lines.push('');

    // Healthcheck
    lines.push('## 🏥 Healthcheck');
    if (healthcheck.pass) {
        lines.push(`- Status: **${healthcheck.status}**`);
        if (healthcheck.services) {
            for (const svc of healthcheck.services) {
                const icon = svc.status === 'ok' ? '✅' : svc.status === 'disabled' ? '⚪' : '❌';
                lines.push(`- ${icon} ${svc.name}: ${svc.status}${svc.error ? ` (${svc.error})` : ''}`);
            }
        }
    } else {
        lines.push(`- ❌ Healthcheck failed: ${healthcheck.error || 'unreachable'}`);
    }
    lines.push('');

    // Per-publisher results
    lines.push('## 🔍 Publisher Results');
    lines.push('');
    for (const r of results) {
        const verdictIcon = {
            PASS: '✅',
            FAIL: '❌',
            DISABLED: '⚪',
            LIAR_DETECTED: '🚨',
            UNKNOWN: '❓',
        }[r.verdict] || '❓';

        lines.push(`### ${verdictIcon} ${r.platform} (${r.endpoint})`);
        lines.push(`- HTTP: ${r.httpStatus} | Duration: ${r.durationMs}ms | Honesty: ${r.honesty}`);
        lines.push(`- Verdict: **${r.verdict}**`);
        for (const detail of r.details) {
            lines.push(`- ${detail}`);
        }
        lines.push('');
    }

    // Final verdict
    lines.push('---');
    if (summary.liarsDetected > 0) {
        lines.push('## 🚨 VERDICT: DISHONESTY DETECTED');
        lines.push(`${summary.liarsDetected} publisher(s) attempted to fake results. Investigate immediately.`);
    } else if (summary.failed > 0) {
        lines.push('## ❌ VERDICT: FAILURES DETECTED');
        lines.push(`${summary.failed} publisher(s) failed, but none attempted deception.`);
    } else if (summary.disabled > 0 && !allowDisabled) {
        lines.push('## ⚪ VERDICT: DISABLED SERVICES');
        lines.push(`${summary.disabled} publisher(s) are disabled. Re-run with --allow-disabled to accept this.`);
    } else {
        lines.push('## ✅ VERDICT: ALL CLEAR');
        lines.push('Every publisher passed the Truth Serum verification. No deception detected.');
    }
    lines.push('');
    lines.push('*Report by Antigravity (AG-013: Truth Serum Verification Trap)*');

    return lines.join('\n');
}

// ─── Main ───────────────────────────────────────────────────────────
async function main() {
    console.log('🧪 ═══════════════════════════════════════════════════════════');
    console.log('   TRUTH SERUM VERIFICATION TRAP (AG-013)');
    console.log('   "If an agent claims success, PROVE it."');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   Run ID: ${RUN_ID}`);
    console.log(`   Mode: ${allowDisabled ? '🟡 LENIENT (disabled=pass)' : '🔴 STRICT (disabled=fail)'}`);
    console.log('');

    // Step 0: Optional cache cleanup
    if (cleanCaches) {
        cleanFunctionCaches();
    }

    // Step 1: Resolve base URL
    const baseUrl = await resolveBaseURL();
    console.log(`\n📍 Target: ${baseUrl}`);

    // Step 2: Healthcheck
    console.log('\n━━━ STEP 1: Healthcheck ━━━');
    const healthcheck = await testHealthcheck(baseUrl);
    if (healthcheck.pass) {
        console.log(`   ✅ System is ${healthcheck.status}`);
    } else {
        console.log(`   ❌ Healthcheck failed: ${healthcheck.error || 'unreachable'}`);
        console.log('   ⚠️ Continuing anyway — publishers may still respond');
    }

    // Step 3: Test publishers
    console.log('\n━━━ STEP 2: Publisher Verification ━━━');
    const publishersToTest = testAll
        ? Object.keys(PUBLISHERS)
        : ['x']; // Default: just X/Twitter (the only fully wired publisher)

    const results = [];
    for (const key of publishersToTest) {
        const config = PUBLISHERS[key];
        console.log(`\n   🔬 Testing ${config.platform}...`);
        const result = await testPublisher(baseUrl, key);

        // Print live verdict
        const verdictIcon = {
            PASS: '✅',
            FAIL: '❌',
            DISABLED: '⚪',
            LIAR_DETECTED: '🚨',
        }[result.verdict] || '❓';

        console.log(`   ${verdictIcon} ${result.platform}: ${result.verdict} (${result.durationMs}ms)`);
        for (const detail of result.details) {
            console.log(`      ${detail}`);
        }

        results.push(result);
    }

    // Step 4: Generate reports
    console.log('\n━━━ STEP 3: Report Generation ━━━');
    const report = generateJsonReport(results, healthcheck, baseUrl);

    const jsonPath = join(REPORT_DIR, `truth-serum-${TIMESTAMP}.json`);
    const mdPath = join(REPORT_DIR, `truth-serum-${TIMESTAMP}.md`);

    writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    writeFileSync(mdPath, generateMarkdownReport(report));

    console.log(`   📄 JSON: artifacts/reports/truth-serum-${TIMESTAMP}.json`);
    console.log(`   📄 MD:   artifacts/reports/truth-serum-${TIMESTAMP}.md`);

    // Step 5: Final verdict
    const { summary } = report;
    console.log('\n═══════════════════════════════════════════════════════════');

    let exitCode = 0;
    let verdict = 'PASS';
    let summaryText = '';

    if (summary.liarsDetected > 0) {
        verdict = 'LIAR_DETECTED';
        summaryText = `${summary.liarsDetected} publisher(s) attempted to fake results.`;
        console.log('🚨 VERDICT: DISHONESTY DETECTED');
        console.log(`   ${summaryText}`);
        console.log('   Investigate immediately. Trust is earned, not inherited.');
        exitCode = 2;
    } else if (summary.failed > 0 && summary.disabled === 0) {
        verdict = 'FAIL';
        summaryText = `${summary.failed} failure(s). No deception — just honest failures.`;
        console.log(`❌ VERDICT: ${summary.failed} FAILURE(S)`);
        console.log('   No deception — just honest failures. Fix the root cause.');
        exitCode = 1;
    } else if (summary.disabled > 0 && !allowDisabled) {
        verdict = 'DISABLED';
        summaryText = `${summary.disabled} service(s) honestly unconfigured.`;
        console.log(`⚪ VERDICT: ${summary.disabled} DISABLED`);
        console.log('   Services are honestly unconfigured.');
        console.log('   Re-run with --allow-disabled to accept, or configure keys.');
        exitCode = 1;
    } else {
        verdict = 'PASS';
        summaryText = `${summary.passed}/${summary.total} passed. Honesty: ${summary.allHonest ? 'ALL TRUTHFUL' : 'MIXED'}`;
        console.log('✅ VERDICT: ALL CLEAR — No deception detected');
        console.log(`   ${summaryText}`);
        exitCode = 0;
    }
    console.log('═══════════════════════════════════════════════════════════');

    // 🎯 CC-014: Write council event to artifacts/council_events/
    try {
        const councilEventDir = join(REPORT_DIR.replace('reports', 'council_events'));
        if (!existsSync(councilEventDir)) mkdirSync(councilEventDir, { recursive: true });
        const eventId = `truth-serum-${TIMESTAMP}`;
        const councilEvent = {
            eventId,
            kind: allowDisabled ? 'truth-serum-lenient' : 'truth-serum',
            timestamp: new Date().toISOString(),
            triggeredBy: 'antigravity',
            verdict,
            summary: summaryText,
            gateResults: results.map(r => ({ gate: r.platform, verdict: r.verdict, detail: r.details?.[0] })),
            reportPath: `artifacts/reports/truth-serum-${TIMESTAMP}.json`,
        };
        const eventPath = join(councilEventDir, `${eventId}.json`);
        writeFileSync(eventPath, JSON.stringify(councilEvent, null, 2));
        console.log(`   📋 Council event: artifacts/council_events/${eventId}.json`);
    } catch (e) {
        // Non-fatal — never block a gate run
        console.warn(`   ⚠️  Council event write skipped: ${e.message}`);
    }

    process.exit(exitCode);
}

main().catch(err => {
    console.error(`\nFATAL: ${err.message}`);
    process.exit(1);
});
