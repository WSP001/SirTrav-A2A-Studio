import type { Handler, HandlerEvent } from '@netlify/functions';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * ATTRIBUTION AGENT (7th Agent)
 * 
 * FOR THE COMMONS GOOD
 * 
 * Compiles credits for all AI services used in video production:
 * - Director: Gemini (media curation)
 * - Writer: GPT-4 (narrative generation)
 * - Voice: ElevenLabs (text-to-speech)
 * - Composer: Suno (music generation)
 * - Editor: FFmpeg (video compilation)
 * 
 * Output: credits.json + optional credits slate image
 */

type AttributionInput = {
  projectId: string;
  curated_file?: string;
  music_file?: string;
  voice_file?: string;
  video_file?: string;
};

type Credits = {
  project_id: string;
  created_at: string;
  services_used: {
    director: {
      service: string;
      model: string;
      task: string;
    };
    writer: {
      service: string;
      model: string;
      task: string;
    };
    voice: {
      service: string;
      model: string;
      task: string;
      character_count?: number;
    };
    composer: {
      service: string;
      model: string;
      task: string;
      duration_sec?: number;
    };
    editor: {
      service: string;
      tool: string;
      task: string;
    };
  };
  commons_good_statement: string;
  license: string;
};

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const input: AttributionInput = JSON.parse(event.body || '{}');

    if (!input.projectId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'projectId required' }),
      };
    }

    const tmpDir = process.env.TMPDIR || '/tmp';
    const projectDir = join(tmpDir, input.projectId);

    // Gather metadata from previous agent outputs
    let musicDuration = 90; // default
    let charCount = 0;

    // Try to read music metadata
    if (input.music_file && existsSync(input.music_file)) {
      try {
        const musicData = JSON.parse(readFileSync(input.music_file, 'utf-8'));
        musicDuration = musicData.durationSec || 90;
      } catch (error) {
        console.warn('Could not read music metadata:', error);
      }
    }

    // Build comprehensive credits
    const credits: Credits = {
      project_id: input.projectId,
      created_at: new Date().toISOString(),
      services_used: {
        director: {
          service: 'Google Gemini',
          model: 'gemini-pro',
          task: 'Media curation and thematic direction',
        },
        writer: {
          service: 'OpenAI',
          model: 'gpt-4',
          task: 'Narrative script generation',
        },
        voice: {
          service: 'ElevenLabs',
          model: 'eleven_multilingual_v2',
          task: 'Text-to-speech narration synthesis',
          character_count: charCount,
        },
        composer: {
          service: 'Suno AI',
          model: 'suno-v3',
          task: 'Original soundtrack composition',
          duration_sec: musicDuration,
        },
        editor: {
          service: 'FFmpeg',
          tool: 'ffmpeg 6.0',
          task: 'Video compilation and audio mixing',
        },
      },
      commons_good_statement: 
        'This video was created using AI tools in service of the Commons Good. ' +
        'All AI services are credited transparently. SirTrav A2A Studio is ' +
        'committed to ethical AI use and proper attribution.',
      license: 'CC BY-SA 4.0 (Creative Commons Attribution-ShareAlike)',
    };

    // Write credits.json to project directory
    const creditsPath = join(projectDir, 'credits.json');
    writeFileSync(creditsPath, JSON.stringify(credits, null, 2), 'utf-8');

    console.log(`✅ Attribution credits generated for ${input.projectId}`);

    // Return result
    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        message: 'Attribution credits generated',
        credits_file: creditsPath,
        credits,
      }),
    };

  } catch (error) {
    console.error('Error generating attribution:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to generate attribution',
        detail: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};

export default handler;
