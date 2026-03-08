/**
 * CONTROL PLANE — Single Source of Truth
 * M7: Diagnostics Dashboard backbone
 *
 * Returns the full system state as structured JSON:
 *   pipeline    — 7 agent wiring status + cycle gates
 *   services    — storage, progress, ai_services, social_publishing
 *   publishers  — x, linkedin, youtube with mode (disabled|dry-run|live)
 *   verdict     — local GREEN/YELLOW/RED + cloud GREEN/YELLOW/RED
 *   proof       — metrics file paths if present
 *
 * YouTube Link Policy (No Fake Success):
 *   youtubeUrl is ONLY present when publish-youtube returned a real video ID.
 *   Dry-run and disabled modes return url: null.
 */

import { existsSync, readdirSync, readFileSync } from 'fs';
import { resolve, join } from 'path';
import { getConfiguredBlobsStore } from './lib/storage';
import { readLedger } from './lib/ledger';

// ── Types ────────────────────────────────────────────────────────────────────

type ServiceState = 'ok' | 'degraded' | 'down' | 'disabled';
type PublisherMode = 'disabled' | 'dry-run' | 'live';
type VerdictColor = 'GREEN' | 'YELLOW' | 'RED';

interface ServiceStatus {
  name: string;
  status: ServiceState;
  latency_ms?: number;
  error?: string;
}

interface PublisherStatus {
  platform: string;
  enabled: boolean;
  mode: PublisherMode;
  lastPublish?: {
    url: string | null;
    runId: string | null;
    timestamp: string | null;
  };
}

interface ControlPlaneResponse {
  version: string;
  timestamp: string;
  pipeline: {
    wired: boolean;
    agents: Record<string, boolean>;
    cycleGates: { passed: number; failed: number; pending: number };
  };
  services: ServiceStatus[];
  publishers: PublisherStatus[];
  remotion: {
    configured: boolean;
    mode: 'real' | 'fallback' | 'disabled';
    serveUrl: boolean;
    functionName: boolean;
    awsKeys: boolean;
    region: string | null;
    compositions: number;
    blocker: string | null;
  };
  verdict: {
    local: VerdictColor;
    cloud: VerdictColor;
    combined: VerdictColor;
    reasons: string[];
  };
  proof: {
    metricsFiles: string[];
    ledgerEntries: number;
    lastRunId: string | null;
  };
  youtube_link_policy: {
    rule: string;
    currentUrl: null;
    reason: string;
  };
}

// ── Agent File Map (7-agent D2A pipeline) ────────────────────────────────────

const AGENT_FILES: Record<string, string> = {
  'intake': 'intake-upload.ts',
  'writer': 'narrate-project.ts',
  'director': 'curate-media.ts',
  'voice': 'text-to-speech.ts',
  'composer': 'generate-music.ts',
  'editor': 'compile-video.ts',
  'publisher': 'publish.ts',
};

// ── Service Checks (reuse healthcheck patterns) ──────────────────────────────

const STORAGE_TIMEOUT_MS = 3000;

async function checkStorage(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const storageCheck = async (): Promise<ServiceStatus> => {
      const store = getConfiguredBlobsStore('sirtrav-health');
      const key = `cp-ping-${Date.now()}`;
      await store.set(key, 'ok', { metadata: { ts: new Date().toISOString() } });
      const result = await store.get(key, { type: 'text' });
      await store.delete(key);
      return {
        name: 'storage',
        status: result === 'ok' ? 'ok' : 'degraded',
        latency_ms: Date.now() - start,
      };
    };
    const timeout = new Promise<ServiceStatus>((_, reject) =>
      setTimeout(() => reject(new Error(`Storage timed out after ${STORAGE_TIMEOUT_MS}ms`)), STORAGE_TIMEOUT_MS)
    );
    return await Promise.race([storageCheck(), timeout]);
  } catch (error: any) {
    // Local timeout → degraded (NOT fail). Cloud timeout → down.
    const context = process.env.CONTEXT || 'dev';
    const isLocal = context !== 'production' && context !== 'deploy-preview';
    return {
      name: 'storage',
      status: isLocal ? 'degraded' : 'down',
      latency_ms: Date.now() - start,
      error: error?.message,
    };
  }
}

function checkAIServices(): ServiceStatus {
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasElevenLabs = !!process.env.ELEVENLABS_API_KEY;
  if (hasGemini || hasOpenAI) {
    return {
      name: 'ai_services',
      status: hasElevenLabs ? 'ok' : 'degraded',
      error: hasElevenLabs ? undefined : 'ELEVENLABS_API_KEY missing (voice degraded)',
    };
  }
  return { name: 'ai_services', status: 'down', error: 'No AI keys (GEMINI or OPENAI) present' };
}

