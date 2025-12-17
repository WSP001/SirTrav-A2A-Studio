import type { Handler, HandlerEvent } from '@netlify/functions';
import fs from 'fs';
import path from 'path';
import os from 'os';

const TMP_DIR = process.env.TMPDIR || os.tmpdir();
const DATA_DIR = path.join(TMP_DIR, 'sirtrav-progress');

// Ensure directory exists on cold start
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('Could not create progress directory:', e);
}

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const getProgressFile = (projectId: string) => path.join(DATA_DIR, `${projectId}.json`);

interface ProgressEvent {
  timestamp: string;
  step?: string;
  status?: 'pending' | 'running' | 'completed' | 'failed';
  duration_ms?: number;
  cost_usd?: number;
  meta?: Record<string, unknown>;
}

export const handler: Handler = async (event: HandlerEvent) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // POST: append progress entry
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      const { projectId, step, status, meta } = body;
      if (!projectId) {
        return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'projectId required' }) };
      }

      const filePath = getProgressFile(projectId);
      const entry: ProgressEvent = {
        timestamp: new Date().toISOString(),
        step,
        status,
        meta,
      };

      let data: ProgressEvent[] = [];
      if (fs.existsSync(filePath)) {
        try {
          data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch {
          data = [];
        }
      }

      data.push(entry);

      const tempPath = `${filePath}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2));
      fs.renameSync(tempPath, filePath);

      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, event: entry }) };
    } catch (error: any) {
      console.error('Progress write error:', error);
      return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: error.message }) };
    }
  }

  // GET: fetch progress; supports ?format=sse
  if (event.httpMethod === 'GET') {
    const projectId = event.queryStringParameters?.projectId;
    const format = event.queryStringParameters?.format || 'json';
    if (!projectId) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'projectId required' }) };
    }

    const filePath = getProgressFile(projectId);
    let data: ProgressEvent[] = [];
    if (fs.existsSync(filePath)) {
      try {
        data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch {
        data = [];
      }
    }

    if (format === 'sse') {
      const sseBody = data.map((entry) => `data: ${JSON.stringify(entry)}\n\n`).join('') || 'data: {"status":"waiting"}\n\n';
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
        body: sseBody,
      };
    }

    return { statusCode: 200, headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true, projectId, events: data }) };
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};

export default handler;
