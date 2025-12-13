import { Handler } from '@netlify/functions';
import { uploadsStore } from './lib/storage';

/**
 * Intake Upload (Blobs-backed, JSON payload)
 * POST body: { projectId, filename, contentType?, fileBase64 }
 * Limit: ~6MB (sync function payload constraint)
 */

const MAX_BYTES = 6 * 1024 * 1024; // ~6MB

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { projectId = 'dev', filename, contentType = 'application/octet-stream', fileBase64 } = body;

    if (!filename || !fileBase64) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'filename and fileBase64 are required' }) };
    }

    const buffer = Buffer.from(fileBase64, 'base64');
    if (buffer.length > MAX_BYTES) {
      return { statusCode: 413, headers, body: JSON.stringify({ error: 'File too large for sync upload (>6MB)' }) };
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, key, size: buffer.length }),
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
