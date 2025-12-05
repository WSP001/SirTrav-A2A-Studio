/**
 * SHARE LINK GENERATOR
 * Creates shareable links for videos with optional expiry
 * 
 * PURPOSE: Generate public/private shareable URLs
 * 
 * INPUT: { projectId, privacy, expiresIn }
 * OUTPUT: { shareUrl, shortUrl, qrCodeUrl, expiresAt }
 * 
 * FEATURES:
 * - Public links (no expiry)
 * - Private links (with token + expiry)
 * - Short URL generation
 * - QR code for mobile sharing
 */

import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { videoStore } from "./lib/storage";

interface ShareRequest {
  projectId: string;
  privacy: 'public' | 'unlisted' | 'private';
  expiresIn?: number;  // Seconds until expiry (for private links)
  title?: string;
  description?: string;
}

interface ShareResponse {
  success: boolean;
  projectId: string;
  shareUrl: string;
  shortUrl?: string;
  qrCodeUrl?: string;
  embedCode?: string;
  expiresAt?: string;
  privacy: string;
}

/**
 * Generate a secure token for private links
 */
function generateToken(projectId: string, expiresAt: number): string {
  const data = `${projectId}:${expiresAt}:${process.env.SHARE_SECRET || 'default-secret'}`;
  // Simple hash - in production use crypto.createHmac
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Generate QR code URL using a free service
 */
function generateQRCodeUrl(url: string): string {
  const encodedUrl = encodeURIComponent(url);
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedUrl}`;
}

/**
 * Generate embed code for websites
 */
function generateEmbedCode(shareUrl: string, title: string): string {
  return `<iframe 
  src="${shareUrl}?embed=true" 
  width="560" 
  height="315" 
  frameborder="0" 
  allowfullscreen
  title="${title}"
></iframe>`;
}

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  console.log('🔗 SHARE LINK GENERATOR');
  
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
    const request: ShareRequest = JSON.parse(event.body || '{}');
    
    if (!request.projectId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'projectId is required' }),
      };
    }
    
    const domain = process.env.URL || 'https://sirtrav-a2a-studio.netlify.app';
    const privacy = request.privacy || 'unlisted';
    
    let shareUrl: string;
    let expiresAt: string | undefined;
    
    if (privacy === 'private') {
      // Private link with token and expiry
      const expiresIn = request.expiresIn || 24 * 60 * 60; // Default 24 hours
      const expiryTime = Date.now() + expiresIn * 1000;
      const token = generateToken(request.projectId, expiryTime);
      
      shareUrl = `${domain}/v/${request.projectId}?token=${token}&expires=${expiryTime}`;
      expiresAt = new Date(expiryTime).toISOString();
    } else if (privacy === 'unlisted') {
      // Unlisted - accessible with link but not indexed
      shareUrl = `${domain}/v/${request.projectId}`;
    } else {
      // Public - fully accessible
      shareUrl = `${domain}/v/${request.projectId}`;
    }
    
    // Generate QR code
    const qrCodeUrl = generateQRCodeUrl(shareUrl);
    
    // Generate embed code
    const embedCode = generateEmbedCode(shareUrl, request.title || `Video ${request.projectId}`);
    
    // Try to generate short URL (using a service like bit.ly if configured)
    let shortUrl: string | undefined;
    const bitlyToken = process.env.BITLY_ACCESS_TOKEN;
    if (bitlyToken) {
      try {
        const bitlyResponse = await fetch('https://api-ssl.bitly.com/v4/shorten', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${bitlyToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ long_url: shareUrl }),
        });
        
        if (bitlyResponse.ok) {
          const bitlyData = await bitlyResponse.json();
          shortUrl = bitlyData.link;
        }
      } catch (error) {
        console.log('Short URL generation failed, using full URL');
      }
    }
    
    const response: ShareResponse = {
      success: true,
      projectId: request.projectId,
      shareUrl,
      shortUrl,
      qrCodeUrl,
      embedCode,
      expiresAt,
      privacy,
    };
    
    console.log(`✅ Share link generated: ${shareUrl}`);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };
    
  } catch (error) {
    console.error('❌ Share Link error:', error);
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
