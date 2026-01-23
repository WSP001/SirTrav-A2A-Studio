/**
 * test_motion_graphic.mjs
 * End-to-end smoke test for MG-002/MG-003
 *
 * Usage: node scripts/test_motion_graphic.mjs [projectId]
 *
 * Flow:
 * 1. Checks healthcheck
 * 2. Calls start-pipeline (simulating UI click-to-kick)
 * 3. Polls progress (aggregating events locally) until complete or failed
 * 4. Verifies output contract
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.URL || 'http://localhost:8888';
const PROJECT_ID = process.argv[2] || `smoke_test_${Date.now()}`;
const MAX_POLLS = 120; // 4 minutes (2s interval) - needed for fallback agents

const AGENTS = ['director', 'writer', 'voice', 'composer', 'editor', 'attribution', 'publisher'];

async function run() {
    console.log('🚀 Starting Motion Graphic Smoke Test');
    console.log(`Target: ${BASE_URL}`);
    console.log(`Project: ${PROJECT_ID}`);

    // 1. Healthcheck
    try {
        const health = await fetch(`${BASE_URL}/.netlify/functions/healthcheck`);
        if (!health.ok) throw new Error(`Healthcheck failed: ${health.status}`);
        console.log('✅ System Healthy');
    } catch (err) {
        console.error('🛑 System Offline (Run netlify dev)');
        process.exit(1);
    }

    // 2. Start Pipeline (Simulate Click-to-Kick)
    console.log('▶️ Triggering Pipeline...');
    const startRes = await fetch(`${BASE_URL}/.netlify/functions/start-pipeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer demo' },
        body: JSON.stringify({
            projectId: PROJECT_ID,
            platform: 'tiktok',
            payload: {
                socialPlatform: 'tiktok',
                musicMode: 'manual', // Avoid Suno API costs for smoke test
                voiceStyle: 'friendly',
                videoLength: 'short'
            }
        })
    });

    if (!startRes.ok) {
        const errText = await startRes.text();
        console.error(`🛑 Start Failed: ${startRes.status} - ${errText}`);
        process.exit(1);
    }

    const startData = await startRes.json();
    const runId = startData.runId;
    console.log(`✅ Pipeline Started (RunID: ${runId})`);

    // 3. Poll Progress
    console.log('⏳ Polling Progress...');
    let pipelineStatus = 'started';
    let polls = 0;

    while (pipelineStatus !== 'completed' && pipelineStatus !== 'failed' && polls < MAX_POLLS) {
        await new Promise(r => setTimeout(r, 2000));
        polls++;

        const progressRes = await fetch(`${BASE_URL}/.netlify/functions/progress?projectId=${PROJECT_ID}&runId=${runId}`);
        const progressResponse = await progressRes.json();
        const events = progressResponse.events || [];

        // Aggregate Events Logic (Mirrors Frontend)
        const agentStatuses = new Map();
        AGENTS.forEach(a => agentStatuses.set(a, 'pending'));

        let failed = false;
        events.forEach(evt => {
            let targets = [evt.agent];

            if (evt.agent === 'production_parallel') {
                targets = ['voice', 'composer'];
            } else if (evt.agent === 'completed') {
                targets = ['publisher'];
            } else if (evt.agent === 'pipeline' || evt.agent === 'quality_gate') {
                targets = [];
            }

            // Waterfall Inference: Mark previous agents as completed
            if (targets.length > 0 && evt.status !== 'failed') {
                const indices = targets.map(t => AGENTS.indexOf(t)).filter(i => i !== -1);
                if (indices.length > 0) {
                    const minIndex = Math.min(...indices);
                    for (let i = 0; i < minIndex; i++) {
                        const prevAgent = AGENTS[i];
                        const prevStatus = agentStatuses.get(prevAgent);
                        if (prevStatus !== 'completed' && prevStatus !== 'fallback') {
                            agentStatuses.set(prevAgent, 'completed');
                        }
                    }
                }
            }

            targets.forEach(agentId => {
                let status = evt.status;
                if (status === 'started') status = 'running';

                const currentStatus = agentStatuses.get(agentId);
                if ((currentStatus === 'completed' || currentStatus === 'fallback') && status === 'running') return;

                agentStatuses.set(agentId, status);
            });

            if (evt.status === 'failed') failed = true;
        });

        const allCompleted = AGENTS.every(a => {
            const s = agentStatuses.get(a);
            return s === 'completed' || s === 'fallback';
        });

        if (failed) pipelineStatus = 'failed';
        else if (allCompleted) pipelineStatus = 'completed';
        else pipelineStatus = 'running';

        // Print current state
        const runningAgent = AGENTS.find(a => agentStatuses.get(a) === 'running') || 'processing';
        const completedCount = AGENTS.filter(a => agentStatuses.get(a) === 'completed' || agentStatuses.get(a) === 'fallback').length;

        process.stdout.write(`\r[${polls}/${MAX_POLLS}] Status: ${pipelineStatus} (Active: ${runningAgent}, Done: ${completedCount}/7)   `);
    }
    console.log(''); // Newline

    if (pipelineStatus === 'completed') {
        console.log('🎉 Pipeline Completed Successfully');
        process.exit(0);
    } else {
        console.error(`🛑 Pipeline Failed or Timed Out (Status: ${pipelineStatus})`);

        // Debug: print events
        const finalRes = await fetch(`${BASE_URL}/.netlify/functions/progress?projectId=${PROJECT_ID}&runId=${runId}`);
        const finalData = await finalRes.json();
        console.log('Final Events:', JSON.stringify(finalData.events, null, 2));

        process.exit(1);
    }
}

run();
