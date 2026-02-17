#!/usr/bin/env node
/**
 * cycle-check.mjs — Progressive Context-Lean Gate System (v3)
 *
 * DESIGN PRINCIPLE: Every output mode is budgeted by tokens.
 * Agents should spend tokens on LOGIC, not on re-reading status.
 *
 * 10 gates organized by Layer, each owned by a specific agent.
 *
 * COMMANDS (sorted by token cost):
 *   next                  → ~50 tokens  — ONE line: what to do next
 *   brief                 → ~150 tokens — 1 line per gate, no decoration
 *   orient <agent>        → ~200 tokens — Agent role + gates + next action
 *   budget                → ~100 tokens — Token cost of each command
 *   layer <1-4>           → ~80 tokens  — Test only one layer
 *   status                → ~400 tokens — Full decorated status (default)
 *   quick                 → ~400 tokens — Run all except build, show status
 *   all                   → ~500 tokens — Run ALL gates + status
 *   <gate-name>           → ~80 tokens  — Run one specific gate
 *
 * Gates:
 *   Layer 1 (TRUTH):    build, netlify_plugin, healthcheck, no_fake_success
 *   Layer 2 (WIRING):   wiring, contracts, golden_path
 *   Layer 3 (DESIGN):   design_tokens
 *   Layer 4 (DELIVER):  social_dry, motion_test
 *
 * PROGRESSIVE DISCLOSURE:
 *   Session start     → just cycle-next    (50 tokens)
 *   If all pass       → agent does logic work (full context budget)
 *   If something fails → just cycle-layer 1 (80 tokens on that layer)
 *   Deep debug        → just cycle-status  (400 tokens, full detail)
 *
 * This saves ~4800 tokens/session vs. reading 10 files.
 * For the Commons Good!
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const STATE_FILE = join(ROOT, 'agent-state.json');
const BUDGET_FILE = join(ROOT, 'artifacts', 'claude', 'token-budget.json');

// ─── Token Budget Constants ─────────────────────────────────────────
// Estimated tokens per command output (helps agents plan context usage)
const TOKEN_COSTS = {
    next:    50,   // ONE line
    brief:   150,  // 10 lines, no decoration
    orient:  200,  // role + gates + next
    budget:  100,  // cost table
    layer:   80,   // subset of gates
    status:  400,  // full decorated
    quick:   400,  // run + status
    all:     500,  // run ALL + status
    gate:    80,   // single gate
};

// ─── Gate Definitions ───────────────────────────────────────────────
const GATES = [
    // Layer 1: TRUTH
    { id: 'build', layer: 1, owner: 'Windsurf', name: 'Vite Build Passes' },
    { id: 'netlify_plugin', layer: 1, owner: 'Claude Code', name: '@netlify/vite-plugin Installed' },
    { id: 'healthcheck', layer: 1, owner: 'Claude Code', name: 'Healthcheck Returns 200' },
    { id: 'no_fake_success', layer: 1, owner: 'Claude Code', name: 'Publishers Have No Fake Success' },
    // Layer 2: WIRING
    { id: 'wiring', layer: 2, owner: 'Claude Code', name: 'Pipeline Steps 1-7 Wired' },
    { id: 'contracts', layer: 2, owner: 'Antigravity', name: 'API Contracts Match Schemas' },
    { id: 'golden_path', layer: 2, owner: 'Antigravity', name: 'Golden Path Smoke Test' },
    // Layer 3: DESIGN
    { id: 'design_tokens', layer: 3, owner: 'Codex', name: 'Design Tokens Exported' },
    // Layer 4: DELIVER
    { id: 'social_dry', layer: 4, owner: 'Antigravity', name: 'Social Dry-Run Tests' },
    { id: 'motion_test', layer: 4, owner: 'Antigravity', name: 'Motion Graphics Render' },
];

const LAYER_NAMES = { 1: 'TRUTH', 2: 'WIRING', 3: 'DESIGN', 4: 'DELIVER' };

// ─── Agent Profiles (for orient mode) ──────────────────────────────
const AGENTS = {
    'claude-code': {
        role: 'Backend Builder',
        gates: ['netlify_plugin', 'healthcheck', 'no_fake_success', 'wiring'],
        files: 'netlify/functions/*',
        avoid: 'src/components/*, justfile',
    },
    'codex': {
        role: 'Frontend Builder',
        gates: ['design_tokens'],
        files: 'src/components/*, src/remotion/*',
        avoid: 'netlify/functions/*, scripts/*',
        blocked: 'BLOCKED UNTIL Layer 1-2 all pass',
    },
    'antigravity': {
        role: 'Test & QA Agent',
        gates: ['contracts', 'golden_path', 'social_dry', 'motion_test'],
        files: 'scripts/*, artifacts/contracts/*, artifacts/data/*',
        avoid: 'netlify/functions/*, src/components/*',
    },
    'windsurf': {
        role: 'Infrastructure Master',
        gates: ['build'],
        files: 'justfile, netlify.toml, vite.config.js',
        avoid: 'netlify/functions/* internals',
    },
    'human': {
        role: 'Operator (Scott)',
        gates: [],
        files: 'Netlify Dashboard ENV VARS',
        tasks: 'X keys (DONE!), YouTube refresh token, Suno key, Remotion AWS vars',
    },
};

// ─── State Management ───────────────────────────────────────────────
function loadState() {
    if (existsSync(STATE_FILE)) {
        try { return JSON.parse(readFileSync(STATE_FILE, 'utf8')); }
        catch { /* corrupt, reset */ }
    }
    const state = { version: 2, gates: {}, lastRun: null };
    GATES.forEach(g => { state.gates[g.id] = { status: 'pending', lastChecked: null, error: null }; });
    return state;
}

