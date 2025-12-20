/**
 * run-pipeline-background v3.0 - REAL AGENT EXECUTION
 * Background worker that executes the 7-agent pipeline with REAL API calls.
 * No more mocks - calls actual agent endpoints when APIs are available.
 *
 * Writes progress + final status to runsStore so UI can poll/SSE safely.
 */
import type { Handler } from '@netlify/functions';
import { runsStore, artifactsStore } from './lib/storage';
import { updateRunIndex } from './lib/runIndex';

type RunStatus = 'queued' | 'running' | 'complete' | 'failed';

interface PipelinePayload {
  images?: Array<{ id: string; url: string; base64?: string }>;
  projectMode?: string;
  outputFormat?: {
    objective?: 'personal' | 'social';
    platform?: string;
    aspectRatio?: string;
    maxDuration?: number;
  };
  chaosMode?: boolean;
  prompt?: string;
}

interface PipelineArtifacts {
  director?: any;
  writer?: any;
  voice?: any;
  composer?: any;
  editor?: any;
  attribution?: any;
  finalVideoUrl?: string;
  creditsUrl?: string;
  mode?: 'full' | 'enhanced' | 'simple' | 'test';
}

function makeRunKey(projectId: string, runId: string) {
  return `${projectId}/${runId}.json`;
}

async function updateRun(
  projectId: string,
  runId: string,
  patch: Partial<{
    status: RunStatus;
    progress: number;
    step: string;
    message: string;
    artifacts: PipelineArtifacts;
    errors: string[];
    error?: string;
  }>
) {
  const store = runsStore();
  const key = makeRunKey(projectId, runId);
  const now = new Date().toISOString();
  const existing = (await store.getJSON(key)) as Record<string, unknown> | null;
  const next = {
    ...(existing || { projectId, runId, createdAt: now }),
    ...patch,
    updatedAt: now,
  };
  await store.setJSON(key, next, { metadata: { projectId, runId, status: next.status as string } });
  await updateRunIndex(projectId, runId, {
    status: (next.status as RunStatus) || 'running',
  });
}

/**
 * Determine pipeline mode based on available API keys
 */
