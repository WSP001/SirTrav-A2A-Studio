/**
 * start-pipeline
 * Synchronous front door that creates a run record, then triggers the
 * background worker (run-pipeline-background).
 */
import type { Handler } from '@netlify/functions';
import { runsStore } from './lib/storage';

type RunStatus = 'queued' | 'running' | 'succeeded' | 'failed';

function makeRunKey(projectId: string, runId: string) {
  return `${projectId}/${runId}.json`;
}

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'method_not_allowed' }) };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const projectId: string | undefined = body.projectId;
    const payload = body.payload || {};

    if (!projectId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'projectId_required' }) };
    }

    const runId = body.runId || `run-${Date.now()}`;
    const payloadKey = `${projectId}/${runId}-payload.json`;
    const key = makeRunKey(projectId, runId);
    const now = new Date().toISOString();
    const store = runsStore();

    // Simple lock: if a run record already exists and is not failed, refuse to start a duplicate
    const existing = await store.getJSON(key) as any;
    if (existing && existing.status && existing.status !== 'failed') {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ ok: false, error: 'run_already_exists', runId, projectId, status: existing.status }),
      };
    }

    // Write initial run record
    const runRecord = {
      projectId,
      runId,
      status: 'queued' as RunStatus,
      progress: 0,
      step: 'queued',
      message: 'Pipeline queued',
      createdAt: now,
      updatedAt: now,
      payloadSummary: Object.keys(payload),
    };

    await store.setJSON(key, runRecord, {
      metadata: { projectId, runId, status: 'queued' },
    });

    // Persist payload separately to avoid background payload limits
    await store.setJSON(payloadKey, payload, {
      metadata: { projectId, runId, kind: 'payload' },
    });

    // Trigger background worker
    const baseUrl = process.env.URL || 'http://localhost:8888';
    const invokeUrl = `${baseUrl}/.netlify/functions/run-pipeline-background`;

    await fetch(invokeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, runId, payloadKey }),
    });

    return {
      statusCode: 202,
      headers,
      body: JSON.stringify({ ok: true, runId, projectId, status: 'queued', payloadKey }),
    };
  } catch (error) {
    console.error('start-pipeline error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'pipeline_start_failed' }),
    };
  }
};

export default handler;
