/**
 * Contract Enforcement Test Script
 *
 * Tests that publisher endpoints reject invalid payloads
 * and return the correct error shape:
 *   { success: false, error: 'Invalid payload', details: [...] }
 *
 * Usage: node scripts/test-schema-validation.mjs [--live]
 *
 * Default: dry-run (validates schema files exist + shape)
 * --live: hits localhost:8888 endpoints with bad payloads
 *
 * Owner: Claude-Code (Backend)
 * Task: cc-007-validate-publishers
 */

const BASE_URL = process.env.URL || 'http://127.0.0.1:8888/.netlify/functions';
const isLive = process.argv.includes('--live');

let passed = 0;
let failed = 0;
let skipped = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.error(`  ❌ ${message}`);
    failed++;
  }
}

// ─────────────────────────────────────────────
// 1. Schema File Checks (always run)
// ─────────────────────────────────────────────

console.log('📋 Schema File Validation');
console.log('─────────────────────────────────────────');

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// Social post schema
const socialPath = join(root, 'artifacts/contracts/social-post.schema.json');
if (existsSync(socialPath)) {
  const schema = JSON.parse(readFileSync(socialPath, 'utf-8'));
  assert(schema.$schema, 'social-post.schema.json has $schema');
  assert(schema.required?.includes('platform'), 'social-post requires platform');
  assert(schema.required?.includes('projectId'), 'social-post requires projectId');
  assert(schema.required?.includes('content'), 'social-post requires content');
  assert(schema.properties?.media, 'social-post has media[] field');
  assert(schema.properties?.hashtags, 'social-post has hashtags[] field');
  assert(schema.properties?.scheduledTime, 'social-post has scheduledTime field');
  assert(schema.allOf?.length >= 5, 'social-post has platform-specific validations');
} else {
  console.error('  ❌ artifacts/contracts/social-post.schema.json NOT FOUND');
  failed++;
}

console.log('');

// Job costing schema
const costingPath = join(root, 'artifacts/data/job-costing.schema.json');
if (existsSync(costingPath)) {
  const schema = JSON.parse(readFileSync(costingPath, 'utf-8'));
  assert(schema.$schema, 'job-costing.schema.json has $schema');
  assert(schema.properties?.rateCard, 'job-costing has rateCard');
  assert(schema.properties?.projectPhases, 'job-costing has projectPhases');
  assert(schema.properties?.timeTracking, 'job-costing has timeTracking');
  assert(schema.properties?.costPlusMarkup, 'job-costing has costPlusMarkup');
  assert(
    schema.properties?.costPlusMarkup?.properties?.markupRate?.const === 0.20,
    'costPlusMarkup.markupRate is 0.20 (20%)'
  );
} else {
  console.error('  ❌ artifacts/data/job-costing.schema.json NOT FOUND');
  failed++;
}

// ─────────────────────────────────────────────
// 2. Live Endpoint Validation (only with --live)
// ─────────────────────────────────────────────

if (isLive) {
  console.log('');
  console.log('🌐 Live Endpoint Validation');
  console.log('─────────────────────────────────────────');

  const INVALID_PAYLOADS = [
    {
      name: 'publish-x: empty text',
      endpoint: 'publish-x',
      body: { text: '' },
      expectStatus: 400,
    },
    {
      name: 'publish-x: text too long (>280)',
      endpoint: 'publish-x',
      body: { text: 'A'.repeat(281) },
      expectStatus: 400,
    },
    {
      name: 'publish-x: mediaUrls wrong type',
      endpoint: 'publish-x',
      body: { text: 'hello', mediaUrls: 'not-an-array' },
      expectStatus: 400,
    },
    {
      name: 'publish-youtube: missing title',
      endpoint: 'publish-youtube',
      body: { projectId: 'test', videoUrl: 'http://example.com/vid.mp4' },
      expectStatus: 400,
    },
    {
      name: 'publish-youtube: bad privacy',
      endpoint: 'publish-youtube',
      body: { projectId: 'test', videoUrl: 'http://example.com/vid.mp4', title: 'Test', privacy: 'INVALID' },
      expectStatus: 400,
    },
    {
      name: 'publish-linkedin: missing projectId',
      endpoint: 'publish-linkedin',
      body: { videoUrl: 'http://example.com/vid.mp4', title: 'Test' },
      expectStatus: 400,
    },
    {
      name: 'publish-linkedin: bad visibility',
      endpoint: 'publish-linkedin',
      body: { projectId: 'test', videoUrl: 'http://example.com/vid.mp4', title: 'Test', visibility: 'INVALID' },
      expectStatus: 400,
    },
  ];

  for (const test of INVALID_PAYLOADS) {
    try {
      const res = await fetch(`${BASE_URL}/${test.endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(test.body),
      });

      const data = await res.json();

      assert(
        res.status === test.expectStatus,
        `${test.name}: status ${res.status} (expected ${test.expectStatus})`
      );
      assert(
        data.success === false,
        `${test.name}: success=false`
      );
      assert(
        data.error === 'Invalid payload',
        `${test.name}: error='Invalid payload'`
      );
      assert(
        Array.isArray(data.details) && data.details.length > 0,
        `${test.name}: has details array`
      );
    } catch (e) {
      console.error(`  ⚠️  ${test.name}: ${e.message} (server may not be running)`);
      skipped++;
    }
  }
} else {
  console.log('');
  console.log('ℹ️  Run with --live to test endpoints against localhost:8888');
}

// ─────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────

console.log('');
console.log('═══════════════════════════════════════');
console.log(`📊 Results: ${passed} passed | ${failed} failed | ${skipped} skipped`);
console.log('═══════════════════════════════════════');

if (failed > 0) {
  console.error('❌ CONTRACT ENFORCEMENT FAILED');
  process.exit(1);
} else {
  console.log('✅ All contract checks passed');
}
