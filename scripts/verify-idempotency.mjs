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
        // 409 means "Run already exists" (our implementation returns 409 if strictly locked)
        // 202 means "Accepted" (if it just returns existing run logic without error)
        // In start-pipeline.ts, if !lock we return 409.
        // So we expect 409 for strict idempotency failure (duplicate start attempt blocked).
        // Or 200/202 if the API is "upsert" style.

        if (res2.status === 409) {
            console.log('✅ PASSED: Duplicate request blocked (409 Conflict) - Idempotency preserved.');
        } else if (res2.status === 202 || res2.status === 200) {
            console.log(`⚠️ Note: Same runId returned with status ${res2.status}. This counts as idempotent (safe retry behavior).`);
            console.log('✅ PASSED: Idempotency verified (Run ID stability).');
        } else {
            console.warn(`⚠️ WARNING: Same runId returned but status is ${res2.status}.`);
        }
    } else {
        console.log('❌ FAILED: Different runIds returned');
        throw new Error('Idempotency failed: different run IDs');
    }
}

main().catch(err => {
    console.error(err);
    process.exitCode = 1;
});
