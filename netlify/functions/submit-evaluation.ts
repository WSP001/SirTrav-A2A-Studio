import type { Handler, HandlerEvent } from '@netlify/functions';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface EvaluationInput {
  projectId: string;
  runId?: string;
  rating: 'good' | 'bad';
  theme?: string;
  mood?: string;
  feedback?: string;
}

interface MemoryIndex {
  version: string;
  last_updated: string;
  user_preferences: {
    favorite_moods: string[];
    disliked_music_styles: string[];
  };
  video_history: Array<{
    project_id: string;
    run_id?: string;
    user_rating: 'good' | 'bad';
    theme?: string;
    mood?: string;
    timestamp: string;
    feedback?: string;
  }>;
}

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const input: EvaluationInput = JSON.parse(event.body || '{}');
    if (!input.projectId || !input.rating) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'projectId and rating required' }) };
    }

    const vaultPath = process.env.VAULT_PATH || join(process.env.TMPDIR || '/tmp', 'vault');
    if (!existsSync(vaultPath)) {
      mkdirSync(vaultPath, { recursive: true });
    }

    const memoryPath = join(vaultPath, 'memory_index.json');
    let memory: MemoryIndex;

    if (existsSync(memoryPath)) {
      try {
        memory = JSON.parse(readFileSync(memoryPath, 'utf-8'));
      } catch {
        memory = createEmptyMemory();
      }
    } else {
      memory = createEmptyMemory();
    }

    memory.video_history.push({
      project_id: input.projectId,
      run_id: input.runId,
      user_rating: input.rating,
      theme: input.theme,
      mood: input.mood,
      feedback: input.feedback,
      timestamp: new Date().toISOString(),
    });

    // Simple learning: track liked moods
    if (input.rating === 'good' && input.mood) {
      if (!memory.user_preferences.favorite_moods.includes(input.mood)) {
        memory.user_preferences.favorite_moods.push(input.mood);
      }
    }

    // Keep last 100 entries
    if (memory.video_history.length > 100) {
      memory.video_history = memory.video_history.slice(-100);
    }

    memory.last_updated = new Date().toISOString();

    writeFileSync(memoryPath, JSON.stringify(memory, null, 2));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        projectId: input.projectId,
        runId: input.runId,
        learning: {
          favorite_moods: memory.user_preferences.favorite_moods,
          total_history: memory.video_history.length,
        },
      }),
    };
  } catch (error: any) {
    console.error('Evaluation error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'evaluation_failed', detail: error.message }) };
  }
};

function createEmptyMemory(): MemoryIndex {
  return {
    version: '1.0',
    last_updated: new Date().toISOString(),
    user_preferences: {
      favorite_moods: [],
      disliked_music_styles: [],
    },
    video_history: [],
  };
}

export default handler;