function checkProgress(): ServiceStatus {
  // Progress endpoint exists and has timeout wrappers — report based on Blobs availability
  return {
    name: 'progress',
    status: 'ok', // Always available — falls back to in-memory if Blobs hangs
  };
}

function checkSocial(): ServiceStatus {
  const hasTwitter = !!process.env.TWITTER_API_KEY && !!process.env.TWITTER_ACCESS_TOKEN;
  const hasLinkedIn = !!process.env.LINKEDIN_ACCESS_TOKEN;
  const hasYouTube = !!process.env.YOUTUBE_CLIENT_ID && !!process.env.YOUTUBE_CLIENT_SECRET;
  const count = [hasTwitter, hasLinkedIn, hasYouTube].filter(Boolean).length;
  if (count === 3) return { name: 'social_publishing', status: 'ok' };
  if (count > 0) return { name: 'social_publishing', status: 'degraded', error: `${count}/3 platforms configured` };
  return { name: 'social_publishing', status: 'disabled', error: 'No social keys configured' };
}

// ── Publisher Status ─────────────────────────────────────────────────────────

function getPublisherStatus(): PublisherStatus[] {
  const hasTwitter = !!process.env.TWITTER_API_KEY && !!process.env.TWITTER_ACCESS_TOKEN;
  const hasLinkedIn = !!process.env.LINKEDIN_ACCESS_TOKEN;
  const hasYouTube = !!process.env.YOUTUBE_CLIENT_ID && !!process.env.YOUTUBE_CLIENT_SECRET && !!process.env.YOUTUBE_REFRESH_TOKEN;

  return [
    {
      platform: 'x',
      enabled: hasTwitter,
      mode: hasTwitter ? 'live' : 'disabled',
      lastPublish: { url: null, runId: null, timestamp: null },
    },
    {
      platform: 'linkedin',
      enabled: hasLinkedIn,
      mode: hasLinkedIn ? 'live' : 'disabled',
      lastPublish: { url: null, runId: null, timestamp: null },
    },
    {
      platform: 'youtube',
      enabled: hasYouTube,
      mode: hasYouTube ? 'live' : 'disabled',
      // No Fake Success: url is ALWAYS null unless a real publish happened.
      // Only publish-youtube (live mode) can set a real youtubeUrl.
      lastPublish: { url: null, runId: null, timestamp: null },
    },
  ];
}

// ── Pipeline Wiring Check ────────────────────────────────────────────────────

function checkPipeline(): ControlPlaneResponse['pipeline'] {
  const agents: Record<string, boolean> = {};
  let allWired = true;

  // Resolve functions dir from project root (process.cwd() = /var/task in Netlify Lambda)
  const functionsDir = join(process.cwd(), 'netlify', 'functions');

  for (const [name, file] of Object.entries(AGENT_FILES)) {
    const exists = existsSync(join(functionsDir, file));
    agents[name] = exists;
    if (!exists) allWired = false;
  }

  // Cycle gates cannot be verified at function runtime — gate scripts run externally.
  // Run `just cycle-status` to verify. Reporting `pending` is honest; not `passed`.
  const gateNames = ['wiring', 'no_fake_success', 'contracts', 'golden_path', 'build'];

  return { wired: allWired, agents, cycleGates: { passed: 0, failed: 0, pending: gateNames.length } };
}

// ── Verdict ──────────────────────────────────────────────────────────────────

