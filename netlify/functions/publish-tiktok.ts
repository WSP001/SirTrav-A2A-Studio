/**
 * PUBLISHER AGENT - TikTok Upload
 * Part of Agent 7 (Publisher) in the D2A Pipeline
 * 
 * PURPOSE: Upload videos to TikTok with proper metadata
 * 
 * INPUT: { projectId, videoUrl, caption, privacy }
 * OUTPUT: { tiktokId, tiktokUrl, status }
 * 
 * REAL INTEGRATION: Uses TikTok Content Posting API
 * 
 * REQUIREMENTS:
 * - TIKTOK_CLIENT_KEY: App client key
 * - TIKTOK_CLIENT_SECRET: App client secret
 * - TIKTOK_ACCESS_TOKEN: User access token (from OAuth flow)
 */

import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

interface TikTokRequest {
  projectId: string;
  videoUrl: string;
  caption: string;
  privacy?: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'SELF_ONLY';
  disableComment?: boolean;
  disableDuet?: boolean;
  disableStitch?: boolean;
  commonsGoodCredits?: string;
}

interface TikTokResponse {
  success: boolean;
  projectId: string;
  tiktokId?: string;
  tiktokUrl?: string;
  status: 'uploaded' | 'processing' | 'failed' | 'placeholder';
  error?: string;
  publishId?: string;
}

/**
 * Get TikTok access token (refresh if needed)
 */
async function getAccessToken(): Promise<string | null> {
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN;
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const refreshToken = process.env.TIKTOK_REFRESH_TOKEN;
  
  if (!clientKey || !clientSecret) {
    console.log('⚠️ Missing TikTok credentials');
    return null;
  }
  
  // If we have a valid access token, use it
  if (accessToken) {
    return accessToken;
  }
  
  // Otherwise try to refresh
  if (!refreshToken) {
    console.log('⚠️ No TikTok refresh token');
    return null;
  }
  
  try {
    const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });
    
    if (!response.ok) {
      console.error('Failed to refresh TikTok token:', response.statusText);
      return null;
    }
    
    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('TikTok token refresh error:', error);
    return null;
  }
}

/**
 * Initialize video upload to TikTok
 * Returns upload URL for chunked upload
 */
async function initializeUpload(
  accessToken: string,
  videoSize: number
): Promise<{ uploadUrl: string; publishId: string } | null> {
  try {
    const response = await fetch(
      'https://open.tiktokapis.com/v2/post/publish/inbox/video/init/',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_info: {
            source: 'FILE_UPLOAD',
            video_size: videoSize,
            chunk_size: videoSize, // Single chunk for small videos
            total_chunk_count: 1,
          },
        }),
      }
    );
    
    if (!response.ok) {
      console.error('TikTok upload init failed:', response.statusText);
      return null;
    }
    
    const data = await response.json();
    return {
      uploadUrl: data.data.upload_url,
      publishId: data.data.publish_id,
    };
  } catch (error) {
    console.error('TikTok init error:', error);
    return null;
  }
}

/**
 * Upload video chunk to TikTok
 */
async function uploadVideoChunk(
  uploadUrl: string,
  videoBuffer: Buffer
): Promise<boolean> {
  try {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Range': `bytes 0-${videoBuffer.length - 1}/${videoBuffer.length}`,
      },
      body: new Uint8Array(videoBuffer),
    });
    
    return response.ok;
  } catch (error) {
    console.error('TikTok chunk upload error:', error);
    return false;
  }
}

/**
 * Publish the uploaded video
 */
async function publishVideo(
  accessToken: string,
  publishId: string,
  caption: string,
  privacy: string,
  options: {
    disableComment?: boolean;
    disableDuet?: boolean;
    disableStitch?: boolean;
  }
): Promise<{ videoId: string } | null> {
  try {
    const response = await fetch(
      'https://open.tiktokapis.com/v2/post/publish/video/init/',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          post_info: {
            title: caption.substring(0, 150), // TikTok caption limit
            privacy_level: privacy,
            disable_comment: options.disableComment || false,
            disable_duet: options.disableDuet || false,
            disable_stitch: options.disableStitch || false,
          },
          source_info: {
            source: 'PULL_FROM_URL',
            video_url: publishId, // Use the publish_id from init
          },
        }),
      }
    );
    
    if (!response.ok) {
      console.error('TikTok publish failed:', response.statusText);
      return null;
    }
    
    const data = await response.json();
    return { videoId: data.data.video_id || publishId };
  } catch (error) {
    console.error('TikTok publish error:', error);
    return null;
  }
}

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  console.log('📱 PUBLISHER AGENT - TikTok Upload');
  
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
    const request: TikTokRequest = JSON.parse(event.body || '{}');
    
    if (!request.projectId || !request.videoUrl || !request.caption) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'projectId, videoUrl, and caption are required' }),
      };
    }
    
    // Build caption with Commons Good credits
    let caption = request.caption;
    if (request.commonsGoodCredits) {
      caption += `\n\n🌍 ${request.commonsGoodCredits}`;
    }
    caption += '\n#CommonsGood #SirTrav #A2A';
    
    // Get access token
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      console.log('⚠️ No TikTok credentials, using placeholder mode');
      const response: TikTokResponse = {
        success: true,
        projectId: request.projectId,
        status: 'placeholder',
        tiktokUrl: `https://tiktok.com/@sirtrav/video/PLACEHOLDER_${request.projectId}`,
      };
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(response),
      };
    }
    
    // Download video
    console.log(`📥 Downloading video from: ${request.videoUrl}`);
    const videoResponse = await fetch(request.videoUrl);
    if (!videoResponse.ok) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'Failed to download video' }),
      };
    }
    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
    
    // Initialize upload
    console.log('📤 Initializing TikTok upload...');
    const initResult = await initializeUpload(accessToken, videoBuffer.length);
    if (!initResult) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'TikTok upload init failed' }),
      };
    }
    
    // Upload video chunk
    console.log('📤 Uploading video to TikTok...');
    const uploadSuccess = await uploadVideoChunk(initResult.uploadUrl, videoBuffer);
    if (!uploadSuccess) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'TikTok video upload failed' }),
      };
    }
    
    // Publish video
    console.log('🚀 Publishing to TikTok...');
    const publishResult = await publishVideo(
      accessToken,
      initResult.publishId,
      caption,
      request.privacy || 'PUBLIC_TO_EVERYONE',
      {
        disableComment: request.disableComment,
        disableDuet: request.disableDuet,
        disableStitch: request.disableStitch,
      }
    );
    
    if (!publishResult) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'TikTok publish failed' }),
      };
    }
    
    const response: TikTokResponse = {
      success: true,
      projectId: request.projectId,
      tiktokId: publishResult.videoId,
      tiktokUrl: `https://tiktok.com/@sirtrav/video/${publishResult.videoId}`,
      status: 'uploaded',
      publishId: initResult.publishId,
    };
    
    console.log(`✅ TikTok upload complete: ${response.tiktokUrl}`);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };
    
  } catch (error) {
    console.error('❌ TikTok Publisher error:', error);
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
