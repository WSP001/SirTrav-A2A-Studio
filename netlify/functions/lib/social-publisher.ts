import { buildFunctionUrl } from './request-origin';

export interface SocialPublishResult {
  success: boolean;
  data?: any;
  error?: string;
  duration_ms?: number;
  fallback?: boolean;
}

export interface SocialPublishingOptions {
  baseUrl: string;
  projectId: string;
  runId: string;
  publishTargets: string[];
  videoUrl: string;
  narrative: string;
  attributionData?: any;
  imageUrls?: string[];
}

export async function executeSocialPublishingAgent(options: SocialPublishingOptions): Promise<Record<string, SocialPublishResult>> {
  const {
    baseUrl,
    projectId,
    runId,
    publishTargets,
    videoUrl,
    narrative,
    attributionData,
    imageUrls,
  } = options;
  const results: Record<string, SocialPublishResult> = {};

  if (!publishTargets || publishTargets.length === 0) {
    console.log('[Publisher] No publish targets; skipping social distribution');
    return results;
  }

  const platformCalls: Array<{ platform: string; url: string; body: any }> = [];

  for (const target of publishTargets) {
    if (target === 'x') {
      const text = narrative.length > 250 ? `${narrative.substring(0, 247)}...` : narrative;
      platformCalls.push({
        platform: 'x',
        url: buildFunctionUrl(baseUrl, 'publish-x'),
        body: {
          text,
          dryRun: false,
          mediaUrls: imageUrls && imageUrls.length > 0 ? imageUrls.slice(0, 4) : undefined,
        },
      });
    } else if (target === 'linkedin') {
      platformCalls.push({
        platform: 'linkedin',
        url: buildFunctionUrl(baseUrl, 'publish-linkedin'),
        body: {
          projectId,
          runId,
          videoUrl,
          title: `SirTrav: ${projectId}`,
          description: narrative.substring(0, 500),
          visibility: 'PUBLIC',
          commonsGoodCredits: attributionData?.markdown || 'For the Commons Good',
          dryRun: false,
        },
      });
    } else if (target === 'youtube') {
      platformCalls.push({
        platform: 'youtube',
        url: buildFunctionUrl(baseUrl, 'publish-youtube'),
        body: {
          projectId,
          videoUrl,
          title: `SirTrav: ${projectId}`,
          description: narrative.substring(0, 2000),
          tags: ['SirTrav', 'A2A', 'CommonsGood', 'Travel'],
          privacy: 'unlisted',
          commonsGoodCredits: attributionData?.markdown || 'For the Commons Good',
          dryRun: false,
        },
      });
    }
  }

  console.log(`[Publisher] Publishing to ${platformCalls.length} platform(s): ${platformCalls.map(c => c.platform).join(', ')}`);

  const youtubeCall = platformCalls.find(c => c.platform === 'youtube');
  const linkedinCall = platformCalls.find(c => c.platform === 'linkedin');
  let youtubeVideoUrl: string | null = null;

  if (youtubeCall) {
    const startTime = Date.now();
    try {
      const ytRes = await fetch(youtubeCall.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(youtubeCall.body),
        signal: AbortSignal.timeout(120000),
      });
      const ytData = await ytRes.json().catch(() => ({}));
      if (ytData.success === true && ytData.youtubeId) {
        youtubeVideoUrl = `https://youtube.com/watch?v=${ytData.youtubeId}&utm_source=linkedin&utm_medium=social&utm_campaign=seatrace-reel&utm_content=${projectId}`;
        results.publisher_youtube = {
          success: true,
          data: ytData,
          duration_ms: Date.now() - startTime,
          fallback: false,
        };

        if (linkedinCall) {
          const ytLink = `\n\nWatch the full reel: ${youtubeVideoUrl}`;
          linkedinCall.body.description = (linkedinCall.body.description || '').substring(0, 400) + ytLink;
        }
      } else {
        results.publisher_youtube = {
          success: false,
          data: ytData,
          duration_ms: Date.now() - startTime,
          fallback: ytData.disabled === true || ytData.dryRun === true,
          error: ytData.error || ytData.note || `youtube_publish_${ytRes.status}`,
        };
      }
    } catch (error) {
      results.publisher_youtube = {
        success: false,
        data: {},
        duration_ms: Date.now() - startTime,
        fallback: true,
        error: error instanceof Error ? error.message : 'youtube_publish_failed',
      };
    }
  }

  const remainingCalls = platformCalls.filter(c => c.platform !== 'youtube');
  const settlements = await Promise.allSettled(
    remainingCalls.map(async ({ platform, url, body }) => {
      const startTime = Date.now();
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(60000),
        });
        const data = await response.json().catch(() => ({}));
        return {
          platform,
          result: {
            success: data.success === true,
            data,
            duration_ms: Date.now() - startTime,
            fallback: data.disabled === true || data.dryRun === true,
            error: data.success === true ? undefined : data.error || data.note || `${platform}_publish_${response.status}`,
          } satisfies SocialPublishResult,
        };
      } catch (error) {
        return {
          platform,
          result: {
            success: false,
            error: error instanceof Error ? error.message : 'publish_failed',
            duration_ms: Date.now() - startTime,
            fallback: true,
          } satisfies SocialPublishResult,
        };
      }
    }),
  );

  for (const settlement of settlements) {
    if (settlement.status === 'fulfilled') {
      results[`publisher_${settlement.value.platform}`] = settlement.value.result;
    } else {
      results.publisher_unknown = {
        success: false,
        error: settlement.reason?.message || 'unknown_publish_error',
        fallback: true,
      };
    }
  }

  return results;
}
