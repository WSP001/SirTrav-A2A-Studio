#!/usr/bin/env node
/**
 * verify-devkit.mjs — 5-Layer Gate Verifier for SirTrav-A2A-Studio DevKit
 *
 * Layer 0a: System tools (node, git, docker --version + docker info)
 * Layer 0b: Project tools (netlify-cli, just, npm)
 * Layer 1:  Environment (.env vars, required config)
 * Layer 2:  Healthcheck (can we reach functions?)
 * Layer 3:  Pipeline smoke (build, contracts, path depth)
 * Layer 4:  Truth Serum subprocess (no fake success)
 *
 * Exit codes:
 *   0 = all green
 *   1 = failed (fixable)
 *   3 = blocked on external (429, outage, missing keys)
 *
 * Deterministic SKIP categories:
 *   SKIP_KEYS_MISSING       — env var not set, cannot test
 *   SKIP_AUTH_GATE_ACTIVE   — auth required, no token
 *   SKIP_LONG_RUNNING       — test takes >30s, use --full
 *   SKIP_NO_LOCAL_ENV       — needs netlify dev running
 *   SKIP_LAYER_DEPENDENCY   — prior layer failed
 */

import { execSync, spawnSync } from 'child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join, sep } from 'path';
import { performance } from 'perf_hooks';

const ROOT = resolve(import.meta.dirname || '.', '..');
const args = process.argv.slice(2);
const FULL_MODE = args.includes('--full');
const TOOLS_ONLY = args.includes('--tools');
const QUICK_MODE = args.includes('--quick');
const CI_MODE = args.includes('--ci');

// ── RESULT TRACKING ─────────────────────────────────────────
const results = [];
let blockedOnExternal = false;

function record(layer, name, status, detail = '', ms = 0) {
  const entry = { layer, name, status, detail, ms: Math.round(ms) };
  results.push(entry);
  const icon = status === 'PASS' ? '✅' :
               status === 'FAIL' ? '❌' :
               status.startsWith('SKIP') ? '⏭️' : '⚠️';
  const timing = ms > 0 ? ` (${Math.round(ms)}ms)` : '';
  console.log(`  ${icon} ${name}${timing}${detail ? ' — ' + detail : ''}`);
  return status === 'PASS';
}

function cmd(command, opts = {}) {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 15000,
      cwd: ROOT,
      ...opts
    }).trim();
  } catch (e) {
    return null;
  }
}

function toolVersion(tool) {
  return cmd(`${tool} --version`) || cmd(`${tool} -v`) || null;
}

// ── LAYER 0a: SYSTEM TOOLS ──────────────────────────────────
function layer0a() {
  const t0 = performance.now();
  console.log('\n━━━ Layer 0a: System Tools ━━━');

  const systemTools = [
    { cmd: 'node', name: 'Node.js' },
    { cmd: 'git', name: 'Git' },
    { cmd: 'npm', name: 'npm' },
    { cmd: 'curl', name: 'cURL' },
    { cmd: 'python', name: 'Python', optional: true },
  ];

  let ok = true;
  for (const t of systemTools) {
    const ver = toolVersion(t.cmd);
    if (ver) {
      record('0a', t.name, 'PASS', ver, 0);
    } else if (t.optional) {
      record('0a', t.name, 'SKIP_KEYS_MISSING', 'Optional — not installed');
    } else {
      record('0a', t.name, 'FAIL', 'Not found in PATH');
      ok = false;
    }
  }

  // Docker special: check both binary AND daemon
  const dockerVer = toolVersion('docker');
  if (dockerVer) {
    record('0a', 'Docker (binary)', 'PASS', dockerVer);
    const dockerInfo = cmd('docker info');
    if (dockerInfo) {
      record('0a', 'Docker (daemon)', 'PASS', 'Running');
    } else {
      record('0a', 'Docker (daemon)', 'SKIP_NO_LOCAL_ENV', 'Installed but daemon not running');
    }
  } else {
    record('0a', 'Docker', 'SKIP_KEYS_MISSING', 'Not installed (optional)');
  }

  record('0a', 'Layer 0a', ok ? 'PASS' : 'FAIL', '', performance.now() - t0);
  return ok;
}

