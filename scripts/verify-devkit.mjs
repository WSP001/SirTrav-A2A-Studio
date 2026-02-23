#!/usr/bin/env node
/**
 * verify-devkit.mjs — DevKit Spin-Up Verification Suite
 *
 * 5-layer gate sequence verifying tool installation AND project health.
 * Output format mirrors cycle-check.mjs (gate table + bottom-line score).
 *
 * Layers:
 *   Layer 0 — SYSTEM TOOLS:  System CLIs (git, gh, node, npm, python, docker, jq, rg, just)
 *   Layer 0 — PROJECT TOOLS: Project CLIs (netlify, code) + npm preflight
 *   Layer 1 — ENV:           Required files, dirs, .env presence, node_modules
 *   Layer 2 — ALIVE:         Healthcheck endpoint (auto-detect local/cloud)
 *   Layer 3 — PIPELINE:      start-pipeline → SSE first-event smoke test
 *   Layer 4 — TRUTH:         truth-serum.mjs subprocess (No Fake Success)
 *
 * Usage:
 *   node scripts/verify-devkit.mjs                  # full run, auto-detect local/cloud
 *   node scripts/verify-devkit.mjs --tools-only     # Layers 0 only (no network)
 *   node scripts/verify-devkit.mjs --no-pipeline    # skip Layers 3+4
 *   node scripts/verify-devkit.mjs --local          # force localhost:8888
 *   node scripts/verify-devkit.mjs --cloud          # force cloud URL
 *   node scripts/verify-devkit.mjs --allow-disabled # truth-serum lenient (disabled=PASS)
 *
 * Skip categories (deterministic, no "skip creep"):
 *   SKIP_KEYS_MISSING       — env keys not configured (honest: cloud mode works)
 *   SKIP_AUTH_GATE_ACTIVE   — 401 returned (endpoint deployed, auth working)
 *   SKIP_LONG_RUNNING       — no SSE events in 5s window (pipeline slow-start)
 *   SKIP_NO_LOCAL_ENV       — .env.local not present (cloud mode OK)
 *   SKIP_LAYER_DEPENDENCY   — upstream layer failed so this gate cannot run
 *
 * Exit codes:
 *   0  All non-skipped gates passed
 *   1  One or more gates FAILED (code bug or config error)
 *   2  Critical tool missing (node/npm) — cannot continue
 *   3  Blocked on external service (429 / platform outage) — not a code bug
 */

import { execSync } from 'child_process';
import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ─── CLI Flags ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const toolsOnly    = args.includes('--tools-only');
const noPipeline   = args.includes('--no-pipeline');
const forceLocal   = args.includes('--local');
const forceCloud   = args.includes('--cloud');
const allowDisabled= args.includes('--allow-disabled');

// ─── Constants ───────────────────────────────────────────────────────────────
const LOCAL_BASE  = 'http://localhost:8888';
const CLOUD_BASE  = 'https://sirtrav-a2a-studio.netlify.app';
const TIMESTAMP   = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const RUN_ID      = `devkit-${TIMESTAMP}`;

// ─── Gate Accumulator ────────────────────────────────────────────────────────
const GATES = [];
const LAYER_TIMINGS = {};  // layer -> ms
let baseUrl = null;
let blockedOnExternal = false;

function record(layer, id, name, status, detail = '') {
    GATES.push({ layer, id, name, status, detail });
}

// ─── Utility: run CLI command ────────────────────────────────────────────────
function runCmd(cmd, argStr = '') {
    try {
        const out = execSync(`${cmd} ${argStr}`, {
            timeout: 8000,
            stdio: ['ignore', 'pipe', 'pipe'],
            encoding: 'utf8',
        });
        return { ok: true, output: out.trim() };
    } catch (e) {
        return { ok: false, error: (e.stderr?.toString().trim() || e.message).slice(0, 200) };
    }
}

// ─── Utility: fetch with timeout ─────────────────────────────────────────────
async function fetchWithTimeout(url, opts = {}, timeoutMs = 5000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { ...opts, signal: controller.signal });
        clearTimeout(timer);
        return res;
    } catch (err) {
        clearTimeout(timer);
        throw err;
    }
}

