/**
 * check-x-engagement (Modern function)
 * GET: Fetches recent mentions/replies from X/Twitter and stores engagement signals.
 * POST: { runId?, sinceId? } — optional parameters for targeted fetch.
 *
 * Engagement signals are stored in evalsStore for the regenerative content loop.
 * Free tier X API only supports GET /2/users/me — mentions require Basic ($100/mo).
 * This function gracefully handles tier limitations.
 */
import { TwitterApi } from 'twitter-api-v2';
import { evalsStore } from './lib/storage';

interface EngagementSignal {
  id: string;
  platform: 'x';
  type: 'mention' | 'reply';
  author: string;
  text: string;
  timestamp: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  actionable: boolean;
}

interface EngagementResponse {
  success: boolean;
  disabled?: boolean;
  count?: number;
  signals?: EngagementSignal[];
  userId?: string;
  username?: string;
  tierLimited?: boolean;
  invoice?: {
    endpoint: string;
    cost: number;
    total_due: number;
    timestamp: string;
    buildId: string;
  };
  error?: string;
  runId?: string;
}

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

function analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
  const lower = text.toLowerCase();
  const positiveWords = ['love', 'great', 'amazing', 'awesome', 'fire', 'nice', 'good', 'best', 'thanks'];
  const negativeWords = ['bad', 'hate', 'terrible', 'awful', 'worst', 'boring', 'trash', 'broken'];

  const posScore = positiveWords.filter(w => lower.includes(w)).length;
  const negScore = negativeWords.filter(w => lower.includes(w)).length;

  if (posScore > negScore) return 'positive';
  if (negScore > posScore) return 'negative';
  return 'neutral';
}

function isActionable(text: string): boolean {
  const lower = text.toLowerCase();
  const actionWords = ['more', 'less', 'please', 'could you', 'can you', 'should', 'want', 'need', 'try', 'suggest'];
  return actionWords.some(w => lower.includes(w));
}

export default async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('', { status: 204, headers: HEADERS });
  }

  // Parse optional body for POST (runId, sinceId)
  let runId = 'unknown';
  let sinceId: string | undefined;

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      runId = body.runId || 'unknown';
      sinceId = body.sinceId;
    } catch {
      // Body is optional
    }
  }

  // No Fake Success: disabled if keys missing
  const appKey = process.env.TWITTER_API_KEY || process.env.X_API_KEY;
  const appSecret = process.env.TWITTER_API_SECRET || process.env.X_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN || process.env.X_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET || process.env.X_ACCESS_SECRET;

  if (!appKey || !appSecret || !accessToken || !accessSecret) {
    const resp: EngagementResponse = {
      success: false,
      disabled: true,
      error: 'X/Twitter disabled (missing keys)',
      runId,
    };
    return new Response(JSON.stringify(resp), { status: 200, headers: HEADERS });
  }

  try {
    console.log(`[X-ENGAGEMENT] Checking engagement signals (runId: ${runId})...`);

    const client = new TwitterApi({ appKey, appSecret, accessToken, accessSecret });

    // Step 1: Get authenticated user ID (required for mentions endpoint)
    const me = await client.v2.me();
    const userId = me.data.id;
    const username = me.data.username;

    console.log(`[X-ENGAGEMENT] Authenticated as @${username} (${userId})`);

    // Step 2: Try to fetch mentions (requires Basic tier — $100/mo)
    let signals: EngagementSignal[] = [];
    let tierLimited = false;

    try {
      const mentionOpts: Record<string, any> = {
        max_results: 10,
        'tweet.fields': ['created_at', 'author_id', 'conversation_id'],
        'user.fields': ['username'],
        expansions: ['author_id'],
      };
      if (sinceId) mentionOpts.since_id = sinceId;

      const mentions = await client.v2.userMentionTimeline(userId, mentionOpts);

      if (mentions.data?.data) {
        signals = mentions.data.data.map((tweet) => {
          const author = mentions.includes?.users?.find((u) => u.id === tweet.author_id);
          return {
            id: tweet.id,
            platform: 'x' as const,
            type: 'mention' as const,
            author: author ? `@${author.username}` : 'unknown',
            text: tweet.text,
            timestamp: tweet.created_at || new Date().toISOString(),
            sentiment: analyzeSentiment(tweet.text),
            actionable: isActionable(tweet.text),
          };
        });
      }
    } catch (tierErr: any) {
      // Free tier returns 403 for mentions — expected, not an error
      if (tierErr.code === 403 || tierErr.data?.status === 403) {
        console.log('[X-ENGAGEMENT] Mentions endpoint requires Basic tier (Free tier limitation)');
        tierLimited = true;
      } else {
        throw tierErr;
      }
    }

    // Step 3: Store signals in evalsStore (engagement memory)
    if (signals.length > 0) {
      try {
        const store = evalsStore();
        const ts = new Date().toISOString();
        const key = `engagement/${userId}/${ts}.json`;
        await store.setJSON(key, {
          runId,
          userId,
          username,
          fetchedAt: ts,
          signalCount: signals.length,
          signals,
        });
        console.log(`[X-ENGAGEMENT] Stored ${signals.length} signals in evalsStore`);
      } catch (storeErr) {
        console.warn('[X-ENGAGEMENT] evalsStore write failed (continuing):', storeErr);
      }
    }

    // Step 4: Cost Plus 20% invoice
    const invoice = {
      endpoint: 'GET /2/users/:id/mentions',
      cost: 0.0001,
      total_due: 0.0001 * 1.2,
      timestamp: new Date().toISOString(),
      buildId: process.env.BUILD_ID || 'local-dev',
    };

    console.log(`[X-ENGAGEMENT] Found ${signals.length} signals${tierLimited ? ' (tier-limited)' : ''}`);

    const resp: EngagementResponse = {
      success: true,
      count: signals.length,
      signals,
      userId,
      username,
      tierLimited,
      invoice,
      runId,
    };

    return new Response(JSON.stringify(resp), { status: 200, headers: HEADERS });
  } catch (error: any) {
    console.error('[X-ENGAGEMENT] Error:', error);

    if (error.code === 401 || error.data?.status === 401) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Authentication Failed. Check API Keys.',
        keysPresent: true,
        runId,
      }), { status: 401, headers: HEADERS });
    }

    if (error.code === 429) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Rate Limit Exceeded. Try again in 15 minutes.',
        retryAfter: 900,
        runId,
      }), { status: 429, headers: HEADERS });
    }

    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Internal Server Error',
      runId,
    }), { status: 500, headers: HEADERS });
  }
};
