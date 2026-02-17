/**
 * issue-intake (Modern function) — CC-013
 * POST: Receives Click2Kick signals from the Command Plaque (SystemStatusEmblem).
 * Validates domain + action, logs to diagnostic store, returns domain health.
 *
 * Domains: storage | network | build | pipeline
 * Actions: diagnose | kick | toggle-admin
 */
import { evalsStore } from './lib/storage';
import { randomUUID } from 'crypto';

// ─── Types ──────────────────────────────────────────────────────────

type Domain = 'storage' | 'network' | 'build' | 'pipeline';
type Action = 'diagnose' | 'kick' | 'toggle-admin';

interface IssueIntakePayload {
  domain: Domain;
  action: Action;
  runId?: string;
  timestamp: string;
}

interface DomainDiagnostics {
  status: 'healthy' | 'degraded' | 'offline';
  detail: string;
  lastChecked: string;
  metrics?: Record<string, number>;
}

interface IssueIntakeResponse {
  success: true;
  domain: string;
  diagnostics: DomainDiagnostics;
  action_taken: string;
  runId: string;
}

interface IssueIntakeError {
  success: false;
  error: string;
  disabled?: boolean;
  runId?: string;
}

// ─── Constants ──────────────────────────────────────────────────────

const VALID_DOMAINS: Domain[] = ['storage', 'network', 'build', 'pipeline'];
const VALID_ACTIONS: Action[] = ['diagnose', 'kick', 'toggle-admin'];

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-Intake-Secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

// ─── Domain Diagnostics ─────────────────────────────────────────────

function diagnoseStorage(): DomainDiagnostics {
  const hasBlobsContext = !!process.env.NETLIFY_BLOBS_CONTEXT;
  const hasSiteId = !!process.env.NETLIFY_SITE_ID || !!process.env.SITE_ID;
  const hasToken = !!process.env.NETLIFY_API_TOKEN || !!process.env.NETLIFY_AUTH_TOKEN;

  if (hasBlobsContext) {
    return {
      status: 'healthy',
      detail: 'Netlify Blobs context available (production mode)',
      lastChecked: new Date().toISOString(),
      metrics: { blobs_context: 1, site_id: hasSiteId ? 1 : 0, token: hasToken ? 1 : 0 },
    };
  }
  if (hasSiteId && hasToken) {
    return {
      status: 'healthy',
      detail: 'Storage using explicit credentials (siteID + token)',
      lastChecked: new Date().toISOString(),
      metrics: { blobs_context: 0, site_id: 1, token: 1 },
    };
  }
  return {
    status: 'degraded',
    detail: 'Storage falling back to local filesystem (/tmp or cwd)',
    lastChecked: new Date().toISOString(),
    metrics: { blobs_context: 0, site_id: hasSiteId ? 1 : 0, token: hasToken ? 1 : 0 },
  };
}

function diagnoseNetwork(): DomainDiagnostics {
  const aiKeys = {
    openrouter: !!process.env.OPENROUTER_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    elevenlabs: !!process.env.ELEVENLABS_API_KEY,
  };
  const socialKeys = {
    twitter: !!process.env.TWITTER_API_KEY,
    youtube: !!(process.env.YOUTUBE_CLIENT_ID || process.env.YOUTUBE_REFRESH_TOKEN),
    linkedin: !!process.env.LINKEDIN_CLIENT_ID,
    tiktok: !!process.env.TIKTOK_CLIENT_KEY,
    instagram: !!process.env.INSTAGRAM_ACCESS_TOKEN,
  };

  const aiConfigured = Object.values(aiKeys).filter(Boolean).length;
  const socialConfigured = Object.values(socialKeys).filter(Boolean).length;

  const status = aiConfigured >= 1 ? (socialConfigured >= 2 ? 'healthy' : 'degraded') : 'offline';

  return {
    status,
    detail: `AI: ${aiConfigured}/3 providers | Social: ${socialConfigured}/5 platforms`,
    lastChecked: new Date().toISOString(),
    metrics: { ai_configured: aiConfigured, social_configured: socialConfigured },
  };
}

function diagnoseBuild(): DomainDiagnostics {
  const buildId = process.env.BUILD_ID || null;
  const commitRef = process.env.COMMIT_REF || process.env.HEAD || null;
  const context = process.env.CONTEXT || 'unknown';

  return {
    status: buildId ? 'healthy' : 'degraded',
    detail: buildId
      ? `Build ${buildId.substring(0, 8)} (${context}) at commit ${commitRef?.substring(0, 7) || 'unknown'}`
      : 'Running in local dev mode (no BUILD_ID)',
    lastChecked: new Date().toISOString(),
    metrics: {
      has_build_id: buildId ? 1 : 0,
      has_commit: commitRef ? 1 : 0,
    },
  };
}