function detectPipelineMode(): 'full' | 'enhanced' | 'simple' | 'test' {
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasElevenLabs = !!process.env.ELEVENLABS_API_KEY;
  const hasFFmpeg = !!process.env.FFMPEG_SERVICE_URL;
  const forceTest = process.env.USE_TEST_VIDEO === 'true';

  if (forceTest) return 'test';
  if (hasOpenAI && hasFFmpeg && hasElevenLabs) return 'full';
  if (hasOpenAI) return 'enhanced';
  return 'simple';
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200 };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const projectId: string | undefined = body.projectId;
    const runId: string | undefined = body.runId;
    const payloadKey: string | undefined = body.payloadKey;

    if (!projectId || !runId) {
      return { statusCode: 400, body: 'projectId and runId are required' };
    }

    const store = runsStore();
    const key = makeRunKey(projectId, runId);
    const existing = await store.getJSON(key) as any;

    // Idempotency: if already succeeded, exit early
    if (existing?.status === 'complete') {
      return { statusCode: 200, body: JSON.stringify({ ok: true, projectId, runId, status: 'complete' }) };
    }

    // Soft lock: if another worker set running recently with high progress, respect it
    if (existing?.status === 'running' && existing?.progress >= 99) {
      return { statusCode: 200, body: JSON.stringify({ ok: true, projectId, runId, status: existing.status }) };
    }

    // Load payload
    let payload: PipelinePayload = {};
    if (payloadKey) {
      const loaded = await store.getJSON(payloadKey);
      if (loaded) {
        payload = loaded as PipelinePayload;
      }
    }

    const baseUrl = process.env.URL || 'http://localhost:8888';
    const mode = detectPipelineMode();
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasElevenLabs = !!process.env.ELEVENLABS_API_KEY;
    const hasSuno = !!process.env.SUNO_API_KEY;
    const hasFFmpeg = !!process.env.FFMPEG_SERVICE_URL;

    console.log(`🎬 Pipeline starting for ${projectId}/${runId}`);
    console.log(`📊 Mode: ${mode} | OpenAI: ${hasOpenAI} | ElevenLabs: ${hasElevenLabs} | Suno: ${hasSuno} | FFmpeg: ${hasFFmpeg}`);
    console.log(`📦 Payload: ${payload.images?.length || 0} images`);

    const artifacts: PipelineArtifacts = { mode };
    const errors: string[] = [];

    // ========================================================================
    // STEP 1: DIRECTOR AGENT - Curate Media with Vision
    // ========================================================================
    await updateRun(projectId, runId, {
      status: 'running',
      progress: 5,
      step: 'director',
      message: 'Analyzing your photos with AI vision...'
    });

    try {
      console.log('🎬 Step 1: Director Agent...');

      if (hasOpenAI && payload.images && payload.images.length > 0) {
        const directorResponse = await fetch(`${baseUrl}/.netlify/functions/curate-media`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: projectId,
            project_mode: payload.projectMode || 'family_private',
            images: payload.images.map((img, i) => ({
              id: img.id || `img_${i}`,
              url: img.url,
              base64: img.base64,
            })),
          }),
        });

        if (directorResponse.ok) {
          artifacts.director = await directorResponse.json();
          console.log('✅ Director Agent complete:', artifacts.director.summary || 'Success');
        } else {
          const errorText = await directorResponse.text();
          console.warn('⚠️ Director Agent failed:', errorText);
          errors.push(`Director: ${errorText}`);
          // Use fallback
          artifacts.director = {
            ok: true,
            fallback: true,
            theme: 'cinematic',
            mood: 'inspiring',
            scenes: payload.images?.map((img, i) => ({
              scene_id: `scene_${i}`,
              assets: [{ url: img.url }]
            })) || []
          };
        }
      } else {
        // No OpenAI or no images - use simple passthrough
        console.log('⚠️ Skipping Director (no OpenAI key or no images)');
        artifacts.director = {
          ok: true,
          skipped: true,
          theme: 'cinematic',
          mood: 'inspiring',
          scenes: payload.images?.map((img, i) => ({
            scene_id: `scene_${i}`,
            assets: [{ url: img.url }]
          })) || []
        };
      }
    } catch (error) {
      console.error('❌ Director Agent error:', error);
      errors.push(`Director: ${error instanceof Error ? error.message : 'Unknown error'}`);
      artifacts.director = { ok: false, error: String(error) };
    }

    await updateRun(projectId, runId, {
      progress: 15,
      step: 'director',
      message: 'Director Agent completed'
    });

    // ========================================================================
    // STEP 2: WRITER AGENT - Generate Narrative
    // ========================================================================
    await updateRun(projectId, runId, {
      progress: 20,
      step: 'writer',
      message: 'Writing your story...'
    });

    try {
      console.log('✍️ Step 2: Writer Agent...');

      const writerResponse = await fetch(`${baseUrl}/.netlify/functions/narrate-project`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          theme: artifacts.director?.theme || artifacts.director?.summary?.dominant_mood || 'cinematic',
          mood: artifacts.director?.mood || 'inspiring',
          sceneCount: artifacts.director?.scenes?.length || payload.images?.length || 4,
        }),
      });

      if (writerResponse.ok) {
        artifacts.writer = await writerResponse.json();
        console.log(`✅ Writer Agent complete: ${artifacts.writer.wordCount || 0} words (${artifacts.writer.generatedBy})`);
      } else {
        const errorText = await writerResponse.text();
        console.warn('⚠️ Writer Agent failed:', errorText);
        errors.push(`Writer: ${errorText}`);
        artifacts.writer = {
          success: true,
          fallback: true,
          narrative: 'A journey through captured moments, each frame telling its own story.',
          estimatedDuration: 30
        };
      }
    } catch (error) {
      console.error('❌ Writer Agent error:', error);
      errors.push(`Writer: ${error instanceof Error ? error.message : 'Unknown error'}`);
      artifacts.writer = {
        success: false,
        error: String(error),
        narrative: 'Your story unfolds across these beautiful moments.',
        estimatedDuration: 30
      };
    }

    await updateRun(projectId, runId, {
      progress: 30,
      step: 'writer',
      message: 'Writer Agent completed'
    });

    // ========================================================================
    // STEP 3: VOICE AGENT - Text to Speech (Optional)
    // ========================================================================
    await updateRun(projectId, runId, {
      progress: 35,
      step: 'voice',
      message: hasElevenLabs ? 'Synthesizing voice narration...' : 'Voice agent (skipped - no ElevenLabs key)'
    });

    try {
      console.log('🎙️ Step 3: Voice Agent...');

      if (hasElevenLabs && artifacts.writer?.narrative) {
        const voiceResponse = await fetch(`${baseUrl}/.netlify/functions/text-to-speech`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            runId,
            text: artifacts.writer.narrative,
            voice_id: process.env.ELEVENLABS_DEFAULT_VOICE_ID || 'Rachel',
          }),
        });

        if (voiceResponse.ok) {
          artifacts.voice = await voiceResponse.json();
          console.log(`✅ Voice Agent complete: ${artifacts.voice.placeholder ? 'placeholder' : 'real audio'}`);
        } else {
          const errorText = await voiceResponse.text();
          console.warn('⚠️ Voice Agent failed:', errorText);
          errors.push(`Voice: ${errorText}`);
          artifacts.voice = { success: true, skipped: true, audioUrl: null };
        }
      } else {
        console.log('⚠️ Skipping Voice Agent (no ElevenLabs key or no narrative)');
        artifacts.voice = { success: true, skipped: true, audioUrl: null };
      }
    } catch (error) {
      console.error('❌ Voice Agent error:', error);
      errors.push(`Voice: ${error instanceof Error ? error.message : 'Unknown error'}`);
      artifacts.voice = { success: false, error: String(error), audioUrl: null };
    }

    await updateRun(projectId, runId, {
      progress: 45,
      step: 'voice',
      message: 'Voice Agent completed'
    });

    // ========================================================================
    // STEP 4: COMPOSER AGENT - Generate Music (Optional)
    // ========================================================================
    await updateRun(projectId, runId, {
      progress: 50,
      step: 'composer',
      message: hasSuno ? 'Composing soundtrack...' : 'Composer agent (using beat grid templates)'
    });

    try {
      console.log('🎵 Step 4: Composer Agent...');

      const composerResponse = await fetch(`${baseUrl}/.netlify/functions/generate-music`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          runId,
          mood: artifacts.director?.mood || 'cinematic',
          duration: artifacts.writer?.estimatedDuration || 30,
          sceneType: artifacts.director?.scenes?.[0]?.story_role || 'opening',
        }),
      });

      if (composerResponse.ok) {
        artifacts.composer = await composerResponse.json();
        console.log(`✅ Composer Agent complete: ${artifacts.composer.mode} mode, ${artifacts.composer.bpm}bpm`);
      } else {
        const errorText = await composerResponse.text();
        console.warn('⚠️ Composer Agent failed:', errorText);
        errors.push(`Composer: ${errorText}`);
        artifacts.composer = { success: true, skipped: true, musicUrl: null };
      }
    } catch (error) {
      console.error('❌ Composer Agent error:', error);
      errors.push(`Composer: ${error instanceof Error ? error.message : 'Unknown error'}`);
      artifacts.composer = { success: false, error: String(error), musicUrl: null };
    }

    await updateRun(projectId, runId, {
      progress: 60,
      step: 'composer',
      message: 'Composer Agent completed'
    });

    // ========================================================================
    // STEP 5: EDITOR AGENT - Compile Video (CRITICAL)
    // ========================================================================
    await updateRun(projectId, runId, {
      progress: 65,
      step: 'editor',
      message: 'Compiling your video...'
    });

    try {
      console.log('🎞️ Step 5: Editor Agent...');

      // Gather images from director output or original payload
      const imagesToCompile = artifacts.director?.scenes?.flatMap((s: any) =>
        s.assets?.map((a: any) => ({ id: a.asset_id || a.id, url: a.vault_path || a.preview_url || a.url })) || []
      ) || payload.images || [];

      const editorResponse = await fetch(`${baseUrl}/.netlify/functions/compile-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          images: imagesToCompile,
          narrationUrl: artifacts.voice?.audioUrl && !artifacts.voice.placeholder ? artifacts.voice.audioUrl : null,
          musicUrl: artifacts.composer?.musicUrl && !artifacts.composer.placeholder ? artifacts.composer.musicUrl : null,
          beatGrid: artifacts.composer?.beatGrid,
          narrationSegments: artifacts.writer?.scenes?.map((s: any) => ({
            start: s.id * 3,
            end: (s.id + 1) * 3,
            text: s.text
          })),
          resolution: payload.outputFormat?.aspectRatio === '9:16' ? '1080p' : '1080p',
          fps: 30,
          lufsTarget: -14,
        }),
      });

      if (editorResponse.ok) {
        artifacts.editor = await editorResponse.json();
        artifacts.finalVideoUrl = artifacts.editor.videoUrl;
        console.log(`✅ Editor Agent complete: ${artifacts.editor.placeholder ? 'placeholder' : 'real video'} - ${artifacts.editor.duration}s`);
      } else {
        const errorText = await editorResponse.text();
        console.warn('⚠️ Editor Agent failed:', errorText);
        errors.push(`Editor: ${errorText}`);
        // Fallback to test video
        artifacts.editor = {
          success: true,
          fallback: true,
          videoUrl: '/test-assets/test-video.mp4',
          duration: 15,
          placeholder: true
        };
        artifacts.finalVideoUrl = '/test-assets/test-video.mp4';
      }
    } catch (error) {
      console.error('❌ Editor Agent error:', error);
      errors.push(`Editor: ${error instanceof Error ? error.message : 'Unknown error'}`);
      artifacts.editor = {
        success: false,
        error: String(error),
        videoUrl: '/test-assets/test-video.mp4',
        placeholder: true
      };
      artifacts.finalVideoUrl = '/test-assets/test-video.mp4';
    }

    await updateRun(projectId, runId, {
      progress: 80,
      step: 'editor',
      message: 'Editor Agent completed'
    });

    // ========================================================================
    // STEP 6: ATTRIBUTION AGENT - Generate Credits (Always runs)
    // ========================================================================
    await updateRun(projectId, runId, {
      progress: 85,
      step: 'attribution',
      message: 'Generating Commons Good credits...'
    });

    try {
      console.log('📜 Step 6: Attribution Agent...');

      // Determine which services were actually used
      const servicesUsed: string[] = ['sirtrav', 'netlify'];
      if (hasOpenAI && artifacts.director && !artifacts.director.skipped) servicesUsed.push('openai');
      if (hasElevenLabs && artifacts.voice && !artifacts.voice.skipped) servicesUsed.push('elevenlabs');
      if (hasSuno && artifacts.composer?.mode === 'suno') servicesUsed.push('suno');
      if (hasFFmpeg && artifacts.editor && !artifacts.editor.placeholder) servicesUsed.push('ffmpeg');

      const attributionResponse = await fetch(`${baseUrl}/.netlify/functions/generate-attribution`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          services: servicesUsed,
        }),
      });

      if (attributionResponse.ok) {
        artifacts.attribution = await attributionResponse.json();
        artifacts.creditsUrl = `/test-assets/credits.json`; // Store path
        console.log(`✅ Attribution Agent complete: ${artifacts.attribution.credits?.length || 0} credits`);
      } else {
        const errorText = await attributionResponse.text();
        console.warn('⚠️ Attribution Agent failed (non-critical):', errorText);
        artifacts.attribution = { success: true, fallback: true, credits: [] };
      }
    } catch (error) {
      console.error('❌ Attribution Agent error (non-critical):', error);
      artifacts.attribution = { success: false, error: String(error), credits: [] };
    }

    await updateRun(projectId, runId, {
      progress: 90,
      step: 'attribution',
      message: 'Attribution Agent completed'
    });

    // ========================================================================
    // STEP 7: FINALIZATION
    // ========================================================================
    await updateRun(projectId, runId, {
      progress: 95,
      step: 'publisher',
      message: 'Finalizing your video...'
    });

    // Store artifacts for retrieval
    try {
      const artifactStore = artifactsStore();
      const artifactKey = `${projectId}/${runId}/artifacts.json`;
      await artifactStore.setJSON(artifactKey, artifacts, {
        metadata: { projectId, runId, mode: artifacts.mode || 'unknown' },
      });
      console.log(`💾 Artifacts stored: ${artifactKey}`);
    } catch (storeError) {
      console.warn('Could not store artifacts:', storeError);
    }

    // ========================================================================
    // COMPLETE
    // ========================================================================
    const finalMessage = errors.length > 0
      ? `Pipeline complete with ${errors.length} warnings`
      : 'Your video is ready!';

    await updateRun(projectId, runId, {
      status: 'complete',
      progress: 100,
      step: 'complete',
      message: finalMessage,
      artifacts,
      errors: errors.length > 0 ? errors : undefined,
    });

    console.log(`🎉 Pipeline complete for ${projectId}/${runId}`);
    console.log(`📊 Final status: mode=${artifacts.mode}, video=${artifacts.finalVideoUrl}, errors=${errors.length}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        projectId,
        runId,
        status: 'complete',
        mode: artifacts.mode,
        videoUrl: artifacts.finalVideoUrl,
        creditsUrl: artifacts.creditsUrl,
        warnings: errors.length > 0 ? errors : undefined,
      })
    };

  } catch (error) {
    console.error('❌ run-pipeline-background critical error:', error);

    // Try to update the run with failure status
    try {
      const body = event.body ? JSON.parse(event.body) : {};
      if (body.projectId && body.runId) {
        await updateRun(body.projectId, body.runId, {
          status: 'failed',
          progress: 0,
          step: 'error',
          message: error instanceof Error ? error.message : 'Pipeline failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } catch (updateError) {
      console.error('Could not update run with failure:', updateError);
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : 'pipeline_failed'
      })
    };
  }
};

export default handler;
