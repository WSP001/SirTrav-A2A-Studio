/**
 * PUBLISHER AGENT - Instagram Reels Upload
 * Part of Agent 7 (Publisher) in the D2A Pipeline
 * 
 * PURPOSE: Upload videos to Instagram as Reels
 * 
 * INPUT: { projectId, videoUrl, caption }
 * OUTPUT: { instagramId, instagramUrl, status }
 * 
 * REAL INTEGRATION: Uses Instagram Graph API (requires Facebook Business account)
 * 
 * REQUIREMENTS:
 * - INSTAGRAM_ACCESS_TOKEN: Long-lived access token
 * - INSTAGRAM_BUSINESS_ID: Instagram Business Account ID
 */

import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

interface InstagramRequest {
  projectId: string;
  videoUrl: string;
  caption: string;
  coverUrl?: string;  // Thumbnail image URL
  shareToFeed?: boolean;
  commonsGoodCredits?: string;
}

interface InstagramResponse {
  success: boolean;
  projectId: string;
  instagramId?: string;
  instagramUrl?: string;
  status: 'uploaded' | 'processing' | 'failed' | 'placeholder';
  error?: string;
  containerId?: string;
}

/**
 * Create Instagram media container for Reels
 */
async function createMediaContainer(
  accessToken: string,
  businessId: string,
  videoUrl: string,
  caption: string,
  coverUrl?: string
): Promise<{ containerId: string } | null> {
  try {
    const params = new URLSearchParams({
      media_type: 'REELS',
      video_url: videoUrl,
      caption: caption,
      access_token: accessToken,
    });
    
    if (coverUrl) {
      params.append('cover_url', coverUrl);
    }
    
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${businessId}/media?${params}`,
      { method: 'POST' }
    );
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Instagram container creation failed:', error);
      return null;
    }
    
    const data = await response.json();
    return { containerId: data.id };
  } catch (error) {
    console.error('Instagram container error:', error);
    return null;
  }
}

/**
 * Check media container status
 */
async function checkContainerStatus(
  accessToken: string,
  containerId: string
): Promise<'FINISHED' | 'IN_PROGRESS' | 'ERROR'> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${containerId}?fields=status_code&access_token=${accessToken}`
    );
    
    if (!response.ok) return 'ERROR';
    
    const data = await response.json();
    return data.status_code || 'IN_PROGRESS';
  } catch {
    return 'ERROR';
  }
}

/**
 * Publish the media container
 */
async function publishMedia(
  accessToken: string,
  businessId: string,
  containerId: string
): Promise<{ mediaId: string } | null> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${businessId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          creation_id: containerId,
          access_token: accessToken,
        }),
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Instagram publish failed:', error);
      return null;
    }
    
    const data = await response.json();
    return { mediaId: data.id };
  } catch (error) {
    console.error('Instagram publish error:', error);
    return null;
  }
}

/**
 * Get Instagram permalink
 */
async function getPermalink(
  accessToken: string,
  mediaId: string
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${mediaId}?fields=permalink&access_token=${accessToken}`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data.permalink;
  } catch {
    return null;
  }
}

/**
 * Wait for container to be ready (with timeout)
 */
async function waitForContainer(
  accessToken: string,
  containerId: string,
  maxWaitMs: number = 30000
): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    const status = await checkContainerStatus(accessToken, containerId);
    
    if (status === 'FINISHED') return true;
    if (status === 'ERROR') return false;
    
    // Wait 2 seconds before checking again
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  return false;
}

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  console.log('📸 PUBLISHER AGENT - Instagram Reels Upload');
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }
  
  try {
    const request: InstagramRequest = JSON.parse(event.body || '{}');
    
    if (!request.projectId || !request.videoUrl || !request.caption) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'projectId, videoUrl, and caption are required' }),
      };
    }
    
    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const businessId = process.env.INSTAGRAM_BUSINESS_ID;
    
    if (!accessToken || !businessId) {
      console.warn('⚠️ [DISABLED] Instagram credentials not configured');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          disabled: true,
          platform: 'instagram',
          projectId: request.projectId,
          error: 'Instagram disabled (missing INSTAGRAM_ACCESS_TOKEN or INSTAGRAM_BUSINESS_ID)',
          note: 'Set INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_BUSINESS_ID in Netlify.',
        }),
      };
    }
    
    // Build caption with Commons Good credits
    let caption = request.caption;
    if (request.commonsGoodCredits) {
      caption += `\n\n🌍 ${request.commonsGoodCredits}`;
    }
    caption += '\n\n#CommonsGood #SirTrav #A2A #ForTheCommonsGood';
    
    // Create media container
    console.log('📤 Creating Instagram media container...');
    const containerResult = await createMediaContainer(
      accessToken,
      businessId,
      request.videoUrl,
      caption,
      request.coverUrl
    );
    
    if (!containerResult) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'Failed to create media container' }),
      };
    }
    
    // Wait for container to be ready
    console.log('⏳ Waiting for video processing...');
    const isReady = await waitForContainer(accessToken, containerResult.containerId);
    
    if (!isReady) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Video processing timeout',
          containerId: containerResult.containerId,
        }),
      };
    }
    
    // Publish the media
    console.log('🚀 Publishing to Instagram...');
    const publishResult = await publishMedia(accessToken, businessId, containerResult.containerId);
    
    if (!publishResult) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'Failed to publish media' }),
      };
    }
    
    // Get permalink
    const permalink = await getPermalink(accessToken, publishResult.mediaId);
    
    const response: InstagramResponse = {
      success: true,
      projectId: request.projectId,
      instagramId: publishResult.mediaId,
      instagramUrl: permalink || `https://instagram.com/reel/${publishResult.mediaId}`,
      status: 'uploaded',
      containerId: containerResult.containerId,
    };
    
    console.log(`✅ Instagram upload complete: ${response.instagramUrl}`);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };
    
  } catch (error) {
    console.error('❌ Instagram Publisher error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
    };
  }
};

export { handler };