function diagnosePipeline(): DomainDiagnostics {
  const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;
  const hasRemotionLambda = !!process.env.REMOTION_LAMBDA_FUNCTION || !!process.env.REMOTION_FUNCTION_NAME;
  const hasSuno = !!process.env.SUNO_API_KEY;

  const stepsConfigured = [hasOpenRouter, true, true, hasSuno, hasRemotionLambda, true, true]
    .filter(Boolean).length;

  const status = stepsConfigured >= 5 ? 'healthy' : stepsConfigured >= 3 ? 'degraded' : 'offline';

  return {
    status,
    detail: `${stepsConfigured}/7 pipeline steps have env keys configured`,
    lastChecked: new Date().toISOString(),
    metrics: {
      steps_configured: stepsConfigured,
      has_openrouter: hasOpenRouter ? 1 : 0,
      has_remotion: hasRemotionLambda ? 1 : 0,
      has_suno: hasSuno ? 1 : 0,
    },
  };
}

const DOMAIN_HANDLERS: Record<Domain, () => DomainDiagnostics> = {
  storage: diagnoseStorage,
  network: diagnoseNetwork,
  build: diagnoseBuild,
  pipeline: diagnosePipeline,
};

// ─── Handler ────────────────────────────────────────────────────────

export default async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('', { status: 204, headers: HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405, headers: HEADERS,
    });
  }

  // Optional webhook secret validation
  const intakeSecret = process.env.ISSUE_INTAKE_SECRET;
  if (intakeSecret) {
    const provided = req.headers.get('X-Intake-Secret');
    if (provided !== intakeSecret) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401, headers: HEADERS,
      });
    }
  }

  let body: Partial<IssueIntakePayload>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Invalid JSON body' }), {
      status: 400, headers: HEADERS,
    });
  }

  const { domain, action, timestamp } = body;
  const runId = body.runId || randomUUID();

  // Validate domain
  if (!domain || !VALID_DOMAINS.includes(domain as Domain)) {
    return new Response(JSON.stringify({
      success: false,
      error: `Invalid domain: "${domain}". Must be one of: ${VALID_DOMAINS.join(', ')}`,
      runId,
    } as IssueIntakeError), { status: 400, headers: HEADERS });
  }

  // Validate action
  if (!action || !VALID_ACTIONS.includes(action as Action)) {
    return new Response(JSON.stringify({
      success: false,
      error: `Invalid action: "${action}". Must be one of: ${VALID_ACTIONS.join(', ')}`,
      runId,
    } as IssueIntakeError), { status: 400, headers: HEADERS });
  }

  // Validate timestamp
  if (!timestamp || isNaN(Date.parse(timestamp))) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid or missing timestamp (ISO 8601 required)',
      runId,
    } as IssueIntakeError), { status: 400, headers: HEADERS });
  }

  try {
    console.log(`[ISSUE-INTAKE] ${action} on ${domain} (runId: ${runId})`);

    // Run diagnostics for the requested domain
    const diagnostics = DOMAIN_HANDLERS[domain as Domain]();

    const actionDescription = action === 'diagnose'
      ? 'Diagnostic log recorded'
      : action === 'kick'
        ? 'Kick initiated — domain re-checked'
        : 'Admin toggle signal received';

    // Log signal to evalsStore
    try {
      const store = evalsStore();
      const ts = new Date().toISOString();
      const key = `issue-intake/${domain}/${ts}.json`;
      await store.setJSON(key, {
        domain,
        action,
        runId,
        requestTimestamp: timestamp,
        loggedAt: ts,
        diagnostics,
      });
      console.log(`[ISSUE-INTAKE] Signal logged to evalsStore: ${key}`);
    } catch (storeErr) {
      console.warn('[ISSUE-INTAKE] evalsStore write failed (continuing):', storeErr);
    }

    const resp: IssueIntakeResponse = {
      success: true,
      domain,
      diagnostics,
      action_taken: actionDescription,
      runId,
    };

    return new Response(JSON.stringify(resp), { status: 200, headers: HEADERS });
  } catch (error: any) {
    console.error('[ISSUE-INTAKE] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Internal Server Error',
      runId,
    } as IssueIntakeError), { status: 500, headers: HEADERS });
  }
};