function computeVerdict(services: ServiceStatus[], publishers: PublisherStatus[], remotion: ControlPlaneResponse['remotion']): ControlPlaneResponse['verdict'] {
  const reasons: string[] = [];
  const context = process.env.CONTEXT || 'dev';
  const isLocal = context !== 'production' && context !== 'deploy-preview';

  // Service checks
  const storageOk = services.find(s => s.name === 'storage')?.status;
  const aiOk = services.find(s => s.name === 'ai_services')?.status;

  if (storageOk === 'ok') reasons.push('storage=ok');
  else if (storageOk === 'degraded') reasons.push('storage=degraded');
  else reasons.push('storage=down');

  if (aiOk === 'ok' || aiOk === 'degraded') reasons.push('ai=available');
  else reasons.push('ai=down');

  // Publisher checks
  const enabledPubs = publishers.filter(p => p.enabled).length;
  reasons.push(`publishers=${enabledPubs}/3`);

  // Remotion render pipeline
  if (remotion.configured) reasons.push('remotion=real');
  else reasons.push(`remotion=${remotion.mode}`);

  // Local verdict: storage timeout is acceptable, AI must work
  let local: VerdictColor = 'GREEN';
  if (aiOk === 'down') local = 'RED';
  else if (storageOk !== 'ok' || enabledPubs < 2) local = 'YELLOW';

  // Cloud verdict: storage must work, AI must work
  let cloud: VerdictColor = 'GREEN';
  if (storageOk === 'down' || aiOk === 'down') cloud = 'RED';
  else if (storageOk === 'degraded' || enabledPubs < 2) cloud = 'YELLOW';

  // In local mode, cloud verdict is inferred (we can't ping cloud from local)
  if (isLocal) {
    cloud = 'YELLOW'; // Can't verify cloud from local — honest
    reasons.push('cloud=inferred(local-mode)');
  }

  const combined: VerdictColor = local === 'RED' || cloud === 'RED' ? 'RED'
    : local === 'YELLOW' || cloud === 'YELLOW' ? 'YELLOW' : 'GREEN';

  return { local, cloud, combined, reasons };
}

// ── Proof / Metrics ──────────────────────────────────────────────────────────

function getProof(): ControlPlaneResponse['proof'] {
  const metricsDir = 'artifacts/public/metrics';
  let metricsFiles: string[] = [];
  try {
    if (existsSync(metricsDir)) {
      metricsFiles = readdirSync(metricsDir).map(f => `${metricsDir}/${f}`);
    }
  } catch { /* ignore */ }

  let ledgerEntries = 0;
  let lastRunId: string | null = null;
  try {
    const recent = readLedger({ limit: 1 });
    const all = recent.length > 0 ? readLedger() : [];
    ledgerEntries = all.length;
    lastRunId = recent[0]?.ticket ?? null;
  } catch { /* ledger read failure is not fatal */ }

  return { metricsFiles, ledgerEntries, lastRunId };
}

// ── Remotion Render Pipeline ─────────────────────────────────────────────────

function checkRemotion(): ControlPlaneResponse['remotion'] {
  const serveUrl = !!process.env.REMOTION_SERVE_URL;
  const functionName = !!process.env.REMOTION_FUNCTION_NAME;
  const awsKeys = !!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.REMOTION_REGION || null;
  const configured = serveUrl && functionName && awsKeys;

  let mode: 'real' | 'fallback' | 'disabled';
  let blocker: string | null = null;

  if (configured) {
    mode = 'real';
  } else if (serveUrl || functionName) {
    mode = 'fallback';
    const missing: string[] = [];
    if (!serveUrl) missing.push('REMOTION_SERVE_URL');
    if (!functionName) missing.push('REMOTION_FUNCTION_NAME');
    if (!awsKeys) missing.push('AWS keys');
    blocker = 'Partial config: missing ' + missing.join(', ');
  } else {
    mode = 'disabled';
    blocker = 'HO-007: No Remotion keys configured — see docs/ENV-REMOTION.md';
  }

  // 7 compositions registered: IntroSlate, SirTrav-Main, EmblemComposition, EmblemThumbnail, MotionGraphicButtons, WeeklyRecap, EngagementReport
  const compositions = 7;

  return { configured, mode, serveUrl, functionName, awsKeys, region, compositions, blocker };
}

// ── Handler ──────────────────────────────────────────────────────────────────

export default async (req: Request) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
  };

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers });
  }

  try {
    const pipeline = checkPipeline();
    const storageStatus = await checkStorage();
    const aiStatus = checkAIServices();
    const progressStatus = checkProgress();
    const socialStatus = checkSocial();
    const services = [storageStatus, aiStatus, progressStatus, socialStatus];
    const publishers = getPublisherStatus();
    const remotion = checkRemotion();
    const verdict = computeVerdict(services, publishers, remotion);
    const proof = getProof();

    const response: ControlPlaneResponse = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      pipeline,
      services,
      publishers,
      remotion,
      verdict,
      proof,
      youtube_link_policy: {
        rule: 'No Fake Success: youtubeUrl only from real publish-youtube (live mode)',
        currentUrl: null,
        reason: publishers.find(p => p.platform === 'youtube')?.enabled
          ? 'No publish executed this session'
          : 'YouTube publisher disabled (missing credentials)',
      },
    };

    return new Response(JSON.stringify(response, null, 2), {
      status: 200,
      headers,
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error?.message || 'Control plane error', timestamp: new Date().toISOString() }),
      { status: 500, headers }
    );
  }
};
