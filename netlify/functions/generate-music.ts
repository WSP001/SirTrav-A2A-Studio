/**
 * COMPOSER AGENT - Generate Music
 * Agent 4 of 7 in the D2A Pipeline
 * 
 * PURPOSE: Suno music generation with beat grid + Netlify Blobs storage
 * 
 * INPUT: { projectId, mood, tempo, genre, prompt }
 * OUTPUT: { musicUrl, duration, beatGrid[], bpm, stored }
 * 
 * REAL INTEGRATION: Uses Suno API + Netlify Blobs
 */

import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { audioStore } from "./lib/storage";

interface MusicRequest {
  projectId: string;
  mood: string;
  tempo?: number;
  genre?: string;
  duration?: number;
  prompt?: string;  // Custom prompt for Suno
  instrumental?: boolean;  // Instrumental only (no vocals)
}

interface BeatPoint {
  time: number;
  type: 'downbeat' | 'upbeat' | 'accent';
  intensity: number;
}

interface MusicResponse {
  success: boolean;
  projectId: string;
  musicUrl: string;
  duration: number;
  beatGrid: BeatPoint[];
  bpm: number;
  genre: string;
  mood: string;
  placeholder: boolean;
  stored: boolean;
  cost?: number;  // Estimated cost in cents
  sunoId?: string;  // Suno generation ID for tracking
}

/**
 * Generate beat grid for video synchronization
 */
function generateBeatGrid(duration: number, bpm: number): BeatPoint[] {
  const beatGrid: BeatPoint[] = [];
  const secondsPerBeat = 60 / bpm;
  
  let time = 0;
  let beatIndex = 0;
  
  while (time < duration) {
    const isDownbeat = beatIndex % 4 === 0;
    const isAccent = beatIndex % 8 === 0;
    
    beatGrid.push({
      time: Math.round(time * 1000) / 1000, // Round to milliseconds
      type: isAccent ? 'accent' : isDownbeat ? 'downbeat' : 'upbeat',
      intensity: isAccent ? 1.0 : isDownbeat ? 0.8 : 0.5,
    });
    
    time += secondsPerBeat;
    beatIndex++;
  }
  
  return beatGrid;
}

/**
 * Select tempo based on mood
 */
function selectTempo(mood: string, requestedTempo?: number): number {
  if (requestedTempo) return requestedTempo;
  
  const moodTempos: Record<string, number> = {
    'exciting': 120,
    'adventure': 110,
    'inspiring': 100,
    'calm': 70,
    'reflection': 65,
    'dramatic': 90,
    'cinematic': 85,
  };
  
  return moodTempos[mood] || 85;
}

/**
 * Build Suno prompt from mood and genre
 */
function buildSunoPrompt(request: MusicRequest): string {
  if (request.prompt) return request.prompt;
  
  const moodDescriptors: Record<string, string> = {
    'exciting': 'energetic, uplifting, adventurous',
    'adventure': 'epic, heroic, inspiring journey',
    'inspiring': 'hopeful, motivational, uplifting',
    'calm': 'peaceful, serene, relaxing',
    'reflection': 'contemplative, emotional, introspective',
    'dramatic': 'intense, powerful, cinematic tension',
    'cinematic': 'orchestral, film score, emotional',
    'playful': 'fun, whimsical, lighthearted',
    'mysterious': 'enigmatic, suspenseful, intriguing',
  };
  
  const genreStyles: Record<string, string> = {
    'ambient': 'ambient electronic, atmospheric pads',
    'orchestral': 'full orchestra, strings, brass',
    'acoustic': 'acoustic guitar, piano, natural instruments',
    'electronic': 'synth, electronic beats, modern',
    'folk': 'folk instruments, warm, organic',
    'cinematic': 'film score, epic orchestral',
  };
  
  const moodDesc = moodDescriptors[request.mood] || 'cinematic, emotional';
  const genreStyle = genreStyles[request.genre || 'cinematic'] || 'orchestral';
  
  return `${moodDesc}, ${genreStyle}, ${request.instrumental !== false ? 'instrumental only, no vocals' : 'with subtle vocals'}`;
}

/**
 * Estimate cost in cents (Suno pricing: ~$0.05 per generation)
 */
function estimateCost(duration: number): number {
  // Suno charges per generation, roughly $0.05 per song
  return Math.ceil(duration / 60) * 5; // 5 cents per minute
}