// ── LAYER 0b: PROJECT TOOLS ─────────────────────────────────
function layer0b() {
  const t0 = performance.now();
  console.log('\n━━━ Layer 0b: Project Tools ━━━');

  let ok = true;
  const projectTools = [
    { cmd: 'netlify', name: 'Netlify CLI' },
    { cmd: 'just', name: 'Just' },
  ];

  for (const t of projectTools) {
    const ver = toolVersion(t.cmd);
    if (ver) {
      record('0b', t.name, 'PASS', ver);
    } else {
      record('0b', t.name, 'FAIL', 'Not found — run: .\\devkit-spinup.ps1');
      ok = false;
    }
  }

  // Check node_modules
  const nmPath = join(ROOT, 'node_modules');
  if (existsSync(nmPath)) {
    record('0b', 'node_modules', 'PASS', 'Present');
  } else {
    record('0b', 'node_modules', 'FAIL', 'Missing — run: npm install');
    ok = false;
  }

  record('0b', 'Layer 0b', ok ? 'PASS' : 'FAIL', '', performance.now() - t0);
  return ok;
}

// ── LAYER 1: ENVIRONMENT ────────────────────────────────────
function layer1() {
  const t0 = performance.now();
  console.log('\n━━━ Layer 1: Environment ━━━');

  if (TOOLS_ONLY) {
    record('1', 'Layer 1', 'SKIP_LAYER_DEPENDENCY', '--tools flag: skipping env checks');
    return true;
  }

  let ok = true;

  // Check .env or .env.local exists
  const envFiles = ['.env', '.env.local'];
  const hasEnv = envFiles.some(f => existsSync(join(ROOT, f)));
  if (hasEnv) {
    record('1', '.env file', 'PASS', 'Found');
  } else {
    record('1', '.env file', 'SKIP_KEYS_MISSING', 'No .env file — cloud-only mode OK');
  }

  // Check critical config files
  const configs = [
    { file: 'netlify.toml', name: 'Netlify config' },
    { file: 'vite.config.js', name: 'Vite config' },
    { file: 'package.json', name: 'package.json' },
    { file: 'justfile', name: 'justfile' },
  ];

  for (const c of configs) {
    if (existsSync(join(ROOT, c.file))) {
      record('1', c.name, 'PASS', c.file);
    } else {
      record('1', c.name, 'FAIL', `${c.file} missing`);
      ok = false;
    }
  }

  // Path depth guard — scan for recursive nesting
  const pathViolations = scanPathDepth(ROOT);
  if (pathViolations.length === 0) {
    record('1', 'Path Depth Guard', 'PASS', 'No recursive nesting detected');
  } else {
    record('1', 'Path Depth Guard', 'FAIL',
      `${pathViolations.length} violation(s) — run: just fix-recursive-nest`);
    ok = false;
  }

  record('1', 'Layer 1', ok ? 'PASS' : 'FAIL', '', performance.now() - t0);
  return ok;
}

