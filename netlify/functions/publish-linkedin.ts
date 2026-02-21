/**
 * PUBLISHER AGENT - LinkedIn Business Upload
 * Part of Agent 7 (Publisher) in the D2A Pipeline
 * 
 * PURPOSE: Post videos to LinkedIn for business/professional audiences
 * 
 * INPUT: { projectId, videoUrl, title, description, visibility }
 * OUTPUT: { linkedinId, linkedinUrl, status }
 * 
 * REAL INTEGRATION: Uses LinkedIn Marketing API v2
 * 
 * REQUIREMENTS:
 * - LINKEDIN_CLIENT_ID: OAuth2 client ID
 * - LINKEDIN_CLIENT_SECRET: OAuth2 client secret
 * - LINKEDIN_ACCESS_TOKEN: Access token (refresh periodically)
 * - LINKEDIN_ORGANIZATION_ID: Company page URN (for business posts)
 * 
 * SCOPES REQUIRED:
 * - w_member_social (for personal posts)
 * - w_organization_social (for company page posts)
 * - r_liteprofile (for user context)
 */

import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

interface LinkedInRequest {
  projectId: string;
  videoUrl: string;           // URL to the video file (from Netlify Blobs)
  title: string;
  description: string;
  visibility?: 'PUBLIC' | 'CONNECTIONS' | 'LOGGED_IN';
  postType?: 'personal' | 'organization';
  hashtags?: string[];
  commonsGoodCredits?: string;  // Attribution text to append
}

interface LinkedInResponse {
  success: boolean;
  projectId: string;
  linkedinId?: string;
  linkedinUrl?: string;
  status: 'uploaded' | 'processing' | 'failed' | 'placeholder';
  error?: string;
  urn?: string;
}

// ----------------------------------------------------------------------------
// Payload Validation (social-post.schema.json contract for platform: "linkedin")
// ----------------------------------------------------------------------------
function validateLinkedInPayload(body: unknown): { valid: true; data: LinkedInRequest } | { valid: false; errors: string[] } {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Payload must be a JSON object'] };
  }

  const p = body as Record<string, unknown>;

  if (typeof p.projectId !== 'string' || p.projectId.trim().length === 0) {
    errors.push("'projectId' is required and must be a non-empty string");
  }
  if (typeof p.videoUrl !== 'string' || p.videoUrl.trim().length === 0) {
    errors.push("'videoUrl' is required and must be a non-empty string");
  }
  if (typeof p.title !== 'string' || p.title.trim().length === 0) {
    errors.push("'title' is required and must be a non-empty string");
  } else if (p.title.length > 200) {
    errors.push(`'title' exceeds 200 character limit (got ${(p.title as string).length})`);
  }
  if (p.description !== undefined && typeof p.description !== 'string') {
    errors.push("'description' must be a string");
  }
  if (p.visibility !== undefined && !['PUBLIC', 'CONNECTIONS', 'LOGGED_IN'].includes(p.visibility as string)) {
    errors.push("'visibility' must be one of: PUBLIC, CONNECTIONS, LOGGED_IN");
  }
  if (p.postType !== undefined && !['personal', 'organization'].includes(p.postType as string)) {
    errors.push("'postType' must be one of: personal, organization");
  }
  if (p.hashtags !== undefined) {
    if (!Array.isArray(p.hashtags) || !p.hashtags.every((h: unknown) => typeof h === 'string')) {
      errors.push("'hashtags' must be an array of strings");
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, data: p as unknown as LinkedInRequest };
}

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

/**
 * Get user profile URN for personal posts
 */
async function getUserUrn(accessToken: string): Promise<string | null> {
  try {
    const response = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    if (!response.ok) {
      console.error('Failed to get LinkedIn user info:', response.statusText);
      return null;
    }
    
    const data = await response.json();
    return `urn:li:person:${data.sub}`;
  } catch (error) {
    console.error('LinkedIn user info error:', error);
    return null;
  }
}

/**
 * Register video upload with LinkedIn
 */
async function registerVideoUpload(
  accessToken: string,
  ownerUrn: string,
  fileSizeBytes: number
): Promise<{ uploadUrl: string; videoUrn: string } | null> {
  try {
    const response = await fetch('https://api.linkedin.com/v2/videos?action=initializeUpload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        initializeUploadRequest: {
          owner: ownerUrn,
          fileSizeBytes,
          uploadCaptions: false,
          uploadThumbnail: false,
        },
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to register LinkedIn upload:', response.status, errorText);
      return null;
    }
    
    const data = await response.json();
    return {
      uploadUrl: data.value.uploadInstructions[0].uploadUrl,
      videoUrn: data.value.video,
    };
  } catch (error) {
    console.error('LinkedIn upload registration error:', error);
    return null;
  }
}

/**
 * Upload video bytes to LinkedIn's upload URL
 */
async function uploadVideoToLinkedIn(
  uploadUrl: string,
  videoBuffer: ArrayBuffer,
  accessToken: string
): Promise<boolean> {
  try {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream',
      },
      body: videoBuffer,
    });
    
    return response.ok;
  } catch (error) {
    console.error('LinkedIn video upload error:', error);
    return false;
  }
}

/**
 * Finalize video upload
 */
async function finalizeVideoUpload(
  accessToken: string,
  videoUrn: string
): Promise<boolean> {
  try {
    const response = await fetch('https://api.linkedin.com/v2/videos?action=finalizeUpload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        finalizeUploadRequest: {
          video: videoUrn,
        },
      }),
    });
    
    return response.ok;
  } catch (error) {
    console.error('LinkedIn finalize upload error:', error);
    return false;
  }
}

