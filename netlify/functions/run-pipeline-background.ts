/**
 * run-pipeline-background
 * Background worker that simulates (or executes) the 7-agent pipeline.
 * Writes progress + final status to runsStore so UI can poll/SSE safely.
 */
import type { Handler } from '@netlify/functions';
import { runsStore } from './lib/storage';

type RunStatus = 'queued' | 'running' | 'succeeded' | 'failed';

function makeRunKey(projectId: string, runId: string) {
  return `${projectId}/${runId}.json`;
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function updateRun(
  projectId: string,
  runId: string,
  patch: Partial<{
    status: RunStatus;
    progress: number;
    step: string;
    message: string;
    artifacts: Record<string, unknown>;
    errors: string[];
  }>
) {
  const store = runsStore();
  const key = makeRunKey(projectId, runId);
  const now = new Date().toISOString();
  const existing = await store.getJSON(key) as Record<string, unknown> | null;
  const next = {
    ...(existing || { projectId, runId, createdAt: now }),
    ...patch,
    updatedAt: now,
  };
  await store.setJSON(key, next, { metadata: { projectId, runId, status: next.status } });
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200 };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const projectId: string | undefined = body.projectId;
    const runId: string | undefined = body.runId;
    const payloadKey: string | undefined = body.payloadKey;

    if (!projectId || !runId) {
      return { statusCode: 400, body: 'projectId and runId are required' };
    }

    const store = runsStore();
    const key = makeRunKey(projectId, runId);
    const existing = await store.getJSON(key) as any;

    // Idempotency: if already succeeded, exit early
    if (existing?.status === 'succeeded') {
      return { statusCode: 200, body: JSON.stringify({ ok: true, projectId, runId, status: 'succeeded' }) };
    }

    // Soft lock: if another worker set running recently, respect it
    if (existing?.status === 'running' && existing?.progress >= 99) {
      return { statusCode: 200, body: JSON.stringify({ ok: true, projectId, runId, status: existing.status }) };
    }

    // Load payload if present (not used in mock, but kept for parity)
    if (payloadKey) {
      await store.getJSON(payloadKey); // fetch to validate existence; ignored otherwise
    }

    const steps = [
      'director',
      'writer',
      'voice',
      'composer',
      'editor',
      'attribution',
      'publisher',
    ];

    await updateRun(projectId, runId, { status: 'running', progress: 2, step: 'start', message: 'Pipeline started' });

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      await delay(600 + Math.random() * 700);
      const progress = Math.min(99, Math.round(((i + 1) / steps.length) * 100));
      await updateRun(projectId, runId, {
        status: 'running',
        progress,
        step,
        message: `${step} completed`,
      });
    }

    const artifacts = {
      videoUrl: `/media/${projectId}/${runId}.mp4`,
      creditsUrl: `/media/${projectId}/${runId}-credits.json`,
    };

    await updateRun(projectId, runId, {
      status: 'succeeded',
      progress: 100,
      step: 'complete',
      message: 'Pipeline complete',
      artifacts,
    });

    return { statusCode: 200, body: JSON.stringify({ ok: true, projectId, runId, status: 'succeeded', artifacts }) };
  } catch (error) {
    console.error('run-pipeline-background error:', error);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'pipeline_failed' }) };
  }
};

export default handler;
