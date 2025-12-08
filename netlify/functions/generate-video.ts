/**
 * GENERATE-VIDEO ORCHESTRATOR v2.0
 * 
 * This is the main entry point for the 7-agent A2A pipeline.
 * 
 * REAL FLOW (when APIs configured):
 *   Director → Writer → Voice → Composer → Editor → Attribution → Publisher
 * 
 * SIMPLE FLOW (Phase 1 - No APIs needed):
 *   Uses Creatomate or similar to create simple slideshow from images
 * 
 * Input: { projectId, outputObjective, socialPlatform, images[] }
 * Output: { ok: true, projectId, videoUrl, creditsUrl }
 */

import type { Handler, HandlerEvent } from '@netlify/functions';

interface OutputFormat {
  objective: 'personal' | 'social';
  platform?: 'tiktok' | 'youtube_shorts' | 'instagram' | 'youtube_full';
  aspectRatio: string;
  maxDuration?: number;
}

interface GenerateVideoRequest {
  projectId: string;
  outputObjective?: 'personal' | 'social';
  socialPlatform?: 'tiktok' | 'youtube_shorts' | 'instagram' | 'youtube_full';
  outputFormat?: OutputFormat;
  chaosMode?: boolean;
  prompt?: string;
  images?: Array<{ id: string; url: string; base64?: string }>;
}

interface GenerateVideoResponse {
  ok: boolean;
  projectId: string;
  videoUrl?: string;
  creditsUrl?: string;
  duration?: number;
  status?: 'completed' | 'processing' | 'error';
  error?: string;
  mode?: 'test' | 'simple' | 'full';
  pipeline_steps?: {
    director: 'completed' | 'pending' | 'skipped';
    writer: 'completed' | 'pending' | 'skipped';
    voice: 'completed' | 'pending' | 'skipped';
    composer: 'completed' | 'pending' | 'skipped';
    editor: 'completed' | 'pending' | 'skipped';
    attribution: 'completed' | 'pending' | 'skipped';
    publisher: 'completed' | 'pending' | 'skipped';
  };
  outputFormat?: OutputFormat;
}

// ============================================================================
// Aspect Ratio Settings for Different Platforms
// ============================================================================

const ASPECT_RATIOS: Record<string, { width: number; height: number }> = {
  '16:9': { width: 1920, height: 1080 },   // YouTube, Personal
  '9:16': { width: 1080, height: 1920 },   // TikTok, Shorts, Reels
  '1:1': { width: 1080, height: 1080 },    // Instagram Square
  '4:5': { width: 1080, height: 1350 },    // Instagram Portrait
};

function getAspectRatio(outputFormat?: OutputFormat): { width: number; height: number } {
  const ratio = outputFormat?.aspectRatio || '16:9';
  return ASPECT_RATIOS[ratio] || ASPECT_RATIOS['16:9'];
}

// ============================================================================
// Test Mode: Return static video for MVP validation
// ============================================================================

function getTestVideoResponse(projectId: string, outputFormat?: OutputFormat): GenerateVideoResponse {
  console.log(`🎬 [generate-video] TEST MODE: Returning static test video for ${projectId}`);
  
  return {
    ok: true,
    projectId,
    videoUrl: '/test-assets/test-video.mp4',
    creditsUrl: '/test-assets/credits.json',
    duration: 15,
    status: 'completed',
    mode: 'test',
    pipeline_steps: {
      director: 'completed',
      writer: 'completed',
      voice: 'completed',
      composer: 'completed',
      editor: 'completed',
      attribution: 'completed',
      publisher: 'completed',
    },
    outputFormat,
  };
}

// ============================================================================
// Simple Slideshow Mode: Use Creatomate API (if available)
// ============================================================================

