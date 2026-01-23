
import type { Handler } from "@netlify/functions";
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';

// Types
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
}

const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
};

// ----------------------------------------------------------------------------
// OAuth 1.0a Helper
// ----------------------------------------------------------------------------
function getAuthHeader(url: string, method: string) {
    const oauth = new OAuth({
        consumer: {
            // Support both old TWITTER_ and new X_ prefixes per Scott's instructions
            key: process.env.X_API_KEY || process.env.TWITTER_API_KEY || '',
            secret: process.env.X_API_SECRET || process.env.TWITTER_API_SECRET || '',
        },
        signature_method: 'HMAC-SHA1',
        hash_function(base_string, key) {
            return crypto
                .createHmac('sha1', key)
                .update(base_string)
                .digest('base64');
        },
    });

    const token = {
        key: process.env.X_ACCESS_TOKEN || process.env.TWITTER_ACCESS_TOKEN || '',
        secret: process.env.X_ACCESS_TOKEN_SECRET || process.env.TWITTER_ACCESS_SECRET || '',
    };

    return oauth.toHeader(oauth.authorize({ url, method }, token));
}

// ----------------------------------------------------------------------------
// X API Client (Fetch-based with OAuth 1.0a)
// ----------------------------------------------------------------------------
async function postToTwitter(text: string): Promise<any> {
    const endpoint = 'https://api.twitter.com/2/tweets';

    // Safety check for keys before attempting
    const hasKeys = (process.env.X_API_KEY || process.env.TWITTER_API_KEY) &&
        (process.env.X_ACCESS_TOKEN || process.env.TWITTER_ACCESS_TOKEN);

    if (!hasKeys) throw new Error("Missing X/Twitter keys");

    const authHeader = getAuthHeader(endpoint, 'POST');

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            ...authHeader,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
    });

    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            throw new Error(`Auth Error (${response.status}): Check keys and permissions.`);
        }
        if (response.status === 429) {
            throw new Error("Rate Limit Exceeded");
        }
        const errText = await response.text();
        throw new Error(`X API Error ${response.status}: ${errText}`);
    }

    return await response.json();
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

        // Check for API Keys (support both prefixes)
        const hasKeys = (process.env.X_API_KEY || process.env.TWITTER_API_KEY) &&
            (process.env.X_ACCESS_TOKEN || process.env.TWITTER_ACCESS_TOKEN);

        if (!hasKeys) {
            console.log("🐦 [DISABLED] X/Twitter - missing API keys");
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: false,
                    disabled: true,
                    platform: 'x',
                    error: "X/Twitter disabled (missing keys)",
                    note: "Set X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET to enable."
                })
            };
        }

        console.log(`🐦 [X-AGENT] Posting to X: "${text.substring(0, 50)}..."`);

        // Execute Real Post
        const result = await postToTwitter(text);

        // Job Costing Manifest
        // Est. $0.001 per post + Commons Good markup
        const invoiceEntry: XManifestEntry = {
            endpoint: 'tweets',
            cost: 0.001,
            total_due: 0.001 * 1.2, // 20% markup
            timestamp: new Date().toISOString()
        };

        console.log(`✅ [X-AGENT] Posted! Tweet ID: ${result.data?.id}`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                platform: 'x',
                tweetId: result.data?.id,
                url: `https://x.com/user/status/${result.data?.id}`,
                invoice: invoiceEntry
            })
        };

    } catch (error: any) {
        console.error("❌ X Publish Error:", error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, error: error.message }),
        };
    }
};

export { handler };
