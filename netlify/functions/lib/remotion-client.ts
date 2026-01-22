/**
 * remotion-client.ts - Remotion Lambda Client Wrapper
 * MG-001: Render Dispatcher Backend
 *
 * Provides a clean interface to Remotion Lambda's renderMediaOnLambda and getRenderProgress.
 * Falls back gracefully when @remotion/lambda is not installed.
 *
 * ENV VARS REQUIRED:
 * - REMOTION_FUNCTION_NAME: Lambda function name (e.g., "remotion-render-4-0-0")
 * - REMOTION_SERVE_URL: URL to the deployed Remotion bundle
 * - REMOTION_REGION: AWS region (default: us-east-1)
 * - AWS_ACCESS_KEY_ID: AWS credentials
 * - AWS_SECRET_ACCESS_KEY: AWS credentials
 */

// Types for Remotion Lambda (avoid import errors when package not installed)
export interface RenderKickoffParams {
  compositionId: string;
  inputProps?: Record<string, unknown>;
  codec?: 'h264' | 'h265' | 'vp8' | 'vp9' | 'mp3' | 'aac' | 'wav' | 'gif' | 'prores';
  outName?: string;
  imageFormat?: 'jpeg' | 'png';
  jpegQuality?: number;
  scale?: number;
  frameRange?: [number, number] | null;
  framesPerLambda?: number;
  privacy?: 'public' | 'private';
  logLevel?: 'verbose' | 'info' | 'warn' | 'error';
  timeoutInMilliseconds?: number;
}

export interface RenderKickoffResult {
  ok: boolean;
  renderId?: string;
  bucketName?: string;
  folderInS3Console?: string;
  estimatedDuration?: number;
  error?: string;
  fallback?: boolean;
}

export interface RenderProgressResult {
  ok: boolean;
  overallProgress?: number; // 0-1
  renderMetadata?: {
    type: 'still' | 'video';
    codec: string;
    width: number;
    height: number;
    totalFrames: number;
  };
  framesRendered?: number;
  currentPhase?: 'rendering' | 'combining' | 'encoding' | 'done';
  outputFile?: string;
  done?: boolean;
  fatalErrorEncountered?: boolean;
  errors?: string[];
  error?: string;
  fallback?: boolean;
}

/**
 * Check if Remotion Lambda is properly configured
 */
export function isRemotionConfigured(): boolean {
  return !!(
    process.env.REMOTION_FUNCTION_NAME &&
    process.env.REMOTION_SERVE_URL &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY
  );
}

/**
 * Get Remotion configuration from environment
 */
function getRemotionConfig() {
  return {
    functionName: process.env.REMOTION_FUNCTION_NAME || '',
    serveUrl: process.env.REMOTION_SERVE_URL || '',
    region: (process.env.REMOTION_REGION || 'us-east-1') as 'us-east-1' | 'eu-west-1' | 'ap-south-1',
  };
}

/**
 * Kick off a Remotion Lambda render
 * Returns immediately with renderId for progress polling
 *
 * @param params - Render parameters (compositionId, inputProps, etc.)
 * @returns RenderKickoffResult with renderId and bucketName
 */
export async function kickoffRender(params: RenderKickoffParams): Promise<RenderKickoffResult> {
  const config = getRemotionConfig();

  // Graceful fallback if not configured
  if (!isRemotionConfigured()) {
    console.log('[RemotionClient] Not configured, using fallback mode');
    return {
      ok: true,
      renderId: `fallback-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      bucketName: 'fallback-bucket',
      estimatedDuration: 30,
      fallback: true,
    };
  }

  try {
    // Dynamic import to avoid build errors when package not installed
    const { renderMediaOnLambda } = await import('@remotion/lambda/client');

    const startTime = Date.now();

    const result = await renderMediaOnLambda({
      region: config.region,
      functionName: config.functionName,
      serveUrl: config.serveUrl,
      composition: params.compositionId,
      inputProps: params.inputProps || {},
      codec: params.codec || 'h264',
      imageFormat: params.imageFormat || 'jpeg',
      jpegQuality: params.jpegQuality || 80,
      scale: params.scale || 1,
      framesPerLambda: params.framesPerLambda || 20,
      privacy: params.privacy || 'public',
      logLevel: params.logLevel || 'warn',
      timeoutInMilliseconds: params.timeoutInMilliseconds || 120000,
      outName: params.outName,
      frameRange: params.frameRange || null,
    });

    const kickoffTime = Date.now() - startTime;
    console.log(`[RemotionClient] Render kicked off in ${kickoffTime}ms: ${result.renderId}`);

    return {
      ok: true,
      renderId: result.renderId,
      bucketName: result.bucketName,
      folderInS3Console: result.folderInS3Console,
      estimatedDuration: 30, // Rough estimate, can be refined
    };
  } catch (error) {
    console.error('[RemotionClient] Kickoff error:', error);

    // Check if it's a module not found error
    if (error instanceof Error && error.message.includes('Cannot find module')) {
      console.log('[RemotionClient] @remotion/lambda not installed, using fallback');
      return {
        ok: true,
        renderId: `fallback-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        bucketName: 'fallback-bucket',
        estimatedDuration: 30,
        fallback: true,
      };
    }

    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error during render kickoff',
    };
  }
}

