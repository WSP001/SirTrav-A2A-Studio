import type { Handler } from './types';

type PublishPayload = {
  projectId?: string;
  artifactKey?: string;
};

const SITE_URL = process.env.URL || 'http://127.0.0.1:8888';
const DEFAULT_EXPIRY_SECONDS = 24 * 60 * 60;

const buildNetlifyLmUrl = (key: string) => {
  const base = SITE_URL.replace(/\/$/, '');
  return `${base}/.netlify/large-media/${key}`;
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'method_not_allowed' }),
    };
  }

  const payload: PublishPayload = event.body ? JSON.parse(event.body) : {};
  const projectId = payload.projectId?.trim();
  const artifactKey = payload.artifactKey?.trim() || (projectId ? `projects/${projectId}/final.mp4` : '');

  if (!projectId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'projectId_required' }),
    };
  }

  const backend = (process.env.STORAGE_BACKEND || 'netlify_lm').toLowerCase();
  if (backend !== 'netlify_lm') {
    return {
      statusCode: 501,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: false,
        error: 'unsupported_storage_backend',
        message: 'Only netlify_lm is enabled in this public demo build.',
      }),
    };
  }

  const publicUrl = buildNetlifyLmUrl(artifactKey);
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ok: true,
      projectId,
      backend,
      publicUrl,
      expiresAt: new Date(Date.now() + DEFAULT_EXPIRY_SECONDS * 1000).toISOString(),
    }),
  };
};