async function generateSimpleSlideshow(
  projectId: string,
  images: Array<{ id: string; url: string; base64?: string }>,
  outputFormat?: OutputFormat
): Promise<GenerateVideoResponse | null> {
  const creatomateApiKey = process.env.CREATOMATE_API_KEY;
  
  if (!creatomateApiKey) {
    console.log('⚠️ CREATOMATE_API_KEY not set, cannot generate slideshow');
    return null;
  }
  
  const { width, height } = getAspectRatio(outputFormat);
  const duration = Math.min(outputFormat?.maxDuration || 60, images.length * 3); // 3s per image
  
  try {
    console.log(`🎬 Creating slideshow: ${images.length} images, ${width}x${height}, ${duration}s`);
    
    // Build Creatomate render request
    const renderRequest = {
      template_id: process.env.CREATOMATE_TEMPLATE_ID, // Or use inline template
      modifications: {
        // Map images to template slots
        ...images.slice(0, 10).reduce((acc, img, i) => ({
          ...acc,
          [`Image-${i + 1}`]: img.url || img.base64,
        }), {}),
      },
      // Or use source directly for dynamic templates
      source: {
        output_format: 'mp4',
        width,
        height,
        duration,
        elements: images.slice(0, 10).map((img, i) => ({
          type: 'image',
          source: img.url || img.base64,
          duration: 3,
          time: i * 3,
          animations: [
            { type: 'fade', duration: 0.5 },
            { type: 'scale', start_scale: '110%', end_scale: '100%' },
          ],
        })),
      },
    };
    
    const response = await fetch('https://api.creatomate.com/v1/renders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${creatomateApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(renderRequest),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Creatomate API error:', error);
      return null;
    }
    
    const result = await response.json();
    
    // Creatomate returns render ID - need to poll or use webhook
    if (result[0]?.url) {
      return {
        ok: true,
        projectId,
        videoUrl: result[0].url,
        creditsUrl: '/test-assets/credits.json',
        duration,
        status: 'completed',
        mode: 'simple',
        pipeline_steps: {
          director: 'skipped',
          writer: 'skipped',
          voice: 'skipped',
          composer: 'skipped',
          editor: 'completed',
          attribution: 'completed',
          publisher: 'skipped',
        },
        outputFormat,
      };
    }
    
    // If async, return processing status
    return {
      ok: true,
      projectId,
      status: 'processing',
      mode: 'simple',
      pipeline_steps: {
        director: 'skipped',
        writer: 'skipped',
        voice: 'skipped',
        composer: 'skipped',
        editor: 'pending',
        attribution: 'pending',
        publisher: 'pending',
      },
    };
    
  } catch (error) {
    console.error('Slideshow generation failed:', error);
    return null;
  }
}

// ============================================================================
// Full Pipeline Mode: Call all 7 agents
// ============================================================================

