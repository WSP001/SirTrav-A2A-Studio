/**
 * VOICE AGENT - Text to Speech
 * Agent 3 of 7 in the D2A Pipeline
 * 
 * PURPOSE: ElevenLabs TTS synthesis with Netlify Blobs storage
 * 
 * INPUT: { projectId, text, voice_id, character }
 * OUTPUT: { audioUrl, duration, voice, character, stored }
 * 
 * REAL INTEGRATION: Uses ElevenLabs API + Netlify Blobs
 */

import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { audioStore } from "./lib/storage";

interface TTSRequest {
  projectId: string;
  text: string;
  voice_id?: string;
  character?: string;  // For multi-character narration
  segment?: number;    // Segment number for long scripts
}

interface TTSResponse {
  success: boolean;
  projectId: string;
  audioUrl: string;
  duration: number;
  voice: string;
  character?: string;
  placeholder: boolean;
  wordCount: number;
  stored: boolean;
  cost?: number;  // Estimated cost in cents
}

// ElevenLabs voice mapping - Extended for Sir James characters
const VOICES: Record<string, { id: string; description: string }> = {
  // Default narration voices
  'Rachel': { id: '21m00Tcm4TlvDq8ikWAM', description: 'Warm female narrator' },
  'Adam': { id: 'pNInz6obpgDQGcFmaJgB', description: 'Deep male narrator' },
  'Antoni': { id: 'ErXwobaYiN019PkySvjV', description: 'Young male voice' },
  'Bella': { id: 'EXAVITQu4vr4xnSDxMaL', description: 'Soft female voice' },
  'Josh': { id: 'TxGEqnHWrfWFTfGW9XjX', description: 'American male' },
  'Arnold': { id: 'VR6AewLTigWG4xSOukaG', description: 'Crisp male voice' },
  'Domi': { id: 'AZnzlk1XvdvUeBnXmlld', description: 'Strong female voice' },
  'Elli': { id: 'MF3mGyEYCl7XYWbV9V6O', description: 'Emotional female' },
  
  // Sir James character voices (custom or mapped)
  'SirJames': { id: 'pNInz6obpgDQGcFmaJgB', description: 'Sir James - wise adventurer' },
  'Narrator': { id: '21m00Tcm4TlvDq8ikWAM', description: 'Story narrator' },
  'Child': { id: 'jBpfuIE2acCO8z3wKNLl', description: 'Young child voice' },
};

// Character to voice mapping for Sir James stories
const CHARACTER_VOICES: Record<string, string> = {
  'sir_james': 'SirJames',
  'narrator': 'Narrator', 
  'child': 'Child',
  'default': 'Rachel',
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

/**
 * Estimate cost in cents (ElevenLabs pricing: ~$0.30 per 1000 chars)
 */
function estimateCost(text: string): number {
  const chars = text.length;
  return Math.ceil((chars / 1000) * 30); // 30 cents per 1000 chars
}

/**
 * Get voice ID from voice name or character
 */
function getVoiceId(voiceName?: string, character?: string): string {
  // First check character mapping
  if (character && CHARACTER_VOICES[character.toLowerCase()]) {
    const mappedVoice = CHARACTER_VOICES[character.toLowerCase()];
    return VOICES[mappedVoice]?.id || VOICES['Rachel'].id;
  }
  
  // Then check direct voice name
  if (voiceName && VOICES[voiceName]) {
    return VOICES[voiceName].id;
  }
  
  // Default to Rachel
  return VOICES['Rachel'].id;
}

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  console.log('🎤 VOICE AGENT - Text to Speech (Real Integration)');
  
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
    const voiceId = getVoiceId(request.voice_id, request.character);
    const wordCount = request.text.split(/\s+/).length;
    const segment = request.segment || 0;
    
    // Try ElevenLabs, fallback to placeholder
    const audioBuffer = await generateWithElevenLabs(request.text, voiceId);
    const isPlaceholder = !audioBuffer;
    
    let audioUrl: string;
    let stored = false;
    
    if (audioBuffer) {
      // REAL: Store audio in Netlify Blobs
      const audioKey = `${request.projectId}/narration_${segment}.mp3`;
      const uploadResult = await audioStore.uploadData(audioKey, audioBuffer, {
        contentType: 'audio/mpeg',
        metadata: {
          projectId: request.projectId,
          voice: voiceName,
          character: request.character || 'narrator',
          wordCount: String(wordCount),
          segment: String(segment),
        },
      });
      
      if (uploadResult.ok && uploadResult.publicUrl) {
        audioUrl = uploadResult.publicUrl;
        stored = true;
        console.log(`📦 Stored audio to Netlify Blobs: ${audioKey}`);
      } else {
        console.error('Failed to store audio:', uploadResult.error);
        audioUrl = `error://storage-failed/${request.projectId}`;
      }
    } else {
      // Placeholder mode - no actual audio
      audioUrl = `placeholder://narration/${request.projectId}_${segment}.mp3`;
    }
    
    const duration = estimateDuration(request.text);
    const cost = estimateCost(request.text);
    
    const response: TTSResponse = {
      success: true,
      projectId: request.projectId,
      audioUrl,
      duration,
      voice: voiceName,
      character: request.character,
      placeholder: isPlaceholder,
      wordCount,
      stored,
      cost,
    };
    
    console.log(`✅ Voice Agent: ${isPlaceholder ? 'Placeholder' : 'Generated'} ${duration}s audio, voice: ${voiceName}, stored: ${stored}`);
    
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
