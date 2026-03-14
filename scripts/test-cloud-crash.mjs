#!/usr/bin/env node
/**
 * test-cloud-crash.mjs — Diagnostic probe for the "Loud Crash" wrapper
 *
 * Sends a pipeline request to start-pipeline, then polls the progress endpoint
 * every 2 seconds. If the background function crashes, the LOUD CRASH wrapper
 * writes the exact stack trace to the progress store, and this script displays it.
 *
 * Usage:
 *   node scripts/test-cloud-crash.mjs [--local] [--cloud]
 *
 * Default: local (localhost:5173)
 * --cloud: test against sirtrav-a2a-studio.netlify.app
 */

const isCloud = process.argv.includes('--cloud');
const BASE = isCloud
  ? 'https://sirtrav-a2a-studio.netlify.app'
  : 'http://localhost:5173';

const projectId = 'crash-probe';
const runId = `probe-${Date.now()}`;

console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('  CLOUD CRASH DIAGNOSTIC PROBE');
console.log(`  Target: ${BASE}`);
console.log(`  Run: ${projectId}/${runId}`);
console.log('═══════════════════════════════════════════════════════════');
console.log('');

async function main() {
  // Step 1: Start the pipeline
  console.log('[1/3] Sending start-pipeline request...');
  const startRes = await fetch(`${BASE}/.netlify/functions/start-pipeline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer demo' },
    body: JSON.stringify({
      projectId,
      runId,
      platform: 'twitter',
      brief: { mood: 'reflective', story: 'Crash probe test' },
      payload: {
        images: [{ id: 'probe.jpg', url: 'uploads/probe/test.jpg' }],
        publishTargets: ['x'],
      },
    }),
  });

  const startData = await startRes.json();
  if (!startData.ok) {
    console.error('❌ start-pipeline failed:', startData);
    process.exit(1);
  }

  console.log(`[1/3] ✅ Pipeline queued. Background URL: ${startData._debug?.invokeUrl || 'unknown'}`);
  console.log(`[1/3]    Background status: ${startData._debug?.bgStatus || 'unknown'}`);
  console.log('');

  // Step 2: Poll progress every 2 seconds
  console.log('[2/3] Polling progress (every 2s, timeout 120s)...');
  console.log('');

  const MAX_POLLS = 60; // 120 seconds
  let lastEventCount = 0;

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise(r => setTimeout(r, 2000));

    try {
      const progressRes = await fetch(
        `${BASE}/.netlify/functions/progress?projectId=${projectId}&runId=${runId}`
      );
      const progressData = await progressRes.json();
      const events = progressData.events || progressData || [];
      const count = Array.isArray(events) ? events.length : progressData.count || 0;

      if (count > lastEventCount) {
        // New events — print them
        const newEvents = Array.isArray(events) ? events.slice(lastEventCount) : [];
        for (const evt of newEvents) {
          const icon = evt.status === 'failed' ? '❌' : evt.status === 'completed' ? '✅' : '🔄';
          console.log(`  ${icon} [${evt.progress || 0}%] ${evt.agent}: ${evt.message || evt.status}`);

          // Check for FATAL CRASH
          if (evt.message && evt.message.includes('FATAL CRASH')) {
            console.log('');
            console.log('═══════════════════════════════════════════════════════════');
            console.log('  🚨 FATAL CRASH DETECTED — Stack trace from cloud:');
            console.log('═══════════════════════════════════════════════════════════');
            console.log(evt.message);
            console.log('═══════════════════════════════════════════════════════════');
            process.exit(1);
          }
        }
        lastEventCount = count;

        // Check if pipeline is complete
        const lastEvt = Array.isArray(events) ? events[events.length - 1] : null;
        if (lastEvt && (lastEvt.progress >= 100 || lastEvt.status === 'completed')) {
          console.log('');
          console.log('═══════════════════════════════════════════════════════════');
          console.log(`  ✅ PIPELINE COMPLETE — ${count} events in ${(i + 1) * 2}s`);
          console.log('═══════════════════════════════════════════════════════════');
          process.exit(0);
        }
      } else {
        // No new events — show a dot
        process.stdout.write(`  [${(i + 1) * 2}s] waiting (${count} events)...\r`);
      }
    } catch (pollErr) {
      console.error(`  [${(i + 1) * 2}s] Poll error:`, pollErr.message);
    }
  }

  // Timeout
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  ⏰ TIMEOUT — 120s elapsed with no completion');
  console.log(`  Last event count: ${lastEventCount}`);
  if (lastEventCount === 0) {
    console.log('  🔴 ZERO events = background function never executed');
    console.log('     If the LOUD CRASH wrapper was deployed, this means:');
    console.log('     1. The function crashed BEFORE even @netlify/blobs loaded');
    console.log('     2. OR the deploy has not propagated yet');
    console.log('     Check Netlify Dashboard → Functions → run-pipeline-background → Logs');
  } else {
    console.log('  🟡 Some events received — function started but did not finish');
  }
  console.log('═══════════════════════════════════════════════════════════');
  process.exit(1);
}

main().catch(err => {
  console.error('Probe error:', err);
  process.exit(1);
});
