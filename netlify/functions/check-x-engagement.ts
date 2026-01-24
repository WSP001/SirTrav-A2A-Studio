import { Handler } from '@netlify/functions';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';

// Types for X API Responses
interface XUser {
    id: string;
    name: string;
    username: string;
}

interface XTweet {
    id: string;
    text: string;
    author_id: string;
    created_at: string;
    conversation_id?: string;
}

interface XMentionsResponse {
    data?: XTweet[];
    includes?: {
        users?: XUser[];
    };
    meta?: {
        result_count: number;
        newest_id: string;
    };
    errors?: any[];
}

/**
 * Helper: Generate OAuth 1.0a Header (Reused from publish-x.ts)
 */
function getAuthHeader(url: string, method: string) {
    const oauth = new OAuth({
        consumer: {
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

export const handler: Handler = async (event) => {
    // 1. Basic Auth Check
    const apiKey = process.env.X_API_KEY || process.env.TWITTER_API_KEY;
    if (!apiKey) {
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: false,
                disabled: true,
                message: "X Integration disabled (keys missing)"
            })
        };
    }

    // 2. Determine Fetch Parameters
    // In a real app, we'd read 'since_id' from a DB/Vault to only get new stuff
    // For now, we fetch the last 5 mentions
    const maxResults = 5;
    const userId = 'me'; // Special alias when using OAuth 1.0a User Context
    const baseUrl = `https://api.twitter.com/2/users/${userId}/mentions`;
    const queryParams = `max_results=${maxResults}&place.fields=full_name&tweet.fields=created_at,author_id,conversation_id&user.fields=username`;
    const fullUrl = `${baseUrl}?${queryParams}`;

    try {
        console.log(`📡 [X-LISTENER] Checking mentions for @me...`);

        // 3. Call X API
        const authHeader = getAuthHeader(baseUrl, 'GET');

        // Note: OAuth 1.0a signature MUST NOT include query params in the base string if they are in the URL
        // BUT the library handles this if we pass the full URL to authorize().
        // Let's be careful. The safer way is to sign the base URL and append params later, 
        // OR pass param object to authorize.
        // Let's try the robust way:

        const requestData = {
            url: baseUrl, // Base URL for signing
            method: 'GET',
            data: {
                max_results: maxResults,
                'tweet.fields': 'created_at,author_id,conversation_id',
                'user.fields': 'username'
            }
        };

        const oauth = new OAuth({
            consumer: {
                key: process.env.X_API_KEY || process.env.TWITTER_API_KEY || '',
                secret: process.env.X_API_SECRET || process.env.TWITTER_API_SECRET || '',
            },
            signature_method: 'HMAC-SHA1',
            hash_function(base_string, key) {
                return crypto.createHmac('sha1', key).update(base_string).digest('base64');
            },
        });

        const token = {
            key: process.env.X_ACCESS_TOKEN || process.env.TWITTER_ACCESS_TOKEN || '',
            secret: process.env.X_ACCESS_TOKEN_SECRET || process.env.TWITTER_ACCESS_SECRET || '',
        };

        const authHeaderObj = oauth.toHeader(oauth.authorize(requestData, token));

        // Construct final URL with params
        const finalUrl = `${baseUrl}?max_results=${maxResults}&tweet.fields=created_at,author_id,conversation_id&user.fields=username`;

        const response = await fetch(finalUrl, {
            method: 'GET',
            headers: {
                ...authHeaderObj,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json() as XMentionsResponse;

        if (response.status !== 200) {
            console.error('❌ X API Error:', data);
            return {
                statusCode: response.status,
                body: JSON.stringify({
                    success: false,
                    error: `X API Error: ${response.status}`,
                    details: data
                })
            };
        }

        // 4. Process Signals
        const signals = (data.data || []).map(tweet => {
            const author = data.includes?.users?.find(u => u.id === tweet.author_id);
            return {
                id: tweet.id,
                platform: 'x',
                type: 'mention',
                author: author ? `@${author.username}` : 'unknown',
                text: tweet.text,
                timestamp: tweet.created_at,
                sentiment: 'neutral', // Placeholder for actual analysis
                actionable: tweet.text.toLowerCase().includes('more') || tweet.text.toLowerCase().includes('less')
            };
        });

        console.log(`✅ [X-LISTENER] Found ${signals.length} mentions.`);

        // 5. Return Results (In future: Write to Vault)
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                count: signals.length,
                signals: signals,
                // Invoice (Costing)
                invoice: {
                    endpoint: 'users/:id/mentions',
                    cost: 0.0001, // Cheap read
                    total_due: 0.00012, // +20% markup
                    timestamp: new Date().toISOString()
                }
            })
        };

    } catch (error: any) {
        console.error('❌ Listener Check Failed:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
};
