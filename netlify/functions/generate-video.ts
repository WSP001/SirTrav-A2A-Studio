/**
 * generate-video.ts - Pipeline Orchestrator
 *
 * This endpoint orchestrates the entire 7-agent video generation pipeline.
 * It generates a runId and calls each agent sequentially, threading the runId
 * through every request for enterprise tracing.
 *
 * Flow:
 * 1. curate-media (Director) - Analyzes and curates input images
 * 2. narrate-project (Writer) - Generates narrative script
 * 3. text-to-speech (Voice) - Synthesizes narration audio
 * 4. generate-music (Composer) - Creates soundtrack
 * 5. compile-video (Editor) - Assembles final video
 * 6. generate-attribution (Attribution) - Generates credits
 * 7. publish (Publisher) - Uploads artifacts
 */
import type { Handler } from '@netlify/functions';

interface GenerateVideoRequest {
  projectId: string;
  projectMode?: 'commons_public' | 'business_public' | 'personal';
  prompt?: string;
  images?: Array<{ id: string; url: string; base64?: string }>;
  outputFormat?: {
    platform?: string;
    aspectRatio?: string;
    maxDuration?: number;
  };
  themePreference?: {
    attach: boolean;
    blobKey?: string;
    bpm?: number;
  };
}

interface AgentResult {
  success: boolean;
  data?: any;
  error?: string;
  duration_ms?: number;
  fallback?: boolean;
}

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

/**
 * Call an agent endpoint with runId threading
 */
