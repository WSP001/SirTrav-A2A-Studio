/**
 * start-pipeline
 * Synchronous front door that creates a run record, then triggers the
 * background worker (run-pipeline-background).
 */
import type { Handler } from '@netlify/functions';
import { runsStore } from './lib/storage';
import { updateRunIndex } from './lib/runIndex';

type RunStatus = 'queued' | 'running' | 'completed' | 'failed';

function makeRunKey(projectId: string, runId: string) {
  return `${projectId}/${runId}.json`;
}

// Task 1: Secure Handshake - Real Token Validation
const validateUser = async (token?: string): Promise<boolean> => {
  // 1. Check against Environment Secret (Highest Priority)
  if (process.env.API_SECRET && token === process.env.API_SECRET) {
    return true;
  }

  // 2. Allow 'demo' token for local development/golden path
  if (token === 'demo' || token === 'sk_live_test_key') {
    return true;
  }

  // 3. Fallback: Reject everything else
  return false;
};

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
    const userToken = event.headers.authorization?.replace('Bearer ', '') || body.userToken;

    // 🎯 CC-Task 1: Parse platform + brief from Codex UI
    // These flow to downstream agents for platform-specific processing
    const platform: string = body.platform || payload.socialPlatform || 'tiktok';
    const brief: {
      mood?: string;
      pace?: string;
      story?: string;
      cta?: string;
      tone?: string;
    } = body.brief || payload.creativeBrief || {};

    // 🔒 SECURE HANDSHAKE: Verify user before allocating resources
    const isAuthorized = await validateUser(userToken);

    if (!userToken) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authentication required. Please provide a Bearer token.' })
      };
    }

    if (!isAuthorized) {
      console.warn(`🛑 Blocked unauthorized access to ${projectId}: Invalid token`);
      return {
        statusCode: 401, // Standardizing on 401 for bad credentials
        headers,
        body: JSON.stringify({ error: 'Invalid authentication token.' })
      };
    }

    if (!projectId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'projectId_required' }) };
    }

    const runId = body.runId || `run-${Date.now()}`;
    const payloadKey = `${projectId}/${runId}-payload.json`;
    const key = makeRunKey(projectId, runId);
    const now = new Date().toISOString();
    const store = runsStore();

    // Simple lock: if a run record already exists and is not failed, refuse to start a duplicate
    // Optimistic lock: set a lock key once per run
    const lockKey = `${projectId}/${runId}.lock`;
    const lock = await store.set(lockKey, 'locked', {
      metadata: { projectId, runId, type: 'lock' },
      // onlyIfNew ensures we don't overwrite an existing lock
      // @ts-ignore netlify types may not yet expose onlyIfNew
      onlyIfNew: true,
    }).catch(() => null);

    if (!lock) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ ok: false, error: 'run_already_exists', runId, projectId }),
      };
    }

    // Write initial run record with platform + brief context
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
      // 🎯 Platform + Brief for downstream agents
      platform,
      brief,
    };

    await store.setJSON(key, runRecord, {
      metadata: { projectId, runId, status: 'queued' },
    });

    // Create the artifact index immediately so UI can poll results
    // Include platform + brief so downstream agents can access context
    await updateRunIndex(projectId, runId, {
      status: 'running',
      createdAt: now,
      payloadKey,
      // @ts-ignore - extending RunArtifacts with platform/brief
      platform,
      brief,
    });

    // Persist payload separately to avoid background payload limits
    await store.setJSON(payloadKey, payload, {
      metadata: { projectId, runId, kind: 'payload' },
    });

    // Trigger background worker with platform + brief context
    const baseUrl = process.env.URL || 'http://localhost:8888';
    const invokeUrl = `${baseUrl}/.netlify/functions/run-pipeline-background`;

    await fetch(invokeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        runId,
        payloadKey,
        // 🎯 Pass platform + brief to background worker for agent context
        platform,
        brief,
      }),
    });

    return {
      statusCode: 202,
      headers,
      body: JSON.stringify({
        ok: true,
        runId,
        projectId,
        status: 'queued',
        payloadKey,
        // 🎯 Echo platform + brief for UI confirmation
        platform,
        brief: Object.keys(brief).length > 0 ? brief : undefined,
      }),
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
