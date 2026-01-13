/**
 * COMPOSER AGENT - Generate Music v2.1.0-THEME (Modern)
 * Modes: attached_theme, manual, scene harmony, suno, placeholder
 */
import { audioStore } from './lib/storage';
import { artifactsStore } from './lib/storage';
import { updateRunIndex } from './lib/runIndex';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { readMemoryIndex, learnFromHistory } from './lib/memory';

interface ThemePreference {
  attached: boolean;
  url?: string;
  filename?: string;
  bpm?: number;
  duration?: number;
  grid?: StoredBeatGrid;
}
interface MusicRequest {
  projectId: string;
  runId?: string;
  mood: string;
  tempo?: number;
  genre?: string;
  duration?: number;
  prompt?: string;
  instrumental?: boolean;
  manualFile?: string;
  bpm?: number;
  sceneType?: string;
  themePreference?: ThemePreference;
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
  mode: 'attached_theme' | 'manual' | 'suno' | 'placeholder';
  cost?: number;
  sunoId?: string;
  manualFile?: string;
  gridSource?: string;
  beatGridKey?: string;
}
interface StoredBeatGrid {
  version?: number;
  project?: string;
  template?: string;
  bpm: number;
  duration: number;
  beats: Array<{ t: number; beat?: number; downbeat?: boolean; measure?: number }>;
}

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const SCENE_HARMONY: Record<string, { template: string; bpm: number }> = {
  opening: { template: 'morning_calm', bpm: 72 },
  adventure: { template: 'adventure_theme', bpm: 96 },
  middle: { template: 'upbeat_rider', bpm: 104 },
  emotional: { template: 'tender_moment', bpm: 76 },
  playful: { template: 'playful_discovery', bpm: 110 },
  climax: { template: 'upbeat_rider', bpm: 104 },
  outro: { template: 'sunset_glow', bpm: 84 },
  reflection: { template: 'weekly_reflective', bpm: 88 },
};

function loadBeatGrid(filename: string): StoredBeatGrid | null {
  const paths = [
    join(process.cwd(), 'data', 'beat-grids', `${filename}.json`),
    join('/var/task', 'data', 'beat-grids', `${filename}.json`),
    join(process.cwd(), `data/beat-grids/${filename}.json`),
  ];
  for (const p of paths) {
    try {
      if (existsSync(p)) {
        const raw = readFileSync(p, 'utf-8');
        return JSON.parse(raw) as StoredBeatGrid;
      }
    } catch (e) {
      console.warn('beat grid load failed', p, e);
    }
  }
  return null;
}

function convertStoredGrid(stored: StoredBeatGrid): BeatPoint[] {
  return stored.beats.map((beat, index) => ({
    time: beat.t,
    type: beat.downbeat ? 'downbeat' : (index % 4 === 0 ? 'downbeat' : 'upbeat'),
    intensity: beat.downbeat ? 0.8 : 0.5,
    beat: beat.beat || (index % 4) + 1,
    measure: beat.measure || Math.floor(index / 4) + 1,
  }));
}

function generateBeatGrid(duration: number, bpm: number): BeatPoint[] {
  const grid: BeatPoint[] = [];
  const spb = 60 / bpm;
  let t = 0;
  let i = 0;
  while (t < duration) {
    const down = i % 4 === 0;
    const accent = i % 8 === 0;
    grid.push({
      time: Math.round(t * 1000) / 1000,
      type: accent ? 'accent' : down ? 'downbeat' : 'upbeat',
      intensity: accent ? 1.0 : down ? 0.8 : 0.5,
      beat: (i % 4) + 1,
      measure: Math.floor(i / 4) + 1,
    });
    t += spb;
    i++;
  }
  return grid;
}

function selectTempo(mood: string, requested?: number): number {
  if (requested) return requested;
  const moodTempos: Record<string, number> = {
    exciting: 120,
    adventure: 110,
    inspiring: 100,
    calm: 70,
    reflection: 65,
    dramatic: 90,
    cinematic: 85,
    playful: 110,
    tender: 76,
    peaceful: 72,
  };
  return moodTempos[mood] || 85;
}

