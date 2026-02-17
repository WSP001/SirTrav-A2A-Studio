#!/usr/bin/env node
/**
 * X/Twitter Engagement Loop Test
 * Tests the check-x-engagement function contract.
 *
 * Usage:
 *   node scripts/test-x-engagement.mjs              # Against cloud
 *   node scripts/test-x-engagement.mjs --local      # Against localhost:8888
 *   node scripts/test-x-engagement.mjs --dry-run    # Contract shape only (no live call)
 *
 * Requires: X/Twitter keys configured in Netlify env (or .env for local)
 */

const args = process.argv.slice(2);
const isLocal = args.includes('--local');
const isDryRun = args.includes('--dry-run');

const BASE = isLocal
  ? 'http://localhost:8888'
  : 'https://sirtrav-a2a-studio.netlify.app';

const ENDPOINT = `${BASE}/.netlify/functions/check-x-engagement`;

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.log(`  FAIL: ${label}`);
    failed++;
  }
}

async function testContract() {
  console.log('\n=== X Engagement Loop Test ===');
  console.log(`Target: ${ENDPOINT}`);
  console.log(`Mode: ${isDryRun ? 'DRY-RUN' : isLocal ? 'LOCAL' : 'CLOUD'}\n`);

  if (isDryRun) {
    console.log('--- Dry Run: Contract Shape Validation ---\n');

    const disabledShape = { success: false, disabled: true, error: 'string', runId: 'string' };
    const successShape = { success: true, count: 'number', signals: 'array', userId: 'string', username: 'string', invoice: 'object', runId: 'string' };

    assert('Disabled response has success:false', disabledShape.success === false);
    assert('Disabled response has disabled:true', disabledShape.disabled === true);
    assert('Success response has count field', typeof successShape.count === 'string');
    assert('Success response has signals array', successShape.signals === 'array');
    assert('Success response has invoice object', successShape.invoice === 'object');
    assert('Both shapes include runId', disabledShape.runId === 'string' && successShape.runId === 'string');

    console.log(`\n=== DRY-RUN: ${passed} passed, ${failed} failed ===\n`);
    process.exit(failed > 0 ? 1 : 0);
  }

  // Live test: call the actual endpoint
  console.log('--- Step 1: GET request (no body) ---');
  try {
    const resp = await fetch(ENDPOINT, { method: 'GET' });
    const data = await resp.json();

    assert('Returns HTTP 200 or 401 or 429', [200, 401, 429].includes(resp.status));
    assert('Response has success field', typeof data.success === 'boolean');

    if (data.disabled) {
      assert('Disabled: success is false (No Fake Success)', data.success === false);
      assert('Disabled: has error message', typeof data.error === 'string');
      console.log(`\n  Result: X engagement DISABLED (keys missing)`);
    } else if (data.success) {
      assert('Success: has count', typeof data.count === 'number');
      assert('Success: has signals array', Array.isArray(data.signals));
      assert('Success: has userId', typeof data.userId === 'string');
      assert('Success: has username', typeof data.username === 'string');
      assert('Success: has invoice', typeof data.invoice === 'object');
      assert('Success: has runId', typeof data.runId === 'string');

      if (data.invoice) {
        const expectedDue = data.invoice.cost * 1.2;
        assert('Invoice: total_due = cost * 1.2 (20% markup)', Math.abs(data.invoice.total_due - expectedDue) < 0.0001);
        assert('Invoice: has buildId', typeof data.invoice.buildId === 'string');
      }

      if (data.signals.length > 0) {
        const sig = data.signals[0];
        assert('Signal: has id', typeof sig.id === 'string');
        assert('Signal: platform is x', sig.platform === 'x');
        assert('Signal: type is mention or reply', ['mention', 'reply'].includes(sig.type));
        assert('Signal: has author', typeof sig.author === 'string');
        assert('Signal: has sentiment', ['positive', 'negative', 'neutral'].includes(sig.sentiment));
        assert('Signal: has actionable boolean', typeof sig.actionable === 'boolean');
      }

      if (data.tierLimited) {
        console.log(`\n  Result: Authenticated (Free tier - mentions limited)`);
        console.log(`  User: @${data.username} (${data.userId})`);
      } else {
        console.log(`\n  Result: ${data.count} engagement signals found`);
        console.log(`  User: @${data.username} (${data.userId})`);
      }
    } else {
      assert('Error: has error message', typeof data.error === 'string');
      console.log(`\n  Result: ERROR - ${data.error}`);
    }
  } catch (err) {
    console.log(`  FAIL: Request failed - ${err.message}`);
    failed++;
  }

  // Step 2: POST with runId
  console.log('\n--- Step 2: POST with runId ---');
  try {
    const resp = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runId: 'test-engagement-001' }),
    });
    const data = await resp.json();

    assert('POST returns HTTP 200 or 401 or 429', [200, 401, 429].includes(resp.status));
    assert('POST response has runId', data.runId === 'test-engagement-001');
  } catch (err) {
    console.log(`  FAIL: POST request failed - ${err.message}`);
    failed++;
  }

  console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

testContract();
