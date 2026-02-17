/**
 * HEALTHCHECK (Modern)
 * - Pings Blobs
 * - Checks AI keys (OpenAI + ElevenLabs required, Suno optional/manual)
 * - Social keys: disabled if absent (not degraded)
 */
import { getConfiguredBlobsStore } from './lib/storage';

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
  build: {
    commit: string;
    id: string;
    context: string;
    branch: string;
  };
  services: ServiceStatus[];
  checks: {
    storage: boolean;
    ai_keys: boolean;
    social_keys: boolean;
  };
  // 🎯 CC-Task 2: Simple JSON snapshot for docs alignment
  env_snapshot: {
    openai: boolean;
    elevenlabs: boolean;
    suno: boolean;
    vault_path: string | null;
    url: string | null;
  };
}

const startTime = Date.now();

const checkEnvVars = (keys: string[]) => keys.every((k) => !!process.env[k]);

async function checkStorage(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const store = getConfiguredBlobsStore('sirtrav-health');
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
  // Note: Suno has no public API - we use prompt templates for manual workflow
  // Music is generated via Suno Prompt Wizard → user copies to Suno → uploads result
  if (hasOpenAI && hasElevenLabs) {
    return { name: 'ai_services', status: 'ok' };
  }
  return { name: 'ai_services', status: 'degraded', error: 'OPENAI_API_KEY or ELEVENLABS_API_KEY missing' };
}

function checkSocial(): ServiceStatus {
  const hasYouTube = checkEnvVars(['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET']);
  const hasTikTok = checkEnvVars(['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET']);
  const hasInstagram = checkEnvVars(['INSTAGRAM_ACCESS_TOKEN', 'INSTAGRAM_BUSINESS_ID']);
  const hasLinkedIn = checkEnvVars(['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET', 'LINKEDIN_ACCESS_TOKEN']);
  const hasTwitter = checkEnvVars(['TWITTER_API_KEY', 'TWITTER_ACCESS_TOKEN']);

  // MVP platforms = X/Twitter + YouTube. Others are optional (disabled, not degraded).
  const mvpPlatforms = [
    { name: 'X/Twitter', ok: hasTwitter, mvp: true },
    { name: 'YouTube', ok: hasYouTube, mvp: true },
  ];
  const optionalPlatforms = [
    { name: 'TikTok', ok: hasTikTok, mvp: false },
    { name: 'Instagram', ok: hasInstagram, mvp: false },
    { name: 'LinkedIn', ok: hasLinkedIn, mvp: false },
  ];
  const all = [...mvpPlatforms, ...optionalPlatforms];
  const configured = all.filter(p => p.ok).length;
  const mvpConfigured = mvpPlatforms.filter(p => p.ok).length;
  const disabledOptional = optionalPlatforms.filter(p => !p.ok).map(p => p.name);
  const missingMvp = mvpPlatforms.filter(p => !p.ok).map(p => p.name);

  // If all MVP platforms are configured, report ok (optional platforms are just disabled)
  if (mvpConfigured === mvpPlatforms.length) {
    if (configured === all.length) return { name: 'social_publishing', status: 'ok' };
    return { name: 'social_publishing', status: 'ok', error: `${configured}/${all.length} platforms (disabled: ${disabledOptional.join(', ')})` };
  }
  // MVP platforms missing = degraded
  if (mvpConfigured > 0) return { name: 'social_publishing', status: 'degraded', error: `MVP incomplete (missing: ${missingMvp.join(', ')})` };
  return { name: 'social_publishing', status: 'disabled', error: `No social publishing keys configured` };
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
      version: '2.1.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
      build: {
        commit: (process.env.COMMIT_REF || 'local').substring(0, 7),
        id: process.env.BUILD_ID || 'local',
        context: process.env.CONTEXT || 'development',
        branch: process.env.BRANCH || 'local',
      },
      services,
      checks: {
        storage: storageStatus.status === 'ok',
        ai_keys: aiStatus.status === 'ok',
        social_keys: socialStatus.status === 'ok',
      },
      // 🎯 CC-Task 2: Simple truthful snapshot matching ENV_SETUP.md
      env_snapshot: {
        openai: !!process.env.OPENAI_API_KEY,
        elevenlabs: !!process.env.ELEVENLABS_API_KEY,
        suno: !!process.env.SUNO_API_KEY,
        vault_path: process.env.VAULT_PATH || null,
        url: process.env.URL || null,
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
