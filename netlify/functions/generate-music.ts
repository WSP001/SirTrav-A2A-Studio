/**
 * COMPOSER AGENT - Generate Music
 * Agent 4 of 7 in the D2A Pipeline
 * 
 * PURPOSE: Suno music generation with beat grid (placeholder mode)
 * 
 * INPUT: { projectId, mood, tempo, genre }
 * OUTPUT: { musicUrl, duration, beatGrid[], bpm, placeholder }
 */

import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

interface MusicRequest {
  projectId: string;
  mood: string;
  tempo?: number;
  genre?: string;
  duration?: number;
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
 * Generate music with Suno (if API available)
 */
async function generateWithSuno(request: MusicRequest): Promise<string | null> {
  const apiKey = process.env.SUNO_API_KEY;
  
  if (!apiKey) {
    console.log('⚠️ No Suno API key, using placeholder mode');
    return null;
  }
  
  // Suno API integration would go here
  // For now, return null to use placeholder mode
  return null;
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
    const sunoUrl = await generateWithSuno(request);
    const isPlaceholder = !sunoUrl;
    
    const musicUrl = isPlaceholder
      ? `placeholder://music/${request.projectId}.wav`
      : sunoUrl;
    
    // Generate beat grid for video synchronization
    const beatGrid = generateBeatGrid(request.duration, bpm);
    
    const response: MusicResponse = {
      success: true,
      projectId: request.projectId,
      musicUrl: musicUrl!,
      duration: request.duration,
      beatGrid,
      bpm,
      genre: request.genre,
      mood: request.mood,
      placeholder: isPlaceholder,
    };
    
    console.log(`✅ ${isPlaceholder ? 'Placeholder' : 'Generated'} music: ${request.duration}s, ${bpm} BPM, ${beatGrid.length} beats`);
    
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
