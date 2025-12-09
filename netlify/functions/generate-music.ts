/**
 * COMPOSER AGENT - Generate Music v2.0.0
 * Agent 4 of 7 in the D2A Pipeline
 * 
 * PURPOSE: Music for video with multiple modes:
 *   - MANUAL: Use pre-registered audio file + beat grid
 *   - SUNO: Generate via Suno API (if available)
 *   - PLACEHOLDER: Fallback with no actual audio
 * 
 * INPUT: { projectId, mood, tempo, genre, prompt, manualFile?, bpm? }
 * OUTPUT: { musicUrl, duration, beatGrid[], bpm, stored, mode }
 * 
 * v2.0.0 Changes:
 *   - Added manual mode for pre-registered Suno/uploaded music
 *   - Beat grid loading from data/beat-grids/
 *   - Scene harmony support
 */

import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { audioStore } from "./lib/storage";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

interface MusicRequest {
  projectId: string;
  mood: string;
  tempo?: number;
  genre?: string;
  duration?: number;
  prompt?: string;  // Custom prompt for Suno
  instrumental?: boolean;  // Instrumental only (no vocals)
  // NEW: Manual mode - use pre-registered music
  manualFile?: string;  // e.g., "suno_week44_weekly_reflective_88bpm_90s.mp3"
  bpm?: number;  // Override BPM for manual file
  sceneType?: string;  // For scene harmony auto-selection
}

interface BeatPoint {
  time: number;
  type: 'downbeat' | 'upbeat' | 'accent';
  intensity: number;
  beat?: number;
  measure?: number;
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
  mode: 'manual' | 'suno' | 'placeholder';
  cost?: number;  // Estimated cost in cents
  sunoId?: string;  // Suno generation ID for tracking
  manualFile?: string;  // The manual file used
  gridSource?: string;  // Where beat grid came from
}

interface StoredBeatGrid {
  version?: number;
  project?: string;
  template?: string;
  bpm: number;
  duration: number;
  beats: Array<{
    t: number;
    beat?: number;
    downbeat?: boolean;
    measure?: number;
  }>;
}

/**
 * Load pre-registered beat grid from file
 */
function loadBeatGrid(filename: string): StoredBeatGrid | null {
  const gridPaths = [
    join(process.cwd(), 'data', 'beat-grids', `${filename}.json`),
    join('/var/task', 'data', 'beat-grids', `${filename}.json`),
    join(process.cwd(), `data/beat-grids/${filename}.json`),
  ];
  
  for (const gridPath of gridPaths) {
    try {
      if (existsSync(gridPath)) {
        const raw = readFileSync(gridPath, 'utf-8');
        const grid = JSON.parse(raw) as StoredBeatGrid;
        console.log(`✅ Loaded beat grid from: ${gridPath}`);
        return grid;
      }
    } catch (e) {
      console.warn(`⚠️ Failed to load grid from ${gridPath}:`, e);
    }
  }
  
  return null;
}

/**
 * Convert stored beat grid to API format
 */
function convertStoredGrid(stored: StoredBeatGrid): BeatPoint[] {
  return stored.beats.map((beat, index) => ({
    time: beat.t,
    type: beat.downbeat ? 'downbeat' : (index % 4 === 0 ? 'downbeat' : 'upbeat') as 'downbeat' | 'upbeat' | 'accent',
    intensity: beat.downbeat ? 0.8 : 0.5,
    beat: beat.beat || (index % 4) + 1,
    measure: beat.measure || Math.floor(index / 4) + 1,
  }));
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
      time: Math.round(time * 1000) / 1000,
      type: isAccent ? 'accent' : isDownbeat ? 'downbeat' : 'upbeat',
      intensity: isAccent ? 1.0 : isDownbeat ? 0.8 : 0.5,
      beat: (beatIndex % 4) + 1,
      measure: Math.floor(beatIndex / 4) + 1,
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
    'playful': 110,
    'tender': 76,
    'peaceful': 72,
  };
  
  return moodTempos[mood] || 85;
}

/**
 * Scene harmony mapping - auto-select template based on scene type
 */
const SCENE_HARMONY: Record<string, { template: string; bpm: number }> = {
  'opening': { template: 'morning_calm', bpm: 72 },
  'adventure': { template: 'adventure_theme', bpm: 96 },
  'middle': { template: 'upbeat_rider', bpm: 104 },
  'emotional': { template: 'tender_moment', bpm: 76 },
  'playful': { template: 'playful_discovery', bpm: 110 },
  'climax': { template: 'upbeat_rider', bpm: 104 },
  'outro': { template: 'sunset_glow', bpm: 84 },
  'reflection': { template: 'weekly_reflective', bpm: 88 },
};

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
    'tender': 'gentle, intimate, lullaby',
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
  return Math.ceil(duration / 60) * 5;
}

