/**
 * run-pipeline-background v3.0 - REAL AGENT EXECUTION
 * Background worker that executes the 7-agent pipeline with REAL API calls.
 * No more mocks - calls actual agent functions when APIs are available.
 *
 * Pipeline Modes (auto-detected based on available APIs):
 * - FULL: All agents use real APIs (OpenAI, ElevenLabs, Suno, FFmpeg)
 * - ENHANCED: OpenAI Vision + GPT-4 only, other agents use fallbacks
 * - SIMPLE: All agents use fallback/template logic
 * - DEMO: Test mode with placeholder video
 */
import type { Handler } from '@netlify/functions';
import { runsStore, artifactsStore, uploadsStore } from './lib/storage';
import { updateRunIndex } from './lib/runIndex';
import { appendProgress } from './lib/progress-store';
import { ManifestGenerator } from './lib/cost-manifest';
import { inspectOutput } from './lib/quality-gate';
import { publishVideo, flushCredentials } from './lib/publish';
// 🎯 CC-014: Memory Vault write helpers
import { recordJobPacket } from './lib/vault-helpers';

type RunStatus = 'queued' | 'running' | 'completed' | 'failed';

interface PipelinePayload {
  images?: Array<{ id: string; url: string; base64?: string }>;
  projectMode?: string;
  outputFormat?: {
    objective?: 'personal' | 'social';
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
    artifacts: Record<string, unknown>;
    errors: string[];
    agentResults: Record<string, AgentResult>;
  }>
) {
  const store = runsStore();
  const key = makeRunKey(projectId, runId);
  const now = new Date().toISOString();
  const existing = (await store.get(key, { type: 'json' })) as Record<string, unknown> | null;
  const next = {
    ...(existing || { projectId, runId, createdAt: now }),
    ...patch,
    updatedAt: now,
  };
  await store.set(key, JSON.stringify(next), { metadata: { projectId, runId, status: next.status || 'unknown' } });
  const indexPatch: any = {
    status: (next.status as RunStatus) || 'running',
  };

  // Forward artifacts to the index if present
  if (patch.artifacts) {
    if (patch.artifacts.videoUrl) indexPatch.videoUrl = patch.artifacts.videoUrl;
    if (patch.artifacts.creditsUrl) indexPatch.creditsUrl = patch.artifacts.creditsUrl;
    if (patch.artifacts.pipelineMode) indexPatch.pipelineMode = patch.artifacts.pipelineMode;
    if ((patch.artifacts as any).invoice) indexPatch.invoice = (patch.artifacts as any).invoice;
  }

  await updateRunIndex(projectId, runId, indexPatch);

  // Post progress event for SSE streaming
  // Map RunStatus to ProgressStatus for SSE consumers
  const progressStatus = patch.status === 'completed' ? 'completed'
    : patch.status === 'failed' ? 'failed'
      : 'running';

  await appendProgress(projectId, runId, {
    projectId,
    runId,
    agent: patch.step || 'pipeline',
    status: progressStatus,
    message: patch.message || '',
    timestamp: now,
    progress: patch.progress || 0,
    metadata: {
      step: patch.step,
      agentResults: patch.agentResults ? Object.keys(patch.agentResults) : undefined,
    },
  });
}

// ============================================================================
// REAL AGENT EXECUTION FUNCTIONS
// ============================================================================

/**
 * DIRECTOR AGENT - Curate Media with OpenAI Vision
 */