/**
 * Poll for render progress
 *
 * @param renderId - The render ID from kickoffRender
 * @param bucketName - The bucket name from kickoffRender
 * @returns RenderProgressResult with progress and status
 */
export async function getProgress(renderId: string, bucketName: string): Promise<RenderProgressResult> {
  const config = getRemotionConfig();

  // Graceful fallback for fake render IDs
  if (renderId.startsWith('fallback-')) {
    // Simulate progress over time
    const createdAt = parseInt(renderId.split('-')[1], 10);
    const elapsed = Date.now() - createdAt;
    const progress = Math.min(elapsed / 30000, 1); // 30s fake render

    if (progress >= 1) {
      return {
        ok: true,
        overallProgress: 1,
        done: true,
        currentPhase: 'done',
        outputFile: '/test-assets/test-video.mp4',
        framesRendered: 900,
        fallback: true,
      };
    }

    return {
      ok: true,
      overallProgress: progress,
      done: false,
      currentPhase: progress < 0.7 ? 'rendering' : progress < 0.9 ? 'combining' : 'encoding',
      framesRendered: Math.floor(progress * 900),
      fallback: true,
    };
  }

  // Real Remotion Lambda progress
  if (!isRemotionConfigured()) {
    return {
      ok: false,
      error: 'Remotion Lambda not configured',
    };
  }

  try {
    const { getRenderProgress } = await import('@remotion/lambda/client');

    const progress = await getRenderProgress({
      renderId,
      bucketName,
      region: config.region,
      functionName: config.functionName,
    });

    return {
      ok: true,
      overallProgress: progress.overallProgress,
      done: progress.done,
      fatalErrorEncountered: progress.fatalErrorEncountered,
      framesRendered: progress.framesRendered,
      outputFile: progress.outputFile,
      currentPhase: progress.done ? 'done' : 'rendering',
      renderMetadata: progress.renderMetadata ? {
        type: progress.renderMetadata.type,
        codec: progress.renderMetadata.codec,
        width: progress.renderMetadata.width,
        height: progress.renderMetadata.height,
        totalFrames: progress.renderMetadata.totalFrames,
      } : undefined,
      errors: progress.errors?.map(e => e.message),
    };
  } catch (error) {
    console.error('[RemotionClient] Progress error:', error);

    if (error instanceof Error && error.message.includes('Cannot find module')) {
      return {
        ok: false,
        error: '@remotion/lambda not installed',
        fallback: true,
      };
    }

    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error getting progress',
    };
  }
}

/**
 * Helper to wait for render completion with polling
 * Useful for tests/scripts, NOT for Netlify Functions (use progress endpoint instead)
 */
export async function waitForRender(
  renderId: string,
  bucketName: string,
  options: { pollIntervalMs?: number; timeoutMs?: number } = {}
): Promise<RenderProgressResult> {
  const { pollIntervalMs = 2000, timeoutMs = 300000 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const progress = await getProgress(renderId, bucketName);

    if (!progress.ok) {
      return progress;
    }

    if (progress.done) {
      return progress;
    }

    if (progress.fatalErrorEncountered) {
      return {
        ...progress,
        ok: false,
        error: progress.errors?.join(', ') || 'Fatal error during render',
      };
    }

    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  return {
    ok: false,
    error: `Render timeout after ${timeoutMs}ms`,
  };
}
