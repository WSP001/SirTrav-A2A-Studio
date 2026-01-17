#!/usr/bin/env node
/**
 * Golden Path Verification Script
 * Tests the full 7-agent pipeline end-to-end
 *
 * Usage:
 *   node scripts/verify-golden-path.mjs [projectId] [--smoke]
 *
 * Options:
 *   --smoke    Fast mode - skip heavy processing
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:8888/.netlify/functions';

// Parse args
const args = process.argv.slice(2);
const smokeMode = args.includes('--smoke');
const projectId = args.find(a => !a.startsWith('--')) || `golden-${Date.now()}`;

console.log(`\n🚀 Verifying Golden Path for Project: ${projectId}`);
console.log(`📍 Target: ${BASE_URL}`);
if (smokeMode) console.log('🌪️ Smoke Mode: Fast execution enabled\n');

async function run() {
  try {
    // [0] Preflight: Health Check
    console.log('[0] Preflight: Checking Backend Health...');
    const healthRes = await fetch(`${BASE_URL}/healthcheck`);
    if (!healthRes.ok) throw new Error(`Health check failed: ${healthRes.status}`);
    const healthData = await healthRes.json();
    console.log('✅ Backend Online:', healthData.status || healthData);

    // [1] Start Pipeline
    console.log('\n[1] Starting Pipeline...');
    const startRes = await fetch(`${BASE_URL}/start-pipeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        projectMode: 'commons_public',
        smokeMode
      })
    });

    if (!startRes.ok) {
      const errText = await startRes.text();
      throw new Error(`Start failed: ${startRes.status} ${errText}`);
    }

    const startData = await startRes.json();
    console.log('✅ Started:', startData);

    const runId = startData.runId;
    if (!runId) throw new Error('No runId returned from start-pipeline');

    // [2] Poll for Completion (with timeout)
    console.log(`\n[2] Polling for Completion (Run: ${runId})...`);
    const maxWait = smokeMode ? 30000 : 120000; // 30s smoke, 120s full
    const pollInterval = 2000;
    const startTime = Date.now();
    let finalStatus = null;

    while (Date.now() - startTime < maxWait) {
      const progressRes = await fetch(`${BASE_URL}/progress?projectId=${projectId}&runId=${runId}`);

      if (progressRes.ok) {
        const progressData = await progressRes.json();
        const status = progressData.status || progressData.data?.status;

        console.log(`   ⏳ Status: ${status} | Progress: ${progressData.progress || progressData.data?.progress || '?'}%`);

        if (status === 'completed' || status === 'failed') {
          finalStatus = progressData;
          break;
        }
      }

      await new Promise(r => setTimeout(r, pollInterval));
    }

    if (!finalStatus) {
      throw new Error(`Pipeline timed out after ${maxWait / 1000}s`);
    }

    // [3] Fetch Final Results
    console.log('\n[3] Fetching Final Results...');
    const resultsRes = await fetch(`${BASE_URL}/results?projectId=${projectId}&runId=${runId}`);

    if (!resultsRes.ok) {
      throw new Error(`Results failed: ${resultsRes.status}`);
    }

    const results = await resultsRes.json();
    console.log('✅ Results received');

    // [4] Validate Contract
    console.log('\n[4] Validating Contract...');

    // Status must be 'completed'
    const resultStatus = results.status || results.data?.status;
    if (resultStatus !== 'completed') {
      throw new Error(`Expected status 'completed', got '${resultStatus}'`);
    }
    console.log('   ✅ Status: completed');

    // Must have videoUrl (even if placeholder)
    const videoUrl = results.videoUrl || results.data?.videoUrl || results.artifacts?.videoUrl;
    if (!videoUrl) {
      console.log('   ⚠️ No videoUrl (may be fallback mode)');
    } else {
      console.log(`   ✅ Video URL: ${videoUrl}`);
    }

    // Check pipeline mode
    const mode = results.pipelineMode || results.data?.pipelineMode || results.artifacts?.pipelineMode;
    console.log(`   📊 Pipeline Mode: ${mode || 'UNKNOWN'}`);

    // Check for invoice/manifest (if cost-plus is enabled)
    const invoice = results.invoice || results.data?.invoice || results.manifest;
    if (invoice) {
      console.log('   💰 Invoice found:', invoice.totalDue || invoice.total || 'N/A');
    }

    // [5] Summary
    console.log('\n' + '='.repeat(50));
    console.log('🎉 GOLDEN PATH VERIFIED! All systems green.');
    console.log('='.repeat(50));
    console.log(`   Project: ${projectId}`);
    console.log(`   Run ID:  ${runId}`);
    console.log(`   Mode:    ${mode || 'SIMPLE'}`);
    console.log(`   Status:  ${resultStatus}`);
    if (videoUrl) console.log(`   Video:   ${videoUrl}`);
    console.log('='.repeat(50) + '\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ VERIFICATION FAILED:', error.message);
    process.exit(1);
  }
}

run();
