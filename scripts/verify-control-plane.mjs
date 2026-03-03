#!/usr/bin/env node
/**
 * verify-control-plane.mjs — M7 Control Plane Verifier
 *
 * Assertions:
 *   1. GET /control-plane returns 200 with valid JSON
 *   2. pipeline.wired === true, all 7 agents present
 *   3. services array has 4 entries (storage, ai_services, progress, social_publishing)
 *   4. publishers array has 3 entries (x, linkedin, youtube)
 *   5. verdict object has local + cloud + combined colors
 *   6. YouTube url is null in disabled/dry-run mode (No Fake Success)
 *   7. youtube_link_policy.currentUrl === null (invariant)
 *   8. proof object exists with ledgerEntries and metricsFiles
 *
 * Writes: artifacts/public/metrics/control-plane-verify-{timestamp}.json
 *
 * Usage:
 *   node scripts/verify-control-plane.mjs [--base-url URL]
 *   just control-plane-verify
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── Config ───────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const baseUrlArg = args.find((_, i, a) => a[i - 1] === '--base-url');
const BASE_URL = baseUrlArg || 'http://localhost:8888/.netlify/functions';

const results = [];
let exitCode = 0;

function assert(name, condition, detail = '') {
  const status = condition ? 'PASS' : 'FAIL';
  if (!condition) exitCode = 1;
  results.push({ name, status, detail });
  const icon = condition ? '✅' : '❌';
  console.log(`  ${icon} ${name}${detail ? ` — ${detail}` : ''}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('═'.repeat(60));
  console.log('  M7 CONTROL PLANE VERIFIER');
  console.log('═'.repeat(60));
  console.log(`  Target: ${BASE_URL}/control-plane`);
  console.log('');

  // 1. Fetch control-plane
  let data;
  try {
    const res = await fetch(`${BASE_URL}/control-plane`, { signal: AbortSignal.timeout(15000) });
    assert('HTTP 200', res.status === 200, `status=${res.status}`);
    data = await res.json();
    assert('Valid JSON', !!data && typeof data === 'object');
  } catch (err) {
    assert('Reachable', false, err.message);
    writeReport();
    process.exit(1);
  }

  // 2. Version + timestamp
  assert('version present', typeof data.version === 'string', data.version);
  assert('timestamp present', typeof data.timestamp === 'string');

  // 3. Pipeline
  console.log('\n  ── Pipeline ──');
  assert('pipeline.wired', data.pipeline?.wired === true);
  const agentNames = ['intake', 'writer', 'director', 'voice', 'composer', 'editor', 'publisher'];
  for (const name of agentNames) {
    assert(`agent.${name}`, data.pipeline?.agents?.[name] === true);
  }
  assert('cycleGates.passed >= 0', typeof data.pipeline?.cycleGates?.passed === 'number');

  // 4. Services
  console.log('\n  ── Services ──');
  const expectedServices = ['storage', 'ai_services', 'progress', 'social_publishing'];
  assert('4 services', Array.isArray(data.services) && data.services.length >= 4, `got ${data.services?.length}`);
  for (const svc of expectedServices) {
    const found = data.services?.find(s => s.name === svc);
    assert(`service.${svc} exists`, !!found, found?.status || 'missing');
  }

  // 5. Publishers
  console.log('\n  ── Publishers ──');
  assert('3 publishers', Array.isArray(data.publishers) && data.publishers.length === 3, `got ${data.publishers?.length}`);
  for (const platform of ['x', 'linkedin', 'youtube']) {
    const pub = data.publishers?.find(p => p.platform === platform);
    assert(`publisher.${platform} exists`, !!pub, pub ? `mode=${pub.mode}` : 'missing');
    assert(`publisher.${platform}.mode valid`, ['disabled', 'dry-run', 'live'].includes(pub?.mode));
  }

  // 6. YouTube No Fake Success invariant
  console.log('\n  ── YouTube Link Policy (No Fake Success) ──');
  const ytPub = data.publishers?.find(p => p.platform === 'youtube');
  if (ytPub && !ytPub.enabled) {
    // Disabled mode: url MUST be null
    assert('youtube disabled → url is null', ytPub.lastPublish?.url === null, 'No Fake Success enforced');
  } else if (ytPub && ytPub.mode === 'dry-run') {
    // Dry-run mode: url MUST be null
    assert('youtube dry-run → url is null', ytPub.lastPublish?.url === null, 'No Fake Success enforced');
  } else if (ytPub && ytPub.mode === 'live') {
    // Live mode: url can be null (no publish yet) or a real URL
    const url = ytPub.lastPublish?.url;
    const isValid = url === null || (typeof url === 'string' && url.includes('youtube.com/watch'));
    assert('youtube live → url is null or real youtube.com URL', isValid, url || 'no publish yet');
  }
  assert('youtube_link_policy.currentUrl === null', data.youtube_link_policy?.currentUrl === null,
    data.youtube_link_policy?.reason || '');

  // 7. Verdict
  console.log('\n  ── Verdict ──');
  const validColors = ['GREEN', 'YELLOW', 'RED'];
  assert('verdict.local valid', validColors.includes(data.verdict?.local), data.verdict?.local);
  assert('verdict.cloud valid', validColors.includes(data.verdict?.cloud), data.verdict?.cloud);
  assert('verdict.combined valid', validColors.includes(data.verdict?.combined), data.verdict?.combined);
  assert('verdict.reasons array', Array.isArray(data.verdict?.reasons), `${data.verdict?.reasons?.length} reasons`);

  // 8. Proof
  console.log('\n  ── Proof ──');
  assert('proof.metricsFiles array', Array.isArray(data.proof?.metricsFiles));
  assert('proof.ledgerEntries number', typeof data.proof?.ledgerEntries === 'number', `${data.proof?.ledgerEntries} entries`);

  // ── Summary ────────────────────────────────────────────────────────────────
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  console.log('\n' + '═'.repeat(60));
  console.log(`  RESULT: ${failed === 0 ? '✅ ALL PASSED' : '❌ SOME FAILED'}`);
  console.log(`  Passed: ${passed}  Failed: ${failed}  Total: ${results.length}`);
  console.log('═'.repeat(60));
  console.log('');

  writeReport();
  process.exit(exitCode);
}

function writeReport() {
  const metricsDir = resolve(ROOT, 'artifacts', 'public', 'metrics');
  try {
    if (!existsSync(metricsDir)) mkdirSync(metricsDir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const file = resolve(metricsDir, `control-plane-verify-${ts}.json`);
    const report = {
      verifier: 'verify-control-plane.mjs',
      timestamp: new Date().toISOString(),
      target: `${BASE_URL}/control-plane`,
      passed: results.filter(r => r.status === 'PASS').length,
      failed: results.filter(r => r.status === 'FAIL').length,
      total: results.length,
      exitCode,
      results,
    };
    writeFileSync(file, JSON.stringify(report, null, 2));
    console.log(`  📄 Report: ${file}`);
  } catch (err) {
    console.warn(`  ⚠️ Could not write metrics report: ${err.message}`);
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
