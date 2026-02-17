#!/usr/bin/env node
/**
 * Invoice Generation Script (CC-004 / Task 0005)
 * Generates .invoice.json alongside rendered videos with Cost Plus 20% markup.
 *
 * Usage:
 *   node scripts/generate-invoice.mjs <video-path>
 *   node scripts/generate-invoice.mjs <video-path> --costs '{"openai": 0.15, "elevenlabs": 0.10}'
 *   node scripts/generate-invoice.mjs <video-path> --costs-file costs.json
 *   node scripts/generate-invoice.mjs --demo   # Generate example invoice
 *
 * Output: <video-path>.invoice.json
 */

import { existsSync, statSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname, join } from 'path';

const MARKUP_RATE = 0.20; // 20% Commons Good markup

const args = process.argv.slice(2);

function usage() {
  console.log('Usage: node scripts/generate-invoice.mjs <video-path> [options]');
  console.log('');
  console.log('Options:');
  console.log('  --costs \'{"openai": 0.15}\'   Inline JSON of API costs');
  console.log('  --costs-file <path>          Read costs from a JSON file');
  console.log('  --demo                       Generate example invoice');
  console.log('  --project-id <id>            Associate with a project');
  console.log('  --run-id <id>                Associate with a pipeline run');
  process.exit(1);
}

// Parse arguments
const isDemo = args.includes('--demo');
let videoPath = null;
let costsJson = null;
let costsFile = null;
let projectId = null;
let runId = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--costs' && args[i + 1]) {
    costsJson = args[++i];
  } else if (args[i] === '--costs-file' && args[i + 1]) {
    costsFile = args[++i];
  } else if (args[i] === '--project-id' && args[i + 1]) {
    projectId = args[++i];
  } else if (args[i] === '--run-id' && args[i + 1]) {
    runId = args[++i];
  } else if (args[i] === '--demo') {
    // handled above
  } else if (!videoPath) {
    videoPath = args[i];
  }
}

if (!isDemo && !videoPath) {
  usage();
}

function generateInvoice(filePath, apiCosts) {
  let sizeMb = 0;
  let fileExists = false;

  if (filePath && existsSync(filePath)) {
    const stats = statSync(filePath);
    sizeMb = parseFloat((stats.size / (1024 * 1024)).toFixed(2));
    fileExists = true;
  }

  const baseCost = Object.values(apiCosts).reduce((sum, c) => sum + c, 0);
  const markup = parseFloat((baseCost * MARKUP_RATE).toFixed(6));
  const totalCost = parseFloat((baseCost + markup).toFixed(6));

  return {
    videoPath: filePath || 'demo-video.mp4',
    videoExists: fileExists,
    sizeMb,
    projectId: projectId || 'unknown',
    runId: runId || 'unknown',
    apiCosts,
    baseCost: parseFloat(baseCost.toFixed(6)),
    markupRate: MARKUP_RATE,
    markup,
    totalCost,
    model: 'Cost Plus 20% Justified',
    lineItems: Object.entries(apiCosts).map(([service, cost]) => ({
      service,
      cost,
      markup: parseFloat((cost * MARKUP_RATE).toFixed(6)),
      total: parseFloat((cost * (1 + MARKUP_RATE)).toFixed(6)),
    })),
    generatedAt: new Date().toISOString(),
    buildId: process.env.BUILD_ID || 'local',
  };
}

// Load costs
let apiCosts = {};

if (costsJson) {
  try {
    apiCosts = JSON.parse(costsJson);
  } catch (e) {
    console.error(`Error parsing --costs JSON: ${e.message}`);
    process.exit(1);
  }
} else if (costsFile) {
  if (!existsSync(costsFile)) {
    console.error(`Costs file not found: ${costsFile}`);
    process.exit(1);
  }
  try {
    apiCosts = JSON.parse(readFileSync(costsFile, 'utf-8'));
  } catch (e) {
    console.error(`Error reading costs file: ${e.message}`);
    process.exit(1);
  }
}

// Demo mode: generate example
if (isDemo) {
  apiCosts = {
    openai_vision: 0.025,
    openai_gpt4: 0.08,
    elevenlabs_tts: 0.10,
    suno_music: 0.05,
    remotion_lambda: 0.02,
  };
  videoPath = videoPath || 'demo-video.mp4';
  projectId = projectId || 'demo-project-001';
  runId = runId || 'demo-run-001';
}

// If no costs provided and not demo, note it
if (Object.keys(apiCosts).length === 0) {
  console.log('Note: No API costs provided. Invoice will show $0.00 base cost.');
  console.log('  Use --costs \'{"openai": 0.15}\' to include API costs.\n');
}

// Generate
const invoice = generateInvoice(videoPath, apiCosts);

// Write output
const outputPath = videoPath
  ? `${resolve(videoPath)}.invoice.json`
  : join(process.cwd(), 'artifacts', 'data', 'demo.invoice.json');

const outputDir = dirname(outputPath);
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

writeFileSync(outputPath, JSON.stringify(invoice, null, 2));

// Print summary
console.log('=== Invoice Generated ===');
console.log(`  Video:      ${invoice.videoPath}`);
console.log(`  Size:       ${invoice.sizeMb} MB`);
console.log(`  Project:    ${invoice.projectId}`);
console.log(`  Run:        ${invoice.runId}`);
console.log('');
console.log('  Cost Breakdown:');
for (const item of invoice.lineItems) {
  console.log(`    ${item.service.padEnd(20)} $${item.cost.toFixed(4)} + $${item.markup.toFixed(4)} = $${item.total.toFixed(4)}`);
}
console.log('  ----------------------------------------');
console.log(`  Base Cost:          $${invoice.baseCost.toFixed(4)}`);
console.log(`  Markup (20%):       $${invoice.markup.toFixed(4)}`);
console.log(`  Total Due:          $${invoice.totalCost.toFixed(4)}`);
console.log(`  Model:              ${invoice.model}`);
console.log('');
console.log(`  Output: ${outputPath}`);