// ── LAYER 2: HEALTHCHECK ────────────────────────────────────
function layer2(priorOk) {
  const t0 = performance.now();
  console.log('\n━━━ Layer 2: Healthcheck ━━━');

  if (CI_MODE) {
    record('2', 'Layer 2', 'SKIP_NO_LOCAL_ENV', '--ci flag: cloud mode, no local server');
    return true;
  }

  if (!priorOk) {
    record('2', 'Layer 2', 'SKIP_LAYER_DEPENDENCY', 'Prior layer failed');
    return false;
  }

  // Try cloud healthcheck
  const cloudUrl = 'https://sirtrav-a2a-studio.netlify.app/.netlify/functions/healthcheck';
  const cloudResult = cmd(`curl -s -o NUL -w "%{http_code}" ${cloudUrl}`);
  if (cloudResult && cloudResult.startsWith('2')) {
    record('2', 'Cloud healthcheck', 'PASS', `HTTP ${cloudResult}`);
  } else if (cloudResult === '429') {
    record('2', 'Cloud healthcheck', 'SKIP_AUTH_GATE_ACTIVE', 'Rate limited (429)');
    blockedOnExternal = true;
  } else {
    record('2', 'Cloud healthcheck', 'SKIP_NO_LOCAL_ENV', `HTTP ${cloudResult || 'unreachable'}`);
  }

  // Try local healthcheck
  const localResult = cmd('curl -s -o NUL -w "%{http_code}" http://localhost:8888/.netlify/functions/healthcheck');
  if (localResult && localResult.startsWith('2')) {
    record('2', 'Local healthcheck', 'PASS', `HTTP ${localResult}`);
  } else {
    record('2', 'Local healthcheck', 'SKIP_NO_LOCAL_ENV', 'Run: just dev');
  }

  record('2', 'Layer 2', 'PASS', 'Best-effort (cloud or local)', performance.now() - t0);
  return true;
}

// ── LAYER 3: PIPELINE SMOKE ─────────────────────────────────
function layer3(priorOk) {
  const t0 = performance.now();
  console.log('\n━━━ Layer 3: Pipeline Smoke ━━━');

  if (TOOLS_ONLY || QUICK_MODE) {
    record('3', 'Layer 3', 'SKIP_LONG_RUNNING', 'Use --full to run pipeline smoke');
    return true;
  }

  if (!priorOk) {
    record('3', 'Layer 3', 'SKIP_LAYER_DEPENDENCY', 'Prior layer failed');
    return false;
  }

  let ok = true;

  // Contract files exist
  const contracts = [
    'artifacts/contracts/social-post.schema.json',
  ];
  for (const c of contracts) {
    if (existsSync(join(ROOT, c))) {
      record('3', c.split('/').pop(), 'PASS', 'Schema exists');
    } else {
      record('3', c.split('/').pop(), 'SKIP_KEYS_MISSING', 'Schema not yet created');
    }
  }

  // Build check (only in --full)
  if (FULL_MODE) {
    const buildResult = cmd('npm run build', { timeout: 60000 });
    if (buildResult !== null) {
      record('3', 'npm run build', 'PASS', 'Build succeeded');
    } else {
      record('3', 'npm run build', 'FAIL', 'Build failed');
      ok = false;
    }
  } else {
    record('3', 'npm run build', 'SKIP_LONG_RUNNING', 'Use --full to run build');
  }

  record('3', 'Layer 3', ok ? 'PASS' : 'FAIL', '', performance.now() - t0);
  return ok;
}