async function executeDirectorAgent(
  projectId: string,
  images: Array<{ id: string; url: string; base64?: string }>,
  projectMode: string
): Promise<AgentResult> {
  const startTime = Date.now();
  const baseUrl = process.env.URL || 'http://localhost:8888';

  try {
    console.log(`🎬 [Director] Starting with ${images.length} images...`);

    const response = await fetch(`${baseUrl}/.netlify/functions/curate-media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        project_mode: projectMode || 'commons_public',
        images: images,
        max_scenes: 5,
        max_assets_per_scene: 3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Director API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`🎬 [Director] Completed: ${data.scenes?.length || 0} scenes curated`);

    return {
      success: true,
      data,
      duration_ms: Date.now() - startTime,
      fallback: !process.env.OPENAI_API_KEY,
    };
  } catch (error) {
    console.error('🎬 [Director] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Director agent failed',
      duration_ms: Date.now() - startTime,
      fallback: true,
    };
  }
}

/**
 * WRITER AGENT - Generate Narrative Script with GPT-4
 */
async function executeWriterAgent(
  projectId: string,
  curatedMedia: any
): Promise<AgentResult> {
  const startTime = Date.now();
  const baseUrl = process.env.URL || 'http://localhost:8888';

  try {
    console.log(`✍️ [Writer] Generating narrative...`);

    const mood = curatedMedia?.scenes?.[0]?.dominant_mood || 'reflective';
    const sceneCount = curatedMedia?.scenes?.length || 3;

    const response = await fetch(`${baseUrl}/.netlify/functions/narrate-project`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        theme: 'memory_recollection',
        mood,
        sceneCount,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Writer API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`✍️ [Writer] Completed: ${data.wordCount || 0} words, ${data.estimatedDuration || 0}s`);

    return {
      success: true,
      data,
      duration_ms: Date.now() - startTime,
      fallback: data.generatedBy === 'fallback',
    };
  } catch (error) {
    console.error('✍️ [Writer] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Writer agent failed',
      duration_ms: Date.now() - startTime,
      fallback: true,
    };
  }
}

/**
 * VOICE AGENT - Text-to-Speech with ElevenLabs
 */
async function executeVoiceAgent(
  projectId: string,
  runId: string,
  narrative: any
): Promise<AgentResult> {
  const startTime = Date.now();
  const baseUrl = process.env.URL || 'http://localhost:8888';

  try {
    console.log(`🎙️ [Voice] Synthesizing narration...`);

    const text = narrative?.narrative || narrative?.scenes?.map((s: any) => s.text).join(' ') || 'Welcome to your memories.';

    const response = await fetch(`${baseUrl}/.netlify/functions/text-to-speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        runId,
        text,
        character: 'narrator',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Voice API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`🎙️ [Voice] Completed: ${data.duration || 0}s audio, placeholder=${data.placeholder}`);

    return {
      success: true,
      data,
      duration_ms: Date.now() - startTime,
      fallback: data.placeholder === true,
    };
  } catch (error) {
    console.error('🎙️ [Voice] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Voice agent failed',
      duration_ms: Date.now() - startTime,
      fallback: true,
    };
  }
}

/**
 * COMPOSER AGENT - Generate Music with Suno/Templates
 */
async function executeComposerAgent(
  projectId: string,
  runId: string,
  mood: string,
  themePreference?: any
): Promise<AgentResult> {
  const startTime = Date.now();
  const baseUrl = process.env.URL || 'http://localhost:8888';

  try {
    console.log(`🎵 [Composer] Generating soundtrack...`);

    if (themePreference?.attach && themePreference?.blobKey) {
      console.log(`🎵 [Composer] Using attached theme: ${themePreference.blobKey}`);
      return {
        success: true,
        data: {
          musicUrl: themePreference.blobKey,
          bpm: themePreference.bpm || 120,
          source: 'attached_theme',
        },
        duration_ms: Date.now() - startTime,
        fallback: false,
      };
    }

    const response = await fetch(`${baseUrl}/.netlify/functions/generate-music`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        runId,
        mood: mood || 'reflective',
        duration: 30,
        style: 'cinematic',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Composer API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`🎵 [Composer] Completed: ${data.source || 'unknown'} music`);

    return {
      success: true,
      data,
      duration_ms: Date.now() - startTime,
      fallback: data.source === 'template' || data.source === 'placeholder',
    };
  } catch (error) {
    console.error('🎵 [Composer] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Composer agent failed',
      duration_ms: Date.now() - startTime,
      fallback: true,
    };
  }
}

/**
 * EDITOR AGENT - Compile Video with FFmpeg
 */
