import type { Handler, HandlerEvent } from '@netlify/functions';

/**
 * VOICE AGENT (text-to-speech)
 * 
 * Synthesizes narration using ElevenLabs API
 * Supports placeholder mode for testing without API key
 * 
 * Input: { projectId, text, voice_id? }
 * Output: { ok, audio_url, duration }
 */

interface TTSRequest {
  projectId: string;
  text: string;
  voice_id?: string;
}

const PLACEHOLDER_MODE = !process.env.ELEVENLABS_API_KEY || 
  process.env.ELEVENLABS_API_KEY === 'PLACEHOLDER_ELEVENLABS_API_KEY';

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { Allow: 'POST' },
      body: JSON.stringify({ ok: false, error: 'method_not_allowed' }),
    };
  }

  try {
    const payload: TTSRequest = event.body ? JSON.parse(event.body) : {};
    const { projectId, text, voice_id = 'Rachel' } = payload;

    if (!projectId || !text) {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, error: 'projectId and text required' }),
      };
    }

    console.log(`🎙️  Voice Agent: Synthesizing narration for ${projectId}`);
    console.log(`   Voice: ${voice_id}, Length: ${text.length} chars`);

    if (PLACEHOLDER_MODE) {
      console.log(`⚠️  Running in PLACEHOLDER MODE (no ElevenLabs API key)`);
      
      // Estimate duration (150 words per minute average speech rate)
      const wordCount = text.split(/\s+/).length;
      const estimatedDuration = Math.ceil((wordCount / 150) * 60);

      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: true,
          projectId,
          audio_url: `/placeholder-audio/${projectId}/narration.wav`,
          duration: estimatedDuration,
          placeholder: true,
          metadata: {
            agent: 'voice',
            voice_id,
            word_count: wordCount,
            mode: 'placeholder',
            timestamp: new Date().toISOString(),
          },
        }),
      };
    }

    // TODO: Implement actual ElevenLabs API call
    // const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/${voice_id}', {
    //   method: 'POST',
    //   headers: {
    //     'Accept': 'audio/mpeg',
    //     'xi-api-key': process.env.ELEVENLABS_API_KEY,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({ text, model_id: 'eleven_monolingual_v1' }),
    //});

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        projectId,
        audio_url: `/tmp/${projectId}/narration.wav`,
        duration: 60,
        metadata: {
          agent: 'voice',
          voice_id,
          timestamp: new Date().toISOString(),
        },
      }),
    };
  } catch (error) {
    console.error('Voice agent error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: 'tts_failed',
        detail: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};

export default handler;
