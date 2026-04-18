/**
 * render-progress.ts - MG-001 Render Progress Endpoint
 *
 * Polls Remotion Lambda for render status.
 * Called by the UI to check if render is complete.
 *
 * GET /.netlify/functions/render-progress?renderId=abc&bucketName=xyz
 *  or
 * GET /.netlify/functions/render-progress?projectId=foo&runId=bar
 *
 * RESPONSE:
 * {
 *   "ok": true,
 *   "renderId": "abc123",
 *   "progress": 0.75,
 *   "phase": "rendering" | "combining" | "encoding" | "done",
 *   "framesRendered": 675,
 *   "totalFrames": 900,
 *   "done": false,
 *   "outputFile": null,
 *   "error": null
 * }
 *
 * When done:
 * {
 *   "ok": true,
 *   "done": true,
 *   "phase": "done",
 *   "progress": 1,
 *   "outputFile": "https://s3.amazonaws.com/bucket/render/final.mp4"
 * }
 */

import type { Handler, HandlerEvent } from '@netlify/functions';
import { runsStore, videoStore } from './lib/storage';
import { updateRunIndex } from './lib/runIndex';
import { appendProgress } from './lib/progress-store';
import { getProgress, RenderProgressResult } from './lib/remotion-client';
import { getEventBaseUrl } from './lib/request-origin';

interface RenderRecord {
  projectId: string;
  runId: string;
  renderId: string;
  bucketName: string;
  compositionId: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  fallback: boolean;
  estimatedDuration?: number;
  outputFile?: string;
  error?: string;
}

interface VeoOperationResponse {
  done?: boolean;
  error?: { message?: string };
  response?: {
    generatedVideos?: Array<{ video?: { uri?: string } }>;
    generated_videos?: Array<{ video?: { uri?: string } }>;
  };
  metadata?: Record<string, unknown>;
}

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

async function updateRunState(
  projectId: string,
  runId: string,
  patch: Record<string, unknown>,
  indexPatch: Record<string, unknown>,
  progressEvents: Array<{ agent: string; status: 'running' | 'completed' | 'failed'; message: string; progress: number }>
) {
  const store = runsStore();
  const runKey = `${projectId}/${runId}.json`;
  const now = new Date().toISOString();
  const existing = await store.get(runKey, { type: 'json' }) as Record<string, any> | null;
  const next = {
    ...(existing || { projectId, runId, createdAt: now }),
    ...patch,
    updatedAt: now,
  };

  await store.setJSON(runKey, next, {
    metadata: { projectId, runId, status: String(next.status || 'running') },
  });
  await updateRunIndex(projectId, runId, { ...indexPatch, updatedAt: now } as any);

  for (const event of progressEvents) {
    await appendProgress(projectId, runId, {
      projectId,
      runId,
      agent: event.agent,
      status: event.status,
      message: event.message,
      timestamp: now,
      progress: event.progress,
    });
  }
}

async function fetchVeoOperation(operationName: string, geminiKey: string): Promise<VeoOperationResponse> {
  const operationUrl = `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${geminiKey}`;
  const response = await fetch(operationUrl, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) {
    throw new Error(`Veo operation poll failed with HTTP ${response.status}`);
  }
  return response.json() as Promise<VeoOperationResponse>;
}

function extractVideoUri(operation: VeoOperationResponse): string | null {
  const legacySampleUri = (operation.response as any)?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
  return operation.response?.generatedVideos?.[0]?.video?.uri
    || operation.response?.generated_videos?.[0]?.video?.uri
    || legacySampleUri
    || null;
}