/**
 * Create a post with the uploaded video
 */
async function createVideoPost(
  accessToken: string,
  ownerUrn: string,
  videoUrn: string,
  title: string,
  description: string,
  visibility: string,
  hashtags: string[]
): Promise<{ postUrn: string } | null> {
  try {
    // Build description with hashtags
    const hashtagText = hashtags.length > 0 
      ? '\n\n' + hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ')
      : '';
    const fullDescription = description + hashtagText;
    
    const response = await fetch('https://api.linkedin.com/v2/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        author: ownerUrn,
        commentary: fullDescription,
        visibility,
        distribution: {
          feedDistribution: 'MAIN_FEED',
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        content: {
          media: {
            title,
            id: videoUrn,
          },
        },
        lifecycleState: 'PUBLISHED',
        isReshareDisabledByAuthor: false,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to create LinkedIn post:', response.status, errorText);
      return null;
    }
    
    const postId = response.headers.get('x-restli-id');
    return { postUrn: postId || videoUrn };
  } catch (error) {
    console.error('LinkedIn post creation error:', error);
    return null;
  }
}

/**
 * No Fake Success: Return disabled status when LinkedIn credentials are missing
 */
function disabledResponse(request: LinkedInRequest): object {
  console.warn('⚠️ [DISABLED] LinkedIn credentials not configured');
  return {
    success: false,
    disabled: true,
    platform: 'linkedin',
    projectId: request.projectId,
    error: 'LinkedIn disabled (missing LINKEDIN_ACCESS_TOKEN)',
    note: 'Set LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, LINKEDIN_ACCESS_TOKEN, LINKEDIN_PERSON_URN in Netlify.',
  };
}

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const parsed = JSON.parse(event.body || '{}');
    const validation = validateLinkedInPayload(parsed);

    if (!validation.valid) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Invalid payload',
          details: validation.errors,
        }),
      };
    }

    const request = validation.data;

    console.log(`🔗 LinkedIn publish request for project: ${request.projectId}`);
    
    // Check for LinkedIn credentials
    const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
    const organizationId = process.env.LINKEDIN_ORGANIZATION_ID;
    
    if (!accessToken) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(disabledResponse(request)),
      };
    }

    // Determine owner URN (organization or personal)
    let ownerUrn: string;
    const personUrn = process.env.LINKEDIN_PERSON_URN;
    if (request.postType === 'organization' && organizationId) {
      ownerUrn = `urn:li:organization:${organizationId}`;
    } else if (personUrn && personUrn.startsWith('urn:li:person:')) {
      ownerUrn = personUrn;
    } else {
      const userUrn = await getUserUrn(accessToken);
      if (!userUrn) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            projectId: request.projectId,
            status: 'failed',
            error: 'Failed to get LinkedIn user profile. Set LINKEDIN_PERSON_URN or ensure token has openid scope.',
          } as LinkedInResponse),
        };
      }
      ownerUrn = userUrn;
    }

    // Fetch video from URL
    const videoResponse = await fetch(request.videoUrl);
    if (!videoResponse.ok) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          projectId: request.projectId,
          status: 'failed',
          error: 'Failed to fetch video from URL',
        } as LinkedInResponse),
      };
    }
    
    const videoBuffer = await videoResponse.arrayBuffer();
    const fileSizeBytes = videoBuffer.byteLength;

    // Register upload
    const uploadInfo = await registerVideoUpload(accessToken, ownerUrn, fileSizeBytes);
    if (!uploadInfo) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          projectId: request.projectId,
          status: 'failed',
          error: 'Failed to register video upload with LinkedIn',
        } as LinkedInResponse),
      };
    }

    // Upload video
    const uploaded = await uploadVideoToLinkedIn(uploadInfo.uploadUrl, videoBuffer, accessToken);
    if (!uploaded) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          projectId: request.projectId,
          status: 'failed',
          error: 'Failed to upload video to LinkedIn',
        } as LinkedInResponse),
      };
    }

    // Finalize upload
    const finalized = await finalizeVideoUpload(accessToken, uploadInfo.videoUrn);
    if (!finalized) {
      console.warn('⚠️ Video finalization may have failed, attempting to create post anyway');
    }

    // Build description with Commons Good credits
    let fullDescription = request.description;
    if (request.commonsGoodCredits) {
      fullDescription += `\n\n${request.commonsGoodCredits}`;
    }

    // Create the post
    const visibility = request.visibility || 'PUBLIC';
    const postResult = await createVideoPost(
      accessToken,
      ownerUrn,
      uploadInfo.videoUrn,
      request.title,
      fullDescription,
      visibility,
      request.hashtags || ['SirTrav', 'FamilyTravel', 'Adventure']
    );

    if (!postResult) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          projectId: request.projectId,
          status: 'failed',
          error: 'Failed to create LinkedIn post',
        } as LinkedInResponse),
      };
    }

    // Extract post ID for URL
    const postId = postResult.postUrn.split(':').pop();
    const linkedinUrl = request.postType === 'organization' && organizationId
      ? `https://linkedin.com/company/${organizationId}/posts/${postId}`
      : `https://linkedin.com/feed/update/${postResult.postUrn}`;

    console.log(`✅ LinkedIn video published: ${linkedinUrl}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        projectId: request.projectId,
        linkedinId: postId,
        linkedinUrl,
        status: 'uploaded',
        urn: postResult.postUrn,
      } as LinkedInResponse),
    };
  } catch (error: any) {
    console.error('LinkedIn publish error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        projectId: 'unknown',
        status: 'failed',
        error: error.message || 'Unknown error',
      } as LinkedInResponse),
    };
  }
};

export { handler };