function buildSunoPrompt(request: MusicRequest): string {
  if (request.prompt) return request.prompt;
  const moodDesc: Record<string, string> = {
    exciting: 'energetic, uplifting, adventurous',
    adventure: 'epic, heroic, inspiring journey',
    inspiring: 'hopeful, motivational, uplifting',
    calm: 'peaceful, serene, relaxing',
    reflection: 'contemplative, emotional, introspective',
    dramatic: 'intense, powerful, cinematic tension',
    cinematic: 'orchestral, film score, emotional',
    playful: 'fun, whimsical, lighthearted',
    mysterious: 'enigmatic, suspenseful, intriguing',
    tender: 'gentle, intimate, lullaby',
  };
  const genreStyle: Record<string, string> = {
    ambient: 'ambient electronic, atmospheric pads',
    orchestral: 'full orchestra, strings, brass',
    acoustic: 'acoustic guitar, piano, natural instruments',
    electronic: 'synth, electronic beats, modern',
    folk: 'folk instruments, warm, organic',
    cinematic: 'film score, epic orchestral',
  };
  const moodTxt = moodDesc[request.mood] || 'cinematic, emotional';
  const genreTxt = genreStyle[request.genre || 'cinematic'] || 'orchestral';
  return `${moodTxt}, ${genreTxt}, ${request.instrumental !== false ? 'instrumental only, no vocals' : 'with subtle vocals'}`;
}

function estimateCost(duration: number): number {
  return Math.ceil(duration / 60) * 5; // cents (placeholder estimate)
}

interface SunoGenerationResult {
  audioBuffer: Buffer | null;
  sunoId: string | null;
}

