#!/usr/bin/env node
/**
 * SSE Stress Test - Verify progress streaming under load
 */

const BASE_URL = process.env.URL || 'http://localhost:8888';
const CONCURRENT_RUNS = 3;

async function runPipeline(runNumber) {
    console.log(`[Run ${runNumber}] Starting pipeline...`);

    const startTime = Date.now();
    const projectId = `stress_test_${runNumber}_${Date.now()}`;

    // Start pipeline
    const response = await fetch(`${BASE_URL}/.netlify/functions/start-pipeline`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer demo'
        },
        body: JSON.stringify({ projectId })
    });

    const data = await response.json();
    console.log(`[Run ${runNumber}] Pipeline started: ${data.runId}`);

    // Connect to SSE
    const progressEvents = [];
    const eventSource = new EventSource(
        `${BASE_URL}/.netlify/functions/progress?projectId=${projectId}&runId=${data.runId}`
    );

    return new Promise((resolve) => {
        eventSource.onmessage = (event) => {
            const progress = JSON.parse(event.data);
            progressEvents.push({
                timestamp: Date.now(),
                ...progress
            });
            console.log(`[Run ${runNumber}] Progress: ${progress.agent} - ${progress.status}`);

            if (progress.status === 'completed' || progress.status === 'failed') {
                eventSource.close();
                resolve({
                    runNumber,
                    projectId,
                    runId: data.runId,
                    duration: Date.now() - startTime,
                    eventsReceived: progressEvents.length,
                    finalStatus: progress.status
                });
            }
        };

        eventSource.onerror = () => {
            eventSource.close();
            resolve({
                runNumber,
                projectId,
                error: 'SSE connection failed',
                eventsReceived: progressEvents.length
            });
        };

        // Timeout after 5 minutes
        setTimeout(() => {
            eventSource.close();
            resolve({
                runNumber,
                projectId,
                error: 'Timeout',
                eventsReceived: progressEvents.length
            });
        }, 300000);
    });
}

async function main() {
    console.log('🔥 SSE Stress Test Starting...');
    console.log(`Running ${CONCURRENT_RUNS} pipelines concurrently\n`);

    const runs = [];
    for (let i = 1; i <= CONCURRENT_RUNS; i++) {
        runs.push(runPipeline(i));
    }

    const results = await Promise.all(runs);

    console.log('\n📊 Results:');
    console.log('─'.repeat(50));

    let passed = 0;
    let failed = 0;

    results.forEach(r => {
        const status = r.finalStatus === 'completed' ? '✅' : '❌';
        console.log(`${status} Run ${r.runNumber}: ${r.eventsReceived} events, ${r.duration}ms`);
        if (r.finalStatus === 'completed') passed++;
        else failed++;
    });

    console.log('─'.repeat(50));
    console.log(`Passed: ${passed}/${CONCURRENT_RUNS}`);
    console.log(`Failed: ${failed}/${CONCURRENT_RUNS}`);

    process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