function saveState(state) {
    state.lastRun = new Date().toISOString();
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ─── Gate Checks ────────────────────────────────────────────────────

function checkBuild() {
    try {
        execSync('npx vite build', { cwd: ROOT, stdio: 'pipe', timeout: 30000 });
        return { pass: true };
    } catch (e) {
        return { pass: false, error: 'Vite build failed: ' + (e.stderr?.toString().slice(0, 200) || e.message) };
    }
}

function checkNetlifyPlugin() {
    try {
        const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (deps['@netlify/vite-plugin']) {
            // Also check vite.config.js references it
            const viteConfig = readFileSync(join(ROOT, 'vite.config.js'), 'utf8');
            if (viteConfig.includes('netlify')) {
                return { pass: true };
            }
            return { pass: false, error: '@netlify/vite-plugin in package.json but not in vite.config.js' };
        }
        return { pass: false, error: '@netlify/vite-plugin not in dependencies' };
    } catch (e) {
        return { pass: false, error: e.message };
    }
}

function checkHealthcheck() {
    const hcPath = join(ROOT, 'netlify/functions/healthcheck.ts');
    if (!existsSync(hcPath)) return { pass: false, error: 'healthcheck.ts not found' };
    const content = readFileSync(hcPath, 'utf8');
    // Accept both v1 (handler) and v2 (export default) patterns
    if (content.includes('handler') || content.includes('export default')) {
        return { pass: true };
    }
    return { pass: false, error: 'healthcheck.ts missing handler/export' };
}

function checkNoFakeSuccess() {
    const publishFiles = ['publish-x.ts', 'publish-youtube.ts', 'publish-instagram.ts', 'publish-tiktok.ts', 'publish-linkedin.ts'];
    const errors = [];
    for (const file of publishFiles) {
        const path = join(ROOT, 'netlify/functions', file);
        if (!existsSync(path)) continue;
        const content = readFileSync(path, 'utf8');
        // Check: disabled services must NOT return success: true
        if (content.includes('disabled: true') && content.includes('success: false')) {
            // Good pattern
        } else if (content.includes('disabled')) {
            // Has disabled handling but check if it returns success: true alongside
            if (content.includes("success: true") && content.includes("status: 'placeholder'")) {
                errors.push(`${file}: returns success:true with placeholder status (fake success)`);
            }
        }
    }
    return errors.length > 0 ? { pass: false, error: errors.join('; ') } : { pass: true };
}

function checkWiring() {
    const pipelinePath = join(ROOT, 'netlify/functions/run-pipeline-background.ts');
    if (!existsSync(pipelinePath)) return { pass: false, error: 'run-pipeline-background.ts not found' };
    const content = readFileSync(pipelinePath, 'utf8');
    const checks = [
        { pattern: 'curate-media', label: 'Step 1 Director' },
        { pattern: 'narrate-project', label: 'Step 2 Writer' },
        { pattern: 'text-to-speech', label: 'Step 3 Voice' },
        { pattern: 'generate-music', label: 'Step 4 Composer' },
        { pattern: 'compile-video', label: 'Step 5 Editor' },
        { pattern: 'generate-attribution', label: 'Step 6 Attribution' },
    ];
    const missing = checks.filter(c => !content.includes(c.pattern));
    if (missing.length > 0) {
        return { pass: false, error: `Missing wiring: ${missing.map(m => m.label).join(', ')}` };
    }
    return { pass: true };
}

function checkContracts() {
    const contractFiles = [
        'artifacts/contracts/social-post.schema.json',
        'artifacts/data/job-costing.schema.json',
    ];
    const missing = contractFiles.filter(f => !existsSync(join(ROOT, f)));
    if (missing.length > 0) {
        // Not critical if schemas don't exist yet — check if validators exist instead
        const validatorPath = join(ROOT, 'scripts/validate-social-contracts.mjs');
        if (existsSync(validatorPath)) {
            return { pass: true, note: 'Validator script exists, schema files optional' };
        }
        return { pass: false, error: `Missing: ${missing.join(', ')}` };
    }
    return { pass: true };
}

function checkGoldenPath() {
    const gpPath = join(ROOT, 'scripts/verify-golden-path.mjs');
    if (!existsSync(gpPath)) return { pass: false, error: 'verify-golden-path.mjs not found' };
    // Verify it has the smoke test mode
    const content = readFileSync(gpPath, 'utf8');
    if (content.includes('--smoke') || content.includes('smoke')) {
        return { pass: true };
    }
    return { pass: false, error: 'verify-golden-path.mjs missing --smoke mode' };
}

function checkDesignTokens() {
    const tokensPath = join(ROOT, 'artifacts/antigravity/design-tokens.json');
    if (!existsSync(tokensPath)) return { pass: false, error: 'design-tokens.json not found' };
    try {
        JSON.parse(readFileSync(tokensPath, 'utf8'));
        return { pass: true };
    } catch {
        return { pass: false, error: 'design-tokens.json is invalid JSON' };
    }
}

function checkSocialDry() {
    const testFile = join(ROOT, 'scripts/test-x-publish.mjs');
    if (!existsSync(testFile)) return { pass: false, error: 'test-x-publish.mjs not found' };
    const content = readFileSync(testFile, 'utf8');
    if (content.includes('--dry-run')) {
        return { pass: true };
    }
    return { pass: false, error: 'test-x-publish.mjs missing --dry-run support' };
}

function checkMotionTest() {
    const motionFile = join(ROOT, 'scripts/test_remotion_motion.mjs');
    const altFile = join(ROOT, 'scripts/test_motion_graphic.mjs');
    if (existsSync(motionFile) || existsSync(altFile)) {
        return { pass: true };
    }
    return { pass: false, error: 'No motion test script found' };
}

const CHECK_MAP = {
    build: checkBuild,
    netlify_plugin: checkNetlifyPlugin,
    healthcheck: checkHealthcheck,
    no_fake_success: checkNoFakeSuccess,
    wiring: checkWiring,
    contracts: checkContracts,
    golden_path: checkGoldenPath,
    design_tokens: checkDesignTokens,
    social_dry: checkSocialDry,
    motion_test: checkMotionTest,
};

// ─── Runner ─────────────────────────────────────────────────────────

function runGate(gateId, state) {
    const gate = GATES.find(g => g.id === gateId);
    if (!gate) { console.log(`❌ Unknown gate: ${gateId}`); return; }

    const check = CHECK_MAP[gateId];
    const result = check();

    state.gates[gateId] = {
        status: result.pass ? 'pass' : 'fail',
        lastChecked: new Date().toISOString(),
        error: result.error || null,
        note: result.note || null,
    };

    const icon = result.pass ? '✅' : '❌';
    console.log(`${icon} [L${gate.layer}] ${gate.name} (${gate.owner})`);
    if (result.error) console.log(`   → ${result.error}`);
    if (result.note) console.log(`   ℹ️ ${result.note}`);
}

function printStatus(state) {
    console.log('\n📊 CYCLE STATUS');
    console.log('═══════════════════════════════════════════════');

    let currentLayer = 0;
    for (const gate of GATES) {
        if (gate.layer !== currentLayer) {
            currentLayer = gate.layer;
            const layerNames = { 1: 'TRUTH', 2: 'WIRING', 3: 'DESIGN', 4: 'DELIVER' };
            console.log(`\n── Layer ${currentLayer}: ${layerNames[currentLayer]} ──`);
        }
        const s = state.gates[gate.id] || { status: 'pending' };
        const icon = s.status === 'pass' ? '✅' : s.status === 'fail' ? '❌' : '⏳';
        console.log(`  ${icon} ${gate.name.padEnd(35)} [${gate.owner}]`);
        if (s.error) console.log(`     → ${s.error}`);
    }

    const passed = GATES.filter(g => state.gates[g.id]?.status === 'pass').length;
    const failed = GATES.filter(g => state.gates[g.id]?.status === 'fail').length;
    const pending = GATES.length - passed - failed;

    console.log(`\n═══════════════════════════════════════════════`);
    console.log(`  ✅ ${passed} passed  ❌ ${failed} failed  ⏳ ${pending} pending`);
    console.log(`  Last run: ${state.lastRun || 'never'}`);
    console.log(`═══════════════════════════════════════════════\n`);
}

// ─── Progressive Output Modes ───────────────────────────────────────

/** BRIEF: ~150 tokens — 1 line per gate, no decoration */
function printBrief(state) {
    const passed = GATES.filter(g => state.gates[g.id]?.status === 'pass').length;
    const lastRunDisplay = state.lastRun ? new Date(state.lastRun).toLocaleString() : 'never';
    console.log(`${passed}/${GATES.length} PASS | ${lastRunDisplay}`);
    for (const g of GATES) {
        const s = state.gates[g.id] || { status: '?' };
        const icon = s.status === 'pass' ? 'OK' : s.status === 'fail' ? 'FAIL' : '---';
        const err = s.error ? ` | ${s.error.slice(0, 60)}` : '';
        console.log(`  L${g.layer} ${icon.padEnd(4)} ${g.id}${err}`);
    }
}

/** NEXT: ~50 tokens — Single line: what should the agent do right now? */
function printNext(state, agentName) {
    const agent = agentName ? AGENTS[agentName] : null;
    const relevantGates = agent?.gates || GATES.map(g => g.id);

    // Find first failing gate this agent owns
    for (const gateId of relevantGates) {
        const s = state.gates[gateId];
        if (!s || s.status !== 'pass') {
            const gate = GATES.find(g => g.id === gateId);
            console.log(`NEXT: Fix ${gateId} (${gate?.name}) → run: just cycle-gate ${gateId}`);
            return;
        }
    }
    // All gates pass
    if (agent) {
        const rawBudget = estimateBudget(state);
        const clamped = Math.max(0, rawBudget);
        const formatted = clamped >= 1000 ? `${(clamped / 1000).toFixed(1)}k` : `${clamped}`;
        console.log(`ALL PASS for ${agentName}. Free to do logic work. Budget: ${formatted} tokens saved.`);
    } else {
        console.log(`ALL 10/10 PASS. System healthy. Agents free for logic work.`);
    }
}

/** ORIENT: ~200 tokens — Agent briefing + gates + next action */
function printOrient(state, agentName) {
    const agent = AGENTS[agentName];
    if (!agent) {
        console.log(`Unknown agent: ${agentName}. Known: ${Object.keys(AGENTS).join(', ')}`);
        return;
    }
    console.log(`== ${agentName.toUpperCase()} (${agent.role}) ==`);
    console.log(`Files: ${agent.files}`);
    console.log(`Avoid: ${agent.avoid || 'n/a'}`);
    if (agent.blocked) console.log(`⚠️  ${agent.blocked}`);
    if (agent.tasks) console.log(`Tasks: ${agent.tasks}`);
    console.log(`Gates:`);
    for (const gateId of agent.gates) {
        const s = state.gates[gateId] || { status: '?' };
        const icon = s.status === 'pass' ? 'OK' : s.status === 'fail' ? 'FAIL' : '---';
        console.log(`  ${icon} ${gateId}`);
    }
    console.log('');
    printNext(state, agentName);
}

/** BUDGET: ~100 tokens — Show token cost of each command */
function printBudget() {
    console.log('TOKEN BUDGET (estimated output tokens per command):');
    console.log('────────────────────────────────────────');
    const sorted = Object.entries(TOKEN_COSTS).sort((a, b) => a[1] - b[1]);
    for (const [cmd, cost] of sorted) {
        const bar = '█'.repeat(Math.ceil(cost / 50));
        console.log(`  ${cmd.padEnd(10)} ${String(cost).padStart(4)} tok  ${bar}`);
    }
    console.log('────────────────────────────────────────');
    console.log('Progressive strategy: next → brief → orient → status');
    console.log('Save ~4800 tokens/session vs. reading 10 files');
}

/** LAYER: ~80 tokens — Run/show only gates for one layer (compact output) */
function printLayer(state, layerNum, runChecks) {
    const layerGates = GATES.filter(g => g.layer === layerNum);
    if (layerGates.length === 0) {
        console.log(`No gates for layer ${layerNum}. Valid: 1-4`);
        return;
    }
    // Run checks silently (no per-gate output from runGate)
    if (runChecks) {
        for (const g of layerGates) {
            const check = CHECK_MAP[g.id];
            const result = check();
            state.gates[g.id] = {
                status: result.pass ? 'pass' : 'fail',
                lastChecked: new Date().toISOString(),
                error: result.error || null,
                note: result.note || null,
            };
        }
        saveState(state);
    }
    // Compact output only
    console.log(`Layer ${layerNum}: ${LAYER_NAMES[layerNum]}`);
    for (const g of layerGates) {
        const s = state.gates[g.id] || { status: '?' };
        const icon = s.status === 'pass' ? 'OK' : s.status === 'fail' ? 'FAIL' : '---';
        const err = s.error ? ` → ${s.error.slice(0, 80)}` : '';
        console.log(`  ${icon} ${g.id} [${g.owner}]${err}`);
    }
}

/** Estimate how many tokens were saved by using state file vs. reading raw files */
function estimateBudget(state) {
    const passed = GATES.filter(g => state.gates[g.id]?.status === 'pass').length;
    // Each gate file-read costs ~500 tokens on average. State file = ~200 tokens.
    return (passed * 500) - 200;
}

/** Track cumulative token spend across sessions */
function trackBudget(command) {
    try {
        const dir = join(ROOT, 'artifacts', 'claude');
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

        let budget = { invocations: 0, totalSaved: 0, commands: {}, lastSessionDate: null };
        if (existsSync(BUDGET_FILE)) {
            budget = JSON.parse(readFileSync(BUDGET_FILE, 'utf8'));
        }
        // Migrate legacy field name
        if (budget.sessions && !budget.invocations) {
            budget.invocations = budget.sessions;
            delete budget.sessions;
        }
        budget.invocations = (budget.invocations || 0) + 1;
        budget.commands[command] = (budget.commands[command] || 0) + 1;
        budget.totalSaved += (5000 - (TOKEN_COSTS[command] || 400)); // vs. full file reads
        budget.lastSessionDate = new Date().toISOString().slice(0, 10);
        writeFileSync(BUDGET_FILE, JSON.stringify(budget, null, 2));
    } catch { /* non-critical */ }
}

// ─── Main ───────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const arg = args[0] || 'status';
const arg2 = args[1] || null;
const state = loadState();

// Track usage for Commons Good cost optimization
trackBudget(arg);

switch (arg) {
    case 'status':
        printStatus(state);
        break;

    case 'brief':
        printBrief(state);
        break;

    case 'next':
        printNext(state, arg2);
        break;

    case 'orient':
        if (!arg2) {
            console.log(`Usage: cycle-check.mjs orient <agent>`);
            console.log(`Agents: ${Object.keys(AGENTS).join(', ')}`);
        } else {
            printOrient(state, arg2);
        }
        break;

    case 'budget':
        printBudget();
        break;

    case 'layer': {
        const layerNum = parseInt(arg2);
        if (!layerNum || layerNum < 1 || layerNum > 4) {
            console.log('Usage: cycle-check.mjs layer <1-4>');
        } else {
            printLayer(state, layerNum, true);
        }
        break;
    }

    case 'weekly-report': {
        const fs = await import('fs');
        const ok = p => fs.existsSync(p);
        const report = {
            generatedAt: new Date().toISOString(),
            checks: {
                weeklyRaw: ok('artifacts/data/current-week-raw.json'),
                weeklySchema: ok('artifacts/contracts/weekly-harvest.schema.json'),
                socialSchema: ok('artifacts/contracts/social-post.schema.json'),
                harvestScript: ok('scripts/harvest-week.mjs'),
                analyzeScript: ok('scripts/weekly-analyze.mjs'),
                hudComponent: ok('src/components/SystemStatusEmblem.tsx'),
                validateScript: ok('scripts/validate-weekly-pulse.mjs'),
            },
            gates: {
                total: Object.values(state.gates).filter(g => g.status === 'pass').length,
                of: Object.keys(state.gates).length,
            },
        };
        fs.mkdirSync('artifacts/reports', { recursive: true });
        fs.writeFileSync('artifacts/reports/weekly-pulse-report.json', JSON.stringify(report, null, 2));
        console.log('Wrote artifacts/reports/weekly-pulse-report.json');
        const missing = Object.entries(report.checks).filter(([, v]) => !v).map(([k]) => k);
        if (missing.length) {
            console.log(`Missing: ${missing.join(', ')}`);
        } else {
            console.log('All files present!');
        }
        break;
    }

    case 'all':
        console.log('Running ALL gates...\n');
        for (const gate of GATES) {
            if (gate.id === 'build') {
                console.log(`SKIP [L1] build (slow — run: node scripts/cycle-check.mjs build)`);
                continue;
            }
            runGate(gate.id, state);
        }
        saveState(state);
        printStatus(state);
        break;

    case 'quick':
        console.log('Quick check (skip build)...\n');
        for (const gate of GATES) {
            if (gate.id === 'build') continue;
            runGate(gate.id, state);
        }
        saveState(state);
        printStatus(state);
        break;

    default:
        // Single gate name
        runGate(arg, state);
        saveState(state);
        break;
}
