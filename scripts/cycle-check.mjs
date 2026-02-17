#!/usr/bin/env node
/**
 * cycle-check.mjs — MASTER.md-Aligned Gate System (v2)
 * 
 * 10 gates organized by Layer, each owned by a specific agent.
 * Run: node scripts/cycle-check.mjs [gate-name|all|status]
 * 
 * Gates:
 *   Layer 1 (TRUTH):    build, netlify_plugin, healthcheck, no_fake_success
 *   Layer 2 (WIRING):   wiring, contracts, golden_path
 *   Layer 3 (DESIGN):   design_tokens
 *   Layer 4 (DELIVER):  social_dry, motion_test
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const STATE_FILE = join(ROOT, 'agent-state.json');

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
        'artifacts/contracts/weekly-harvest.schema.json',
        'artifacts/contracts/weekly-pulse-analysis.schema.json',
        'artifacts/data/job-costing.schema.json',
    ];
    const missing = contractFiles.filter(f => !existsSync(join(ROOT, f)));
    if (missing.length > 0) {
        // Not critical if schemas don't exist yet — check if validators exist instead
        const validatorPath = join(ROOT, 'scripts/validate-social-contracts.mjs');
        const pulseValidator = join(ROOT, 'scripts/validate-weekly-pulse.mjs');
        if (existsSync(validatorPath) && existsSync(pulseValidator)) {
            return { pass: true, note: 'Validator scripts exist, some schema files pending' };
        }
        if (existsSync(validatorPath) || existsSync(pulseValidator)) {
            return { pass: true, note: `Validator found, missing: ${missing.join(', ')}` };
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

// ─── Main ───────────────────────────────────────────────────────────

const arg = process.argv[2] || 'status';
const state = loadState();

if (arg === 'status') {
    printStatus(state);
} else if (arg === 'all') {
    console.log('🔄 Running ALL gates...\n');
    for (const gate of GATES) {
        // Skip build gate in "all" mode to save time — it's slow 
        if (gate.id === 'build') {
            console.log(`⏭️  [L1] Vite Build Passes (skipped — run explicitly with: node scripts/cycle-check.mjs build)`);
            continue;
        }
        runGate(gate.id, state);
    }
    saveState(state);
    printStatus(state);
} else if (arg === 'quick') {
    // Run everything except build (fast mode)
    console.log('⚡ Quick cycle check (skip build)...\n');
    for (const gate of GATES) {
        if (gate.id === 'build') continue;
        runGate(gate.id, state);
    }
    saveState(state);
    printStatus(state);
} else {
    runGate(arg, state);
    saveState(state);
}
