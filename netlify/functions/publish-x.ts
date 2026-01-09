
import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

interface TwitterRequest {
    projectId: string;
    videoUrl: string;
    title: string;
    description: string;
    hashtags?: string[];
    commonsGoodCredits?: string;
}

interface TwitterResponse {
    success: boolean;
    projectId: string;
    twitterId?: string;
    twitterUrl?: string;
    status: 'uploaded' | 'processing' | 'failed' | 'placeholder';
    error?: string;
}

const headers = {
    'Access-Control-Allow-Origin': '*',
    // 'Access-Control-Allow-Headers': 'Content-Type', // Optional, usually handled by Netlify
    'Content-Type': 'application/json',
};

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
    console.log('🐦 PUBLISHER AGENT - X (Twitter) Upload');

    // CORS Preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const request: TwitterRequest = JSON.parse(event.body || '{}');

        if (!request.projectId || !request.videoUrl) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing required params: projectId, videoUrl' }),
            };
        }

        // Check secrets
        const apiKey = process.env.TWITTER_API_KEY;
        const apiSecret = process.env.TWITTER_API_SECRET;
        const accessToken = process.env.TWITTER_ACCESS_TOKEN;
        const accessSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;

        // Placeholder Mode if keys missing
        if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
            console.log('⚠️ Missing Twitter/X credentials. Using placeholder mode.');

            // Simulate network delay
            await new Promise(r => setTimeout(r, 1500));

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    projectId: request.projectId,
                    twitterId: `mock-tweet-${Date.now()}`,
                    twitterUrl: `https://x.com/SirTrav/status/mock-${Date.now()}`,
                    status: 'placeholder',
                    error: undefined
                } as TwitterResponse),
            };
        }

        // REAL IMPLEMENTATION (stubbed for now as typically requires complex OAuth 1.0a or 2.0 PKCE for media)
        // For now, we will notify that we need a library like 'twitter-api-v2' to do this robustly in a lambda
        // But since the user asked for the AGENT file, we provide the logic structure.

        // NOTE: Video upload on Twitter API v2 is actually done via v1.1 media/upload endpoint usually.
        // This is a placeholder for the actual library call.

        // In a real scenario, we would:
        // 1. Download video from request.videoUrl
        // 2. Upload to https://upload.twitter.com/1.1/media/upload.json (INIT, APPEND, FINALIZE)
        // 3. Post Tweet with media_id using API v2

        throw new Error("Real Twitter API implementation requires 'twitter-api-v2' package. Using placeholder mode recommended until dependency added.");

    } catch (error: any) {
        console.error('X Publish Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message,
                status: 'failed'
            } as TwitterResponse),
        };
    }
};

export { handler };