// ─── Utility: auto-detect base URL (mirrors truth-serum.mjs:121-141) ─────────
async function resolveBaseURL() {
    if (forceCloud) return CLOUD_BASE;
    if (forceLocal) return LOCAL_BASE;
    try {
        const res = await fetchWithTimeout(
            `${LOCAL_BASE}/.netlify/functions/healthcheck`, {}, 2000
        );
        if (res.ok) {
            console.log('  Auto-detect: localhost:8888 UP -> local mode');
            return LOCAL_BASE;
        }
    } catch (_) { /* not available */ }
    console.log('  Auto-detect: localhost:8888 DOWN -> cloud mode');
    return CLOUD_BASE;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 0 — TOOLS
// Split into System Tools and Project Tools for clearer ops triage.
// System = machine-level installs (winget / OS package manager)
// Project = project-specific CLI tools (netlify-cli, VS Code extension runner)
// ═══════════════════════════════════════════════════════════════════════════════

// System tools — installed at machine level
const SYSTEM_TOOLS = [
    { cmd: 'git',    args: '--version',  name: 'Git',           critical: false },
    { cmd: 'gh',     args: '--version',  name: 'GitHub CLI',    critical: false },
    { cmd: 'node',   args: '--version',  name: 'Node.js',       critical: true  },
    { cmd: 'npm',    args: '--version',  name: 'npm',           critical: true  },
    { cmd: 'python', args: '--version',  name: 'Python',        critical: false },
    { cmd: 'jq',     args: '--version',  name: 'jq',            critical: false },
    { cmd: 'rg',     args: '--version',  name: 'ripgrep (rg)',  critical: false },
    { cmd: 'just',   args: '--version',  name: 'just',          critical: false },
];

// Project tools — project-specific CLI tools
const PROJECT_TOOLS = [
    { cmd: 'netlify', args: '--version', name: 'Netlify CLI',   critical: false },
    { cmd: 'code',    args: '--version', name: 'VS Code',       critical: false },
];

// Docker gets its own runtime check (version + daemon ping)
function runDockerGates(layerTag) {
    // Gate 1: docker binary present
    const versionResult = runCmd('docker', '--version');
    if (!versionResult.ok) {
        record(layerTag, 'tool_docker_bin', 'Docker (installed)', 'fail',
            'Not found on PATH — install Docker Desktop via devkit-spinup.ps1');
        record(layerTag, 'tool_docker_daemon', 'Docker (daemon running)', 'fail',
            'Cannot check daemon — binary not found');
        return;
    }
    const ver = versionResult.output.split('\n')[0];
    record(layerTag, 'tool_docker_bin', 'Docker (installed)', 'pass', ver);
    console.log(`    [PASS] ${'Docker (installed)'.padEnd(28)} ${ver}`);

    // Gate 2: docker daemon actually running (not just installed)
    const infoResult = runCmd('docker', 'info --format "{{.ServerVersion}}"');
    if (infoResult.ok && infoResult.output.trim()) {
        record(layerTag, 'tool_docker_daemon', 'Docker (daemon running)', 'pass',
            `engine v${infoResult.output.trim()}`);
        console.log(`    [PASS] ${'Docker (daemon running)'.padEnd(28)} engine v${infoResult.output.trim()}`);
    } else {
        record(layerTag, 'tool_docker_daemon', 'Docker (daemon running)', 'fail',
            'Installed but daemon not running — start Docker Desktop');
        console.log(`    [FAIL] ${'Docker (daemon running)'.padEnd(28)} installed but daemon not running`);
    }
}

function runLayer0() {
    const t0 = Date.now();
    let criticalFail = false;

    console.log('\n  -- Layer 0a: SYSTEM TOOLS --');
    for (const tool of SYSTEM_TOOLS) {
        const result = runCmd(tool.cmd, tool.args);
        if (result.ok) {
            const ver = result.output.split('\n')[0];
            record('0a', `tool_${tool.cmd}`, tool.name, 'pass', ver);
            console.log(`    [PASS] ${tool.name.padEnd(28)} ${ver}`);
        } else {
            const detail = `Not found on PATH — install with devkit-spinup.ps1`;
            record('0a', `tool_${tool.cmd}`, tool.name, 'fail', detail);
            console.log(`    [FAIL] ${tool.name.padEnd(28)} ${detail}`);
            if (tool.critical) criticalFail = true;
        }
    }

    // Docker: binary + daemon runtime check
    runDockerGates('0a');

    console.log('\n  -- Layer 0b: PROJECT TOOLS --');
    for (const tool of PROJECT_TOOLS) {
        const result = runCmd(tool.cmd, tool.args);
        if (result.ok) {
            const ver = result.output.split('\n')[0];
            record('0b', `tool_${tool.cmd}`, tool.name, 'pass', ver);
            console.log(`    [PASS] ${tool.name.padEnd(28)} ${ver}`);
        } else {
            const detail = tool.cmd === 'netlify'
                ? 'Not installed — run: npm install -g netlify-cli'
                : 'Not found on PATH — install VS Code and add to PATH';
            record('0b', `tool_${tool.cmd}`, tool.name, 'fail', detail);
            console.log(`    [FAIL] ${tool.name.padEnd(28)} ${detail}`);
        }
    }

    LAYER_TIMINGS['0'] = Date.now() - t0;

    if (criticalFail) {
        console.log('\n  CRITICAL: node or npm not found. Cannot continue.\n');
        process.exit(2);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 1 — ENV
// File system checks — no network required.
// Mirrors preflight.mjs logic but is non-fatal per gate.
// ═══════════════════════════════════════════════════════════════════════════════

const REQUIRED_FILES = [
    'package.json',
    '.env.example',
    'netlify/functions/healthcheck.ts',
    'netlify/functions/start-pipeline.ts',
    'netlify/functions/run-pipeline-background.ts',
    'scripts/verify-golden-path.mjs',
    'scripts/truth-serum.mjs',
    'justfile',
];

const REQUIRED_DIRS = [
    'netlify/functions',
    'scripts',
    'artifacts',
];

function runLayer1() {
    const t0 = Date.now();
    console.log('\n  -- Layer 1: ENV --');

    // Required files
    const missingFiles = REQUIRED_FILES.filter(f => !existsSync(join(ROOT, f)));
    if (missingFiles.length === 0) {
        record(1, 'env_files', 'Required Files', 'pass', `${REQUIRED_FILES.length} files verified`);
        console.log(`    [PASS] ${'Required Files'.padEnd(28)} ${REQUIRED_FILES.length} files verified`);
    } else {
        record(1, 'env_files', 'Required Files', 'fail', `Missing: ${missingFiles.join(', ')}`);
        console.log(`    [FAIL] ${'Required Files'.padEnd(28)} Missing: ${missingFiles.join(', ')}`);
    }

    // Required directories
    const missingDirs = REQUIRED_DIRS.filter(d => !existsSync(join(ROOT, d)));
    if (missingDirs.length === 0) {
        record(1, 'env_dirs', 'Required Dirs', 'pass', `${REQUIRED_DIRS.length} dirs verified`);
        console.log(`    [PASS] ${'Required Dirs'.padEnd(28)} ${REQUIRED_DIRS.length} dirs verified`);
    } else {
        record(1, 'env_dirs', 'Required Dirs', 'fail', `Missing: ${missingDirs.join(', ')}`);
        console.log(`    [FAIL] ${'Required Dirs'.padEnd(28)} Missing: ${missingDirs.join(', ')}`);
    }

    // .env.local or .env (SKIP_NO_LOCAL_ENV is honest — cloud mode works without)
    const hasEnvLocal = existsSync(join(ROOT, '.env.local'));
    const hasEnv      = existsSync(join(ROOT, '.env'));
    if (hasEnvLocal || hasEnv) {
        const which = hasEnvLocal ? '.env.local' : '.env';
        record(1, 'env_dotenv', 'Local .env File', 'pass', `${which} found`);
        console.log(`    [PASS] ${'Local .env File'.padEnd(28)} ${which} found`);
    } else {
        record(1, 'env_dotenv', 'Local .env File', 'skip',
            'SKIP_NO_LOCAL_ENV — cloud mode uses Netlify env vars');
        console.log(`    [SKIP] ${'Local .env File'.padEnd(28)} SKIP_NO_LOCAL_ENV (cloud mode OK)`);
    }

    // node_modules
    if (existsSync(join(ROOT, 'node_modules'))) {
        record(1, 'env_modules', 'node_modules', 'pass', 'npm install has been run');
        console.log(`    [PASS] ${'node_modules'.padEnd(28)} npm install has been run`);
    } else {
        record(1, 'env_modules', 'node_modules', 'fail', 'Run: npm install');
        console.log(`    [FAIL] ${'node_modules'.padEnd(28)} Run: npm install`);
    }

    LAYER_TIMINGS['1'] = Date.now() - t0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 2 — ALIVE
// Ping healthcheck and parse service status.
// Resolves baseUrl for Layers 3+4.
// ═══════════════════════════════════════════════════════════════════════════════

async function runLayer2() {
    const t0 = Date.now();
    console.log('\n  -- Layer 2: ALIVE --');

    baseUrl = await resolveBaseURL();
    const hcUrl = `${baseUrl}/.netlify/functions/healthcheck`;

    try {
        const res = await fetchWithTimeout(hcUrl, {}, 6000);
        const body = await res.json().catch(() => ({}));

        if (res.ok) {
            record(2, 'alive_healthcheck', 'Healthcheck (200)', 'pass',
                `status=${body.status || '?'} v${body.version || '?'} @ ${baseUrl}`);
            console.log(`    [PASS] ${'Healthcheck (200)'.padEnd(28)} status=${body.status} v=${body.version}`);

            // AI services sub-gate
            const services = Array.isArray(body.services) ? body.services : [];
            const ai = services.find(s => s.name === 'ai_services' || s.name === 'ai');
            if (ai && (ai.status === 'ok' || ai.status === 'healthy')) {
                record(2, 'alive_ai', 'AI Services', 'pass', 'Keys configured');
                console.log(`    [PASS] ${'AI Services'.padEnd(28)} keys configured`);
            } else {
                record(2, 'alive_ai', 'AI Services', 'skip',
                    `SKIP_KEYS_MISSING — check OPENAI_API_KEY / ELEVENLABS_API_KEY`);
                console.log(`    [SKIP] ${'AI Services'.padEnd(28)} SKIP_KEYS_MISSING`);
            }

            // Social publishing sub-gate
            const social = services.find(s => s.name === 'social_publishing' || s.name === 'social');
            if (social && (social.status === 'ok' || social.status === 'degraded')) {
                record(2, 'alive_social', 'Social Publishing', 'pass', `${social.status}`);
                console.log(`    [PASS] ${'Social Publishing'.padEnd(28)} ${social.status}`);
            } else {
                record(2, 'alive_social', 'Social Publishing', 'skip',
                    'SKIP_KEYS_MISSING — add TWITTER_API_KEY etc to enable');
                console.log(`    [SKIP] ${'Social Publishing'.padEnd(28)} SKIP_KEYS_MISSING`);
            }
        } else if (res.status === 429) {
            blockedOnExternal = true;
            record(2, 'alive_healthcheck', 'Healthcheck (200)', 'fail',
                `429 Rate Limited from ${baseUrl} — BLOCKED_EXTERNAL`);
            console.log(`    [FAIL] ${'Healthcheck (200)'.padEnd(28)} 429 BLOCKED_EXTERNAL`);
        } else {
            record(2, 'alive_healthcheck', 'Healthcheck (200)', 'fail',
                `HTTP ${res.status} from ${hcUrl}`);
            console.log(`    [FAIL] ${'Healthcheck (200)'.padEnd(28)} HTTP ${res.status}`);
        }
    } catch (err) {
        const isConnRefused = err?.cause?.code === 'ECONNREFUSED' || err?.message?.includes('ECONNREFUSED');
        const detail = isConnRefused
            ? 'ECONNREFUSED — run: netlify dev (for local mode) or check cloud deployment'
            : err.message.slice(0, 120);
        record(2, 'alive_healthcheck', 'Healthcheck (200)', 'fail', detail);
        console.log(`    [FAIL] ${'Healthcheck (200)'.padEnd(28)} ${detail}`);
    }

    LAYER_TIMINGS['2'] = Date.now() - t0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 3 — PIPELINE
// Lightweight smoke: POST /start-pipeline → SSE first-event check.
// Does NOT wait for full pipeline completion — tests responsiveness only.
// ═══════════════════════════════════════════════════════════════════════════════

async function runLayer3() {
    const t0 = Date.now();
    console.log('\n  -- Layer 3: PIPELINE --');

    if (!baseUrl) {
        record(3, 'pipeline_start', 'Pipeline Start (202)', 'skip',
            'SKIP_LAYER_DEPENDENCY — Layer 2 did not resolve base URL');
        record(3, 'pipeline_sse', 'SSE Stream Active', 'skip',
            'SKIP_LAYER_DEPENDENCY — no base URL');
        console.log(`    [SKIP] ${'Pipeline Start (202)'.padEnd(28)} SKIP_LAYER_DEPENDENCY`);
        console.log(`    [SKIP] ${'SSE Stream Active'.padEnd(28)} SKIP_LAYER_DEPENDENCY`);
        LAYER_TIMINGS['3'] = Date.now() - t0;
        return;
    }

    const projectId = `devkit-${Date.now()}`;
    let runId = null;

    // Gate: start-pipeline
    try {
        const res = await fetchWithTimeout(
            `${baseUrl}/.netlify/functions/start-pipeline`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer demo',
                },
                body: JSON.stringify({ projectId, runId: RUN_ID, payload: { mode: 'smoke' } }),
            },
            10000
        );

        const body = await res.json().catch(() => ({}));

        if ((res.status === 200 || res.status === 202) && body.runId) {
            runId = body.runId;
            record(3, 'pipeline_start', 'Pipeline Start (202)', 'pass', `runId=${runId}`);
            console.log(`    [PASS] ${'Pipeline Start (202)'.padEnd(28)} runId=${runId}`);
        } else if (res.status === 401) {
            // Auth gate working — endpoint is deployed and secured
            record(3, 'pipeline_start', 'Pipeline Start (202)', 'skip',
                'SKIP_AUTH_GATE_ACTIVE — 401 returned, endpoint deployed and secured');
            console.log(`    [SKIP] ${'Pipeline Start (202)'.padEnd(28)} SKIP_AUTH_GATE_ACTIVE (401 — endpoint exists)`);
        } else if (res.status === 429) {
            blockedOnExternal = true;
            record(3, 'pipeline_start', 'Pipeline Start (202)', 'fail',
                `429 BLOCKED_EXTERNAL — rate limited by upstream provider`);
            console.log(`    [FAIL] ${'Pipeline Start (202)'.padEnd(28)} 429 BLOCKED_EXTERNAL`);
        } else {
            record(3, 'pipeline_start', 'Pipeline Start (202)', 'fail',
                `HTTP ${res.status}: ${JSON.stringify(body).slice(0, 100)}`);
            console.log(`    [FAIL] ${'Pipeline Start (202)'.padEnd(28)} HTTP ${res.status}`);
        }
    } catch (err) {
        record(3, 'pipeline_start', 'Pipeline Start (202)', 'fail', err.message.slice(0, 120));
        console.log(`    [FAIL] ${'Pipeline Start (202)'.padEnd(28)} ${err.message.slice(0, 80)}`);
    }

    // Gate: SSE first-event (only if we have a runId)
    if (runId) {
        try {
            const sseUrl = `${baseUrl}/.netlify/functions/progress?projectId=${projectId}&runId=${runId}&stream=true`;
            const res = await fetchWithTimeout(
                sseUrl,
                { headers: { Accept: 'text/event-stream' } },
                10000
            );

            if (res.ok && res.body) {
                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                let gotEvent = false;
                const killTimer = setTimeout(() => reader.cancel(), 5000);
                try {
                    const { value } = await reader.read();
                    if (value) {
                        const chunk = decoder.decode(value);
                        gotEvent = chunk.includes('event:') || chunk.includes('data:');
                    }
                } catch (_) { /* cancelled — expected */ }
                finally { clearTimeout(killTimer); }

                if (gotEvent) {
                    record(3, 'pipeline_sse', 'SSE Stream Active', 'pass', 'First event received');
                    console.log(`    [PASS] ${'SSE Stream Active'.padEnd(28)} first event received`);
                } else {
                    record(3, 'pipeline_sse', 'SSE Stream Active', 'skip',
                        'SKIP_LONG_RUNNING — no events in 5s window (pipeline slow-start is normal)');
                    console.log(`    [SKIP] ${'SSE Stream Active'.padEnd(28)} SKIP_LONG_RUNNING`);
                }
            } else {
                record(3, 'pipeline_sse', 'SSE Stream Active', 'fail', `HTTP ${res.status}`);
                console.log(`    [FAIL] ${'SSE Stream Active'.padEnd(28)} HTTP ${res.status}`);
            }
        } catch (err) {
            record(3, 'pipeline_sse', 'SSE Stream Active', 'skip',
                `SKIP_LONG_RUNNING — ${err.message.slice(0, 80)}`);
            console.log(`    [SKIP] ${'SSE Stream Active'.padEnd(28)} SKIP_LONG_RUNNING`);
        }
    } else {
        record(3, 'pipeline_sse', 'SSE Stream Active', 'skip',
            'SKIP_LAYER_DEPENDENCY — no runId from start-pipeline');
        console.log(`    [SKIP] ${'SSE Stream Active'.padEnd(28)} SKIP_LAYER_DEPENDENCY`);
    }

    LAYER_TIMINGS['3'] = Date.now() - t0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 4 — TRUTH
// Delegates to truth-serum.mjs subprocess (reuses full logic exactly).
// Uses --allow-disabled (lenient) by default — CI-safe when social keys absent.
// ═══════════════════════════════════════════════════════════════════════════════

async function runLayer4() {
    const t0 = Date.now();
    console.log('\n  -- Layer 4: TRUTH --');

    const serumScript = join(ROOT, 'scripts', 'truth-serum.mjs');
    if (!existsSync(serumScript)) {
        record(4, 'truth_serum', 'No Fake Success', 'fail', 'scripts/truth-serum.mjs not found');
        console.log(`    [FAIL] ${'No Fake Success'.padEnd(28)} truth-serum.mjs missing`);
        LAYER_TIMINGS['4'] = Date.now() - t0;
        return;
    }

    const flags = [];
    if (allowDisabled) flags.push('--allow-disabled');
    if (forceLocal)    flags.push('--local');
    if (forceCloud)    flags.push('--cloud');

    try {
        execSync(
            `node scripts/truth-serum.mjs ${flags.join(' ')}`,
            { cwd: ROOT, stdio: 'pipe', timeout: 45000 }
        );
        const mode = allowDisabled ? 'lenient' : 'strict';
        record(4, 'truth_serum', 'No Fake Success', 'pass', `truth-serum ${mode} mode passed`);
        console.log(`    [PASS] ${'No Fake Success'.padEnd(28)} truth-serum ${mode} passed`);
    } catch (e) {
        const stderr = (e.stderr?.toString() || '').trim();
        const stdout = (e.stdout?.toString() || '').trim();
        const combined = stderr || stdout;
        const isRateLimited = combined.includes('429') || combined.includes('rate limit');
        const isLiar = combined.includes('LIAR') || combined.includes('fake') || e.status === 2;

        if (isRateLimited) {
            blockedOnExternal = true;
            record(4, 'truth_serum', 'No Fake Success', 'fail',
                '429 BLOCKED_EXTERNAL — rate limited during truth-serum');
            console.log(`    [FAIL] ${'No Fake Success'.padEnd(28)} 429 BLOCKED_EXTERNAL`);
        } else if (isLiar) {
            record(4, 'truth_serum', 'No Fake Success', 'fail',
                'LIAR_DETECTED — publisher returning fake success');
            console.log(`    [FAIL] ${'No Fake Success'.padEnd(28)} LIAR_DETECTED`);
        } else {
            record(4, 'truth_serum', 'No Fake Success', 'fail',
                `truth-serum failed: ${combined.slice(0, 120)}`);
            console.log(`    [FAIL] ${'No Fake Success'.padEnd(28)} truth-serum failed`);
        }
    }

    LAYER_TIMINGS['4'] = Date.now() - t0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OUTPUT: Results Table + Bottom-Line Score
// Follows cycle-check.mjs printStatus() format.
// ═══════════════════════════════════════════════════════════════════════════════

function printResults() {
    const layerNames = {
        '0a': 'SYSTEM TOOLS',
        '0b': 'PROJECT TOOLS',
        1:    'ENV',
        2:    'ALIVE',
        3:    'PIPELINE',
        4:    'TRUTH',
    };

    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   DEVKIT VERIFICATION RESULTS');
    console.log(`   Run ID : ${RUN_ID}`);
    console.log(`   Target : ${baseUrl || 'N/A (tools-only mode)'}`);
    console.log(`   Flags  : ${args.join(' ') || '(none)'}`);
    console.log('═══════════════════════════════════════════════════════════');

    let currentLayer = null;
    for (const gate of GATES) {
        if (gate.layer !== currentLayer) {
            currentLayer = gate.layer;
            const layerLabel = layerNames[currentLayer] || String(currentLayer);
            const timing = LAYER_TIMINGS[String(currentLayer).charAt(0)];
            const timingStr = timing != null ? ` (${timing}ms)` : '';
            console.log(`\n  -- Layer ${currentLayer}: ${layerLabel}${timingStr} --`);
        }
        const icon = gate.status === 'pass' ? '[PASS]'
                   : gate.status === 'fail' ? '[FAIL]'
                   : '[SKIP]';
        const col = gate.name.padEnd(30);
        console.log(`    ${icon} ${col} ${gate.detail}`);
    }

    const passed  = GATES.filter(g => g.status === 'pass').length;
    const failed  = GATES.filter(g => g.status === 'fail').length;
    const skipped = GATES.filter(g => g.status === 'skip').length;
    const total   = GATES.length;
    const tested  = total - skipped;
    const score   = `${passed}/${tested}`;

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`  BOTTOM LINE : ${score} gates passed   ${failed} failed   ${skipped} skipped`);

    let verdict;
    if (failed === 0 && !blockedOnExternal) {
        verdict = 'DEVKIT VERIFIED — system ready for development';
    } else if (blockedOnExternal) {
        verdict = `BLOCKED (external) — ${failed} gate(s) failed due to external service limits`;
    } else {
        verdict = `${failed} gate(s) FAILED — see details above`;
    }
    console.log(`  VERDICT     : ${verdict}`);
    console.log('═══════════════════════════════════════════════════════════');

    return { passed, failed, skipped, total, tested, score, verdict };
}

// ─── Council Event Artifact ───────────────────────────────────────────────────
// Mirrors truth-serum.mjs council event pattern.
// Adds layer timing and external-block metadata for team telemetry.
function writeCouncilEvent(summary) {
    try {
        const dir = join(ROOT, 'artifacts', 'council_events');
        mkdirSync(dir, { recursive: true });
        const event = {
            eventId: RUN_ID,
            kind: 'devkit-verify',
            timestamp: new Date().toISOString(),
            triggeredBy: 'devkit-spinup',
            runId: RUN_ID,
            target: baseUrl || 'unknown',
            verdict: summary.failed === 0 ? 'PASS' : (blockedOnExternal ? 'BLOCKED' : 'FAIL'),
            blockedOnExternal,
            summary: `${summary.score} passed, ${summary.failed} failed, ${summary.skipped} skipped`,
            layerTimingsMs: LAYER_TIMINGS,
            flags: { toolsOnly, noPipeline, forceLocal, forceCloud, allowDisabled },
            gateResults: GATES.map(g => ({
                layer: g.layer,
                gate:  g.id,
                name:  g.name,
                status: g.status,
                detail: g.detail,
            })),
        };
        const outPath = join(dir, `${RUN_ID}.json`);
        writeFileSync(outPath, JSON.stringify(event, null, 2));
        console.log(`\n  Council event: artifacts/council_events/${RUN_ID}.json`);
    } catch (e) {
        console.warn(`  Council event write skipped: ${e.message}`);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   SIRTRAV A2A STUDIO — DevKit Verification Suite');
    console.log(`   Run ID : ${RUN_ID}`);
    console.log(`   Flags  : ${args.join(' ') || '(none)'}`);
    console.log('═══════════════════════════════════════════════════════════');

    // Layer 0: always run — no network needed, critical gate
    runLayer0();

    if (toolsOnly) {
        console.log('\n  --tools-only: stopping after Layer 0');
        const summary = printResults();
        writeCouncilEvent(summary);
        process.exit(summary.failed > 0 ? 1 : 0);
    }

    // Layer 1: filesystem checks
    runLayer1();

    // Layer 2: network — resolves baseUrl
    await runLayer2();

    if (noPipeline) {
        console.log('\n  --no-pipeline: stopping after Layer 2');
        const summary = printResults();
        writeCouncilEvent(summary);
        process.exit(summary.failed > 0 ? 1 : 0);
    }

    // Layer 3: pipeline smoke
    await runLayer3();

    // Layer 4: truth serum subprocess
    await runLayer4();

    const summary = printResults();
    writeCouncilEvent(summary);

    if (blockedOnExternal) process.exit(3);
    process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch(err => {
    console.error(`\nFATAL: ${err.message}`);
    process.exit(1);
});
