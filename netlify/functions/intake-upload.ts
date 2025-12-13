import { uploadsStore } from './lib/storage';

/**
 * Intake Upload (Modern function, Blobs-backed, JSON payload)
 * POST body: { projectId, filename, contentType?, fileBase64 }
 * Limit: ~6MB payload (netlify sync function limit) → recommend <4.5MB raw to allow base64 expansion.
 */

const MAX_BYTES = 6 * 1024 * 1024; // hard ceiling
const SAFE_RAW_BYTES = 4.5 * 1024 * 1024; // recommendation for base64 expansion

export default async (req: Request) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  try {
    const body = (await req.json()) as any;
    const { projectId = 'dev', filename, contentType = 'application/octet-stream', fileBase64 } = body || {};

    if (!filename || !fileBase64) {
      return new Response(JSON.stringify({ error: 'filename and fileBase64 are required' }), { status: 400, headers });
    }

    const buffer = Buffer.from(fileBase64, 'base64');
    if (buffer.length > MAX_BYTES) {
      return new Response(JSON.stringify({ error: 'File too large for sync upload (>6MB)' }), { status: 413, headers });
    }
    if (buffer.length > SAFE_RAW_BYTES) {
      console.warn('intake-upload: payload near limit; consider signed URL path for larger files.');
    }

    const key = `${projectId}/${Date.now()}-${filename}`;
    const store = uploadsStore();
    await store.set(key, buffer, {
      metadata: {
        projectId,
        filename,
        contentType,
        size: String(buffer.length),
        uploadedAt: new Date().toISOString(),
      },
    });

    return new Response(JSON.stringify({ ok: true, key, size: buffer.length }), { status: 200, headers });
  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers });
  }
};