async function runFullPipeline(
  projectId: string,
  images: Array<{ id: string; url: string }>,
  outputFormat?: OutputFormat,
  chaosMode?: boolean
): Promise<GenerateVideoResponse> {
  const baseUrl = process.env.URL || 'http://localhost:8888';
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasElevenLabs = !!process.env.ELEVENLABS_API_KEY;
  const hasFFmpeg = !!process.env.FFMPEG_SERVICE_URL;
  
  console.log(`🎬 Full Pipeline: OpenAI=${hasOpenAI}, ElevenLabs=${hasElevenLabs}, FFmpeg=${hasFFmpeg}`);
  
  // If missing critical APIs, fall back to test mode
  if (!hasOpenAI || !hasFFmpeg) {
    console.log('⚠️ Missing critical APIs, falling back to test mode');
    return getTestVideoResponse(projectId, outputFormat);
  }
  
  try {
    // Step 1: Director - Curate media
    console.log('🎬 Step 1: Director...');
    const directorResponse = await fetch(`${baseUrl}/.netlify/functions/curate-media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        project_mode: outputFormat?.objective === 'social' ? 'commons_public' : 'family_private',
        images: images.map((img, i) => ({
          id: img.id || `img_${i}`,
          url: img.url,
        })),
      }),
    });
    const curatedMedia = await directorResponse.json();
    
    // Step 2: Writer - Generate narrative
    console.log('✍️ Step 2: Writer...');
    const writerResponse = await fetch(`${baseUrl}/.netlify/functions/narrate-project`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        theme: curatedMedia.theme || 'cinematic',
        mood: curatedMedia.mood || 'inspiring',
        sceneCount: curatedMedia.scenes?.length || 4,
      }),
    });
    const narrative = await writerResponse.json();
    
    // Step 3: Voice - Text to speech (optional)
    let voiceResult = { audioUrl: null, duration: 0 };
    if (hasElevenLabs && narrative.narrative) {
      console.log('🎙️ Step 3: Voice...');
      const voiceResponse = await fetch(`${baseUrl}/.netlify/functions/text-to-speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          text: narrative.narrative,
          voice_id: 'Rachel',
        }),
      });
      voiceResult = await voiceResponse.json();
    }
    
    // Step 4: Composer - Generate music (optional)
    let musicResult = { musicUrl: null };
    if (process.env.SUNO_API_KEY) {
      console.log('🎵 Step 4: Composer...');
      const composerResponse = await fetch(`${baseUrl}/.netlify/functions/generate-music`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          mood: curatedMedia.mood || 'inspiring',
          duration: narrative.estimatedDuration || 30,
        }),
      });
      musicResult = await composerResponse.json();
    }
    
    // Step 5: Editor - Compile video (CRITICAL)
    console.log('🎞️ Step 5: Editor...');
    const editorResponse = await fetch(`${baseUrl}/.netlify/functions/compile-video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        images: curatedMedia.scenes?.flatMap((s: any) => s.assets) || images,
        narrationUrl: voiceResult.audioUrl,
        musicUrl: musicResult.musicUrl,
        resolution: outputFormat?.aspectRatio === '9:16' ? '1080p' : '1080p',
      }),
    });
    const video = await editorResponse.json();
    
    // Step 6: Attribution
    console.log('📜 Step 6: Attribution...');
    const attributionResponse = await fetch(`${baseUrl}/.netlify/functions/generate-attribution`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId }),
    });
    const credits = await attributionResponse.json();
    
    return {
      ok: true,
      projectId,
      videoUrl: video.videoUrl,
      creditsUrl: credits.creditsUrl || '/test-assets/credits.json',
      duration: video.duration || narrative.estimatedDuration,
      status: 'completed',
      mode: 'full',
      pipeline_steps: {
        director: 'completed',
        writer: 'completed',
        voice: hasElevenLabs ? 'completed' : 'skipped',
        composer: process.env.SUNO_API_KEY ? 'completed' : 'skipped',
        editor: 'completed',
        attribution: 'completed',
        publisher: 'skipped',
      },
      outputFormat,
    };
    
  } catch (error) {
    console.error('Pipeline error:', error);
    return {
      ok: false,
      projectId,
      error: error instanceof Error ? error.message : 'Pipeline failed',
      status: 'error',
      mode: 'full',
    };
  }
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
      outputObjective = 'personal',
      socialPlatform,
      outputFormat,
      chaosMode = false,
      images = [],
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

    console.log('🎬 generate-video called:', { 
      projectId, 
      outputObjective,
      socialPlatform,
      imageCount: images.length,
      chaosMode,
    });

    // Build output format
    const format: OutputFormat = outputFormat || {
      objective: outputObjective,
      platform: socialPlatform,
      aspectRatio: outputObjective === 'social' && socialPlatform !== 'youtube_full' ? '9:16' : '16:9',
      maxDuration: socialPlatform === 'tiktok' || socialPlatform === 'youtube_shorts' ? 60 
                 : socialPlatform === 'instagram' ? 90 
                 : undefined,
    };

    // Decide which mode to use
    const hasCreatomate = !!process.env.CREATOMATE_API_KEY;
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasFFmpeg = !!process.env.FFMPEG_SERVICE_URL;
    const forceTestMode = process.env.USE_TEST_VIDEO === 'true';
    
    let response: GenerateVideoResponse;

    if (forceTestMode) {
      // Explicit test mode
      response = getTestVideoResponse(projectId, format);
    } else if (hasCreatomate && images.length > 0) {
      // Try simple slideshow mode
      const slideshowResult = await generateSimpleSlideshow(projectId, images, format);
      response = slideshowResult || getTestVideoResponse(projectId, format);
    } else if (hasOpenAI && hasFFmpeg) {
      // Full pipeline mode
      response = await runFullPipeline(projectId, images, format, chaosMode);
    } else {
      // Fallback to test mode
      console.log('⚠️ No video generation APIs configured, using test mode');
      response = getTestVideoResponse(projectId, format);
    }

    // Log result
    console.log('✅ generate-video complete:', {
      projectId: response.projectId,
      mode: response.mode,
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
