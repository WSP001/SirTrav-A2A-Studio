#!/usr/bin/env node
/**
 * sanity-test.mjs — "What Actually Works Right Now"
 *
 * Exercises every testable pipe and wire in SirTrav A2A Studio.
 * Tests cloud endpoints, local cycle gates, agent files, env keys,
 * and optionally social publishers (dry-run only by default).
 *
 * Usage:
 *   node scripts/sanity-test.mjs                  # Cloud mode (default) — skips local env checks
 *   node scripts/sanity-test.mjs --mode cloud      # Explicit cloud mode
 *   node scripts/sanity-test.mjs --local           # Local mode — tests local env keys + localhost
 *   node scripts/sanity-test.mjs --mode local      # Explicit local mode
 *   node scripts/sanity-test.mjs --report          # Write artifacts/reports/sanity-YYYY-MM-DD.md
 *   node scripts/sanity-test.mjs --json            # Machine-readable JSON
 *   just sanity-test                                # via justfile (cloud mode)
 *
 * Exit codes:
 *   0 = all required checks passed (degraded optional services OK)
 *   1 = at least one required check failed
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const args = process.argv.slice(2);
const modeIdx = args.indexOf('--mode');
const modeArg = modeIdx >= 0 ? args[modeIdx + 1] : null;
const USE_LOCAL = args.includes('--local') || modeArg === 'local';
const MODE = USE_LOCAL ? 'local' : 'cloud';
const WRITE_REPORT = args.includes('--report');
const JSON_OUT = args.includes('--json');

const CLOUD_BASE = 'https://sirtrav-a2a-studio.netlify.app/.netlify/functions';
const LOCAL_BASE = 'http://localhost:8888/.netlify/functions';
const BASE_URL = USE_LOCAL ? LOCAL_BASE : CLOUD_BASE;

const results = [];
const startTime = Date.now();

// ── Helpers ──────────────────────────────────────────────────
function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', cwd: ROOT, timeout: 30000, ...opts }).trim();
  } catch { return ''; }
}

function log(icon, msg) {
  if (!JSON_OUT) console.log(`  ${icon} ${msg}`);
}

function section(title) {
  if (!JSON_OUT) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`  ${title}`);
    console.log(`${'─'.repeat(60)}`);
  }
}

function record(name, group, status, detail = '') {
  // status: 'pass' | 'fail' | 'skip' | 'degraded'
  const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : status === 'degraded' ? '🟡' : '⏭️';
  log(icon, `${name}${detail ? ` — ${detail}` : ''}`);
  results.push({ name, group, status, detail, ts: new Date().toISOString() });
}

async function fetchJson(url, opts = {}) {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(15000), ...opts });
    const text = await resp.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* not json */ }
    return { ok: resp.ok, status: resp.status, json, text };
  } catch (e) {
    return { ok: false, status: 0, json: null, text: e.message };
  }
}

// ══════════════════════════════════════════════════════════════
// TEST GROUPS
// ══════════════════════════════════════════════════════════════

// 1. Agent file existence
function testAgentFiles() {
  section('1. AGENT FILES (7-Agent Pipeline)');
  const agents = [
    { num: 1, name: 'Director',    path: 'netlify/functions/curate-media.ts' },
    { num: 2, name: 'Writer',      path: 'netlify/functions/narrate-project.ts' },
    { num: 3, name: 'Voice',       path: 'netlify/functions/text-to-speech.ts' },
    { num: 4, name: 'Composer',    path: 'netlify/functions/generate-music.ts' },
    { num: 5, name: 'Editor',      path: 'netlify/functions/compile-video.ts' },
    { num: 6, name: 'Attribution', path: 'netlify/functions/generate-attribution.ts' },
    { num: 7, name: 'Publisher',   path: 'netlify/functions/publish.ts' },
  ];
  for (const a of agents) {
    const exists = existsSync(resolve(ROOT, a.path));
    record(`Agent ${a.num}: ${a.name}`, 'agents', exists ? 'pass' : 'fail', a.path);
  }

  // Supporting infrastructure
  const infra = [
    'netlify/functions/start-pipeline.ts',
    'netlify/functions/run-pipeline-background.ts',
    'netlify/functions/render-dispatcher.ts',
    'netlify/functions/lib/cost-manifest.ts',
    'netlify/functions/lib/quality-gate.ts',
    'netlify/functions/lib/storage.ts',
    'netlify/functions/lib/progress-store.ts',
  ];
  for (const f of infra) {
    const exists = existsSync(resolve(ROOT, f));
    record(`Infra: ${f.split('/').pop()}`, 'infra', exists ? 'pass' : 'fail', f);
  }
}

