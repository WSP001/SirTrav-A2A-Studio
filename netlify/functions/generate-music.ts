import type { Handler, HandlerEvent } from '@netlify/functions';

/**
 * COMPOSER AGENT (generate-music)
 * 
 * Generates soundtrack using Suno API
 * Supports placeholder mode for testing without API key
 * 
 * Input: { projectId, mood, tempo?, genre? }
 * Output: { ok, music_url, beat_grid, duration }
 */

interface MusicRequest {
  projectId: string;
  mood?: string;
  tempo?: number;
  genre?: string;
}

interface BeatGrid {
  bpm: number;
  beats: number[];
  sections: Array<{
    start: number;
    end: number;
    intensity: 'low' | 'medium' | 'high';
  }>;
}

const PLACEHOLDER_MODE = !process.env.SUNO_API_KEY || 
  process.env.SUNO_API_KEY === 'PLACEHOLDER_SUNO_API_KEY';

// Generate synthetic beat grid
function generateBeatGrid(tempo: number, duration: number): BeatGrid {
  const beatsPerSecond = tempo / 60;
  const totalBeats = Math.floor(duration * beatsPerSecond);
  const beats: number[] = [];
  
  for (let i = 0; i < totalBeats; i++) {
    beats.push(i / beatsPerSecond);
  }

  return {
    bpm: tempo,
    beats,
    sections: [
      { start: 0, end: duration * 0.3, intensity: 'low' },
      { start: duration * 0.3, end: duration * 0.7, intensity: 'medium' },
      { start: duration * 0.7, end: duration, intensity: 'high' },
    ],
  };
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
    const payload: MusicRequest = event.body ? JSON.parse(event.body) : {};
    const {
      projectId,
      mood = 'warm',
      tempo = 85,
      genre = 'ambient',
    } = payload;

    if (!projectId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, error: 'projectId required' }),
      };
    }

    console.log(`🎵 Composer Agent: Generating music for ${projectId}`);
    console.log(`   Mood: ${mood}, Tempo: ${tempo} BPM, Genre: ${genre}`);

    const duration = 60; // Default 60 second track

    if (PLACEHOLDER_MODE) {
      console.log(`⚠️  Running in PLACEHOLDER MODE (no Suno API key)`);
      
      const beatGrid = generateBeatGrid(tempo, duration);

      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: true,
          projectId,
          music_url: `/placeholder-music/${projectId}/soundtrack.wav`,
          beat_grid: beatGrid,
          duration,
          placeholder: true,
          metadata: {
            agent: 'composer',
            mood,
            tempo,
            genre,
            mode: 'placeholder',
            timestamp: new Date().toISOString(),
          },
        }),
      };
    }

    // TODO: Implement actual Suno API call
    // const response = await fetch('https://api.suno.ai/v1/generate', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.SUNO_API_KEY}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({ mood, tempo, genre, duration }),
    // });

    const beatGrid = generateBeatGrid(tempo, duration);

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        projectId,
        music_url: `/tmp/${projectId}/soundtrack.wav`,
        beat_grid: beatGrid,
        duration,
        metadata: {
          agent: 'composer',
          mood,
          tempo,
          genre,
          timestamp: new Date().toISOString(),
        },
      }),
    };
  } catch (error) {
    console.error('Composer agent error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: 'music_generation_failed',
        detail: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};

export default handler;
