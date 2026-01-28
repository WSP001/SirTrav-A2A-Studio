
import type { Handler } from "@netlify/functions";
import { TwitterApi } from 'twitter-api-v2';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
interface XPublishRequest {
    text: string;
    mediaUrls?: string[];
    userId?: string;
}

interface XManifestEntry {
    endpoint: string;
    cost: number;
    total_due: number;
    timestamp: string;
    buildId: string;
}

// ----------------------------------------------------------------------------
// Headers
// ----------------------------------------------------------------------------
const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
};

// ----------------------------------------------------------------------------
// Handler
// ----------------------------------------------------------------------------
const handler: Handler = async (event) => {
    // 1. CORS Preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // 2. Method Check
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: 'Method Not Allowed' };
    }

    console.log("🐦 [X-AGENT] Received publish request");

    // 3. Environment Check (TWITTER_ prefix per Netlify Agent findings)
    const appKey = process.env.TWITTER_API_KEY || process.env.X_API_KEY;
    const appSecret = process.env.TWITTER_API_SECRET || process.env.X_API_SECRET;
    const accessToken = process.env.TWITTER_ACCESS_TOKEN || process.env.X_ACCESS_TOKEN;
    const accessSecret = process.env.TWITTER_ACCESS_SECRET || process.env.X_ACCESS_SECRET;

    if (!appKey || !appSecret || !accessToken || !accessSecret) {
        console.warn("⚠️ [DISABLED] Missing one or more Twitter/X API keys.");
        return {
            statusCode: 200, // Return 200 so UI can handle "disabled" state gracefully
            headers,
            body: JSON.stringify({
                success: false,
                disabled: true,
                platform: 'x',
                error: "X/Twitter disabled (missing keys)",
                note: "Set TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET in Netlify."
            })
        };
    }

    try {
        const { text } = JSON.parse(event.body || '{}') as XPublishRequest;

        if (!text) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing 'text' in payload" }) };
        }

        // 4. Initialize Twitter Client (OAuth 1.0a User Context)
        const userClient = new TwitterApi({
            appKey,
            appSecret,
            accessToken,
            accessSecret,
        });

        console.log(`🐦 [X-AGENT] Posting: "${text.substring(0, 50)}..."`);

        // 5. Execute Post (v2 endpoint)
        const result = await userClient.v2.tweet(text);

        if (result.errors && result.errors.length > 0) {
            throw new Error(`Twitter API Error: ${result.errors[0].detail || result.errors[0].title}`);
        }

        const tweetId = result.data.id;
        console.log(`✅ [X-AGENT] Success! Tweet ID: ${tweetId}`);

        // 6. Job Costing Manifest
        // Est. $0.001 per post (credit calc) + 20% Markup
        const invoiceEntry: XManifestEntry = {
            endpoint: 'POST /2/tweets',
            cost: 0.001,
            total_due: 0.001 * 1.2,
            timestamp: new Date().toISOString(),
            buildId: process.env.BUILD_ID || 'local-dev'
        };

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                platform: 'x',
                tweetId: tweetId,
                url: `https://twitter.com/user/status/${tweetId}`, // Generic URL since we don't have username handy without another call
                invoice: invoiceEntry
            })
        };

    } catch (error: any) {
        console.error("❌ [X-AGENT] Error:", error);

        // Rate Limit Handling
        if (error.code === 429) {
            return {
                statusCode: 429,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: "Rate Limit Exceeded. Please try again later.",
                    retryAfter: 60 // Simple default
                })
            };
        }

        // Auth Handling
        if (error.code === 401 || error.message?.includes('401')) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: "Authentication Failed. Check API Keys.",
                    keysPresent: true
                })
            };
        }

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message || "Internal Server Error"
            })
        };
    }
};

export { handler };
