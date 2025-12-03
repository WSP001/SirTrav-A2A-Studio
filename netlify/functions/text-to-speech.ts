/**
 * VOICE AGENT - Text to Speech
 * Agent 3 of 7 in the D2A Pipeline
 * 
 * PURPOSE: ElevenLabs TTS synthesis with placeholder mode
 * 
 * INPUT: { projectId, text, voice_id }
 * OUTPUT: { audioUrl, duration, voice, placeholder }
 */

import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

interface TTSRequest {
  projectId: string;
  text: string;
  voice_id?: string;
}

interface TTSResponse {
  success: boolean;
  projectId: string;
  audioUrl: string;
  duration: number;
  voice: string;
  placeholder: boolean;
  wordCount: number;
}

// ElevenLabs voice mapping
const VOICES: Record<string, string> = {
  'Rachel': '21m00Tcm4TlvDq8ikWAM',
  'Adam': 'pNInz6obpgDQGcFmaJgB',
  'Antoni': 'ErXwobaYiN019PkySvjV',
};

/**
 * Estimate audio duration from text (placeholder mode)
 * Average speaking rate: ~150 words per minute
 */
function estimateDuration(text: string): number {
  const wordCount = text.split(/\s+/).length;
  const wordsPerSecond = 150 / 60; // 2.5 words per second
  return Math.ceil(wordCount / wordsPerSecond);
}

/**
 * Generate speech with ElevenLabs (if API key available)
 */
async function generateWithElevenLabs(text: string, voiceId: string): Promise<Buffer | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey) {
    console.log('⚠️ No ElevenLabs API key, using placeholder mode');
    return null;
  }
  
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });
    
    if (!response.ok) {
      console.error('ElevenLabs API error:', response.statusText);
      return null;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
    
  } catch (error) {
    console.error('ElevenLabs request failed:', error);
    return null;
  }
}

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  console.log('🎤 VOICE AGENT - Text to Speech');
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }
  
  try {
    const request: TTSRequest = JSON.parse(event.body || '{}');
    
    if (!request.projectId || !request.text) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'projectId and text are required' }),
      };
    }
    
    const voiceName = request.voice_id || 'Rachel';
    const voiceId = VOICES[voiceName] || VOICES['Rachel'];
    const wordCount = request.text.split(/\s+/).length;
    
    // Try ElevenLabs, fallback to placeholder
    const audioBuffer = await generateWithElevenLabs(request.text, voiceId);
    const isPlaceholder = !audioBuffer;
    
    // In placeholder mode, we don't have actual audio
    // In production, we'd upload the buffer to storage and return URL
    const audioUrl = isPlaceholder 
      ? `placeholder://narration/${request.projectId}.wav`
      : `https://storage.example.com/${request.projectId}/narration.wav`;
    
    const duration = estimateDuration(request.text);
    
    const response: TTSResponse = {
      success: true,
      projectId: request.projectId,
      audioUrl,
      duration,
      voice: voiceName,
      placeholder: isPlaceholder,
      wordCount,
    };
    
    console.log(`✅ ${isPlaceholder ? 'Placeholder' : 'Generated'} audio: ${duration}s, voice: ${voiceName}`);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };
    
  } catch (error) {
    console.error('❌ Voice Agent error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
    };
  }
};

export { handler };
