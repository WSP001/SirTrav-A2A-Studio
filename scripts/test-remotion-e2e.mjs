#!/usr/bin/env node

/**
 * M9 E2E REMOTION RENDER TEST — Dry-Run Verification
 *
 * Tests the full Remotion render path end-to-end:
 * - Kicks off an IntroSlate render
 * - Polls progress until completion
 * - Reports real render OR fallback (honest No Fake Success)
 * - Never calls social publish endpoints
 *
 * Exit codes:
 *   0 = PASS (real render or fallback acknowledged)
 *   1 = FAIL (error, timeout, fatal exception)
 *
 * RUN: node scripts/test-remotion-e2e.mjs
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import Remotion client functions
const clientPath = resolve(__dirname, '../netlify/functions/lib/remotion-client.ts');
let kickoffRender, waitForRender, isRemotionConfigured;

try {
  // Dynamic import to handle TypeScript files
  const module = await import(`file:///${clientPath.replace(/\\/g, '/')}`);
  kickoffRender = module.kickoffRender;
  waitForRender = module.waitForRender;
  isRemotionConfigured = module.isRemotionConfigured;
} catch (error) {
  console.error('❌ Failed to import remotion-client.ts');
  console.error(error.message);
  process.exit(1);
}

console.log('');
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║           M9 E2E Remotion Render Test                   ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log(`  Time: ${new Date().toISOString()}`);
console.log('');

// Check configuration mode
const configured = isRemotionConfigured();
const mode = configured ? 'real' : 'fallback';

console.log('──────────────────────────────────────────────────────────');
console.log('CONFIGURATION');
console.log('──────────────────────────────────────────────────────────');
console.log(`  Mode:        ${mode.toUpperCase()}`);
console.log(`  Composition: IntroSlate`);
if (!configured) {
  console.log('  ⚠️  Running in fallback mode (Remotion keys not set)');
  console.log('  ℹ️  Set HO-007 keys for real render (see docs/ENV-REMOTION.md)');
}
console.log('');

// Safe test props for IntroSlate
const timestamp = Date.now();
const testProps = {
  projectId: `e2e-test-${timestamp}`,
  title: 'E2E Test Run',
  subtitle: 'Automated Pipeline Verification',
  showDate: true,
  theme: 'default',
};

console.log('──────────────────────────────────────────────────────────');
console.log('RENDER KICKOFF');
console.log('──────────────────────────────────────────────────────────');
console.log(`  Project ID:  ${testProps.projectId}`);
console.log(`  Title:       ${testProps.title}`);
console.log(`  Subtitle:    ${testProps.subtitle}`);
console.log('');

let kickoffResult;
try {
  kickoffResult = await kickoffRender({
    compositionId: 'IntroSlate',
    inputProps: testProps,
    codec: 'h264',
    outName: `e2e-test-${timestamp}.mp4`,
  });
} catch (error) {
  console.error('❌ RENDER KICKOFF FAILED');
  console.error(`  Error: ${error.message}`);
  process.exit(1);
}

if (!kickoffResult.ok) {
  console.error('❌ RENDER KICKOFF FAILED');
  console.error(`  Error: ${kickoffResult.error}`);
  process.exit(1);
}

console.log('✅ Render kicked off successfully');
console.log(`  Render ID:   ${kickoffResult.renderId}`);
console.log(`  Bucket:      ${kickoffResult.bucketName}`);
if (kickoffResult.fallback) {
  console.log('  Fallback:    true (simulated 30s render)');
}
console.log('');

// Wait for render completion
console.log('──────────────────────────────────────────────────────────');
console.log('RENDER PROGRESS');
console.log('──────────────────────────────────────────────────────────');

const timeoutMs = configured ? 300000 : 45000; // 5 min real, 45s fallback
const pollIntervalMs = configured ? 2000 : 1000; // 2s real, 1s fallback
const startTime = Date.now();

let progressResult;
try {
  progressResult = await waitForRender(
    kickoffResult.renderId,
    kickoffResult.bucketName,
    { pollIntervalMs, timeoutMs }
  );
} catch (error) {
  console.error('❌ RENDER POLLING FAILED');
  console.error(`  Error: ${error.message}`);
  process.exit(1);
}

const duration = ((Date.now() - startTime) / 1000).toFixed(1);

console.log('');
console.log('──────────────────────────────────────────────────────────');
console.log('RESULT');
console.log('──────────────────────────────────────────────────────────');

if (!progressResult.ok) {
  console.error('❌ RENDER FAILED');
  console.error(`  Error:       ${progressResult.error}`);
  console.error(`  Duration:    ${duration}s`);
  process.exit(1);
}

if (!progressResult.done) {
  console.error('❌ RENDER TIMEOUT');
  console.error(`  Progress:    ${Math.round((progressResult.overallProgress || 0) * 100)}%`);
  console.error(`  Duration:    ${duration}s`);
  console.error(`  Timeout:     ${timeoutMs / 1000}s`);
  process.exit(1);
}

// Success!
console.log(`  Status:      ${progressResult.done ? '✅ COMPLETE' : '⏳ IN PROGRESS'}`);
console.log(`  Progress:    ${Math.round((progressResult.overallProgress || 0) * 100)}%`);
console.log(`  Phase:       ${progressResult.currentPhase || 'unknown'}`);
console.log(`  Frames:      ${progressResult.framesRendered || 0}`);
console.log(`  Output:      ${progressResult.outputFile || 'N/A'}`);
console.log(`  Duration:    ${duration}s`);

if (progressResult.fallback) {
  console.log('  Mode:        FALLBACK (simulated render)');
  console.log('');
  console.log('🟡 PASS (fallback mode — set HO-007 keys for real render)');
  console.log('');
  console.log('✅ E2E pipeline verified in fallback mode');
  console.log('ℹ️  When Remotion keys are set, this test will render for real');
} else {
  console.log('  Mode:        REAL (Lambda render)');
  console.log('');
  console.log('✅ PASS (real render complete)');
  console.log('');
  console.log('✅ E2E pipeline fully verified with real Remotion Lambda');
}

console.log('');
process.exit(0);
