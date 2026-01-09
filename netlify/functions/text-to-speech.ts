/**
 * VOICE AGENT - Text to Speech (Modern)
 * POST: { projectId, runId, text, voice_id?, character?, segment? }
 * Returns JSON with audioUrl, duration, etc.
 * Uses ElevenLabs if key is present; placeholder otherwise.
 */
import { audioStore } from './lib/storage';
import { updateRunIndex } from './lib/runIndex';

interface TTSRequest {
  projectId: string;
  runId?: string;
  text: string;
  voice_id?: string;
  character?: string;
  segment?: number;
}

interface TTSResponse {
  success: boolean;
  projectId: string;
  runId: string;
  audioUrl: string;
  duration: number;
  voice: string;
  character?: string;
  placeholder: boolean;
  wordCount: number;
  stored: boolean;
  cost?: number;
}

const VOICES: Record<string, { id: string; description: string }> = {
  Rachel: { id: '21m00Tcm4TlvDq8ikWAM', description: 'Warm female narrator' },
  Adam: { id: 'pNInz6obpgDQGcFmaJgB', description: 'Deep male narrator' },
  Antoni: { id: 'ErXwobaYiN019PkySvjV', description: 'Young male voice' },
  Bella: { id: 'EXAVITQu4vr4xnSDxMaL', description: 'Soft female voice' },
  Josh: { id: 'TxGEqnHWrfWFTfGW9XjX', description: 'American male' },
  Arnold: { id: 'VR6AewLTigWG4xSOukaG', description: 'Crisp male voice' },
  Domi: { id: 'AZnzlk1XvdvUeBnXmlld', description: 'Strong female voice' },
  Elli: { id: 'MF3mGyEYCl7XYWbV9V6O', description: 'Emotional female' },
  SirJames: { id: 'pNInz6obpgDQGcFmaJgB', description: 'Sir James - wise adventurer' },
  Narrator: { id: '21m00Tcm4TlvDq8ikWAM', description: 'Story narrator' },
  Child: { id: 'jBpfuIE2acCO8z3wKNLl', description: 'Young child voice' },
};

const CHARACTER_VOICES: Record<string, string> = {
  sir_james: 'SirJames',
  narrator: 'Narrator',
  child: 'Child',
  default: 'Adam',
};

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function estimateDuration(text: string): number {
  const wordCount = text.split(/\s+/).length;
  const wordsPerSecond = 150 / 60;
  return Math.ceil(wordCount / wordsPerSecond);
}

async function generateWithElevenLabs(text: string, voiceId: string): Promise<Buffer | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return null;

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });
  if (!res.ok) return null;
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function estimateCost(text: string): number {
  return Math.ceil((text.length / 1000) * 30); // cents
}

function getVoiceId(voiceName?: string, character?: string): string {
  if (character && CHARACTER_VOICES[character.toLowerCase()]) {
    const mapped = CHARACTER_VOICES[character.toLowerCase()];
    return VOICES[mapped]?.id || VOICES.Adam.id;
  }
  if (voiceName && VOICES[voiceName]) return VOICES[voiceName].id;
  return VOICES.Adam.id;
}

export default async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  try {
    const request = (await req.json()) as TTSRequest;
    if (!request.projectId || !request.text) {
      return new Response(JSON.stringify({ error: 'projectId and text are required' }), { status: 400, headers });
    }

    const runId = request.runId || `run-${Date.now()}`;
    const voiceName = request.voice_id || 'Adam';
    const voiceId = getVoiceId(request.voice_id, request.character);
    const wordCount = request.text.split(/\s+/).length;
    const segment = request.segment || 0;

    const audioBuffer = await generateWithElevenLabs(request.text, voiceId);
    const isPlaceholder = !audioBuffer;
    let audioUrl: string;
    let stored = false;

    if (audioBuffer) {
      const key = `projects/${request.projectId}/runs/${runId}/narration_${segment}.mp3`;
      const upload = await audioStore.uploadData(key, audioBuffer, {
        contentType: 'audio/mpeg',
        metadata: {
          projectId: request.projectId,
          voice: voiceName,
          character: request.character || 'narrator',
          wordCount: String(wordCount),
          segment: String(segment),
        },
      });
      if (upload.ok && upload.publicUrl) {
        audioUrl = upload.publicUrl;
        stored = true;
      } else {
        audioUrl = `error://storage-failed/${request.projectId}`;
      }
    } else {
      audioUrl = `placeholder://narration/${request.projectId}_${segment}.mp3`;
    }

    const duration = estimateDuration(request.text);
    const cost = estimateCost(request.text);

    const response: TTSResponse = {
      success: true,
      projectId: request.projectId,
      runId,
      audioUrl,
      duration,
      voice: voiceName,
      character: request.character,
      placeholder: isPlaceholder,
      wordCount,
      stored,
      cost,
    };

    await updateRunIndex(request.projectId, runId, {
      narrationKey: stored ? `projects/${request.projectId}/runs/${runId}/narration_${segment}.mp3` : undefined,
      voice: {
        voiceId,
        modelId: 'eleven_monolingual_v1',
        characters: request.text.length,
        costCents: cost,
        placeholder: isPlaceholder,
        store: 'audio',
      },
    });

    return new Response(JSON.stringify(response), { status: 200, headers });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error?.message || 'Unknown error' }), {
      status: 500,
      headers,
    });
  }
};