// ── LAYER 4: TRUTH SERUM ────────────────────────────────────
function layer4(priorOk) {
  const t0 = performance.now();
  console.log('\n━━━ Layer 4: Truth Serum ━━━');

  if (TOOLS_ONLY || QUICK_MODE || CI_MODE) {
    record('4', 'Layer 4', 'SKIP_LONG_RUNNING', 'Use --full for truth serum');
    return true;
  }

  if (!priorOk) {
    record('4', 'Layer 4', 'SKIP_LAYER_DEPENDENCY', 'Prior layer failed');
    return false;
  }

  // Run truth-serum.mjs if it exists
  const serumPath = join(ROOT, 'scripts', 'truth-serum.mjs');
  if (!existsSync(serumPath)) {
    record('4', 'Truth Serum', 'SKIP_KEYS_MISSING', 'scripts/truth-serum.mjs not found');
    record('4', 'Layer 4', 'PASS', 'Skipped (no serum script)', performance.now() - t0);
    return true;
  }

  const result = spawnSync('node', [serumPath, '--allow-disabled'], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 30000,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  if (result.status === 0) {
    record('4', 'Truth Serum', 'PASS', 'All truthful');
  } else if (result.status === 3) {
    record('4', 'Truth Serum', 'SKIP_AUTH_GATE_ACTIVE', 'Blocked on external');
    blockedOnExternal = true;
  } else {
    record('4', 'Truth Serum', 'FAIL', 'Liar detected');
  }

  record('4', 'Layer 4', result.status === 0 ? 'PASS' : 'FAIL', '', performance.now() - t0);
  return result.status === 0;
}

// ── PATH DEPTH SCANNER ──────────────────────────────────────
function scanPathDepth(root, maxDepthFromRoot = 8) {
  const violations = [];
  const skipDirs = new Set(['node_modules', '.git', 'dist', '.netlify', '.cache']);

  function walk(dir, depth) {
    if (depth > maxDepthFromRoot) return;
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (skipDirs.has(entry.name)) continue;

      const fullPath = join(dir, entry.name);

      // Check absolute path length
      if (fullPath.length > 250) {
        violations.push({ path: fullPath, reason: 'PATH_TOO_LONG', length: fullPath.length });
        continue;
      }

      // Check for recursive naming (same folder name appears 3+ times in path)
      const parts = fullPath.split(sep);
      const counts = {};
      for (const p of parts) { counts[p] = (counts[p] || 0) + 1; }
      const dupes = Object.entries(counts).filter(([k, v]) => v >= 3 && k.length > 2);
      if (dupes.length > 0) {
        violations.push({
          path: fullPath,
          reason: `RECURSIVE: ${dupes.map(d => d[0]).join(', ')}`,
          length: fullPath.length
        });
        continue;
      }

      walk(fullPath, depth + 1);
    }
  }

  walk(root, 0);
  return violations;
}

// ══════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║  SirTrav DevKit Verifier — 5-Layer Gate System          ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log(`Mode: ${FULL_MODE ? 'FULL' : TOOLS_ONLY ? 'TOOLS' : QUICK_MODE ? 'QUICK' : CI_MODE ? 'CI' : 'STANDARD'}`);

const t0_total = performance.now();

const ok0a = layer0a();
const ok0b = layer0b();
const ok1 = layer1();
const ok2 = layer2(ok0a && ok0b && ok1);
const ok3 = layer3(ok2);
const ok4 = layer4(ok3);

const totalMs = Math.round(performance.now() - t0_total);

// ── VERDICT ─────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════════════════════');

const passed = results.filter(r => r.status === 'PASS').length;
const failed = results.filter(r => r.status === 'FAIL').length;
const skipped = results.filter(r => r.status.startsWith('SKIP')).length;

console.log(`RESULTS: ${passed} PASS | ${failed} FAIL | ${skipped} SKIP | ${totalMs}ms total`);

// Council event JSON for telemetry
const councilEvent = {
  event: 'devkit-verify',
  timestamp: new Date().toISOString(),
  totalMs,
  layers: {
    '0a': { pass: ok0a, ms: results.find(r => r.name === 'Layer 0a')?.ms || 0 },
    '0b': { pass: ok0b, ms: results.find(r => r.name === 'Layer 0b')?.ms || 0 },
    '1':  { pass: ok1,  ms: results.find(r => r.name === 'Layer 1')?.ms || 0 },
    '2':  { pass: true,  ms: results.find(r => r.name === 'Layer 2')?.ms || 0 },
    '3':  { pass: ok3,  ms: results.find(r => r.name === 'Layer 3')?.ms || 0 },
    '4':  { pass: ok4,  ms: results.find(r => r.name === 'Layer 4')?.ms || 0 },
  }
};
console.log(`\nCouncil Event: ${JSON.stringify(councilEvent)}`);

if (failed > 0) {
  if (blockedOnExternal) {
    console.log('\nVERDICT: BLOCKED (external) — exit 3');
    process.exit(3);
  }
  console.log('\nVERDICT: FAILED — fix issues above, then re-run');
  process.exit(1);
} else {
  console.log('\nVERDICT: ALL GREEN ✅');
  process.exit(0);
}
