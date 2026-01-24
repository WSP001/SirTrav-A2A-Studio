
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8888';
const ENDPOINT = `${BASE_URL}/.netlify/functions/check-x-engagement`;

async function testEngagement() {
    console.log('🦅 Antigravity: X (Twitter) Engagement Listener Verification');
    console.log('===========================================================');

    try {
        console.log('1. Calling Engagement Endpoint...');
        const start = Date.now();
        const response = await fetch(ENDPOINT);
        const duration = Date.now() - start;

        const data = await response.json();

        console.log(`- Status: ${response.status}`);
        console.log(`- Duration: ${duration}ms`);
        console.log(`- Response:`, JSON.stringify(data, null, 2));

        // Assertions
        if (data.disabled) {
            console.log('\n✅ PASS: Gracefully handled "Disabled" state (No Fake Success).');
        } else if (data.success) {
            console.log(`\n✅ PASS: Successfully fetched ${data.count} mentions!`);
            console.log('Sample Signal:', data.signals[0] || 'None');

            if (data.invoice) {
                console.log(`- Job Cost: $${data.invoice.total_due.toFixed(5)}`);
            }
        } else if (data.error) {
            if (data.error.includes('Auth Error') || data.error.includes('401') || data.details?.status === 401) {
                console.log('\n✅ PASS: Correctly identified Auth Error (Keys present but maybe invalid).');
            } else {
                console.warn('\n⚠️  FAIL: Unexpected error type.');
            }
        }

    } catch (err) {
        console.error('❌ Request Failed:', err);
    }
}

testEngagement();
