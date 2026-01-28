import fetch from 'node-fetch';

const BASE_URL = process.env.URL || 'http://localhost:8888';
const ENDPOINT = `${BASE_URL}/.netlify/functions/narrate-project`;

async function runSmokeTest() {
    console.log(`🚬 Smoking Agent: Writer (${ENDPOINT})`);

    const payload = {
        projectId: `smoke-${Date.now()}`,
        theme: 'adventure',
        mood: 'exciting',
        sceneCount: 3
    };

    const start = Date.now();

    try {
        const response = await fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const duration = Date.now() - start;

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Assertions
        if (!data.success) throw new Error('Response success !== true');
        if (!data.narrative) throw new Error('Missing narrative');
        if (!Array.isArray(data.scenes)) throw new Error('Missing scenes array');
        if (data.scenes.length !== 3) throw new Error(`Expected 3 scenes, got ${data.scenes.length}`);
        if (typeof data.estimatedDuration !== 'number') throw new Error('Missing estimatedDuration');

        console.log('✅ Response Structure OK');
        console.log(`⏱️ Duration: ${duration}ms`);
        console.log(`📝 generatedBy: ${data.generatedBy}`);

        if (duration > 5000) {
            console.warn('⚠️ Warning: Response time > 5000ms');
        }

        console.log('✅ SKILL CHECK PASSED: narrate-project');

    } catch (error) {
        console.error('❌ SKILL CHECK FAILED:', error.message);
        process.exit(1);
    }
}

runSmokeTest();