async function generateWithSuno(request: MusicRequest): Promise<SunoGenerationResult> {
  const apiKey = process.env.SUNO_API_KEY;
  const apiUrl = process.env.SUNO_API_URL || 'https://api.suno.ai/v1';
  if (!apiKey) return { audioBuffer: null, sunoId: null };
  try {
    const prompt = buildSunoPrompt(request);
    const createResponse = await fetch(`${apiUrl}/generate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        duration: request.duration || 90,
        make_instrumental: request.instrumental !== false,
        wait_audio: true,
      }),
    });
    if (!createResponse.ok) return { audioBuffer: null, sunoId: null };
    const result = await createResponse.json();
    const sunoId = result.id || result.generation_id;
    const audioUrl = result.audio_url || result.url;
    if (!audioUrl) return { audioBuffer: null, sunoId };
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) return { audioBuffer: null, sunoId };
    const arrayBuffer = await audioResponse.arrayBuffer();
    return { audioBuffer: Buffer.from(arrayBuffer), sunoId };
  } catch (e) {
    console.error('Suno request failed:', e);
    return { audioBuffer: null, sunoId: null };
  }
}

export default async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });

  try {
    const request = (await req.json()) as MusicRequest;
    if (!request.projectId) {
      return new Response(JSON.stringify({ error: 'projectId is required' }), { status: 400, headers });
    }

    // runId threading: MUST come from orchestrator, not generated locally
    if (!request.runId) {
      console.warn('[Composer] runId not provided - generating fallback. This should come from orchestrator!');
    }
    const runId = request.runId || `run-${Date.now()}`;

    // Mode: attached theme
    if (request.themePreference?.attached && request.themePreference.url) {
      const theme = request.themePreference;
      let beatGrid: BeatPoint[];
      if (theme.grid) {
        beatGrid = convertStoredGrid(theme.grid);
      } else {
        beatGrid = generateBeatGrid(theme.duration || 90, theme.bpm || 92);
      }
      const response: MusicResponse = {
        success: true,
        projectId: request.projectId,
        musicUrl: theme.url,
        duration: theme.duration || 90,
        beatGrid,
        bpm: theme.bpm || 92,
        genre: request.genre || 'cinematic',
        mood: request.mood || 'adventure',
        placeholder: false,
        stored: true,
        mode: 'attached_theme',
        manualFile: theme.filename,
        gridSource: theme.grid ? 'attached' : 'generated',
      };
      await updateRunIndex(request.projectId, runId, {
        musicKey: theme.filename,
        music: {
          mode: 'attached_theme',
          bpm: theme.bpm,
          duration: theme.duration,
          manualFile: theme.filename,
          store: 'audio',
        },
      });
      return new Response(JSON.stringify(response), { status: 200, headers });
    }

    // Mode: manual
    if (request.manualFile) {
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
      } else {
        bpm = request.bpm || 92;
        duration = request.duration || 90;
        beatGrid = generateBeatGrid(duration, bpm);
        gridSource = 'generated';
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
      await updateRunIndex(request.projectId, runId, {
        musicKey: `/music/${request.manualFile}`,
        beatGridKey: gridSource === 'file' ? `music/${request.manualFile}.json` : undefined,
        music: {
          mode: 'manual',
          bpm,
          duration,
          manualFile: request.manualFile,
          gridSource,
          store: 'audio',
        },
      });
      return new Response(JSON.stringify(response), { status: 200, headers });
    }

    // Scene harmony assist
    if (request.sceneType && SCENE_HARMONY[request.sceneType]) {
      const harmony = SCENE_HARMONY[request.sceneType];
      const possible = [
        `suno_${request.projectId}_${harmony.template}_${harmony.bpm}bpm_90s.mp3`,
        `suno_default_${harmony.template}_${harmony.bpm}bpm_90s.mp3`,
      ];
      for (const file of possible) {
        const grid = loadBeatGrid(file);
        if (grid) {
          const response: MusicResponse = {
            success: true,
            projectId: request.projectId,
            musicUrl: `/music/${file}`,
            duration: grid.duration,
            beatGrid: convertStoredGrid(grid),
            bpm: grid.bpm,
            genre: request.genre || 'cinematic',
            mood: request.sceneType,
            placeholder: false,
            stored: true,
            mode: 'manual',
            manualFile: file,
            gridSource: 'scene-harmony',
          };
          await updateRunIndex(request.projectId, runId, {
            musicKey: `/music/${file}`,
            beatGridKey: `music/${file}.json`,
            music: {
              mode: 'manual',
              bpm: grid.bpm,
              duration: grid.duration,
              manualFile: file,
              gridSource: 'scene-harmony',
              store: 'audio',
            },
          });
          return new Response(JSON.stringify(response), { status: 200, headers });
        }
      }
      request.tempo = SCENE_HARMONY[request.sceneType].bpm;
    }

    // Suno or placeholder

    // Memory integration
    const memory = readMemoryIndex('./Sir-TRAV-scott');
    const learnedMood = learnFromHistory(memory);

    request.mood = request.mood || learnedMood;
    request.genre = request.genre || (learnedMood === 'energetic' ? 'electronic' : 'ambient');
    request.duration = request.duration || 90;
    const bpm = selectTempo(request.mood, request.tempo);
    const sunoResult = await generateWithSuno(request);
    const isPlaceholder = !sunoResult.audioBuffer;
    let musicUrl: string;
    let stored = false;

    let beatGridKey: string | undefined;
    if (sunoResult.audioBuffer) {
      const musicKey = `projects/${request.projectId}/runs/${runId}/music.mp3`;
      const upload = await audioStore.uploadData(musicKey, sunoResult.audioBuffer, {
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
      beatGridKey = `projects/${request.projectId}/runs/${runId}/beat_grid.json`;
      await artifactsStore().setJSON(beatGridKey, beatGrid, {
        metadata: { projectId: request.projectId, runId, bpm: String(bpm), duration: String(request.duration) },
      });
      if (upload.ok && upload.publicUrl) {
        musicUrl = upload.publicUrl;
        stored = true;
      } else {
        musicUrl = `error://storage-failed/${request.projectId}`;
      }
    } else {
      musicUrl = `placeholder://music/${request.projectId}.mp3`;
    }

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
      beatGridKey,
    };

    await updateRunIndex(request.projectId, runId, {
      musicKey: stored ? `projects/${request.projectId}/runs/${runId}/music.mp3` : response.musicUrl,
      beatGridKey,
      music: {
        mode: response.mode,
        bpm,
        duration: request.duration,
        sunoId: response.sunoId || null,
        manualFile: response.manualFile,
        gridSource: response.gridSource,
        store: 'audio',
      },
    });

    return new Response(JSON.stringify(response), { status: 200, headers });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ success: false, error: e?.message || 'Internal server error' }),
      { status: 500, headers }
    );
  }
};