interface SunoGenerationResult {
  audioBuffer: Buffer | null;
  sunoId: string | null;
}

/**
 * Generate music with Suno API
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
        wait_audio: true,
      }),
    });
    
    if (!createResponse.ok) {
      console.error('Suno API error:', createResponse.statusText);
      return { audioBuffer: null, sunoId: null };
    }
    
    const result = await createResponse.json();
    const sunoId = result.id || result.generation_id;
    
    const audioUrl = result.audio_url || result.url;
    if (!audioUrl) {
      console.error('No audio URL in Suno response');
      return { audioBuffer: null, sunoId };
    }
    
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
  console.log('🎵 COMPOSER AGENT v2.0.0 - Generate Music');
  
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
    
    // ═══════════════════════════════════════════════════════════════
    // MODE 1: MANUAL - Use pre-registered music file
    // ═══════════════════════════════════════════════════════════════
    if (request.manualFile) {
      console.log(`📦 MANUAL MODE: Using pre-registered file: ${request.manualFile}`);
      
      // Try to load existing beat grid
      const storedGrid = loadBeatGrid(request.manualFile);
      
      let beatGrid: BeatPoint[];
      let bpm: number;
      let duration: number;
      let gridSource: string;
      
      if (storedGrid) {
        beatGrid = convertStoredGrid(storedGrid);
        bpm = request.bpm || storedGrid.bpm || 92;
        duration = storedGrid.duration || 90;
        gridSource = 'file';
        console.log(`✅ Loaded grid: ${beatGrid.length} beats, ${bpm} BPM, ${duration}s`);
      } else {
        // Generate grid from BPM if no stored grid
        bpm = request.bpm || 92;
        duration = request.duration || 90;
        beatGrid = generateBeatGrid(duration, bpm);
        gridSource = 'generated';
        console.log(`⚠️ No stored grid, generated: ${beatGrid.length} beats, ${bpm} BPM`);
      }
      
      const response: MusicResponse = {
        success: true,
        projectId: request.projectId,
        musicUrl: `/music/${request.manualFile}`,
        duration,
        beatGrid,
        bpm,
        genre: request.genre || 'cinematic',
        mood: request.mood || 'adventure',
        placeholder: false,
        stored: true,
        mode: 'manual',
        manualFile: request.manualFile,
        gridSource,
      };
      
      console.log(`✅ Composer Agent: Manual mode - ${request.manualFile}`);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(response),
      };
    }
    
    // ═══════════════════════════════════════════════════════════════
    // MODE 1.5: SCENE HARMONY - Auto-select based on scene type
    // ═══════════════════════════════════════════════════════════════
    if (request.sceneType && SCENE_HARMONY[request.sceneType]) {
      const harmony = SCENE_HARMONY[request.sceneType];
      console.log(`🎭 SCENE HARMONY: ${request.sceneType} → ${harmony.template} @ ${harmony.bpm} BPM`);
      
      // Try to find a pre-registered file for this template
      const possibleFiles = [
        `suno_${request.projectId}_${harmony.template}_${harmony.bpm}bpm_90s.mp3`,
        `suno_default_${harmony.template}_${harmony.bpm}bpm_90s.mp3`,
      ];
      
      for (const filename of possibleFiles) {
        const storedGrid = loadBeatGrid(filename);
        if (storedGrid) {
          console.log(`✅ Found scene harmony match: ${filename}`);
          const response: MusicResponse = {
            success: true,
            projectId: request.projectId,
            musicUrl: `/music/${filename}`,
            duration: storedGrid.duration,
            beatGrid: convertStoredGrid(storedGrid),
            bpm: storedGrid.bpm,
            genre: request.genre || 'cinematic',
            mood: request.sceneType,
            placeholder: false,
            stored: true,
            mode: 'manual',
            manualFile: filename,
            gridSource: 'scene-harmony',
          };
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(response),
          };
        }
      }
      
      // If no pre-registered file, fall through to Suno/placeholder with harmony BPM
      request.tempo = harmony.bpm;
      console.log(`⚠️ No pre-registered file for ${request.sceneType}, using harmony BPM: ${harmony.bpm}`);
    }
    
    // ═══════════════════════════════════════════════════════════════
    // MODE 2: SUNO API - Generate new music
    // ═══════════════════════════════════════════════════════════════
    
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
      // ═══════════════════════════════════════════════════════════════
      // MODE 3: PLACEHOLDER - No actual audio
      // ═══════════════════════════════════════════════════════════════
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
      mode: isPlaceholder ? 'placeholder' : 'suno',
      cost,
      sunoId: sunoResult.sunoId || undefined,
    };
    
    console.log(`✅ Composer Agent: ${response.mode} mode - ${request.duration}s music, ${bpm} BPM, stored: ${stored}`);
    
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
