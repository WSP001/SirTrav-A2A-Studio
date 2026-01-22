/**
 * render-dispatcher.ts - MG-001 Render Dispatcher Backend
 *
 * Kicks off a Remotion Lambda render and returns immediately with renderId.
 * The UI polls render-progress.ts for status updates.
 *
 * POST /.netlify/functions/render-dispatcher
 *
 * REQUEST:
 * {
 *   "projectId": "week4_recap",
 *   "runId": "run-123456",          // Optional: will generate if not provided
 *   "compositionId": "IntroSlate",  // Remotion composition name
 *   "inputProps": { ... },          // Props passed to composition
 *   "codec": "h264",                // Optional: h264, h265, vp8, vp9
 *   "outName": "final.mp4"          // Optional: output filename
 * }
 *
 * RESPONSE (202 Accepted):
 * {
 *   "ok": true,
 *   "renderId": "abc123",
 *   "bucketName": "remotionlambda-useast1-abc",
 *   "runId": "run-123456",
 *   "projectId": "week4_recap",
 *   "estimatedDuration": 30,
 *   "fallback": false
 * }
 *
 * CONSTRAINTS:
 * - Must return in <10s (Netlify Function limit)
 * - Never wait for render completion
 * - Store renderId in runs record for UI polling
 */

import type { Handler, HandlerEvent } from '@netlify/functions';
import { runsStore } from './lib/storage';
import { kickoffRender, isRemotionConfigured, RenderKickoffParams } from './lib/remotion-client';

// Simple Zod-like validation (avoid adding zod dependency for now)
interface RenderDispatcherRequest {
  projectId: string;
  runId?: string;
  compositionId: string;
  inputProps?: Record<string, unknown>;
  codec?: 'h264' | 'h265' | 'vp8' | 'vp9';
  outName?: string;
  frameRange?: [number, number];
}

interface ValidationResult {
  ok: boolean;
  data?: RenderDispatcherRequest;
  error?: string;
}

function validateRequest(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Request body must be a JSON object' };
  }

  const req = body as Record<string, unknown>;

  // Required: projectId
  if (typeof req.projectId !== 'string' || req.projectId.trim() === '') {
    return { ok: false, error: 'projectId is required and must be a non-empty string' };
  }

  // Required: compositionId
  if (typeof req.compositionId !== 'string' || req.compositionId.trim() === '') {
    return { ok: false, error: 'compositionId is required and must be a non-empty string' };
  }

  // Optional: runId
  if (req.runId !== undefined && typeof req.runId !== 'string') {
    return { ok: false, error: 'runId must be a string if provided' };
  }

  // Optional: codec
  const validCodecs = ['h264', 'h265', 'vp8', 'vp9'];
  if (req.codec !== undefined && !validCodecs.includes(req.codec as string)) {
    return { ok: false, error: `codec must be one of: ${validCodecs.join(', ')}` };
  }

  // Optional: inputProps
  if (req.inputProps !== undefined && (typeof req.inputProps !== 'object' || req.inputProps === null)) {
    return { ok: false, error: 'inputProps must be an object if provided' };
  }

  // Optional: frameRange
  if (req.frameRange !== undefined) {
    if (!Array.isArray(req.frameRange) || req.frameRange.length !== 2) {
      return { ok: false, error: 'frameRange must be a tuple [start, end]' };
    }
    if (typeof req.frameRange[0] !== 'number' || typeof req.frameRange[1] !== 'number') {
      return { ok: false, error: 'frameRange values must be numbers' };
    }
  }

  return {
    ok: true,
    data: {
      projectId: req.projectId as string,
      runId: req.runId as string | undefined,
      compositionId: req.compositionId as string,
      inputProps: req.inputProps as Record<string, unknown> | undefined,
      codec: req.codec as 'h264' | 'h265' | 'vp8' | 'vp9' | undefined,
      outName: req.outName as string | undefined,
      frameRange: req.frameRange as [number, number] | undefined,
    },
  };
}

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

export const handler: Handler = async (event: HandlerEvent) => {
  console.log('🎬 RENDER DISPATCHER - MG-001');

  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ ok: false, error: 'Method not allowed' }),
    };
  }

  const startTime = Date.now();

  try {
    // Parse body
    let body: unknown;
    try {
      body = event.body ? JSON.parse(event.body) : {};
    } catch (e) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: 'Invalid JSON in request body' }),
      };
    }

    // Validate request
    const validation = validateRequest(body);
    if (!validation.ok || !validation.data) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: validation.error }),
      };
    }

    const req = validation.data;
    const runId = req.runId || `render-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    console.log(`[RenderDispatcher] Project: ${req.projectId}, Run: ${runId}, Composition: ${req.compositionId}`);

    // Check Remotion configuration
    const remotionConfigured = isRemotionConfigured();
    if (!remotionConfigured) {
      console.log('[RenderDispatcher] Remotion not configured, will use fallback mode');
    }

    // Prepare render params
    const renderParams: RenderKickoffParams = {
      compositionId: req.compositionId,
      inputProps: req.inputProps,
      codec: req.codec || 'h264',
      outName: req.outName || `${req.projectId}-${runId}.mp4`,
      frameRange: req.frameRange || null,
    };

    // Kick off render (returns immediately)
    const kickoffResult = await kickoffRender(renderParams);

    if (!kickoffResult.ok) {
      console.error('[RenderDispatcher] Kickoff failed:', kickoffResult.error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          ok: false,
          error: kickoffResult.error || 'Failed to start render',
          runId,
          projectId: req.projectId,
        }),
      };
    }

    // Store render metadata in runs record
    const store = runsStore();
    const renderKey = `renders/${req.projectId}/${runId}.json`;

    const renderRecord = {
      projectId: req.projectId,
      runId,
      renderId: kickoffResult.renderId,
      bucketName: kickoffResult.bucketName,
      compositionId: req.compositionId,
      inputProps: req.inputProps,
      codec: renderParams.codec,
      status: 'rendering',
      startedAt: now,
      fallback: kickoffResult.fallback || false,
      estimatedDuration: kickoffResult.estimatedDuration,
    };

    await store.setJSON(renderKey, renderRecord, {
      metadata: {
        projectId: req.projectId,
        runId,
        status: 'rendering',
      },
    });

    const kickoffTime = Date.now() - startTime;
    console.log(`[RenderDispatcher] Kicked off in ${kickoffTime}ms. RenderId: ${kickoffResult.renderId}`);

    // Return 202 Accepted (render is in progress)
    return {
      statusCode: 202,
      headers,
      body: JSON.stringify({
        ok: true,
        renderId: kickoffResult.renderId,
        bucketName: kickoffResult.bucketName,
        runId,
        projectId: req.projectId,
        compositionId: req.compositionId,
        estimatedDuration: kickoffResult.estimatedDuration,
        fallback: kickoffResult.fallback || false,
        remotionConfigured,
        kickoffTimeMs: kickoffTime,
      }),
    };
  } catch (error) {
    console.error('[RenderDispatcher] Error:', error);
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
