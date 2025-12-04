import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Submit Evaluation Agent
 * 
 * Closes the EGO-Prompt learning loop by recording user feedback (👍/👎)
 * and updating memory_index.json with preferences learned from each video.
 * 
 * This is the critical feedback mechanism that makes the AI learn what "good" means.
 */

interface EvaluationRequest {
  projectId: string;
  rating: 'good' | 'bad';
  theme?: string;
  mood?: string;
  music_style?: string;
  comments?: string;
}

interface MemoryIndex {
  version: string;
  last_updated: string;
  user_preferences: {
    favorite_moods: string[];
    disliked_music_styles: string[];
    preferred_themes: string[];
  };
  video_history: Array<{
    projectId: string;
    rating: 'good' | 'bad';
    theme?: string;
    mood?: string;
    music_style?: string;
    timestamp: string;
  }>;
  projects?: Record<string, unknown>;
}

const MEMORY_PATH = process.env.MEMORY_PATH || join(process.cwd(), 'data', 'memory_index.json');

/**
 * Load or initialize memory index
 */
async function loadMemory(): Promise<MemoryIndex> {
  try {
    if (existsSync(MEMORY_PATH)) {
      const content = await readFile(MEMORY_PATH, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.warn('Could not load memory, initializing fresh:', err);
  }

  // Initialize fresh memory
  return {
    version: '1.0.0',
    last_updated: new Date().toISOString(),
    user_preferences: {
      favorite_moods: [],
      disliked_music_styles: [],
      preferred_themes: []
    },
    video_history: [],
    projects: {}
  };
}

/**
 * Save memory index with atomic write
 */
async function saveMemory(memory: MemoryIndex): Promise<void> {
  memory.last_updated = new Date().toISOString();
  
  // Ensure directory exists
  const dir = join(MEMORY_PATH, '..');
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  // Atomic write: write to temp file then rename
  const tempPath = `${MEMORY_PATH}.tmp`;
  await writeFile(tempPath, JSON.stringify(memory, null, 2));
  await writeFile(MEMORY_PATH, JSON.stringify(memory, null, 2));
}

/**
 * Update preferences based on feedback
 */
function updatePreferences(memory: MemoryIndex, evaluation: EvaluationRequest): void {
  const { rating, theme, mood, music_style } = evaluation;
  const prefs = memory.user_preferences;

  if (rating === 'good') {
    // Learn from positive feedback
    if (mood && !prefs.favorite_moods.includes(mood)) {
      prefs.favorite_moods.push(mood);
      // Keep only last 10 favorites
      if (prefs.favorite_moods.length > 10) {
        prefs.favorite_moods.shift();
      }
    }
    if (theme && !prefs.preferred_themes.includes(theme)) {
      prefs.preferred_themes.push(theme);
      if (prefs.preferred_themes.length > 10) {
        prefs.preferred_themes.shift();
      }
    }
    // Remove from disliked if previously disliked
    if (music_style) {
      const idx = prefs.disliked_music_styles.indexOf(music_style);
      if (idx > -1) {
        prefs.disliked_music_styles.splice(idx, 1);
      }
    }
  } else {
    // Learn from negative feedback
    if (music_style && !prefs.disliked_music_styles.includes(music_style)) {
      prefs.disliked_music_styles.push(music_style);
      if (prefs.disliked_music_styles.length > 10) {
        prefs.disliked_music_styles.shift();
      }
    }
    // Remove from favorites if previously liked
    if (mood) {
      const idx = prefs.favorite_moods.indexOf(mood);
      if (idx > -1) {
        prefs.favorite_moods.splice(idx, 1);
      }
    }
  }
}

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ ok: false, error: 'Method not allowed' })
    };
  }

  try {
    const body: EvaluationRequest = JSON.parse(event.body || '{}');
    
    // Validate required fields
    if (!body.projectId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: 'projectId is required' })
      };
    }

    if (!body.rating || !['good', 'bad'].includes(body.rating)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: 'rating must be "good" or "bad"' })
      };
    }

    console.log(`[submit-evaluation] Processing ${body.rating} feedback for ${body.projectId}`);

    // Load current memory
    const memory = await loadMemory();

    // Add to video history
    memory.video_history.push({
      projectId: body.projectId,
      rating: body.rating,
      theme: body.theme,
      mood: body.mood,
      music_style: body.music_style,
      timestamp: new Date().toISOString()
    });

    // Keep only last 100 entries
    if (memory.video_history.length > 100) {
      memory.video_history = memory.video_history.slice(-100);
    }

    // Update preferences based on feedback
    updatePreferences(memory, body);

    // Save updated memory
    await saveMemory(memory);

    console.log(`[submit-evaluation] ✅ Feedback recorded. Preferences updated.`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        message: `Feedback recorded: ${body.rating}`,
        data: {
          projectId: body.projectId,
          rating: body.rating,
          preferences_updated: true,
          total_history: memory.video_history.length
        }
      })
    };

  } catch (err: any) {
    console.error('[submit-evaluation] Error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: 'internal_error',
        message: err.message
      })
    };
  }
};

export { handler };
