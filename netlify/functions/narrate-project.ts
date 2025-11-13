import type { Handler, HandlerEvent } from '@netlify/functions';

/**
 * WRITER AGENT (narrate-project)
 * 
 * Drafts reflective first-person script based on curated scenes
 * 
 * Input: { projectId, curated_media, theme, mood }
 * Output: { ok, narrative: string, word_count }
 */

interface NarrateRequest {
  projectId: string;
  curated_media?: Array<{
    file: string;
    caption?: string;
    order: number;
  }>;
  theme?: string;
  mood?: string;
}

// Generate narrative based on scenes (stub - in production use Gemini/GPT)
function generateNarrative(theme: string, mood: string, sceneCount: number): string {
  const narratives: Record<string, string> = {
    uplifting: `This week reminded us of the simple joys that make life meaningful.

Each moment captured here tells a story of connection, of laughter shared and memories made. The warmth we felt in these times together continues to brighten our days.

As we look back on these ${sceneCount} moments, we're reminded that life's greatest treasures are the people we share it with.`,
    
    reflective: `Looking back on this week, I find myself grateful for the quiet moments.

There's something profound in the everyday—the way light filters through a window, the comfort of familiar spaces, the gentle rhythm of our days together.

These ${sceneCount} scenes capture not just what we did, but how it felt to be present, to be together, to simply be.`,
    
    contemplative: `This week unfolded with a quietness that invited reflection.

In ${sceneCount} fleeting moments, we found depth. Each image holds a story, each story a truth about who we are and what matters most.

Time moves forward, but these memories remain—anchors in the stream, reminders of what endures.`,
  };

  return narratives[theme] || narratives.reflective;
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
    const payload: NarrateRequest = event.body ? JSON.parse(event.body) : {};
    const {
      projectId,
      curated_media = [],
      theme = 'reflective',
      mood = 'contemplative',
    } = payload;

    if (!projectId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, error: 'projectId required' }),
      };
    }

    console.log(`📝 Writer Agent: Drafting narrative for ${projectId}`);
    console.log(`   Theme: ${theme}, Mood: ${mood}, Scenes: ${curated_media.length}`);

    // Generate narrative
    const narrative = generateNarrative(theme, mood, curated_media.length);
    const wordCount = narrative.split(/\s+/).length;

    console.log(`✅ Writer completed: ${wordCount} words`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        projectId,
        narrative,
        word_count: wordCount,
        metadata: {
          agent: 'writer',
          theme,
          mood,
          scene_count: curated_media.length,
          timestamp: new Date().toISOString(),
        },
      }),
    };
  } catch (error) {
    console.error('Writer agent error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: 'narrate_failed',
        detail: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};

export default handler;
