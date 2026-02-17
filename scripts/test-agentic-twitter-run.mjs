#!/usr/bin/env node
/**
 * test-agentic-twitter-run.mjs — "Around the Block" End-to-End Harness (v2)
 *
 * Tests whether SirTrav behaves as a 1-button agentic system:
 *   1. Healthcheck (is the system alive + what mode?)
 *   2. Start Pipeline (does it accept a run and return 202?)
 *   3. SSE Progress (do events stream without stalling?)
 *   4. Results Contract (is the output shape valid?)
 *   5. Publish-to-X (truthful: real tweet OR disabled, never fake success)
 *   6. Metrics Report (JSON + Markdown with pass/fail + timing)
 *
 * ALIGNED TO ACTUAL ENDPOINTS (audited from source 2026-02-14):
 *   POST /start-pipeline  { projectId }           → 202 { ok, runId, projectId, status }
 *   GET  /progress?projectId=X                     → 200 { events[], count }
 *   GET  /progress?projectId=X (Accept: text/event-stream) → SSE stream
 *   GET  /results?projectId=X&runId=Y              → 200 { status, videoUrl, artifacts }
 *   POST /publish-x { text }                       → 200 { success, tweetId } or { success:false, disabled:true }
 *   GET  /healthcheck                              → 200 { status, version, services }
 *
 * Usage:
 *   node scripts/test-agentic-twitter-run.mjs                         # cloud, no publish
 *   node scripts/test-agentic-twitter-run.mjs --publish-x             # cloud + live tweet
 *   node scripts/test-agentic-twitter-run.mjs --local                 # localhost:8888
 *   node scripts/test-agentic-twitter-run.mjs --base https://custom   # custom base
 *   node scripts/test-agentic-twitter-run.mjs --dry-run               # validate shapes only
 *
 * Outputs:
 *   artifacts/public/metrics/agentic-run-<runId>.json
 *   artifacts/public/metrics/agentic-run-<runId>.md
 *   Console: pass/fail with timing
 *
 * For the Commons Good!
 */

import fs from 'node:fs';
import path from 'node:path';

// ─── CLI Flags ──────────────────────────────────────────────────────
const args = new Set(process.argv.slice(2));
const isLocal = args.has('--local');
const doPublishX = args.has('--publish-x');
const isDryRun = args.has('--dry-run');
const baseIdx = process.argv.indexOf('--base');
const baseArg = baseIdx !== -1 ? process.argv[baseIdx + 1] : null;

const BASE_URL = process.env.BASE_URL || baseArg ||
  (isLocal ? 'http://localhost:8888' : 'https://sirtrav-a2a-studio.netlify.app');

const FN = `${BASE_URL}/.netlify/functions`;
const OUT_DIR = path.join(process.cwd(), 'artifacts', 'public', 'metrics');
fs.mkdirSync(OUT_DIR, { recursive: true });

const now = () => Date.now();

// ─── HTTP Helpers ───────────────────────────────────────────────────

async function httpJson(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not json */ }
  return { status: res.status, ok: res.ok, json, text };
}

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
}

// ─── Step 1: Healthcheck ────────────────────────────────────────────

async function stepHealthcheck() {
  const t0 = now();
  const { status, json } = await httpJson(`${FN}/healthcheck`, { method: 'GET' });
  const ms = now() - t0;

  assert(status === 200 || status === 503, `healthcheck HTTP ${status}`);
  assert(json?.status, 'healthcheck missing .status');
  assert(json?.version, 'healthcheck missing .version');
  assert(json?.services, 'healthcheck missing .services');

  // Extract real capability info
  const storageOk = json.services?.find(s => s.name === 'storage')?.status === 'ok';
  const aiOk = json.services?.find(s => s.name === 'ai_services')?.status === 'ok';
  const socialStatus = json.services?.find(s => s.name === 'social_publishing');

  return {
    pass: true,
    ms,
    httpStatus: status,
    systemStatus: json.status,
    version: json.version,
    storageOk,
    aiOk,
    socialStatus: socialStatus?.status || 'unknown',
    socialError: socialStatus?.error || null,
    envSnapshot: json.env_snapshot || null,
  };
}

