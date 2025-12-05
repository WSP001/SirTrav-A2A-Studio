/**
 * PUBLISHER AGENT - YouTube Upload
 * Part of Agent 7 (Publisher) in the D2A Pipeline
 * 
 * PURPOSE: Upload videos to YouTube with proper metadata
 * 
 * INPUT: { projectId, videoUrl, title, description, tags, privacy }
 * OUTPUT: { youtubeId, youtubeUrl, status }
 * 
 * REAL INTEGRATION: Uses YouTube Data API v3
 * 
 * REQUIREMENTS:
 * - YOUTUBE_CLIENT_ID: OAuth2 client ID
 * - YOUTUBE_CLIENT_SECRET: OAuth2 client secret
 * - YOUTUBE_REFRESH_TOKEN: Long-lived refresh token
 */

import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

interface YouTubeRequest {
  projectId: string;
  videoUrl: string;  // URL to the video file (from Netlify Blobs)
  title: string;
  description: string;
  tags?: string[];
  privacy?: 'private' | 'unlisted' | 'public';
  categoryId?: string;  // YouTube category (22 = People & Blogs)
  playlistId?: string;  // Optional playlist to add to
  commonsGoodCredits?: string;  // Attribution text to append
}

interface YouTubeResponse {
  success: boolean;
  projectId: string;
  youtubeId?: string;
  youtubeUrl?: string;
  status: 'uploaded' | 'processing' | 'failed' | 'placeholder';
  error?: string;
  thumbnailUrl?: string;
}

/**
 * Get OAuth2 access token from refresh token
 */
async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
  
  if (!clientId || !clientSecret || !refreshToken) {
    console.log('⚠️ Missing YouTube OAuth credentials');
    return null;
  }
  
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    
    if (!response.ok) {
      console.error('Failed to refresh YouTube token:', response.statusText);
      return null;
    }
    
    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('YouTube token refresh error:', error);
    return null;
  }
}

/**
 * Download video from URL to buffer
 */
async function downloadVideo(videoUrl: string): Promise<Buffer | null> {
  try {
    const response = await fetch(videoUrl);
    if (!response.ok) {
      console.error('Failed to download video:', response.statusText);
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('Video download error:', error);
    return null;
  }
}

/**
 * Upload video to YouTube using resumable upload
 */
async function uploadToYouTube(
  accessToken: string,
  videoBuffer: Buffer,
  metadata: {
    title: string;
    description: string;
    tags: string[];
    privacy: string;
    categoryId: string;
  }
): Promise<{ id: string; status: string } | null> {
  try {
    // Step 1: Initialize resumable upload
    const initResponse = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Type': 'video/mp4',
          'X-Upload-Content-Length': String(videoBuffer.length),
        },
        body: JSON.stringify({
          snippet: {
            title: metadata.title,
            description: metadata.description,
            tags: metadata.tags,
            categoryId: metadata.categoryId,
          },
          status: {
            privacyStatus: metadata.privacy,
            selfDeclaredMadeForKids: false,
          },
        }),
      }
    );
    
    if (!initResponse.ok) {
      console.error('YouTube upload init failed:', initResponse.statusText);
      return null;
    }
    
    const uploadUrl = initResponse.headers.get('location');
    if (!uploadUrl) {
      console.error('No upload URL returned');
      return null;
    }
    
    // Step 2: Upload the video data
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': String(videoBuffer.length),
      },
      body: new Uint8Array(videoBuffer),
    });
    
    if (!uploadResponse.ok) {
      console.error('YouTube upload failed:', uploadResponse.statusText);
      return null;
    }
    
    const result = await uploadResponse.json();
    return {
      id: result.id,
      status: result.status?.uploadStatus || 'uploaded',
    };
    
  } catch (error) {
    console.error('YouTube upload error:', error);
    return null;
  }
}

/**
 * Add video to playlist
 */
async function addToPlaylist(
  accessToken: string,
  videoId: string,
  playlistId: string
): Promise<boolean> {
  try {
    const response = await fetch(
      'https://www.googleapis.com/youtube/v3/playlistItems?part=snippet',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          snippet: {
            playlistId,
            resourceId: {
              kind: 'youtube#video',
              videoId,
            },
          },
        }),
      }
    );
    
    return response.ok;
  } catch (error) {
    console.error('Failed to add to playlist:', error);
    return false;
  }
}

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  console.log('📺 PUBLISHER AGENT - YouTube Upload');
  
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
    const request: YouTubeRequest = JSON.parse(event.body || '{}');
    
    if (!request.projectId || !request.videoUrl || !request.title) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'projectId, videoUrl, and title are required' }),
      };
    }
    
    // Build description with Commons Good credits
    let description = request.description || '';
    if (request.commonsGoodCredits) {
      description += `\n\n---\n🌍 Commons Good Attribution:\n${request.commonsGoodCredits}`;
    }
    description += '\n\n🎬 Created with SirTrav A2A Studio - For the Commons Good';
    
    // Get access token
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      console.log('⚠️ No YouTube credentials, using placeholder mode');
      const response: YouTubeResponse = {
        success: true,
        projectId: request.projectId,
        status: 'placeholder',
        youtubeUrl: `https://youtube.com/watch?v=PLACEHOLDER_${request.projectId}`,
      };
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(response),
      };
    }
    
    // Download video
    console.log(`📥 Downloading video from: ${request.videoUrl}`);
    const videoBuffer = await downloadVideo(request.videoUrl);
    
    if (!videoBuffer) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Failed to download video for upload' 
        }),
      };
    }
    
    // Upload to YouTube
    console.log(`📤 Uploading to YouTube: "${request.title}"`);
    const uploadResult = await uploadToYouTube(accessToken, videoBuffer, {
      title: request.title,
      description,
      tags: request.tags || ['SirTrav', 'A2A', 'Commons Good'],
      privacy: request.privacy || 'unlisted',
      categoryId: request.categoryId || '22', // People & Blogs
    });
    
    if (!uploadResult) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'YouTube upload failed' 
        }),
      };
    }
    
    // Add to playlist if specified
    if (request.playlistId) {
      await addToPlaylist(accessToken, uploadResult.id, request.playlistId);
    }
    
    const response: YouTubeResponse = {
      success: true,
      projectId: request.projectId,
      youtubeId: uploadResult.id,
      youtubeUrl: `https://youtube.com/watch?v=${uploadResult.id}`,
      status: 'uploaded',
      thumbnailUrl: `https://img.youtube.com/vi/${uploadResult.id}/maxresdefault.jpg`,
    };
    
    console.log(`✅ YouTube upload complete: ${response.youtubeUrl}`);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };
    
  } catch (error) {
    console.error('❌ YouTube Publisher error:', error);
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