async function callAgent(
  baseUrl: string,
  endpoint: string,
  projectId: string,
  runId: string,
  payload: Record<string, any>
): Promise<AgentResult> {
  const startTime = Date.now();

  try {
    const response = await fetch(`${baseUrl}/.netlify/functions/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        runId,  // CRITICAL: Always thread runId
        ...payload,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `${endpoint} failed with status ${response.status}`,
        duration_ms: Date.now() - startTime,
        fallback: true,
      };
    }

    return {
      success: true,
      data,
      duration_ms: Date.now() - startTime,
      fallback: data.placeholder === true || data.fallback === true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : `${endpoint} failed`,
      duration_ms: Date.now() - startTime,
      fallback: true,
    };
  }
}

/**
 * Determine pipeline mode based on agent fallback status
 */
function determinePipelineMode(results: Record<string, AgentResult>): string {
  const realAgents = Object.values(results).filter(r => r.success && !r.fallback).length;
  const total = Object.keys(results).length;

  if (realAgents === total) return 'FULL';
  if (realAgents >= 4) return 'ENHANCED';
  if (realAgents >= 2) return 'SIMPLE';
  return 'DEMO';
}

export const handler: Handler = async (event) => {
  // Handle CORS preflight
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
    const body: GenerateVideoRequest = event.body ? JSON.parse(event.body) : {};

    // Validate required fields
    if (!body.projectId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: 'projectId is required' }),
      };
    }

    const projectId = body.projectId;
    const runId = `run-${Date.now()}`;  // Generate unique runId
    const baseUrl = process.env.URL || 'http://localhost:8888';

    console.log(`\n========================================`);
    console.log(`GENERATE-VIDEO ORCHESTRATOR`);
    console.log(`Project: ${projectId}`);
    console.log(`Run: ${runId}`);
    console.log(`========================================\n`);

    const agentResults: Record<string, AgentResult> = {};

    // ========================================================================
    // STEP 1: DIRECTOR (curate-media)
    // ========================================================================
    console.log(`[1/7] Calling Director Agent...`);
    agentResults.director = await callAgent(baseUrl, 'curate-media', projectId, runId, {
      project_mode: body.projectMode || 'commons_public',
      images: body.images || [],
      max_scenes: 5,
    });
    console.log(`[1/7] Director: ${agentResults.director.success ? 'OK' : 'FALLBACK'}`);

    // ========================================================================
    // STEP 2: WRITER (narrate-project)
    // ========================================================================
    console.log(`[2/7] Calling Writer Agent...`);
    const mood = agentResults.director.data?.scenes?.[0]?.dominant_mood || 'reflective';
    agentResults.writer = await callAgent(baseUrl, 'narrate-project', projectId, runId, {
      theme: 'memory_recollection',
      mood,
      prompt: body.prompt,
      sceneCount: agentResults.director.data?.scenes?.length || 3,
    });
    console.log(`[2/7] Writer: ${agentResults.writer.success ? 'OK' : 'FALLBACK'}`);

    // ========================================================================
    // STEP 3: VOICE (text-to-speech)
    // ========================================================================
    console.log(`[3/7] Calling Voice Agent...`);
    const narrative = agentResults.writer.data?.narrative ||
                     agentResults.writer.data?.scenes?.map((s: any) => s.text).join(' ') ||
                     'Welcome to your memories.';
    agentResults.voice = await callAgent(baseUrl, 'text-to-speech', projectId, runId, {
      text: narrative,
      character: 'narrator',
    });
    console.log(`[3/7] Voice: ${agentResults.voice.success ? 'OK' : 'FALLBACK'}`);

    // ========================================================================
    // STEP 4: COMPOSER (generate-music)
    // ========================================================================
    console.log(`[4/7] Calling Composer Agent...`);
    if (body.themePreference?.attach && body.themePreference?.blobKey) {
      // Use attached theme music
      agentResults.composer = {
        success: true,
        data: {
          musicUrl: body.themePreference.blobKey,
          bpm: body.themePreference.bpm || 120,
          source: 'attached_theme',
        },
        duration_ms: 0,
        fallback: false,
      };
    } else {
      agentResults.composer = await callAgent(baseUrl, 'generate-music', projectId, runId, {
        mood,
        duration: 30,
        style: 'cinematic',
      });
    }
    console.log(`[4/7] Composer: ${agentResults.composer.success ? 'OK' : 'FALLBACK'}`);

    // ========================================================================
    // STEP 5: EDITOR (compile-video)
    // ========================================================================
    console.log(`[5/7] Calling Editor Agent...`);
    agentResults.editor = await callAgent(baseUrl, 'compile-video', projectId, runId, {
      scenes: agentResults.director.data?.scenes || [],
      audioUrl: agentResults.voice.data?.audioUrl,
      musicUrl: agentResults.composer.data?.musicUrl,
      outputFormat: body.outputFormat || { aspectRatio: '16:9' },
    });
    console.log(`[5/7] Editor: ${agentResults.editor.success ? 'OK' : 'FALLBACK'}`);

    // ========================================================================
    // STEP 6: ATTRIBUTION (generate-attribution)
    // ========================================================================
    console.log(`[6/7] Calling Attribution Agent...`);
    agentResults.attribution = await callAgent(baseUrl, 'generate-attribution', projectId, runId, {
      agents: {
        director: agentResults.director.fallback ? 'fallback' : 'openai_vision',
        writer: agentResults.writer.fallback ? 'fallback' : 'gpt4',
        voice: agentResults.voice.fallback ? 'placeholder' : 'elevenlabs',
        composer: agentResults.composer.fallback ? 'template' : 'suno',
        editor: agentResults.editor.fallback ? 'fallback' : 'ffmpeg',
      },
    });
    console.log(`[6/7] Attribution: ${agentResults.attribution.success ? 'OK' : 'FALLBACK'}`);

    // ========================================================================
    // STEP 7: PUBLISHER (publish)
    // ========================================================================
    console.log(`[7/7] Calling Publisher Agent...`);
    agentResults.publisher = await callAgent(baseUrl, 'publish', projectId, runId, {
      videoUrl: agentResults.editor.data?.videoUrl,
      creditsUrl: agentResults.attribution.data?.creditsUrl,
      platform: body.outputFormat?.platform || 'default',
    });
    console.log(`[7/7] Publisher: ${agentResults.publisher.success ? 'OK' : 'FALLBACK'}`);

    // ========================================================================
    // FINAL RESULT
    // ========================================================================
    const pipelineMode = determinePipelineMode(agentResults);
    const videoUrl = agentResults.editor.data?.videoUrl || '/test-assets/test-video.mp4';
    const creditsUrl = agentResults.attribution.data?.creditsUrl || '/test-assets/credits.json';

    console.log(`\n========================================`);
    console.log(`PIPELINE COMPLETE`);
    console.log(`Mode: ${pipelineMode}`);
    console.log(`Video: ${videoUrl}`);
    console.log(`========================================\n`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        projectId,
        runId,
        videoUrl,
        creditsUrl,
        pipelineMode,
        duration: agentResults.editor.data?.duration || 30,
        agentResults,
      }),
    };

  } catch (error) {
    console.error('generate-video error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : 'Pipeline orchestration failed',
      }),
    };
  }
};

export default handler;
