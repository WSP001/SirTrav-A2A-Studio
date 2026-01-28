/**
 * MOTION GRAPHIC AGENT (Claude Assignment)
 * 
 * The bridge between UI and Remotion Lambda.
 * Handles input validation, cloud orchestration, and regenerative learning.
 * 
 * PATTERN: Dispatcher (Fire & Return ID) → Client Polls Progress
 */
import type { Handler, HandlerEvent } from "@netlify/functions";
import { z } from 'zod';

// ============================================================================
// SCHEMAS (Should match src/remotion/types.ts)
// ============================================================================
const MotionConfigSchema = z.object({
    templateId: z.enum(['IntroSlate', 'Changelog', 'OutroCredits', 'SocialPromo', 'SirTrav-Main']),
    props: z.record(z.any()),
    projectId: z.string().min(1),
    runId: z.string().optional(),
    platform: z.enum(['youtube', 'instagram', 'tiktok', 'linkedin']).default('youtube'),
    forceRegenerate: z.boolean().default(false),
});

type MotionConfig = z.infer<typeof MotionConfigSchema>;

// ============================================================================
// PLATFORM SPECIFICATIONS
// ============================================================================
const PLATFORMS = {
    youtube: { width: 1920, height: 1080, fps: 30 },
    instagram: { width: 1080, height: 1920, fps: 30 },
    tiktok: { width: 1080, height: 1920, fps: 30 },
    linkedin: { width: 1920, height: 1080, fps: 30 },
} as const;

// ============================================================================
// HEADERS
// ============================================================================
const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
};

// ============================================================================
// REGENERATIVE CONTEXT (Memory-based preference learning)
// ============================================================================
async function getRegenerativeContext(projectId: string): Promise<{
    preferredTheme: string;
    mutations: Record<string, any>;
}> {
    try {
        // In production, read from memory-index.json or Netlify Blobs
        // For now, return defaults with mutation hints
        const defaultContext = {
            preferredTheme: 'default',
            mutations: {},
        };

        // TODO: Read from memory store
        // const memory = await memoryStore.get(`project:${projectId}:preferences`);
        // if (memory) {
        //   const history = memory.run_history || [];
        //   const negativeRuns = history.filter(r => r.user_feedback?.score < 3);
        //   const positiveRuns = history.filter(r => r.user_feedback?.score >= 4);
        //   
        //   // Infer preferences from history
        //   if (positiveRuns.length > 0) {
        //     const lastGood = positiveRuns[positiveRuns.length - 1];
        //     defaultContext.preferredTheme = lastGood.parameters?.theme || 'default';
        //   }
        //   
        //   // Apply mutations to avoid past mistakes
        //   if (negativeRuns.length > 0) {
        //     const lastBad = negativeRuns[negativeRuns.length - 1];
        //     defaultContext.mutations = {
        //       avoidTheme: lastBad.parameters?.theme,
        //       avoidPacing: lastBad.parameters?.pacing,
        //     };
        //   }
        // }

        return defaultContext;
    } catch (error) {
        console.error('[Motion Agent] Failed to read regenerative context:', error);
        return { preferredTheme: 'default', mutations: {} };
    }
}

// ============================================================================
// LAMBDA DISPATCH (The actual render trigger)
// ============================================================================
async function dispatchToLambda(config: MotionConfig, context: { preferredTheme: string }) {
    const {
        REMOTION_LAMBDA_FUNCTION,
        REMOTION_BUCKET,
        AWS_REGION = 'us-east-1',
        REMOTION_SERVE_URL,
    } = process.env;

    // Check for Remotion Lambda configuration
    if (!REMOTION_LAMBDA_FUNCTION || !REMOTION_BUCKET || !REMOTION_SERVE_URL) {
        console.log('[Motion Agent] Remotion Lambda not configured - returning placeholder');
        return {
            success: true,
            placeholder: true,
            renderId: `placeholder-${Date.now()}`,
            message: 'Remotion Lambda not configured. Set REMOTION_LAMBDA_FUNCTION, REMOTION_BUCKET, REMOTION_SERVE_URL.',
            mockUrl: `https://example.com/placeholder-video-${config.templateId}.mp4`,
        };
    }

    // In production, use @remotion/lambda/client
    // import { renderMediaOnLambda } from '@remotion/lambda/client';

    const platformSpec = PLATFORMS[config.platform];

    try {
        // Dynamic import for Lambda client (only when actually rendering)
        const { renderMediaOnLambda } = await import('@remotion/lambda/client');

        const { renderId, bucketName } = await renderMediaOnLambda({
            region: AWS_REGION as any,
            functionName: REMOTION_LAMBDA_FUNCTION,
            serveUrl: REMOTION_SERVE_URL,
            composition: config.templateId,
            inputProps: {
                ...config.props,
                theme: context.preferredTheme,
                projectId: config.projectId,
                runId: config.runId,
            },
            codec: 'h264',
            imageFormat: 'jpeg',
            maxRetries: 1,
            framesPerLambda: 20,
            privacy: 'public',
            downloadBehavior: { type: 'download', fileName: `${config.projectId}-${config.templateId}.mp4` },
            // Video specs from platform
            ...platformSpec,
        });

        console.log(`[Motion Agent] Render dispatched: ${renderId}`);

        return {
            success: true,
            renderId,
            bucketName,
            region: AWS_REGION,
            polling: true,
            pollUrl: `/.netlify/functions/render-progress?renderId=${renderId}&bucketName=${bucketName}`,
        };
    } catch (error: any) {
        console.error('[Motion Agent] Lambda dispatch failed:', error);
        throw error;
    }
}

// ============================================================================
// HANDLER
// ============================================================================
const handler: Handler = async (event: HandlerEvent) => {
    // CORS Preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    // Method check
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method Not Allowed' }),
        };
    }

    console.log('[Motion Agent] 🎬 Received render request');

    try {
        // 1. Parse and validate input
        const rawInput = JSON.parse(event.body || '{}');
        const config = MotionConfigSchema.parse(rawInput);

        console.log(`[Motion Agent] Template: ${config.templateId}, Project: ${config.projectId}`);

        // 2. Get regenerative context (memory-based preferences)
        const context = await getRegenerativeContext(config.projectId);
        console.log(`[Motion Agent] Context: theme=${context.preferredTheme}`);

        // 3. Dispatch to Lambda
        const result = await dispatchToLambda(config, context);

        // 4. Return render ID for polling
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                ...result,
                templateId: config.templateId,
                projectId: config.projectId,
                timestamp: new Date().toISOString(),
            }),
        };

    } catch (error: any) {
        console.error('[Motion Agent] Error:', error);

        // Zod validation error
        if (error.name === 'ZodError') {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Validation Error',
                    details: error.errors,
                }),
            };
        }

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message || 'Internal Server Error',
            }),
        };
    }
};

export { handler };
