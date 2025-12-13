/**
 * HEALTHCHECK (Modern)
 * - Pings Blobs
 * - Checks AI keys (OpenAI + ElevenLabs required, Suno optional/manual)
 * - Social keys: disabled if absent (not degraded)
 */
import { getStore } from '@netlify/blobs';

type ServiceState = 'ok' | 'degraded' | 'down' | 'disabled';

interface ServiceStatus {
  name: string;
  status: ServiceState;
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

const checkEnvVars = (keys: string[]) => keys.every((k) => !!process.env[k]);

async function checkStorage(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const store = getStore('sirtrav-health');
    const key = `ping-${Date.now()}`;
    await store.set(key, 'ok', { metadata: { ts: new Date().toISOString() } });
    const result = await store.get(key, { type: 'text' });
    await store.delete(key);
    return {
      name: 'storage',
      status: result === 'ok' ? 'ok' : 'degraded',
      latency_ms: Date.now() - start,
      error: result === 'ok' ? undefined : 'Blob echo failed',
    };
  } catch (error: any) {
    return { name: 'storage', status: 'down', latency_ms: Date.now() - start, error: error?.message };
  }
}

function checkAIServices(): ServiceStatus {
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasElevenLabs = !!process.env.ELEVENLABS_API_KEY;
  const hasSuno = !!process.env.SUNO_API_KEY;
  if (hasOpenAI && hasElevenLabs) {
    return { name: 'ai_services', status: 'ok', error: hasSuno ? undefined : 'Suno key missing (manual flow assumed)' };
  }
  return { name: 'ai_services', status: 'degraded', error: 'OPENAI_API_KEY or ELEVENLABS_API_KEY missing' };
}

function checkSocial(): ServiceStatus {
  const hasYouTube = checkEnvVars(['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET']);
  const hasTikTok = checkEnvVars(['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET']);
  const hasInstagram = checkEnvVars(['INSTAGRAM_ACCESS_TOKEN', 'INSTAGRAM_BUSINESS_ID']);
  const configured = [hasYouTube, hasTikTok, hasInstagram].filter(Boolean).length;
  if (configured === 3) return { name: 'social_publishing', status: 'ok' };
  if (configured > 0) return { name: 'social_publishing', status: 'degraded', error: `${configured}/3 platforms configured` };
  return { name: 'social_publishing', status: 'disabled', error: 'No social publishing keys (placeholder mode)' };
}

export default async () => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
  };
  try {
    const storageStatus = await checkStorage();
    const aiStatus = checkAIServices();
    const socialStatus = checkSocial();
    const services = [storageStatus, aiStatus, socialStatus];
    const hasDown = services.some((s) => s.status === 'down');
    const hasDegraded = services.some((s) => s.status === 'degraded');
    const overallStatus: HealthResponse['status'] = hasDown ? 'unhealthy' : hasDegraded ? 'degraded' : 'healthy';
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
    return new Response(JSON.stringify(response, null, 2), {
      status: overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503,
      headers,
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ status: 'unhealthy', error: e?.message || 'unknown', timestamp: new Date().toISOString() }),
      { status: 500, headers }
    );
  }
};
