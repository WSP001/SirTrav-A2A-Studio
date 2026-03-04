#!/usr/bin/env node

/**
 * M9 READINESS CHECK — Pre-flight for E2E Video Production
 * 
 * Checks all prerequisites needed before M9 can go live:
 * - Remotion Lambda env vars (REMOTION_SERVE_URL, REMOTION_FUNCTION_NAME)
 * - AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
 * - Voice agent key (ELEVENLABS_API_KEY)
 * - @remotion/lambda package installed
 * - Remotion compositions registered
 * - render-dispatcher.ts + remotion-client.ts present
 * - compile-video.ts CC-019 graceful degradation in place
 * 
 * RUN: node scripts/m9-readiness-check.mjs [--cloud]
 */

import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

const args = process.argv.slice(2);
const isCloud = args.includes('--cloud');

let passed = 0;
let failed = 0;
let warnings = 0;

function check(label, ok, detail) {
  if (ok) {
    console.log(`  ✅ ${label}${detail ? ` — ${detail}` : ''}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

function warn(label, detail) {
  console.log(`  🟡 ${label}${detail ? ` — ${detail}` : ''}`);
  warnings++;
}

console.log('');
console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║         M9: E2E Video Production — Readiness Check       ║');
console.log('╚═══════════════════════════════════════════════════════════╝');
console.log(`  Mode: ${isCloud ? 'cloud' : 'local'}`);
console.log(`  Time: ${new Date().toISOString()}`);
console.log('');

// ──────────────────────────────────────────────────────────
// 1. CORE FILES
// ──────────────────────────────────────────────────────────
console.log('──────────────────────────────────────────────────────────');
console.log('1. CORE FILES (Remotion Pipeline)');
console.log('──────────────────────────────────────────────────────────');

const coreFiles = [
  { path: 'netlify/functions/compile-video.ts', label: 'Editor Agent (compile-video.ts)' },
  { path: 'netlify/functions/render-dispatcher.ts', label: 'Render Dispatcher' },
  { path: 'netlify/functions/lib/remotion-client.ts', label: 'Remotion Client wrapper' },
  { path: 'src/remotion/Root.tsx', label: 'Remotion Root (composition registry)' },
  { path: 'src/remotion/index.ts', label: 'Remotion entry point' },
  { path: 'src/remotion/compositions/MainComposition.tsx', label: 'MainComposition' },
  { path: 'src/remotion/compositions/IntroSlate', label: 'IntroSlate composition' },
  { path: 'src/remotion/compositions/EmblemComposition', label: 'EmblemComposition' },
];

for (const f of coreFiles) {
  check(f.label, existsSync(resolve(ROOT, f.path)), f.path);
}

// ──────────────────────────────────────────────────────────
// 2. CC-019 GRACEFUL DEGRADATION
// ──────────────────────────────────────────────────────────
console.log('');
console.log('──────────────────────────────────────────────────────────');
console.log('2. CC-019 GRACEFUL DEGRADATION');
console.log('──────────────────────────────────────────────────────────');

const compileVideo = readFileSync(resolve(ROOT, 'netlify/functions/compile-video.ts'), 'utf8');
check('CC-019 degradation check', compileVideo.includes('hasRemotionKeys') && compileVideo.includes("status: 'degraded'"), 'Returns degraded placeholder when keys missing');
check('Render Dispatcher call', compileVideo.includes('render-dispatcher'), 'compile-video.ts calls render-dispatcher');

const remotionClient = readFileSync(resolve(ROOT, 'netlify/functions/lib/remotion-client.ts'), 'utf8');
check('isRemotionConfigured()', remotionClient.includes('isRemotionConfigured'), 'Config check function exists');
check('Fallback mode', remotionClient.includes('fallback-'), 'Graceful fallback with fake renderId');
check('Progress polling', remotionClient.includes('getProgress'), 'getProgress() for render polling');

// ──────────────────────────────────────────────────────────
// 3. PACKAGE DEPENDENCIES
// ──────────────────────────────────────────────────────────
console.log('');
console.log('──────────────────────────────────────────────────────────');
console.log('3. PACKAGE DEPENDENCIES');
console.log('──────────────────────────────────────────────────────────');

const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));
const deps = { ...pkg.dependencies, ...pkg.devDependencies };

check('remotion', !!deps['remotion'], deps['remotion'] || 'MISSING');
check('@remotion/cli', !!deps['@remotion/cli'], deps['@remotion/cli'] || 'MISSING');

const hasLambdaPkg = !!deps['@remotion/lambda'];
if (hasLambdaPkg) {
  check('@remotion/lambda', true, deps['@remotion/lambda']);
} else {
  warn('@remotion/lambda', 'NOT in package.json — dynamic import handles this, but install for real renders');
}

const hasLambdaInstalled = existsSync(resolve(ROOT, 'node_modules/@remotion/lambda'));
if (hasLambdaInstalled) {
  check('@remotion/lambda (installed)', true, 'Found in node_modules');
} else {
  warn('@remotion/lambda (installed)', 'NOT in node_modules — run: npm install @remotion/lambda');
}

// ──────────────────────────────────────────────────────────
// 4. ENVIRONMENT VARIABLES (M9 critical)
// ──────────────────────────────────────────────────────────
console.log('');
console.log('──────────────────────────────────────────────────────────');
console.log('4. ENVIRONMENT VARIABLES (M9 Critical)');
console.log('──────────────────────────────────────────────────────────');

const m9EnvVars = [
  { key: 'REMOTION_SERVE_URL', label: 'Remotion bundle URL', required: true },
  { key: 'REMOTION_FUNCTION_NAME', label: 'Lambda function name', required: true },
  { key: 'REMOTION_REGION', label: 'AWS region', required: false, default: 'us-east-1' },
  { key: 'AWS_ACCESS_KEY_ID', label: 'AWS access key', required: true },
  { key: 'AWS_SECRET_ACCESS_KEY', label: 'AWS secret key', required: true },
  { key: 'ELEVENLABS_API_KEY', label: 'Voice agent (ElevenLabs)', required: false },
  { key: 'GEMINI_API_KEY', label: 'Writer agent (Gemini)', required: true },
  { key: 'OPENAI_API_KEY', label: 'Vision AI (OpenAI)', required: false },
];

let m9KeysPresent = 0;
let m9KeysRequired = 0;

for (const v of m9EnvVars) {
  const present = !!process.env[v.key];
  if (v.required) m9KeysRequired++;
  if (present && v.required) m9KeysPresent++;

  if (present) {
    const masked = process.env[v.key].substring(0, 4) + '****';
    check(v.label, true, `${v.key} = ${masked}`);
  } else if (v.required) {
    check(v.label, false, `${v.key} — REQUIRED for M9`);
  } else {
    warn(v.label, `${v.key} — optional${v.default ? ` (default: ${v.default})` : ''}`);
  }
}

// ──────────────────────────────────────────────────────────
// 5. REMOTION COMPOSITIONS REGISTERED
// ──────────────────────────────────────────────────────────
console.log('');
console.log('──────────────────────────────────────────────────────────');
console.log('5. REMOTION COMPOSITIONS');
console.log('──────────────────────────────────────────────────────────');

const rootTsx = readFileSync(resolve(ROOT, 'src/remotion/Root.tsx'), 'utf8');
const compositionIds = [...rootTsx.matchAll(/id="([^"]+)"/g)].map(m => m[1]);
check('Compositions registered', compositionIds.length >= 3, `${compositionIds.length} found: ${compositionIds.join(', ')}`);

// Check that render-dispatcher references a valid composition
const dispatcher = readFileSync(resolve(ROOT, 'netlify/functions/render-dispatcher.ts'), 'utf8');
check('Dispatcher accepts compositionId', dispatcher.includes('compositionId'), 'Dynamic composition selection');

// ──────────────────────────────────────────────────────────
// 6. PIPELINE INTEGRATION
// ──────────────────────────────────────────────────────────
console.log('');
console.log('──────────────────────────────────────────────────────────');
console.log('6. PIPELINE INTEGRATION');
console.log('──────────────────────────────────────────────────────────');

const pipelineFiles = [
  { path: 'netlify/functions/start-pipeline.ts', label: 'start-pipeline.ts' },
  { path: 'netlify/functions/run-pipeline-background.ts', label: 'run-pipeline-background.ts' },
  { path: 'netlify/functions/curate-media.ts', label: 'Agent 1: Director' },
  { path: 'netlify/functions/narrate-project.ts', label: 'Agent 2: Writer' },
  { path: 'netlify/functions/text-to-speech.ts', label: 'Agent 3: Voice' },
  { path: 'netlify/functions/generate-music.ts', label: 'Agent 4: Composer' },
  { path: 'netlify/functions/compile-video.ts', label: 'Agent 5: Editor' },
  { path: 'netlify/functions/generate-attribution.ts', label: 'Agent 6: Attribution' },
  { path: 'netlify/functions/publish.ts', label: 'Agent 7: Publisher' },
];

for (const f of pipelineFiles) {
  check(f.label, existsSync(resolve(ROOT, f.path)));
}

// Check publishTargets threading (M8)
const startPipeline = readFileSync(resolve(ROOT, 'netlify/functions/start-pipeline.ts'), 'utf8');
check('publishTargets (M8)', startPipeline.includes('publishTargets'), 'Threaded in start-pipeline.ts');

// ──────────────────────────────────────────────────────────
// SUMMARY
// ──────────────────────────────────────────────────────────
console.log('');
console.log('──────────────────────────────────────────────────────────');
console.log('SUMMARY');
console.log('──────────────────────────────────────────────────────────');
console.log(`  ✅ Passed:   ${passed}`);
console.log(`  ❌ Failed:   ${failed}`);
console.log(`  🟡 Warnings: ${warnings}`);
console.log(`  📊 Total:    ${passed + failed + warnings} checks`);
console.log('');

if (m9KeysPresent === m9KeysRequired) {
  console.log('  🟢 M9 ENV KEYS: ALL PRESENT — ready for real render');
} else {
  console.log(`  🔴 M9 ENV KEYS: ${m9KeysPresent}/${m9KeysRequired} required keys present`);
  console.log('     Human-Ops HO-007: Set Remotion Lambda AWS keys to unblock M9');
}

console.log('');

if (failed === 0) {
  console.log('  ✅ CODE READY — all files, compositions, and architecture in place');
  console.log('  ⏳ BLOCKED ON: AWS keys (HO-007) to go from degraded → real rendering');
} else {
  console.log(`  ❌ ${failed} check(s) FAILED — fix before proceeding with M9`);
}

console.log('');
process.exit(failed > 0 ? 1 : 0);
