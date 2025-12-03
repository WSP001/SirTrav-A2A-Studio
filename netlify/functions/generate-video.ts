import type { Handler, HandlerEvent } from '@netlify/functions';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';

/**
 * GENERATE-VIDEO ORCHESTRATOR
 * 
 * This is the main entry point for the 7-agent A2A pipeline.
 * The UI calls this function, and it orchestrates:
 *   Director → Writer → Voice → Composer → Editor → Attribution → Publisher
 * 
 * For MVP testing, returns a static test video URL.
 * Long-term: calls run-manifest.mjs and reads publish_result.json.
 * 
 * Input: { projectId, projectMode?, prompt }
 * Output: { ok: true, projectId, videoUrl, creditsUrl? }
 */

interface GenerateVideoRequest {
  projectId: string;
  projectMode?: 'commons_public' | 'family_private' | 'biz_internal';
  prompt?: string;
  images?: Array<{ id: string; url: string }>;
}

interface GenerateVideoResponse {
  ok: boolean;
  projectId: string;
  videoUrl?: string;
  creditsUrl?: string;
  duration?: number;
  status?: 'completed' | 'processing' | 'error';
  error?: string;
  detail?: string;
  pipeline_steps?: {
    director: 'completed' | 'pending' | 'skipped';
    writer: 'completed' | 'pending' | 'skipped';
    voice: 'completed' | 'pending' | 'skipped';
    composer: 'completed' | 'pending' | 'skipped';
    editor: 'completed' | 'pending' | 'skipped';
    attribution: 'completed' | 'pending' | 'skipped';
    publisher: 'completed' | 'pending' | 'skipped';
  };
}

// ============================================================================
// Test Mode: Return static video for MVP validation
// ============================================================================

function getTestVideoResponse(projectId: string): GenerateVideoResponse {
  console.log(`🎬 [generate-video] TEST MODE: Returning static test video for ${projectId}`);
  
  return {
    ok: true,
    projectId,
    videoUrl: '/test-assets/test-video.mp4',
    creditsUrl: '/test-assets/credits.json',
    duration: 15,
    status: 'completed',
    pipeline_steps: {
      director: 'completed',
      writer: 'completed',
      voice: 'completed',
      composer: 'completed',
      editor: 'completed',
      attribution: 'completed',
      publisher: 'completed',
    },
  };
}

// ============================================================================
// Production Mode: Call real A2A pipeline
// ============================================================================

async function runRealPipeline(
  projectId: string,
  projectMode: string,
  prompt: string,
  images: Array<{ id: string; url: string }> = []
): Promise<GenerateVideoResponse> {
  console.log(`🎬 [generate-video] PRODUCTION MODE: Running pipeline for ${projectId}`);
  console.log(`📋 Project mode: ${projectMode}`);
  console.log(`📝 Prompt: ${prompt}`);
  console.log(`🖼️ Images: ${images.length}`);

  // TODO: Implement real pipeline calls
  // 1. Call curate-media (Director)
  // 2. Call narrate-project (Writer)
  // 3. Call text-to-speech (Voice)
  // 4. Call generate-music (Composer)
  // 5. Call ffmpeg_compile (Editor) - NOT YET IMPLEMENTED
  // 6. Call generate-attribution (Attribution)
  // 7. Call publish (Publisher)

  // For now, return test video until Editor is implemented
  console.log('⚠️ Editor agent not implemented yet - returning test video');
  return getTestVideoResponse(projectId);
}

// ============================================================================
// Main Handler
// ============================================================================

export const handler: Handler = async (event: HandlerEvent) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Only POST allowed
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...headers, Allow: 'POST' },
      body: JSON.stringify({ ok: false, error: 'method_not_allowed' }),
    };
  }

  try {
    // Parse request body
    const body: GenerateVideoRequest = event.body ? JSON.parse(event.body) : {};
    const { 
      projectId, 
      projectMode = 'commons_public', 
      prompt = '',
      images = [] 
    } = body;

    // Validate projectId
    if (!projectId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          ok: false, 
          error: 'projectId_required',
          detail: 'Request must include a projectId' 
        }),
      };
    }

    console.log('🎬 generate-video called:', { projectId, projectMode, promptLength: prompt.length });

    // Decide mode: test vs production
    const useTestMode = process.env.USE_TEST_VIDEO === 'true' || 
                        !process.env.OPENAI_API_KEY ||
                        process.env.NODE_ENV !== 'production';

    let response: GenerateVideoResponse;

    if (useTestMode) {
      response = getTestVideoResponse(projectId);
    } else {
      response = await runRealPipeline(projectId, projectMode, prompt, images);
    }

    // Log result
    console.log('✅ generate-video complete:', {
      projectId: response.projectId,
      hasVideoUrl: !!response.videoUrl,
      status: response.status,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };

  } catch (error) {
    console.error('❌ generate-video error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: 'generation_failed',
        detail: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};

export default handler;
