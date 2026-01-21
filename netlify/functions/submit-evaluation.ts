import type { Handler } from './types';
import { promises as fs } from 'node:fs';
import path from 'node:path';

type Rating = 'good' | 'bad';

interface EvaluationPayload {
  projectId?: string;
  rating?: Rating;
  tags?: string[];
}

interface VideoHistoryEntry {
  projectId: string;
  rating: Rating;
  tags: string[];
  recordedAt: string;
}

interface MemoryFileShape {
  video_history: VideoHistoryEntry[];
  user_preferences: {
    positive_tags: string[];
    negative_tags: string[];
    last_feedback_at?: string;
  };
}

const TMP_MEMORY_PATH = path.join(process.env.TMPDIR || '/tmp', 'memory_index.json');
const DEFAULT_MEMORY: MemoryFileShape = {
  video_history: [],
  user_preferences: {
    positive_tags: [],
    negative_tags: [],
  },
};

async function loadMemory(): Promise<MemoryFileShape> {
  try {
    const raw = await fs.readFile(TMP_MEMORY_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<MemoryFileShape>;
    const preferences = (parsed.user_preferences ?? {}) as Partial<MemoryFileShape['user_preferences']>;
    return {
      video_history: Array.isArray(parsed.video_history) ? (parsed.video_history as VideoHistoryEntry[]) : [],
      user_preferences: {
        positive_tags: Array.isArray(preferences.positive_tags)
          ? [...new Set(preferences.positive_tags as string[])]
          : [],
        negative_tags: Array.isArray(preferences.negative_tags)
          ? [...new Set(preferences.negative_tags as string[])]
          : [],
        last_feedback_at: preferences.last_feedback_at,
      },
    };
  } catch {
    await fs.mkdir(path.dirname(TMP_MEMORY_PATH), { recursive: true });
    await fs.writeFile(TMP_MEMORY_PATH, JSON.stringify(DEFAULT_MEMORY, null, 2));
    return { ...DEFAULT_MEMORY };
  }
}

function sanitizeTags(tags?: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
    .filter((tag) => tag.length > 0)
    .slice(0, 50);
}

function mergeUnique(existing: string[], additions: string[]): string[] {
  const combined = new Set(existing);
  for (const tag of additions) {
    if (tag) {
      combined.add(tag);
    }
  }
  return Array.from(combined).slice(0, 200);
}

export const handler: Handler = async (event) => {
  if ((event.httpMethod || '').toUpperCase() !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Allow': 'POST',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ ok: false, error: 'Method Not Allowed' }),
    };
  }

  if (!event.body) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: false, error: 'Missing request body' }),
    };
  }

  let payload: EvaluationPayload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: false, error: 'Invalid JSON' }),
    };
  }

  const projectId = typeof payload.projectId === 'string' ? payload.projectId.trim() : '';
  const rating = payload.rating;
  const tags = sanitizeTags(payload.tags);

  if (!projectId) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: false, error: 'projectId is required' }),
    };
  }

  if (rating !== 'good' && rating !== 'bad') {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: false, error: 'rating must be "good" or "bad"' }),
    };
  }

  const memory = await loadMemory();
  const now = new Date().toISOString();

  memory.video_history.push({ projectId, rating, tags, recordedAt: now });
  memory.user_preferences.last_feedback_at = now;

  if (rating === 'good') {
    memory.user_preferences.positive_tags = mergeUnique(memory.user_preferences.positive_tags, tags);
  } else {
    memory.user_preferences.negative_tags = mergeUnique(memory.user_preferences.negative_tags, tags);
  }

  await fs.writeFile(TMP_MEMORY_PATH, JSON.stringify(memory, null, 2));

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      ok: true,
      projectId,
      rating,
      tags,
      videoHistoryCount: memory.video_history.length,
    }),
  };
};

export default handler;