// 2. Cloud/Local function health
async function testFunctionEndpoints() {
  section(`2. FUNCTION ENDPOINTS (${USE_LOCAL ? 'local' : 'cloud'})`);

  // Healthcheck
  const hc = await fetchJson(`${BASE_URL}/healthcheck`);
  if (hc.ok && hc.json) {
    record('healthcheck', 'functions', 'pass', `status=${hc.json.status}, v${hc.json.version}`);
    // Report service breakdown
    if (hc.json.services) {
      for (const s of hc.json.services) {
        const st = s.status === 'ok' ? 'pass' : s.status === 'disabled' ? 'degraded' : 'fail';
        record(`  └ ${s.name}`, 'functions', st, s.error || s.status);
      }
    }
    // env snapshot
    if (hc.json.env_snapshot) {
      const snap = hc.json.env_snapshot;
      record('  └ OpenAI key', 'env-cloud', snap.openai ? 'pass' : 'fail');
      record('  └ ElevenLabs key', 'env-cloud', snap.elevenlabs ? 'pass' : 'degraded');
      record('  └ Suno key', 'env-cloud', snap.suno ? 'pass' : 'degraded');
    }
  } else {
    record('healthcheck', 'functions', 'fail', hc.text?.slice(0, 80));
  }

  // Progress (POST + GET)
  const postBody = JSON.stringify({
    projectId: 'sanity-test',
    agent: 'director',
    status: 'started',
    message: 'Sanity test probe',
  });
  const prog = await fetchJson(`${BASE_URL}/progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: postBody,
  });
  record('progress POST', 'functions', prog.ok ? 'pass' : 'fail', `status=${prog.status}`);

  const progGet = await fetchJson(`${BASE_URL}/progress?projectId=sanity-test`);
  record('progress GET', 'functions', progGet.ok ? 'pass' : 'fail', `status=${progGet.status}`);

  // Evals
  const evals = await fetchJson(`${BASE_URL}/evals`);
  record('evals', 'functions', evals.ok ? 'pass' : (evals.status === 405 ? 'pass' : 'fail'), `status=${evals.status}`);

  // MCP gateway
  const mcp = await fetchJson(`${BASE_URL}/mcp`);
  record('mcp', 'functions', mcp.ok || mcp.status === 405 ? 'pass' : 'fail', `status=${mcp.status}`);

  // Narrate-project (Writer agent dry test)
  const narrateBody = JSON.stringify({
    projectId: 'sanity-test',
    theme: 'cinematic',
    mood: 'reflective',
    sceneCount: 2,
  });
  const narrate = await fetchJson(`${BASE_URL}/narrate-project`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: narrateBody,
  });
  if (narrate.ok && narrate.json?.success) {
    record('narrate-project (Writer)', 'pipeline', 'pass',
      `${narrate.json.scenes?.length || 0} scenes, ${narrate.json.wordCount || 0} words, via ${narrate.json.generatedBy}`);
  } else {
    record('narrate-project (Writer)', 'pipeline', 'fail', narrate.text?.slice(0, 80));
  }

  // Generate-attribution
  const attrBody = JSON.stringify({ projectId: 'sanity-test' });
  const attr = await fetchJson(`${BASE_URL}/generate-attribution`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: attrBody,
  });
  record('generate-attribution', 'pipeline',
    attr.ok ? 'pass' : (attr.status === 405 ? 'pass' : 'fail'),
    `status=${attr.status}`);
}

// 3. Cycle gates
function testCycleGates() {
  section('3. CYCLE GATES');
  const raw = run('node scripts/cycle-check.mjs all 2>&1');
  const passM = raw.match(/(\d+)\s+passed/);
  const failM = raw.match(/(\d+)\s+failed/);
  const pendM = raw.match(/(\d+)\s+pending/);
  const passed = passM ? parseInt(passM[1]) : 0;
  const failed = failM ? parseInt(failM[1]) : 0;
  const pending = pendM ? parseInt(pendM[1]) : 0;
  record('Cycle gates', 'gates', failed === 0 ? 'pass' : 'fail',
    `${passed} passed, ${failed} failed, ${pending} pending`);
}

// 4. Build check
function testBuild() {
  section('4. BUILD');
  const buildOut = run('npm run build 2>&1');
  const ok = buildOut.includes('built in') || buildOut.includes('modules transformed');
  record('Vite build', 'build', ok ? 'pass' : 'fail',
    ok ? 'dist/ generated' : buildOut.slice(-100));
}

// 5. Schema validation
function testSchemas() {
  section('5. CONTRACT SCHEMAS');
  const schemasDir = resolve(ROOT, 'artifacts', 'contracts');
  if (!existsSync(schemasDir)) {
    record('Schema directory', 'schemas', 'skip', 'artifacts/contracts not found');
    return;
  }
  const raw = run('node scripts/test-schema-validation.mjs 2>&1');
  const hasChecks = raw.includes('✅') || raw.includes('\u2713');
  const hasFails = raw.includes('❌') || raw.includes('FAIL');
  const exitOk = !hasFails && hasChecks;
  record('JSON schemas', 'schemas', exitOk ? 'pass' : 'fail', exitOk ? 'all schemas valid' : raw.slice(0, 100));
}

// 6. Env key audit — mode-aware (CC-016)
//    Cloud mode: local env keys are informational (skip, not fail)
//    Local mode: required keys fail honestly
function testEnvKeys() {
  section(`6. LOCAL ENV KEYS (mode: ${MODE})`);

  if (MODE === 'cloud') {
    log('⏭️', 'Cloud mode — local env keys are informational only (not blocking)');
  }

  const envPath = resolve(ROOT, '.env');
  const localEnv = {};
  if (existsSync(envPath)) {
    const lines = readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const m = line.match(/^([A-Z_]+)=(.+)/);
      if (m) localEnv[m[1]] = true;
    }
  }

  const keys = [
    { key: 'OPENAI_API_KEY',       req: true,  group: 'core-ai' },
    { key: 'ELEVENLABS_API_KEY',   req: false, group: 'core-ai' },
    { key: 'SUNO_API_KEY',         req: false, group: 'core-ai' },
    { key: 'GEMINI_API_KEY',       req: false, group: 'core-ai' },
    { key: 'LINEAR_API_KEY',       req: false, group: 'infra' },
    { key: 'TWITTER_API_KEY',      req: false, group: 'social' },
    { key: 'TWITTER_ACCESS_TOKEN', req: false, group: 'social' },
    { key: 'LINKEDIN_CLIENT_ID',   req: false, group: 'social' },
    { key: 'LINKEDIN_ACCESS_TOKEN',req: false, group: 'social' },
    { key: 'YOUTUBE_CLIENT_ID',    req: false, group: 'social' },
    { key: 'REMOTION_SERVE_URL',   req: false, group: 'remotion' },
    { key: 'REMOTION_AWS_REGION',  req: false, group: 'remotion' },
  ];

  for (const k of keys) {
    const present = !!localEnv[k.key] || !!process.env[k.key];
    // In cloud mode: required-but-missing → skip (informational), not fail
    // In local mode: required-but-missing → fail (honest)
    let st;
    if (present) {
      st = 'pass';
    } else if (k.req && MODE === 'local') {
      st = 'fail';
    } else if (k.req && MODE === 'cloud') {
      st = 'skip';
    } else {
      st = 'degraded';
    }
    const detail = present ? 'present' : (k.req ? `MISSING (required${MODE === 'cloud' ? ' — skipped in cloud mode' : ''})` : 'missing (optional)');
    record(k.key, `env-${k.group}`, st, detail);
  }
}

// 7. Social publishers dry-run (only test X since it was proven working)
async function testSocialDryRun() {
  section('7. SOCIAL PUBLISHERS (dry-run)');

  // X/Twitter dry-run
  const xScript = resolve(ROOT, 'scripts', 'test-x-publish.mjs');
  if (existsSync(xScript)) {
    const xOut = run('node scripts/test-x-publish.mjs --dry-run 2>&1');
    const xOk = xOut.includes('success') || xOut.includes('PASS') || xOut.includes('dry');
    record('X/Twitter dry-run', 'social', xOk ? 'pass' : 'degraded', xOut.slice(0, 80));
  } else {
    record('X/Twitter dry-run', 'social', 'skip', 'test-x-publish.mjs not found');
  }

  // LinkedIn dry-run
  const liScript = resolve(ROOT, 'scripts', 'test-linkedin-publish.mjs');
  if (existsSync(liScript)) {
    const liOut = run('node scripts/test-linkedin-publish.mjs --dry-run 2>&1');
    const liOk = liOut.includes('DRY-RUN') || liOut.includes('success') || liOut.includes('disabled');
    record('LinkedIn dry-run', 'social', liOk ? 'pass' : 'degraded', liOut.slice(0, 80));
  } else {
    record('LinkedIn dry-run', 'social', 'skip', 'test-linkedin-publish.mjs not found');
  }

  // YouTube dry-run
  const ytScript = resolve(ROOT, 'scripts', 'test-youtube-publish.mjs');
  if (existsSync(ytScript)) {
    const ytOut = run('node scripts/test-youtube-publish.mjs --dry-run 2>&1');
    const ytOk = ytOut.includes('DRY-RUN') || ytOut.includes('success') || ytOut.includes('disabled');
    record('YouTube dry-run', 'social', ytOk ? 'pass' : 'degraded', ytOut.slice(0, 80));
  } else {
    record('YouTube dry-run', 'social', 'skip', 'test-youtube-publish.mjs not found');
  }
}

// ══════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════
async function main() {
  if (!JSON_OUT) {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║  SirTrav A2A Studio — Sanity Test                       ║');
    console.log('║  "What Actually Works Right Now"                        ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log(`  Target: ${BASE_URL}`);
    console.log(`  Mode:   ${MODE}`);
    console.log(`  Time:   ${new Date().toISOString()}`);
  }

  // Run all test groups
  testAgentFiles();
  await testFunctionEndpoints();
  testCycleGates();
  testBuild();
  testSchemas();
  testEnvKeys();
  await testSocialDryRun();

  // ── Summary ──
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const passed  = results.filter(r => r.status === 'pass').length;
  const failed  = results.filter(r => r.status === 'fail').length;
  const degraded = results.filter(r => r.status === 'degraded').length;
  const skipped = results.filter(r => r.status === 'skip').length;
  const total   = results.length;

  if (JSON_OUT) {
    console.log(JSON.stringify({
      summary: { passed, failed, degraded, skipped, total, elapsed_s: parseFloat(elapsed) },
      target: BASE_URL,
      timestamp: new Date().toISOString(),
      results,
    }, null, 2));
  } else {
    section('SUMMARY');
    console.log(`  ✅ Passed:   ${passed}`);
    console.log(`  ❌ Failed:   ${failed}`);
    console.log(`  🟡 Degraded: ${degraded}`);
    console.log(`  ⏭️  Skipped:  ${skipped}`);
    console.log(`  📊 Total:    ${total} checks in ${elapsed}s`);
    console.log('');

    if (failed === 0) {
      console.log('  ✅ ALL REQUIRED CHECKS PASSED — pipeline is operational');
    } else {
      console.log('  ❌ SOME REQUIRED CHECKS FAILED:');
      for (const r of results.filter(r => r.status === 'fail')) {
        console.log(`     - ${r.name}: ${r.detail}`);
      }
    }

    if (degraded > 0) {
      console.log(`\n  🟡 DEGRADED (optional, not blocking):`);
      for (const r of results.filter(r => r.status === 'degraded')) {
        console.log(`     - ${r.name}: ${r.detail}`);
      }
    }
    console.log('');
  }

  // ── Write report file ──
  if (WRITE_REPORT) {
    const date = new Date().toISOString().split('T')[0];
    const dir = resolve(ROOT, 'artifacts', 'reports');
    mkdirSync(dir, { recursive: true });
    const reportPath = resolve(dir, `sanity-${date}.md`);

    const lines = [
      `# Sanity Test Report — ${date}`,
      `> Target: ${BASE_URL}`,
      `> Elapsed: ${elapsed}s`,
      `> Passed: ${passed} | Failed: ${failed} | Degraded: ${degraded} | Skipped: ${skipped}`,
      '',
    ];

    // Group by test group
    const groups = [...new Set(results.map(r => r.group))];
    for (const g of groups) {
      lines.push(`## ${g}`);
      for (const r of results.filter(r => r.group === g)) {
        const icon = r.status === 'pass' ? '✅' : r.status === 'fail' ? '❌' : r.status === 'degraded' ? '🟡' : '⏭️';
        lines.push(`- ${icon} **${r.name}**: ${r.detail || r.status}`);
      }
      lines.push('');
    }

    lines.push('---', `*Generated by \`just sanity-test --report\` — For the Commons Good.*`);
    writeFileSync(reportPath, lines.join('\n'));
    if (!JSON_OUT) console.log(`  📋 Report written: ${reportPath}`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('Sanity test crashed:', e);
  process.exit(1);
});
