/**
 * HEALTHCHECK - System Health Monitor
 * 
 * PURPOSE: Verify all pipeline components are operational
 * 
 * INPUT: GET request (no body needed)
 * OUTPUT: { status, version, services[], uptime }
 * 
 * Used by: Monitoring, CI/CD, Netlify status checks
 */

import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

interface ServiceStatus {
  name: string;
  status: 'ok' | 'degraded' | 'down';
  latency_ms?: number;
  error?: string;
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  environment: string;
  timestamp: string;
  uptime_seconds: number;
  services: ServiceStatus[];
  checks: {
    storage: boolean;
    ai_keys: boolean;
    social_keys: boolean;
  };
}

const startTime = Date.now();

/**
 * Check if required environment variables are set
 */
function checkEnvVars(keys: string[]): boolean {
  return keys.every(key => !!process.env[key]);
}

/**
 * Check storage connectivity
 */
async function checkStorage(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    // Check if Netlify Blobs context is available
    const hasBlobs = !!process.env.NETLIFY_BLOBS_CONTEXT || !!process.env.NETLIFY;
    const hasS3 = checkEnvVars(['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'S3_BUCKET_NAME']);
    
    if (hasBlobs || hasS3) {
      return {
        name: 'storage',
        status: 'ok',
        latency_ms: Date.now() - start,
      };
    }
    
    return {
      name: 'storage',
      status: 'degraded',
      latency_ms: Date.now() - start,
      error: 'No storage backend configured (using mock)',
    };
  } catch (error) {
    return {
      name: 'storage',
      status: 'down',
      latency_ms: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check AI service keys
 */
function checkAIServices(): ServiceStatus {
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasElevenLabs = !!process.env.ELEVENLABS_API_KEY;
  const hasSuno = !!process.env.SUNO_API_KEY;
  
  const configured = [hasOpenAI, hasElevenLabs, hasSuno].filter(Boolean).length;
  
  if (configured === 3) {
    return { name: 'ai_services', status: 'ok' };
  } else if (configured > 0) {
    return { 
      name: 'ai_services', 
      status: 'degraded',
      error: `${configured}/3 AI services configured`,
    };
  }
  
  return { 
    name: 'ai_services', 
    status: 'down',
    error: 'No AI service keys configured',
  };
}

/**
 * Check social publishing keys
 */
function checkSocialServices(): ServiceStatus {
  const hasYouTube = checkEnvVars(['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET']);
  const hasTikTok = checkEnvVars(['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET']);
  const hasInstagram = checkEnvVars(['INSTAGRAM_ACCESS_TOKEN', 'INSTAGRAM_BUSINESS_ID']);
  
  const configured = [hasYouTube, hasTikTok, hasInstagram].filter(Boolean).length;
  
  if (configured === 3) {
    return { name: 'social_publishing', status: 'ok' };
  } else if (configured > 0) {
    return { 
      name: 'social_publishing', 
      status: 'degraded',
      error: `${configured}/3 social platforms configured`,
    };
  }
  
  return { 
    name: 'social_publishing', 
    status: 'degraded',
    error: 'No social publishing keys (placeholder mode)',
  };
}

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
  };
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }
  
  try {
    // Run all checks
    const storageStatus = await checkStorage();
    const aiStatus = checkAIServices();
    const socialStatus = checkSocialServices();
    
    const services = [storageStatus, aiStatus, socialStatus];
    
    // Determine overall health
    const hasDown = services.some(s => s.status === 'down');
    const hasDegraded = services.some(s => s.status === 'degraded');
    
    const overallStatus = hasDown ? 'unhealthy' : hasDegraded ? 'degraded' : 'healthy';
    
    const response: HealthResponse = {
      status: overallStatus,
      version: '2.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
      services,
      checks: {
        storage: storageStatus.status === 'ok',
        ai_keys: aiStatus.status === 'ok',
        social_keys: socialStatus.status === 'ok',
      },
    };
    
    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;
    
    console.log(`🏥 Healthcheck: ${overallStatus}`);
    
    return {
      statusCode,
      headers,
      body: JSON.stringify(response, null, 2),
    };
    
  } catch (error) {
    console.error('❌ Healthcheck error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }),
    };
  }
};

export { handler };
