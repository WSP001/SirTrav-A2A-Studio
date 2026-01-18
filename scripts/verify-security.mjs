const BASE_URL = process.env.URL || 'http://127.0.0.1:8888/.netlify/functions';
const PROJECT_ID = `hack-attempt-${Date.now()}`;

async function run() {
    console.log('🕵️ Security Audit: Testing Secure Handshake...');

    // Test 1: No Token
    console.log('   [1] Attempting access without token...');
    const res1 = await fetch(`${BASE_URL}/start-pipeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: PROJECT_ID })
    });

    if (res1.status === 403) {
        console.log('   ✅ PASS: Non-token request blocked (403 Forbidden).');
    } else {
        console.error(`   ❌ FAIL: Request allowed or wrong status. Got: ${res1.status}`);
        process.exit(1);
    }

    // Test 2: Invalid Token
    console.log('   [2] Attempting access with invalid token...');
    const res2 = await fetch(`${BASE_URL}/start-pipeline`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer invalid_token_123'
        },
        body: JSON.stringify({ projectId: PROJECT_ID })
    });

    if (res2.status === 403) {
        console.log('   ✅ PASS: Invalid token blocked (403 Forbidden).');
    } else {
        console.error(`   ❌ FAIL: Invalid token allowed. Got: ${res2.status}`);
        process.exit(1);
    }

    // Test 3: Valid Token (simulate legitimate user)
    console.log('   [3] Attempting access with VALID token (sk_live_...)...');
    const res3 = await fetch(`${BASE_URL}/start-pipeline`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer sk_live_test_key'
        },
        body: JSON.stringify({ projectId: PROJECT_ID })
    });

    if (res3.status === 202) {
        console.log('   ✅ PASS: Valid token accepted (202 Accepted).');
    } else {
        console.error(`   ❌ FAIL: Valid token rejected. Got: ${res3.status}`);
        process.exit(1);
    }

    console.log('\n🔒 SECURITY AUDIT PASSED: The Handshake is Secure.');
}

run();
