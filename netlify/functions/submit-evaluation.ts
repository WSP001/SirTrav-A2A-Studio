/**
 * submit-evaluation (Modern function)
 * POST: { projectId, runId?, rating: 'good' | 'bad', comments?, metadata? }
 * Persists evaluation to Blobs (evalsStore) and, when NETLIFY_DEV=true, mirrors to a local memory file.
 */
import { evalsStore } from './lib/storage';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

interface EvaluationPayload {
  projectId: string;
  runId?: string;
  rating: 'good' | 'bad';
  comments?: string;
  metadata?: {
    platform?: string;
    theme?: string;
    style?: string;
  };
}

const VAULT_ROOT = process.env.VAULT_ROOT || process.cwd();
const MEMORY_FILE = join(VAULT_ROOT, 'memory_index.json');

export default async (req: Request) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers });

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers,
    });
  }

  try {
    const body = (await req.json()) as Partial<EvaluationPayload>;
    const { projectId, runId, rating, comments, metadata } = body;

    if (!projectId || !rating || (rating !== 'good' && rating !== 'bad')) {
      return new Response(JSON.stringify({ error: 'projectId and rating (good|bad) are required' }), {
        status: 400,
        headers,
      });
    }

    const ts = new Date().toISOString();
    const entry = {
      projectId,
      runId: runId || 'unknown',
      rating,
      comments,
      metadata,
      timestamp: ts,
      buildId: process.env.BUILD_ID || 'local',
    };

    // Persist to Blobs (production path)
    try {
      const store = evalsStore();
      const key = `${projectId}/${runId || 'unknown'}/${ts}.json`;
      await store.setJSON(key, entry, {
        metadata: { projectId, runId: runId || 'unknown', rating },
      });
    } catch (err) {
      console.warn('evalsStore write failed (continuing):', err);
    }

    // Optional local mirror for NETLIFY_DEV
    if (process.env.NETLIFY_DEV === 'true') {
      let mem: any[] = [];
      if (existsSync(MEMORY_FILE)) {
        try {
          mem = JSON.parse(await readFile(MEMORY_FILE, 'utf-8'));
        } catch {
          mem = [];
        }
      }
      mem.push(entry);
      await writeFile(MEMORY_FILE, JSON.stringify(mem, null, 2));
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Failed to submit evaluation' }), {
      status: 500,
      headers,
    });
  }
};