async function executeEditorAgent(
  projectId: string,
  runId: string,
  curatedMedia: any,
  voiceResult: any,
  musicResult: any,
  outputFormat?: any
): Promise<AgentResult> {
  const startTime = Date.now();
  const baseUrl = process.env.URL || 'http://localhost:8888';

  try {
    console.log(`🎞️ [Editor] Compiling video...`);

    // Extract images from curated media scenes for the Editor
    const images = (curatedMedia?.scenes || []).flatMap((scene: any) =>
      (scene.assets || []).map((asset: any) => ({
        id: asset.id || asset.url,
        url: asset.url,
        duration: asset.duration || 3,
      }))
    );

    const response = await fetch(`${baseUrl}/.netlify/functions/compile-video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        runId,
        images: images.length > 0 ? images : undefined, // Let compile-video use placeholders if empty
        narrationUrl: voiceResult?.data?.audioUrl,
        musicUrl: musicResult?.data?.musicUrl,
        resolution: outputFormat?.aspectRatio === '9:16' ? '1080p' : '1080p',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Editor API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`🎞️ [Editor] Completed: ${data.videoUrl || 'test video'}`);

    return {
      success: true,
      data,
      duration_ms: Date.now() - startTime,
      fallback: data.placeholder === true || data.mode === 'test',
    };
  } catch (error) {
    console.error('🎞️ [Editor] Error:', error);
    return {
      success: true,
      data: {
        videoUrl: '/test-assets/test-video.mp4',
        duration: 30,
        placeholder: true,
        mode: 'fallback',
      },
      error: error instanceof Error ? error.message : 'Editor agent failed',
      duration_ms: Date.now() - startTime,
      fallback: true,
    };
  }
}

/**
 * ATTRIBUTION AGENT - Generate Commons Good Credits
 */
async function executeAttributionAgent(
  projectId: string,
  runId: string,
  agentResults: Record<string, AgentResult>
): Promise<AgentResult> {
  const startTime = Date.now();
  const baseUrl = process.env.URL || 'http://localhost:8888';

  try {
    console.log(`📜 [Attribution] Generating credits...`);

    const response = await fetch(`${baseUrl}/.netlify/functions/generate-attribution`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        runId,
        agents: {
          director: agentResults.director?.fallback ? 'fallback' : 'openai_vision',
          writer: agentResults.writer?.fallback ? 'fallback' : 'gpt4',
          voice: agentResults.voice?.fallback ? 'placeholder' : 'elevenlabs',
          composer: agentResults.composer?.fallback ? 'template' : 'suno',
          editor: agentResults.editor?.fallback ? 'fallback' : 'ffmpeg',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Attribution API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`📜 [Attribution] Completed: credits generated`);

    return {
      success: true,
      data,
      duration_ms: Date.now() - startTime,
      fallback: false,
    };
  } catch (error) {
    console.error('📜 [Attribution] Error:', error);
    return {
      success: true,
      data: {
        credits: 'Generated by SirTrav A2A Studio',
        commons_good: true,
      },
      error: error instanceof Error ? error.message : 'Attribution agent failed',
      duration_ms: Date.now() - startTime,
      fallback: true,
    };
  }
}

/**
 * Determine pipeline mode based on which agents used real APIs vs fallbacks
 */
function determinePipelineMode(agentResults: Record<string, AgentResult>): string {
  const realAgents = Object.values(agentResults).filter(r => !r.fallback).length;
  const totalAgents = Object.keys(agentResults).length;

  if (realAgents === totalAgents) return 'FULL';
  if (realAgents >= 3) return 'ENHANCED';
  if (realAgents >= 1) return 'SIMPLE';
  return 'DEMO';
}

// ============================================================================
// MAIN PIPELINE HANDLER
// ============================================================================

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
    // 🎯 CC-019 M8: Selective publish targets from UI toggle
    const publishTargets: string[] | undefined = body.publishTargets;

    if (!projectId || !runId) {
      return { statusCode: 400, body: 'projectId and runId are required' };
    }

    const store = runsStore();
    const key = makeRunKey(projectId, runId);
    const existing = await store.get(key, { type: 'json' }) as any;

    // Idempotency: if already succeeded, exit early
    if (existing?.status === 'completed') {
      return { statusCode: 200, body: JSON.stringify({ ok: true, projectId, runId, status: 'completed' }) };
    }

    // Soft lock: if another worker set running recently, respect it
    if (existing?.status === 'running' && existing?.progress >= 99) {
      return { statusCode: 200, body: JSON.stringify({ ok: true, projectId, runId, status: existing.status }) };
    }

    // Load payload with images if present
    let payload: PipelinePayload = {};
    if (payloadKey) {
      const loadedPayload = await store.get(payloadKey, { type: 'json' });
      if (loadedPayload) {
        payload = loadedPayload as PipelinePayload;
      }
    }

    // Get images from payload or use defaults for demo
    const images = payload.images || [
      { id: 'demo-1', url: '/test-assets/test-video.mp4' }
    ];

    console.log(`\n🚀 ========================================`);
    console.log(`🚀 REAL PIPELINE STARTING: ${projectId}/${runId}`);
    console.log(`🚀 Images: ${images.length}, Mode: ${payload.projectMode || 'commons_public'}`);
    console.log(`🚀 ========================================\n`);

    const agentResults: Record<string, AgentResult> = {};
    const manifest = new ManifestGenerator();

    // ========================================================================
    // STEP 1: DIRECTOR AGENT (Curate Media)
    // ========================================================================
    await updateRun(projectId, runId, {
      status: 'running',
      progress: 5,
      step: 'director',
      message: '🎬 Director analyzing images...'
    });

    agentResults.director = await executeDirectorAgent(
      projectId,
      images,
      payload.projectMode || 'commons_public'
    );

    // 💰 RECORD COST: Director (Vision)
    // Base Cost: $0.03 input + $0.06 output ~= $0.09
    manifest.addEntry('Director', 'Vision Analysis', 0.09);
    recordJobPacket({ runId, projectId, agent: 'director', action: 'curate_scenes', jobType: 'Director Agent - Curate Media', status: agentResults.director.success ? 'success' : 'failed', publicResult: { sceneCount: agentResults.director.data?.scenes?.length }, cost: { baseCost: 0.09 }, error: agentResults.director.error });

    await updateRun(projectId, runId, {
      progress: 15,
      step: 'director',
      message: `🎬 Director ${agentResults.director.success ? 'completed' : 'failed'}`,
      agentResults,
    });

    // ========================================================================
    // STEP 2: WRITER AGENT (Generate Narrative)
    // ========================================================================
    await updateRun(projectId, runId, {
      progress: 20,
      step: 'writer',
      message: '✍️ Writer crafting narrative...'
    });

    agentResults.writer = await executeWriterAgent(projectId, agentResults.director.data);

    // 💰 RECORD COST: Writer (GPT-4)
    // Base Cost: ~500 tokens = $0.03
    manifest.addEntry('Writer', 'Script Generation', 0.03);
    recordJobPacket({ runId, projectId, agent: 'writer', action: 'narrate_script', jobType: 'Writer Agent - Script Generation', status: agentResults.writer.success ? 'success' : 'failed', publicResult: { wordCount: agentResults.writer.data?.narrative?.split(' ').length }, cost: { baseCost: 0.03 }, error: agentResults.writer.error });

    await updateRun(projectId, runId, {
      progress: 35,
      step: 'writer',
      message: `✍️ Writer ${agentResults.writer.success ? 'completed' : 'failed'}`,
      agentResults,
    });

    // ========================================================================
    // STEP 3 & 4: PARALLEL ENGINE (Voice & Composer)
    // The "Speed Upgrade" - Running independent agents simultaneously
    // ========================================================================
    await updateRun(projectId, runId, {
      progress: 40,
      step: 'production_parallel',
      message: '⚡ Parallel Engine: Synthesizing Audio & Composing Music...'
    });

    const mood = agentResults.director.data?.scenes?.[0]?.dominant_mood || 'reflective';

    // ⚡ PARALLEL EXECUTION
    const [voiceResult, composerResult] = await Promise.all([
      executeVoiceAgent(projectId, runId, agentResults.writer.data),
      executeComposerAgent(projectId, runId, mood, payload.themePreference)
    ]);

    agentResults.voice = voiceResult;
    agentResults.composer = composerResult;

    // 💰 RECORD COST: Voice (ElevenLabs) & Composer (Suno)
    manifest.addEntry('Voice', 'Speech Synthesis', 0.12);
    manifest.addEntry('Composer', 'Music Generation', 0.08);
    recordJobPacket({ runId, projectId, agent: 'voice', action: 'synthesize_audio', jobType: 'Voice Agent - Speech Synthesis', status: voiceResult.success ? 'success' : 'failed', publicResult: { audioUrl: voiceResult.data?.audioUrl }, cost: { baseCost: 0.12 }, error: voiceResult.error });
    recordJobPacket({ runId, projectId, agent: 'composer', action: 'generate_music', jobType: 'Composer Agent - Music Generation', status: composerResult.success ? 'success' : 'failed', publicResult: { mood, musicUrl: composerResult.data?.musicUrl }, cost: { baseCost: 0.08 }, error: composerResult.error });

    await updateRun(projectId, runId, {
      progress: 70,
      step: 'production_parallel',
      message: `⚡ Parallel Engine completed. Voice: ${voiceResult.success}, Music: ${composerResult.success}`,
      agentResults,
    });

    // ========================================================================
    // STEP 5: EDITOR AGENT (Compile Video)
    // ========================================================================
    await updateRun(projectId, runId, {
      progress: 75,
      step: 'editor',
      message: '🎞️ Editor assembling video...'
    });

    agentResults.editor = await executeEditorAgent(
      projectId,
      runId,
      agentResults.director.data,
      agentResults.voice,
      agentResults.composer,
      payload.outputFormat
    );

    // 💰 RECORD COST: Editor (Compute)
    manifest.addEntry('Editor', 'Video Compilation', 0.05);
    recordJobPacket({ runId, projectId, agent: 'editor', action: 'compile_video', jobType: 'Editor Agent - Video Compilation', status: agentResults.editor.success ? 'success' : 'failed', publicResult: { videoUrl: agentResults.editor.data?.videoUrl, duration: agentResults.editor.data?.duration, placeholder: agentResults.editor.data?.placeholder }, cost: { baseCost: 0.05 }, error: agentResults.editor.error });

    await updateRun(projectId, runId, {
      progress: 90,
      step: 'editor',
      message: `🎞️ Editor ${agentResults.editor.success ? 'completed' : 'failed'}`,
      agentResults,
    });

    // ========================================================================
    // STEP 6: ATTRIBUTION AGENT (Commons Good Credits)
    // ========================================================================
    await updateRun(projectId, runId, {
      progress: 92,
      step: 'attribution',
      message: '📜 Attribution generating credits...'
    });

    agentResults.attribution = await executeAttributionAgent(projectId, runId, agentResults);

    // 💰 RECORD COST: Attribution (Data Processing)
    manifest.addEntry('Attribution', 'Commons Good Audit', 0.01);
    recordJobPacket({ runId, projectId, agent: 'attribution', action: 'generate_credits', jobType: 'Attribution Agent - Commons Good Audit', status: agentResults.attribution.success ? 'success' : 'failed', cost: { baseCost: 0.01 }, error: agentResults.attribution.error });

    await updateRun(projectId, runId, {
      progress: 98,
      step: 'attribution',
      message: `📜 Attribution ${agentResults.attribution.success ? 'completed' : 'failed'}`,
      agentResults,
    });

    // ========================================================================
    // STEP 6.5: QUALITY GATE AGENT (Enterprise Auditor)
    // ========================================================================
    const qualityCheck = await inspectOutput({
      scriptText: agentResults.writer?.data?.narrative,
      audioUrl: agentResults.voice?.data?.audioUrl,
      videoUrl: agentResults.editor?.data?.videoUrl,
      images: agentResults.director?.data?.scenes?.flatMap((s: any) => s.assets || [])
    });

    if (!qualityCheck.passed) {
      console.error('❌ Quality Gate Failed:', qualityCheck.errors);
      await updateRun(projectId, runId, {
        status: 'failed',
        step: 'quality_gate',
        message: `Quality check failed: ${qualityCheck.errors.join(', ')}`
      });

      return {
        statusCode: 422,
        body: JSON.stringify({
          ok: false,
          error: 'Quality gate failed',
          details: qualityCheck.errors
        })
      };
    }

    // ========================================================================
    // STEP 7: COMPLETE - Exchange & Wipe (Security)
    // ========================================================================
    const rawVideoUrl = agentResults.editor.data?.videoUrl || '/test-assets/test-video.mp4';

    // 🔒 EXCHANGE: Generate Secure Signed URL
    const secureVideo = await publishVideo(rawVideoUrl, 24);

    // (Credentials flushed after final update)

    const finalArtifacts = {
      videoUrl: secureVideo.signedUrl,
      expiresAt: secureVideo.expiresAt,
      creditsUrl: '/test-assets/credits.json',
      duration: agentResults.editor.data?.duration || 30,
      agentResults,
      pipelineMode: determinePipelineMode(agentResults),
      invoice: manifest.generate(runId),
      exchangeMode: secureVideo.mode,
      // 🎯 CC-019 M8: Platforms the user toggled on for publishing
      publishTargets: publishTargets || ['x', 'youtube', 'linkedin', 'tiktok', 'instagram'],
    };

    await updateRun(projectId, runId, {
      status: 'completed',
      progress: 100,
      step: 'completed',
      message: '✅ Pipeline execution finished successfully',
      artifacts: finalArtifacts,
      agentResults,
    });

    // 🔒 WIPE: Flush Credentials (AFTER final ledger update)
    flushCredentials();

    console.log(`\n✅ ========================================`);
    console.log(`✅ PIPELINE COMPLETE: ${projectId}/${runId}`);
    console.log(`✅ Video: ${finalArtifacts.videoUrl}`);
    console.log(`✅ Mode: ${finalArtifacts.pipelineMode}`);
    console.log(`✅ ========================================\n`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        projectId,
        runId,
        status: 'completed',
        videoUrl: finalArtifacts.videoUrl,
        creditsUrl: finalArtifacts.creditsUrl,
        invoice: finalArtifacts.invoice, // 💰 Cost Plus Manifest
        pipelineMode: finalArtifacts.pipelineMode,
        publishTargets: finalArtifacts.publishTargets, // 🎯 CC-019 M8
        commonsGood: true,
      })
    };

  } catch (error) {
    console.error('❌ run-pipeline-background error:', error);
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