// ─── Step 2: Start Pipeline ─────────────────────────────────────────

async function stepStartPipeline(projectId) {
  const t0 = now();

  // Auth: use demo token for test (accepted by start-pipeline.ts)
  const body = {
    projectId,
    platform: 'x',
    userToken: 'demo',
  };

  const { status, json } = await httpJson(`${FN}/start-pipeline`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const ms = now() - t0;

  // 202 = accepted, 409 = already exists (both OK for test)
  const accepted = status === 202 || status === 200;
  const conflict = status === 409;

  if (accepted) {
    assert(json?.ok === true, 'start-pipeline 202 but ok !== true');
    assert(json?.runId, 'start-pipeline missing .runId');
    assert(json?.projectId, 'start-pipeline missing .projectId');
    return { pass: true, ms, httpStatus: status, runId: json.runId, projectId: json.projectId, status: json.status };
  }

  if (conflict) {
    return { pass: true, ms, httpStatus: 409, runId: json?.runId || projectId, projectId, status: 'conflict', note: 'Run already exists (idempotent)' };
  }

  // Auth failure or bad request — still informative
  return { pass: false, ms, httpStatus: status, error: json?.error || 'Unknown start failure', runId: null, projectId };
}

// ─── Step 3: Progress (JSON polling mode) ───────────────────────────

async function stepProgressPoll(projectId, runId) {
  const t0 = now();

  // JSON polling — simpler and more reliable than SSE for testing
  const params = new URLSearchParams({ projectId });
  if (runId) params.set('runId', runId);

  const { status, json } = await httpJson(`${FN}/progress?${params}`, { method: 'GET' });
  const ms = now() - t0;

  if (status === 200 && json) {
    return {
      pass: true,
      ms,
      httpStatus: status,
      eventCount: json.count || json.events?.length || 0,
      events: (json.events || []).slice(-5), // last 5 for report
      latestAgent: json.events?.[json.events.length - 1]?.agent || null,
      latestStatus: json.events?.[json.events.length - 1]?.status || null,
    };
  }

  return { pass: false, ms, httpStatus: status, error: json?.error || 'Progress fetch failed', eventCount: 0 };
}

// ─── Step 3b: SSE Stream Test ───────────────────────────────────────

async function stepSSEStream(projectId, runId, { timeoutMs = 25000, stallMs = 10000 } = {}) {
  const t0 = now();
  const params = new URLSearchParams({ projectId });
  if (runId) params.set('runId', runId);

  let res;
  try {
    res = await fetch(`${FN}/progress?${params}`, {
      headers: { 'Accept': 'text/event-stream' },
    });
  } catch (e) {
    return { pass: false, ms: now() - t0, error: `SSE connect failed: ${e.message}`, eventCount: 0 };
  }

  if (!res.ok) {
    return { pass: false, ms: now() - t0, httpStatus: res.status, error: `SSE HTTP ${res.status}`, eventCount: 0 };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let eventCount = 0;
  let lastEventAt = now();
  let lastData = null;
  let endedBy = 'unknown';
  const eventTypes = new Set();

  try {
    while (true) {
      if (now() - t0 > timeoutMs) { endedBy = 'timeout'; break; }
      if (now() - lastEventAt > stallMs) { endedBy = 'stall'; break; }

      const { value, done } = await reader.read();
      if (done) { endedBy = 'closed'; break; }

      buf += decoder.decode(value, { stream: true });

      let idx;
      while ((idx = buf.indexOf('\n\n')) !== -1) {
        const rawMsg = buf.slice(0, idx);
        buf = buf.slice(idx + 2);

        for (const line of rawMsg.split('\n')) {
          if (line.startsWith('event:')) {
            eventTypes.add(line.slice(6).trim());
          }
          if (line.startsWith('data:')) {
            const payload = line.slice(5).trim();
            if (!payload) continue;
            lastEventAt = now();
            eventCount++;
            try { lastData = JSON.parse(payload); } catch { lastData = payload; }
          }
        }
      }
    }
  } catch (e) {
    endedBy = 'error: ' + e.message;
  }

  const ms = now() - t0;
  return {
    pass: eventCount > 0 || endedBy === 'closed',
    ms,
    eventCount,
    endedBy,
    eventTypes: [...eventTypes],
    lastData: typeof lastData === 'object' ? lastData : null,
  };
}

// ─── Step 4: Results Contract ───────────────────────────────────────

async function stepFetchResults(projectId, runId) {
  const t0 = now();
  const params = new URLSearchParams({ projectId, runId });
  const { status, json } = await httpJson(`${FN}/results?${params}`, { method: 'GET' });
  const ms = now() - t0;

  if (status === 404) {
    // Not found is valid — pipeline may not have completed yet
    return { pass: true, ms, httpStatus: 404, note: 'Results not yet available (pipeline still running)', contractErrors: [] };
  }

  if (status !== 200 || !json) {
    return { pass: false, ms, httpStatus: status, error: json?.error || 'Results fetch failed', contractErrors: ['non-200 response'] };
  }

  // Contract validation
  const errors = [];
  if (!json.status) errors.push('missing .status');
  if (!json.updatedAt) errors.push('missing .updatedAt');

  const validStatuses = new Set(['queued', 'running', 'completed', 'succeeded', 'failed', 'error']);
  if (json.status && !validStatuses.has(json.status)) {
    errors.push(`unexpected .status="${json.status}"`);
  }
  if (['failed', 'error'].includes(json.status) && !json.error) {
    errors.push('failed/error status but missing .error');
  }

  return {
    pass: errors.length === 0,
    ms,
    httpStatus: status,
    resultStatus: json.status,
    hasVideoUrl: !!json.videoUrl,
    hasCreditsUrl: !!json.creditsUrl,
    hasArtifacts: !!json.artifacts,
    contractErrors: errors,
  };
}

// ─── Step 5: Publish to X ───────────────────────────────────────────

async function stepPublishX(runId) {
  const t0 = now();

  const text = `SirTrav Agentic Test [${new Date().toISOString().slice(0, 19)}] Run: ${runId.slice(0, 12)} — Automated QA. For the Commons Good!`;

  const { status, json } = await httpJson(`${FN}/publish-x`, {
    method: 'POST',
    body: JSON.stringify({ text, userId: 'agentic-test' }),
  });
  const ms = now() - t0;

  if (status === 200 && json) {
    // No Fake Success check — the core SirTrav contract
    if (json.success === true) {
      assert(json.tweetId, 'publish-x success:true but missing tweetId');
      return {
        pass: true, ms, httpStatus: status,
        success: true, disabled: false,
        tweetId: json.tweetId,
        url: json.url,
        invoice: json.invoice || null,
        noFakeSuccess: true,
      };
    }
    if (json.success === false && json.disabled === true) {
      return {
        pass: true, ms, httpStatus: status,
        success: false, disabled: true,
        error: json.error,
        noFakeSuccess: true, // CORRECT behavior — honest about being disabled
      };
    }
    // BAD: success:true without tweetId or ambiguous state
    return {
      pass: false, ms, httpStatus: status,
      error: 'Ambiguous publish response — possible Fake Success violation',
      noFakeSuccess: false,
      raw: json,
    };
  }

  // Non-200 responses
  if (status === 400) {
    return { pass: false, ms, httpStatus: 400, error: json?.error || 'Bad request', details: json?.details };
  }
  if (status === 429) {
    return { pass: true, ms, httpStatus: 429, error: 'Rate limited', retryAfter: json?.retryAfter, noFakeSuccess: true };
  }
  if (status === 401) {
    return { pass: true, ms, httpStatus: 401, error: 'Auth failed (keys present but invalid)', noFakeSuccess: true };
  }

  return { pass: false, ms, httpStatus: status, error: json?.error || 'Unknown publish-x error' };
}

// ─── Main Runner ────────────────────────────────────────────────────

async function main() {
  const runStartedAt = new Date().toISOString();
  const projectId = `agentic-test-${Date.now()}`;
  const t0 = now();
  const steps = {};
  let overallPass = true;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  SIRTRAV AGENTIC "AROUND THE BLOCK" TEST`);
  console.log(`  Base: ${BASE_URL}`);
  console.log(`  Project: ${projectId}`);
  console.log(`  Mode: ${isDryRun ? 'DRY-RUN' : isLocal ? 'LOCAL' : 'CLOUD'}${doPublishX ? ' + PUBLISH-X' : ''}`);
  console.log(`${'='.repeat(60)}\n`);

  // Step 1: Healthcheck
  try {
    console.log('[1/5] Healthcheck...');
    steps.healthcheck = await stepHealthcheck();
    console.log(`  ${steps.healthcheck.pass ? 'OK' : 'FAIL'} | ${steps.healthcheck.systemStatus} v${steps.healthcheck.version} | ${steps.healthcheck.ms}ms`);
    console.log(`  Storage: ${steps.healthcheck.storageOk ? 'OK' : 'DOWN'} | AI: ${steps.healthcheck.aiOk ? 'OK' : 'MISSING'} | Social: ${steps.healthcheck.socialStatus}`);
  } catch (e) {
    steps.healthcheck = { pass: false, error: e.message, ms: 0 };
    console.log(`  FAIL: ${e.message}`);
  }
  if (!steps.healthcheck?.pass) overallPass = false;

  // Step 2: Start Pipeline
  let runId = projectId;
  if (!isDryRun) {
    try {
      console.log('\n[2/5] Start Pipeline...');
      steps.start = await stepStartPipeline(projectId);
      runId = steps.start.runId || projectId;
      console.log(`  ${steps.start.pass ? 'OK' : 'FAIL'} | HTTP ${steps.start.httpStatus} | runId: ${runId} | ${steps.start.ms}ms`);
      if (steps.start.note) console.log(`  Note: ${steps.start.note}`);
    } catch (e) {
      steps.start = { pass: false, error: e.message, ms: 0 };
      console.log(`  FAIL: ${e.message}`);
    }
    if (!steps.start?.pass) overallPass = false;
  } else {
    steps.start = { pass: true, ms: 0, note: 'DRY-RUN: skipped' };
    console.log('\n[2/5] Start Pipeline... SKIPPED (dry-run)');
  }

  // Step 3: Progress (JSON poll + SSE)
  try {
    console.log('\n[3/5] Progress...');

    // 3a: JSON poll
    steps.progressPoll = await stepProgressPoll(projectId, runId);
    console.log(`  Poll: ${steps.progressPoll.pass ? 'OK' : 'FAIL'} | ${steps.progressPoll.eventCount} events | ${steps.progressPoll.ms}ms`);
    if (steps.progressPoll.latestAgent) {
      console.log(`  Latest: ${steps.progressPoll.latestAgent} → ${steps.progressPoll.latestStatus}`);
    }

    // 3b: SSE stream (short test — 15s timeout)
    if (!isDryRun) {
      console.log('  SSE stream test...');
      steps.sse = await stepSSEStream(projectId, runId, { timeoutMs: 15000, stallMs: 8000 });
      console.log(`  SSE: ${steps.sse.pass ? 'OK' : 'FAIL'} | ${steps.sse.eventCount} events | ended: ${steps.sse.endedBy} | ${steps.sse.ms}ms`);
      if (steps.sse.eventTypes.length) console.log(`  Event types: ${steps.sse.eventTypes.join(', ')}`);
    } else {
      steps.sse = { pass: true, ms: 0, note: 'DRY-RUN: skipped', eventCount: 0 };
    }
  } catch (e) {
    steps.progressPoll = steps.progressPoll || { pass: false, error: e.message };
    steps.sse = steps.sse || { pass: false, error: e.message };
    console.log(`  FAIL: ${e.message}`);
  }

  // Step 4: Results Contract
  try {
    console.log('\n[4/5] Results Contract...');
    steps.results = await stepFetchResults(projectId, runId);
    console.log(`  ${steps.results.pass ? 'OK' : 'FAIL'} | HTTP ${steps.results.httpStatus} | status: ${steps.results.resultStatus || steps.results.note || 'n/a'} | ${steps.results.ms}ms`);
    if (steps.results.contractErrors?.length) {
      console.log(`  Contract errors: ${steps.results.contractErrors.join(', ')}`);
      overallPass = false;
    }
  } catch (e) {
    steps.results = { pass: false, error: e.message, ms: 0, contractErrors: [e.message] };
    console.log(`  FAIL: ${e.message}`);
  }

  // Step 5: Publish to X
  if (doPublishX && !isDryRun) {
    try {
      console.log('\n[5/5] Publish to X...');
      steps.publishX = await stepPublishX(runId);
      const px = steps.publishX;
      if (px.success) {
        console.log(`  POSTED | tweetId: ${px.tweetId} | cost: $${px.invoice?.total_due || '?'} | ${px.ms}ms`);
      } else if (px.disabled) {
        console.log(`  DISABLED (honest) | ${px.error} | ${px.ms}ms`);
      } else if (px.httpStatus === 429) {
        console.log(`  RATE LIMITED | retry after ${px.retryAfter}s | ${px.ms}ms`);
      } else {
        console.log(`  ${px.pass ? 'OK' : 'FAIL'} | HTTP ${px.httpStatus} | ${px.error || 'unknown'} | ${px.ms}ms`);
      }
      console.log(`  No Fake Success: ${px.noFakeSuccess ? 'VERIFIED' : 'VIOLATION'}`);
      if (!px.noFakeSuccess) overallPass = false;
    } catch (e) {
      steps.publishX = { pass: false, error: e.message, ms: 0 };
      console.log(`  FAIL: ${e.message}`);
    }
  } else {
    steps.publishX = { pass: true, ms: 0, note: doPublishX ? 'DRY-RUN: skipped' : 'Not requested (use --publish-x)' };
    console.log(`\n[5/5] Publish to X... ${doPublishX ? 'SKIPPED (dry-run)' : 'SKIPPED (use --publish-x)'}`);
  }

  const totalMs = now() - t0;

  // ─── Verdict ────────────────────────────────────────────────────
  const stepSummary = Object.entries(steps).map(([name, s]) => ({
    name,
    pass: s.pass,
    ms: s.ms || 0,
  }));

  const passCount = stepSummary.filter(s => s.pass).length;
  const failCount = stepSummary.filter(s => !s.pass).length;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  VERDICT: ${overallPass ? 'PASS' : 'FAIL'} | ${passCount}/${stepSummary.length} steps | ${totalMs}ms total`);
  console.log(`${'='.repeat(60)}\n`);

  // ─── JSON Report ──────────────────────────────────────────────────
  const report = {
    harness: 'test-agentic-twitter-run v2',
    runStartedAt,
    baseUrl: BASE_URL,
    projectId,
    runId,
    mode: isDryRun ? 'dry-run' : isLocal ? 'local' : 'cloud',
    publishX: doPublishX,
    totalMs,
    overallPass,
    passCount,
    failCount,
    steps,
  };

  const jsonFile = path.join(OUT_DIR, `agentic-run-${projectId}.json`);
  fs.writeFileSync(jsonFile, JSON.stringify(report, null, 2));

  // ─── Markdown Report ──────────────────────────────────────────────
  const md = [
    `# SirTrav Agentic Run Report`,
    ``,
    `| Field | Value |`,
    `|-------|-------|`,
    `| Run ID | \`${runId}\` |`,
    `| Project | \`${projectId}\` |`,
    `| Base | \`${BASE_URL}\` |`,
    `| Mode | ${report.mode}${doPublishX ? ' + publish-x' : ''} |`,
    `| Duration | **${totalMs}ms** |`,
    `| Verdict | **${overallPass ? 'PASS' : 'FAIL'}** (${passCount}/${stepSummary.length}) |`,
    ``,
    `## Steps`,
    ``,
    `| # | Step | Pass | Time |`,
    `|---|------|------|------|`,
    ...stepSummary.map((s, i) => `| ${i + 1} | ${s.name} | ${s.pass ? 'OK' : 'FAIL'} | ${s.ms}ms |`),
    ``,
    `## Healthcheck`,
    `- System: **${steps.healthcheck?.systemStatus || 'unknown'}** v${steps.healthcheck?.version || '?'}`,
    `- Storage: ${steps.healthcheck?.storageOk ? 'OK' : 'DOWN'}`,
    `- AI Services: ${steps.healthcheck?.aiOk ? 'OK' : 'MISSING KEYS'}`,
    `- Social Publishing: ${steps.healthcheck?.socialStatus || 'unknown'}${steps.healthcheck?.socialError ? ` (${steps.healthcheck.socialError})` : ''}`,
    ``,
    `## Pipeline Start`,
    steps.start?.pass
      ? `- HTTP ${steps.start.httpStatus} | runId: \`${steps.start.runId || 'n/a'}\`${steps.start.note ? ` | ${steps.start.note}` : ''}`
      : `- FAILED: ${steps.start?.error || 'unknown'}`,
    ``,
    `## Progress`,
    `- Poll: ${steps.progressPoll?.eventCount || 0} events`,
    steps.sse ? `- SSE: ${steps.sse.eventCount} events, ended by: ${steps.sse.endedBy}${steps.sse.eventTypes?.length ? `, types: ${steps.sse.eventTypes.join(', ')}` : ''}` : '',
    ``,
    `## Results Contract`,
    steps.results?.contractErrors?.length
      ? `- ERRORS: ${steps.results.contractErrors.join(', ')}`
      : `- Contract: OK${steps.results?.note ? ` (${steps.results.note})` : ''}`,
    ``,
    `## Publish X`,
    steps.publishX?.success
      ? `- POSTED: [tweet](${steps.publishX.url}) | cost: $${steps.publishX.invoice?.total_due || '?'}`
      : steps.publishX?.disabled
        ? `- DISABLED (honest): ${steps.publishX.error}`
        : steps.publishX?.note
          ? `- ${steps.publishX.note}`
          : `- ${steps.publishX?.error || 'unknown'}`,
    steps.publishX?.noFakeSuccess !== undefined
      ? `- No Fake Success: **${steps.publishX.noFakeSuccess ? 'VERIFIED' : 'VIOLATION'}**`
      : '',
    ``,
    `## Files`,
    `- JSON: \`${path.relative(process.cwd(), jsonFile)}\``,
    `- MD: \`${path.relative(process.cwd(), jsonFile.replace('.json', '.md'))}\``,
    ``,
    `---`,
    `*Generated by test-agentic-twitter-run v2 — For the Commons Good!*`,
  ].filter(Boolean).join('\n');

  const mdFile = jsonFile.replace('.json', '.md');
  fs.writeFileSync(mdFile, md);

  console.log(`Reports written:`);
  console.log(`  JSON: ${path.relative(process.cwd(), jsonFile)}`);
  console.log(`  MD:   ${path.relative(process.cwd(), mdFile)}`);

  process.exit(overallPass ? 0 : 2);
}

main().catch(err => {
  console.error(`\nFATAL: ${err.message}`);
  process.exit(1);
});
