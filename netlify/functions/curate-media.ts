import type { Handler, HandlerEvent } from '@netlify/functions';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * DIRECTOR AGENT (curate-media)
 * 
 * Curates key shots from the private vault based on:
 * - Theme, mood, pacing
 * - Learning from memory_index.json (EGO-Prompt)
 * 
 * Input: { projectId, vaultPath }
 * Output: { ok, curated_media: Scene[], theme, mood }
 */

interface Scene {
  file: string;
  type: 'image' | 'video';
  order: number;
  caption?: string;
  duration?: number;
}

interface CurateRequest {
  projectId: string;
  vaultPath?: string;
  maxScenes?: number;
}

interface MemoryIndex {
  version: string;
  projects: Array<{
    projectId: string;
    theme?: string;
    socialMetrics?: {
      views?: number;
      engagement?: number;
    };
  }>;
}

// Read memory index for learning
function readMemoryIndex(vaultPath: string): MemoryIndex | null {
  try {
    const memoryPath = join(vaultPath, 'data', 'memory_index.json');
    if (existsSync(memoryPath)) {
      const content = readFileSync(memoryPath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.warn('Could not read memory index:', error);
  }
  return null;
}

// Learn from past successful projects
function learnFromHistory(memory: MemoryIndex | null): string {
  if (!memory || !memory.projects || memory.projects.length === 0) {
    return 'uplifting'; // default theme
  }

  // Find most successful project
  const sorted = memory.projects
    .filter(p => p.socialMetrics?.engagement)
    .sort((a, b) => (b.socialMetrics?.engagement || 0) - (a.socialMetrics?.engagement || 0));

  if (sorted.length > 0 && sorted[0].theme) {
    console.log(`Learning from successful project: ${sorted[0].projectId} (theme: ${sorted[0].theme})`);
    return sorted[0].theme;
  }

  return 'reflective';
}

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { Allow: 'POST' },
      body: JSON.stringify({ ok: false, error: 'method_not_allowed' }),
    };
  }

  try {
    const payload: CurateRequest = event.body ? JSON.parse(event.body) : {};
    const { projectId, vaultPath = './Sir-TRAV-scott', maxScenes = 5 } = payload;

    if (!projectId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, error: 'projectId required' }),
      };
    }

    console.log(`🎬 Director Agent: Curating media for ${projectId}`);

    // Step 1: Read memory index and learn
    const memory = readMemoryIndex(vaultPath);
    const learnedTheme = learnFromHistory(memory);

    console.log(`✨ Learned theme from memory: ${learnedTheme}`);

    // Step 2: Mock curation (in production, use Gemini AI)
    // This would analyze actual images/videos from vaultPath/intake/
    const curatedScenes: Scene[] = [
      {
        file: 'IMG_001.jpg',
        type: 'image',
        order: 1,
        caption: 'Opening shot: Family gathering',
        duration: 3,
      },
      {
        file: 'VID_002.mp4',
        type: 'video',
        order: 2,
        caption: 'Moment of connection',
        duration: 5,
      },
      {
        file: 'IMG_003.jpg',
        type: 'image',
        order: 3,
        caption: 'Sunset reflection',
        duration: 4,
      },
    ];

    // Step 3: Determine mood and pacing
    const mood = learnedTheme === 'uplifting' ? 'warm' : 'contemplative';
    const pacing = 'moderate';

    console.log(`✅ Director curated ${curatedScenes.length} scenes`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        projectId,
        theme: learnedTheme,
        mood,
        pacing,
        curated_media: curatedScenes,
        metadata: {
          agent: 'director',
          learned_from_memory: memory !== null,
          timestamp: new Date().toISOString(),
        },
      }),
    };
  } catch (error) {
    console.error('Director agent error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: 'curate_failed',
        detail: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};

export default handler;
