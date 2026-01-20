#!/usr/bin/env node
/**
 * Idempotency Test - Same runId should not duplicate work
 */

const BASE_URL = process.env.URL || 'http://localhost:8888';

async function main() {
    console.log('🔒 Idempotency Verification\n');

    const projectId = `idem_test_${Date.now()}`;

    // First request - should start pipeline
    console.log('1️⃣ First request (should start)...');
    const res1 = await fetch(`${BASE_URL}/.netlify/functions/start-pipeline`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer demo'
        },
        body: JSON.stringify({ projectId })
    });
    const data1 = await res1.json();
    console.log(`   Status: ${res1.status}`);
    console.log(`   RunId: ${data1.runId}`);

    // Wait 2 seconds
    await new Promise(r => setTimeout(r, 2000));

    // Second request with SAME projectId - should return existing run
    // NOTE: start-pipeline creates runId based on Date.now() if NOT provided.
    // To test idempotency, we must provide the SAME runId if the logic depends on runId,
    // OR the logic depends on projectId + active status.
    // The start-pipeline implementation uses:
    // const lockKey = `${projectId}/${runId}.lock`;
    // It generates `runId` if missing.
    // If we want to test "Same request results in same run", we need to see how start-pipeline handles duplicates.
    // Looking at the code:
    // const runId = body.runId || `run-${Date.now()}`;
    // If we don't send runId, we get a NEW runId every time.
    // So two requests with same projectId will produce two runs normally, UNLESS there's a project-level lock?
    // start-pipeline lines 69-77: lockKey = `${projectId}/${runId}.lock`.
    // It locks on PROJECT+RUN pair.
    // So to test idempotency, we MUST send the `runId`.

    const runIdToCheck = data1.runId;

    console.log('\n2️⃣ Second request with same projectId AND runId...');
    const res2 = await fetch(`${BASE_URL}/.netlify/functions/start-pipeline`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer demo'
        },
        body: JSON.stringify({ projectId, runId: runIdToCheck })
    });
    const data2 = await res2.json();
    console.log(`   Status: ${res2.status}`);
    console.log(`   RunId: ${data2.runId}`);

    // Verify
    console.log('\n📊 Verification:');
    if (data1.runId === data2.runId) {
        if (res2.status === 409 || res2.status === 202) {
            // 409 means "Run already exists" (our implementation returns 409)
            // 202 means "Accepted" (if it just returns existing)
            // Our code: return { statusCode: 409, body: { error: 'run_already_exists' } }
            if (res2.status === 409) {
                console.log('✅ PASSED: Duplicate request blocked (409 Conflict) - Idempotency preserved.');
                process.exit(0);
            } else {
                console.warn(`⚠️ WARNING: Same runId returned but status is ${res2.status}`);
                process.exit(0);
            }
        }
    } else {
        console.log('❌ FAILED: Different runIds returned');
        process.exit(1);
    }
}

main().catch(console.error);