interface SunoGenerationResult {
  audioBuffer: Buffer | null;
  sunoId: string | null;
}

/**
 * Generate music with Suno API
 * Uses the unofficial Suno API pattern (suno-api or similar)
 */
async function generateWithSuno(request: MusicRequest): Promise<SunoGenerationResult> {
  const apiKey = process.env.SUNO_API_KEY;
  const apiUrl = process.env.SUNO_API_URL || 'https://api.suno.ai/v1';
  
  if (!apiKey) {
    console.log('⚠️ No Suno API key, using placeholder mode');
    return { audioBuffer: null, sunoId: null };
  }
  
  try {
    const prompt = buildSunoPrompt(request);
    console.log(`🎵 Suno prompt: "${prompt}"`);
    
    // Step 1: Create generation request
    const createResponse = await fetch(`${apiUrl}/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        duration: request.duration || 90,
        make_instrumental: request.instrumental !== false,
        wait_audio: true,  // Wait for audio to be ready
      }),
    });
    
    if (!createResponse.ok) {
      console.error('Suno API error:', createResponse.statusText);
      return { audioBuffer: null, sunoId: null };
    }
    
    const result = await createResponse.json();
    const sunoId = result.id || result.generation_id;
    
    // Step 2: Get audio URL and download
    const audioUrl = result.audio_url || result.url;
    if (!audioUrl) {
      console.error('No audio URL in Suno response');
      return { audioBuffer: null, sunoId };
    }
    
    // Download the audio file
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      console.error('Failed to download Suno audio');
      return { audioBuffer: null, sunoId };
    }
    
    const arrayBuffer = await audioResponse.arrayBuffer();
    return { 
      audioBuffer: Buffer.from(arrayBuffer), 
      sunoId 
    };
    
  } catch (error) {
    console.error('Suno request failed:', error);
    return { audioBuffer: null, sunoId: null };
  }
}

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  console.log('🎵 COMPOSER AGENT - Generate Music');
  
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
    const request: MusicRequest = JSON.parse(event.body || '{}');
    
    if (!request.projectId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'projectId is required' }),
      };
    }
    
    // Set defaults
    request.mood = request.mood || 'cinematic';
    request.genre = request.genre || 'ambient';
    request.duration = request.duration || 90;
    
    const bpm = selectTempo(request.mood, request.tempo);
    
    // Try Suno, fallback to placeholder
    const sunoResult = await generateWithSuno(request);
    const isPlaceholder = !sunoResult.audioBuffer;
    
    let musicUrl: string;
    let stored = false;
    
    if (sunoResult.audioBuffer) {
      // REAL: Store music in Netlify Blobs
      const musicKey = `${request.projectId}/soundtrack.mp3`;
      const uploadResult = await audioStore.uploadData(musicKey, sunoResult.audioBuffer, {
        contentType: 'audio/mpeg',
        metadata: {
          projectId: request.projectId,
          mood: request.mood,
          genre: request.genre || 'cinematic',
          bpm: String(bpm),
          duration: String(request.duration),
          sunoId: sunoResult.sunoId || '',
        },
      });
      
      if (uploadResult.ok && uploadResult.publicUrl) {
        musicUrl = uploadResult.publicUrl;
        stored = true;
        console.log(`📦 Stored music to Netlify Blobs: ${musicKey}`);
      } else {
        console.error('Failed to store music:', uploadResult.error);
        musicUrl = `error://storage-failed/${request.projectId}`;
      }
    } else {
      // Placeholder mode - no actual audio
      musicUrl = `placeholder://music/${request.projectId}.mp3`;
    }
    
    // Generate beat grid for video synchronization
    const beatGrid = generateBeatGrid(request.duration, bpm);
    const cost = estimateCost(request.duration);
    
    const response: MusicResponse = {
      success: true,
      projectId: request.projectId,
      musicUrl,
      duration: request.duration,
      beatGrid,
      bpm,
      genre: request.genre,
      mood: request.mood,
      placeholder: isPlaceholder,
      stored,
      cost,
      sunoId: sunoResult.sunoId || undefined,
    };
    
    console.log(`✅ Composer Agent: ${isPlaceholder ? 'Placeholder' : 'Generated'} ${request.duration}s music, ${bpm} BPM, stored: ${stored}`);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };
    
  } catch (error) {
    console.error('❌ Composer Agent error:', error);
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
