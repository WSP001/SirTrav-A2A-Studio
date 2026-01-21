import type { Handler } from './types';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

type IdempotencyRecord = {
  projectId: string;
  runId: string;
  createdAt: string;
};

type IdempotencyStore = Record<string, IdempotencyRecord>;

type StartPayload = {
  projectId?: string;
  runId?: string;
  payload?: Record<string, unknown>;
  idempotencyKey?: string;
};

const IDEMPOTENCY_PATH = path.join(process.env.TMPDIR || '/tmp', 'sirtrav-idempotency.json');

const SITE_URL = process.env.URL || 'http://127.0.0.1:8888';
const FUNCTIONS_BASE = `${SITE_URL.replace(/\/$/, '')}/.netlify/functions`;

const safeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
};

const validateToken = (token?: string) => {
  if (!token) return false;
  const secret = process.env.PUBLISH_TOKEN_SECRET;
  if (secret) {
    return safeEqual(token, secret);
  }
  return token === 'demo';
};

const loadIdempotency = async (): Promise<IdempotencyStore> => {
  try {
    const raw = await fs.readFile(IDEMPOTENCY_PATH, 'utf8');
    return JSON.parse(raw) as IdempotencyStore;
  } catch {
    await fs.mkdir(path.dirname(IDEMPOTENCY_PATH), { recursive: true });
    await fs.writeFile(IDEMPOTENCY_PATH, JSON.stringify({}, null, 2));
    return {};
  }
};

const saveIdempotency = async (store: IdempotencyStore) => {
  await fs.writeFile(IDEMPOTENCY_PATH, JSON.stringify(store, null, 2));
};

const postProgress = async (payload: Record<string, unknown>) => {
  try {
    await fetch(`${FUNCTIONS_BASE}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.warn('start-pipeline: unable to post progress', error);
  }
};

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,Idempotency-Key',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'method_not_allowed' }) };
  }

  const token =
    event.headers?.authorization?.replace('Bearer ', '') ||
    event.headers?.Authorization?.replace('Bearer ', '') ||
    event.headers?.['x-api-key'];

  if (!token) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ ok: false, error: 'authentication_required' }),
    };
  }

  if (!validateToken(token)) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ ok: false, error: 'invalid_token' }),
    };
  }

  let payload: StartPayload = {};
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'invalid_json' }) };
  }

  const projectId = typeof payload.projectId === 'string' ? payload.projectId.trim() : '';
  if (!projectId) {
    return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'projectId_required' }) };
  }

  const runId =
    typeof payload.runId === 'string' && payload.runId.trim()
      ? payload.runId.trim()
      : `run-${Date.now()}`;

  const idempotencyKey =
    (event.headers?.['idempotency-key'] as string | undefined) ||
    (event.headers?.['Idempotency-Key'] as string | undefined) ||
    payload.idempotencyKey ||
    `${projectId}:${runId}`;

  const store = await loadIdempotency();
  if (store[idempotencyKey]) {
    const existing = store[idempotencyKey];
    return {
      statusCode: 202,
      headers,
      body: JSON.stringify({
        ok: true,
        status: 'duplicate',
        projectId: existing.projectId,
        runId: existing.runId,
        idempotencyKey,
      }),
    };
  }

  store[idempotencyKey] = { projectId, runId, createdAt: new Date().toISOString() };
  await saveIdempotency(store);

  await postProgress({
    projectId,
    runId,
    step: 'start-pipeline',
    status: 'queued',
    meta: { idempotencyKey },
  });

  return {
    statusCode: 202,
    headers,
    body: JSON.stringify({
      ok: true,
      status: 'queued',
      projectId,
      runId,
      idempotencyKey,
      message: 'Pipeline start accepted. Background orchestration will proceed.',
    }),
  };
};

export default handler;
