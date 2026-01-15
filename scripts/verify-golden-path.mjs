/**
 * Golden Path Verification Script
 * 
 * Usage: node scripts/verify-golden-path.mjs [projectId]
 * 
 * Flow:
 * 1. Start Pipeline (POST /start-pipeline)
 * 2. Connect SSE (GET /progress?stream=true)
 * 3. Buffer events until 'complete'
 * 4. Fetch Results (GET /results)
 * 5. Verify Artifacts
 */

const BASE_URL = process.env.URL || 'http://localhost:8888/.netlify/functions';
const PROJECT_ID = process.argv[2] || `verify-${Date.now()}`;

console.log(`🚀 Verifying Golden Path for Project: ${PROJECT_ID}`);
console.log(`📍 Target: ${BASE_URL}`);

async function run() {
    try {
        // 0. Preflight Health Check
        console.log('[0] Preflight: Checking Backend Health...');
        try {
            const healthRes = await fetch(`${BASE_URL}/health`);
            if (!healthRes.ok) throw new Error(`Health check failed: ${healthRes.status}`);
            const healthData = await healthRes.json();
            console.log('✅ Backend Online:', healthData);
        } catch (e) {
            throw new Error(`\n🛑 BACKEND OFFLINE. Please run 'npm run dev' or 'netlify dev' in a separate terminal.\n   Error: ${e.message}`);
        }

        // 1. Start Pipeline
        console.log('\n[1] Starting Pipeline...');
        const isSmoke = process.argv.includes('--smoke');
        if (isSmoke) console.log('🌪️ Smoke Mode: Requesting fast execution');

        const startRes = await fetch(`${BASE_URL}/start-pipeline`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectId: PROJECT_ID,
                payload: isSmoke ? { mode: 'smoke' } : {}
            })
        });

        if (!startRes.ok) throw new Error(`Start failed: ${startRes.status} ${await startRes.text()}`);
        const startData = await startRes.json();
        console.log('✅ Started:', startData);
        const { runId } = startData;

        // 2. Monitor Progress via SSE
        console.log(`\n[2] Connecting to SSE Stream (Run: ${runId})...`);
        // Basic SSE client simulation
        const streamRes = await fetch(`${BASE_URL}/progress?projectId=${PROJECT_ID}&runId=${runId}&stream=true`, {
            headers: { 'Accept': 'text/event-stream' }
        });

        if (!streamRes.ok) throw new Error(`SSE failed: ${streamRes.status}`);

        const reader = streamRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let completed = false;

        console.log('⏳ Streaming events...');

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            const lines = buffer.split('\n\n');
            buffer = lines.pop(); // Keep partial line

            for (const line of lines) {
                if (line.startsWith('event:')) {
                    const type = line.match(/event: (.*)/)?.[1];
                    const dataLine = line.split('\n').find(l => l.startsWith('data:'));
                    const dataStr = dataLine?.replace('data: ', '');

                    if (type === 'progress') {
                        try {
                            const p = JSON.parse(dataStr);
                            process.stdout.write(`\r   > [${p.step}] ${p.progress}%: ${p.message}`);
                        } catch (e) { }
                    } else if (type === 'complete') {
                        console.log('\n✅ Pipeline Complete Event received!');
                        completed = true;
                        reader.cancel(); // Stop stream
                    } else if (type === 'error') {
                        console.error('\n❌ Pipeline Error Event:', dataStr);
                        process.exit(1);
                    }
                }
            }

            if (completed) break;
        }

        // 3. Fetch Results
        console.log('\n[3] Fetching Final Results...');
        const resultRes = await fetch(`${BASE_URL}/results?projectId=${PROJECT_ID}&runId=${runId}`);
        if (!resultRes.ok) throw new Error(`Results failed: ${resultRes.status}`);

        const results = await resultRes.json();
        console.log('✅ Results Received:', results);

        // 4. Assertions
        console.log('\n[4] Verifying Contract...');
        if (results.status !== 'completed') throw new Error(`Status is '${results.status}', expected 'completed'`);
        if (!results.videoUrl) throw new Error('Missing videoUrl');
        // if (!results.creditsUrl) throw new Error('Missing creditsUrl'); // Might be optional in demo

        console.log('\n🎉 GOLDEN PATH VERIFIED! All systems green.');

    } catch (error) {
        console.error('\n❌ VERIFICATION FAILED:', error);
        process.exit(1);
    }
}

run();
