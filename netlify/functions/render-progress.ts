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
import { runsStore } from './lib/storage';
import { getProgress, RenderProgressResult } from './lib/remotion-client';

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

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

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
    let renderId = params.renderId;
    let bucketName = params.bucketName;

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
