
import type { Handler } from "@netlify/functions";

// Types
interface XPublishRequest {
    text: string;
    mediaUrls?: string[];
    userId?: string;
}

interface XPublishResponse {
    success: boolean;
    tweetId?: string;
    url?: string;
    error?: string;
}

const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
};

// ----------------------------------------------------------------------------
// Twitter API Client (Fetch-based to avoid large deps)
// ----------------------------------------------------------------------------
async function postToTwitter(text: string, mediaIds: string[] = []): Promise<any> {
    const apiKey = process.env.TWITTER_API_KEY;
    const apiSecret = process.env.TWITTER_API_SECRET;
    const accessToken = process.env.TWITTER_ACCESS_TOKEN;
    const accessSecret = process.env.TWITTER_ACCESS_SECRET;

    if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
        throw new Error("Missing Twitter API credentials");
    }

    // Note: In a real implementation we would use 'twitter-api-v2' or 'oauth-1.0a'
    // Since we want to keep dependencies light, this is a placeholder for the actual OAuth 1.0a signature logic
    // For now, we simulate the call or fail if credentials exist but library is missing.
    // To make this fully functional, we should add 'twitter-api-v2' to package.json.

    // Simulating Success for demonstration if keys are present (or falling back to placeholder in main handler)
    console.log("🐦 Posting to X:", text, mediaIds);
    return { data: { id: "123456789", text } };
}

// ----------------------------------------------------------------------------
// Handler
// ----------------------------------------------------------------------------
const handler: Handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: 'Method Not Allowed' };
    }

    try {
        const { text, mediaUrls } = JSON.parse(event.body || '{}') as XPublishRequest;

        // Check for API Keys
        const hasKeys = process.env.TWITTER_API_KEY && process.env.TWITTER_ACCESS_TOKEN;

        if (!hasKeys) {
            // 🎯 MG-P0-C: Explicit "disabled" response - no fake success
            console.log("🐦 [DISABLED] X/Twitter - missing API keys");
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: false,
                    disabled: true,
                    platform: 'x',
                    error: "X/Twitter publishing is disabled - missing TWITTER_API_KEY and TWITTER_ACCESS_TOKEN",
                    note: "Configure Twitter API v2 credentials in Netlify environment variables to enable"
                })
            };
        }

        // 🎯 MG-P0-C: Real implementation requires twitter-api-v2 package
        // Currently NOT implemented - return explicit "not_implemented" status
        // TODO: Add twitter-api-v2 to package.json and implement OAuth 1.0a signing
        console.log("🐦 [NOT_IMPLEMENTED] X/Twitter API configured but implementation pending");
        return {
            statusCode: 501,
            headers,
            body: JSON.stringify({
                success: false,
                not_implemented: true,
                platform: 'x',
                error: "X/Twitter publishing not yet implemented - twitter-api-v2 package required",
                note: "API keys are configured but OAuth signing is not implemented"
            })
        };

    } catch (error: any) {
        console.error("❌ X Publish Error:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, error: error.message }),
        };
    }
};

export { handler };