async function persistVeoVideo(projectId: string, runId: string, videoUri: string, baseUrl: string, geminiKey: string): Promise<string> {
  const response = await fetch(videoUri, {
    headers: { 'x-goog-api-key': geminiKey },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`Failed to download Veo output: HTTP ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const videoKey = `${projectId}/${runId}/final.mp4`;
  const publicUrl = `${baseUrl}/.netlify/blobs/sirtrav-videos/${videoKey}`;

  const upload = await videoStore.uploadData(videoKey, buffer, {
    contentType: response.headers.get('content-type') || 'video/mp4',
    metadata: {
      projectId,
      runId,
      source: 'veo2',
      url: publicUrl,
    },
  });

  if (!upload.ok) {
    throw new Error(upload.error || 'Failed to upload Veo output');
  }

  return publicUrl;
}

export const handler: Handler = async (event: HandlerEvent) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ ok: false, error: 'Method not allowed' }),
    };
  }

  try {
    const params = event.queryStringParameters || {};
    const baseUrl = getEventBaseUrl(event);
    const backend = params.backend;
    let renderId = params.renderId;
    let bucketName = params.bucketName;

    if (backend === 'veo2') {
      const projectId = params.projectId;
      const runId = params.runId;
      let operationName = params.operationName;

      if ((!operationName || !projectId || !runId) && projectId && runId) {
        const store = runsStore();
        const runRecord = await store.get(`${projectId}/${runId}.json`, { type: 'json' }) as Record<string, any> | null;
        operationName = operationName || runRecord?.agentResults?.editor?.data?.jobId;
      }

      if (!operationName) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ ok: false, error: 'operationName is required for backend=veo2' }),
        };
      }

      const geminiKey = process.env.GEMINI_API_KEY;
      if (!geminiKey) {
        return {
          statusCode: 503,
          headers,
          body: JSON.stringify({ ok: false, error: 'GEMINI_API_KEY is not configured' }),
        };
      }

      const operation = await fetchVeoOperation(operationName, geminiKey);
      if (operation.error?.message) {
        if (projectId && runId) {
          await updateRunState(
            projectId,
            runId,
            {
              status: 'failed',
              step: 'editor',
              message: `Editor render failed: ${operation.error.message}`,
            },
            {
              status: 'failed',
              step: 'editor',
              message: `Editor render failed: ${operation.error.message}`,
              error: operation.error.message,
            },
            [
              { agent: 'editor', status: 'failed', message: `Editor render failed: ${operation.error.message}`, progress: 96 },
            ],
          );
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            ok: false,
            backend: 'veo2',
            operationName,
            done: true,
            phase: 'error',
            error: operation.error.message,
            ...(projectId && { projectId }),
            ...(runId && { runId }),
          }),
        };
      }

      if (!operation.done) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            ok: true,
            backend: 'veo2',
            operationName,
            done: false,
            phase: 'rendering',
            progress: 0.9,
            ...(projectId && { projectId }),
            ...(runId && { runId }),
          }),
        };
      }

      const videoUri = extractVideoUri(operation);
      if (!videoUri) {
        if (projectId && runId) {
          await updateRunState(
            projectId,
            runId,
            {
              status: 'failed',
              step: 'editor',
              message: 'Editor render finished without a downloadable video URI',
            },
            {
              status: 'failed',
              step: 'editor',
              message: 'Editor render finished without a downloadable video URI',
              error: 'Veo completed without a video URI',
            },
            [
              { agent: 'editor', status: 'failed', message: 'Editor render finished without a downloadable video URI', progress: 96 },
            ],
          );
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            ok: false,
            backend: 'veo2',
            operationName,
            done: true,
            phase: 'error',
            error: 'Veo completed without a video URI',
            ...(projectId && { projectId }),
            ...(runId && { runId }),
          }),
        };
      }

      const outputFile = projectId && runId
        ? await persistVeoVideo(projectId, runId, videoUri, baseUrl, geminiKey)
        : `${videoUri}${videoUri.includes('?') ? '&' : '?'}key=${geminiKey}`;

      if (projectId && runId) {
        const store = runsStore();
        const existing = await store.get(`${projectId}/${runId}.json`, { type: 'json' }) as Record<string, any> | null;
        const existingAgentResults = existing?.agentResults || {};
        const updatedEditor = {
          ...(existingAgentResults.editor || {}),
          success: true,
          data: {
            ...(existingAgentResults.editor?.data || {}),
            status: 'completed',
            videoUrl: outputFile,
            placeholder: false,
            stored: true,
            editor_backend: 'veo2',
          },
          fallback: false,
        };
        const publishTargets = Array.isArray(existing?.publishTargets) ? existing.publishTargets : [];
        const isPublishPending = publishTargets.length > 0;

        await updateRunState(
          projectId,
          runId,
          {
            status: isPublishPending ? 'running' : 'completed',
            progress: isPublishPending ? 98 : 100,
            step: isPublishPending ? 'publisher' : 'completed',
            message: isPublishPending
              ? '✅ Video render finished. Publisher resume is still required for async renders.'
              : '✅ Pipeline execution finished successfully',
            artifacts: {
              ...(existing?.artifacts || {}),
              videoUrl: outputFile,
              duration: updatedEditor.data.duration,
              placeholder: false,
              editorStatus: 'completed',
              editorBackend: 'veo2',
            },
            agentResults: {
              ...existingAgentResults,
              editor: updatedEditor,
            },
          },
          {
            status: isPublishPending ? 'running' : 'completed',
            videoUrl: outputFile,
            placeholder: false,
            pollUrl: undefined,
            editorStatus: 'completed',
            editorBackend: 'veo2',
            agentResults: {
              ...existingAgentResults,
              editor: updatedEditor,
            },
            message: isPublishPending
              ? '✅ Video render finished. Publisher resume is still required for async renders.'
              : '✅ Pipeline execution finished successfully',
            step: isPublishPending ? 'publisher' : 'completed',
          },
          isPublishPending
            ? [
                { agent: 'editor', status: 'completed', message: '✅ Video render finished', progress: 97 },
              ]
            : [
                { agent: 'editor', status: 'completed', message: '✅ Video render finished', progress: 97 },
                { agent: 'completed', status: 'completed', message: '✅ Pipeline execution finished successfully', progress: 100 },
              ],
        );
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          backend: 'veo2',
          operationName,
          done: true,
          phase: 'done',
          progress: 1,
          outputFile,
          ...(projectId && { projectId }),
          ...(runId && { runId }),
        }),
      };
    }

    // If projectId + runId provided, look up from storage
    if (!renderId && params.projectId && params.runId) {
      const store = runsStore();
      const renderKey = `renders/${params.projectId}/${params.runId}.json`;

      const record = await store.getJSON(renderKey) as RenderRecord | null;

      if (!record) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            ok: false,
            error: `Render not found for projectId=${params.projectId}, runId=${params.runId}`,
          }),
        };
      }

      renderId = record.renderId;
      bucketName = record.bucketName;

      // If already completed/errored in storage, return that
      if (record.status === 'completed' && record.outputFile) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            ok: true,
            renderId,
            done: true,
            progress: 1,
            phase: 'done',
            outputFile: record.outputFile,
            projectId: record.projectId,
            runId: record.runId,
            fallback: record.fallback,
          }),
        };
      }

      if (record.status === 'failed') {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            ok: false,
            renderId,
            done: true,
            progress: 0,
            phase: 'error',
            error: record.error || 'Render failed',
            projectId: record.projectId,
            runId: record.runId,
          }),
        };
      }
    }

    // Validate required params
    if (!renderId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          ok: false,
          error: 'renderId is required (or provide projectId + runId)',
        }),
      };
    }

    if (!bucketName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          ok: false,
          error: 'bucketName is required (or provide projectId + runId)',
        }),
      };
    }

    console.log(`[RenderProgress] Checking: ${renderId} in ${bucketName}`);

    // Get progress from Remotion Lambda (or fallback)
    const progress: RenderProgressResult = await getProgress(renderId, bucketName);

    if (!progress.ok) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          ok: false,
          renderId,
          error: progress.error || 'Failed to get progress',
        }),
      };
    }

    // If done, update storage record
    if (progress.done && params.projectId && params.runId) {
      const store = runsStore();
      const renderKey = `renders/${params.projectId}/${params.runId}.json`;
      const record = await store.getJSON(renderKey) as RenderRecord | null;

      if (record) {
        const updatedRecord: RenderRecord = {
          ...record,
          status: progress.fatalErrorEncountered ? 'failed' : 'completed',
          completedAt: new Date().toISOString(),
          outputFile: progress.outputFile,
          error: progress.errors?.join(', '),
        };

        await store.setJSON(renderKey, updatedRecord, {
          metadata: {
            projectId: params.projectId,
            runId: params.runId,
            status: updatedRecord.status,
          },
        });
      }
    }

    // Build response
    const response = {
      ok: true,
      renderId,
      progress: progress.overallProgress || 0,
      phase: progress.currentPhase || 'rendering',
      done: progress.done || false,
      framesRendered: progress.framesRendered,
      totalFrames: progress.renderMetadata?.totalFrames,
      outputFile: progress.outputFile || null,
      error: progress.fatalErrorEncountered ? (progress.errors?.join(', ') || 'Fatal error') : null,
      fallback: progress.fallback || false,
      ...(params.projectId && { projectId: params.projectId }),
      ...(params.runId && { runId: params.runId }),
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('[RenderProgress] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

export default handler;
