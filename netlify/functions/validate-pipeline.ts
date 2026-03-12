/**
 * validate-pipeline — Pre-flight readiness check
 * Returns structured JSON describing what's available, what's degraded,
 * and whether the pipeline can run.
 *
 * GET /.netlify/functions/validate-pipeline
 * No authentication required (readiness check, not an action).
 */
import type { Handler } from '@netlify/functions';
import { runsStore } from './lib/storage';

type CheckStatus = 'ok' | 'degraded' | 'missing';
type PipelineMode = 'FULL' | 'ENHANCED' | 'SIMPLE' | 'DEMO' | 'BLOCKED';

interface ValidationCheck {
  category: string;
  name: string;
  status: CheckStatus;
  required: boolean;
  detail: string;
}

interface ValidationResponse {
  ok: boolean;
  canRun: boolean;
  mode: PipelineMode;
  checks: ValidationCheck[];
  blockers: string[];
  warnings: string[];
  summary: string;
}

function checkEnv(name: string): boolean {
  const val = process.env[name];
  return typeof val === 'string' && val.length > 0;
}

async function checkStorage(): Promise<boolean> {
  try {
    const store = runsStore();
    // Write a small ephemeral key and read it back to verify real persistence.
    // Timeout after 3s to avoid blocking the response.
    const pingKey = '__ping__/validate';
    const pingValue = JSON.stringify({ ts: Date.now() });
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('storage timeout')), 3000)
    );
    await Promise.race([store.set(pingKey, pingValue), timeout]);
    const readBack = await Promise.race([store.get(pingKey, { type: 'text' }), timeout]);
    return readBack !== null;
  } catch {
    return false;
  }
}

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed. Use GET.' }) };
  }

  const checks: ValidationCheck[] = [];
  const blockers: string[] = [];
  const warnings: string[] = [];

  // ── AI Services (at least one required) ──
  const hasGemini = checkEnv('GEMINI_API_KEY');
  const hasOpenAI = checkEnv('OPENAI_API_KEY');

  checks.push({
    category: 'ai',
    name: 'GEMINI_API_KEY',
    status: hasGemini ? 'ok' : 'missing',
    required: !hasOpenAI, // required only if OpenAI is also missing
    detail: hasGemini ? 'Gemini Flash available for Director + Writer' : 'Not set',
  });
  checks.push({
    category: 'ai',
    name: 'OPENAI_API_KEY',
    status: hasOpenAI ? 'ok' : 'missing',
    required: !hasGemini, // required only if Gemini is also missing
    detail: hasOpenAI ? 'OpenAI Vision + GPT-4 available' : 'Not set',
  });

  if (!hasGemini && !hasOpenAI) {
    blockers.push('No AI key available — set GEMINI_API_KEY or OPENAI_API_KEY');
  }

  // ── Voice ──
  const hasElevenLabs = checkEnv('ELEVENLABS_API_KEY');
  checks.push({
    category: 'voice',
    name: 'ELEVENLABS_API_KEY',
    status: hasElevenLabs ? 'ok' : 'missing',
    required: false,
    detail: hasElevenLabs ? 'ElevenLabs voice synthesis available' : 'Missing — voice will use placeholder audio',
  });
  if (!hasElevenLabs) warnings.push('ELEVENLABS_API_KEY missing — voice will use placeholder');

  // ── Music ──
  const hasSuno = checkEnv('SUNO_API_KEY');
  checks.push({
    category: 'music',
    name: 'SUNO_API_KEY',
    status: hasSuno ? 'ok' : 'missing',
    required: false,
    detail: hasSuno ? 'Suno music generation available' : 'Missing — composer will use template music',
  });
  if (!hasSuno) warnings.push('SUNO_API_KEY missing — composer will use template music');

  // ── Rendering (Remotion Lambda) ──
  const hasRemotion = checkEnv('REMOTION_SERVE_URL') && checkEnv('REMOTION_FUNCTION_NAME');
  const hasAWS = checkEnv('AWS_ACCESS_KEY_ID') && checkEnv('AWS_SECRET_ACCESS_KEY');
  const renderReady = hasRemotion && hasAWS;
  checks.push({
    category: 'rendering',
    name: 'REMOTION_LAMBDA',
    status: renderReady ? 'ok' : 'missing',
    required: false,
    detail: renderReady
      ? 'Remotion Lambda rendering available'
      : 'Missing — editor will return placeholder video (HO-007)',
  });
  if (!renderReady) warnings.push('Remotion Lambda keys missing — editor will use fallback video (HO-007)');

  // ── Publishing: X/Twitter ──
  // Runtime (publish-x.ts) requires all 4: API_KEY, API_SECRET, ACCESS_TOKEN, ACCESS_SECRET
  const hasX = checkEnv('TWITTER_API_KEY') && checkEnv('TWITTER_API_SECRET')
    && checkEnv('TWITTER_ACCESS_TOKEN') && checkEnv('TWITTER_ACCESS_SECRET');
  checks.push({
    category: 'publishing',
    name: 'TWITTER_KEYS',
    status: hasX ? 'ok' : 'missing',
    required: false,
    detail: hasX ? 'X/Twitter publishing available' : 'Missing — X publishing will be skipped',
  });
  if (!hasX) warnings.push('Twitter keys missing — X publishing will be skipped');

  // ── Publishing: LinkedIn ──
  const hasLinkedIn = checkEnv('LINKEDIN_ACCESS_TOKEN');
  checks.push({
    category: 'publishing',
    name: 'LINKEDIN_TOKEN',
    status: hasLinkedIn ? 'ok' : 'missing',
    required: false,
    detail: hasLinkedIn ? 'LinkedIn publishing available' : 'Missing — LinkedIn publishing will be skipped',
  });
  if (!hasLinkedIn) warnings.push('LinkedIn token missing — LinkedIn publishing will be skipped');

  // ── Publishing: YouTube ──
  // Runtime (publish-youtube.ts) requires all 3: CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN
  const hasYouTube = checkEnv('YOUTUBE_CLIENT_ID') && checkEnv('YOUTUBE_CLIENT_SECRET')
    && checkEnv('YOUTUBE_REFRESH_TOKEN');
  checks.push({
    category: 'publishing',
    name: 'YOUTUBE_KEYS',
    status: hasYouTube ? 'ok' : 'missing',
    required: false,
    detail: hasYouTube ? 'YouTube publishing available' : 'Missing — YouTube publishing will be skipped',
  });
  if (!hasYouTube) warnings.push('YouTube keys missing — YouTube publishing will be skipped');

  // ── Storage ──
  const storageOk = await checkStorage();
  checks.push({
    category: 'storage',
    name: 'NETLIFY_BLOBS',
    status: storageOk ? 'ok' : 'missing',
    required: true,
    detail: storageOk ? 'Netlify Blobs storage is reachable' : 'Storage unreachable — pipeline cannot persist state',
  });
  if (!storageOk) blockers.push('Storage unreachable — pipeline cannot persist run state');

  // ── Determine pipeline mode ──
  const hasAI = hasGemini || hasOpenAI;
  const optionalCount = [hasElevenLabs, hasSuno, renderReady, hasX, hasLinkedIn, hasYouTube].filter(Boolean).length;

  let mode: PipelineMode;
  if (!storageOk) {
    mode = 'BLOCKED';
  } else if (!hasAI) {
    mode = 'DEMO';
  } else if (optionalCount >= 5) {
    mode = 'FULL';
  } else if (optionalCount >= 2) {
    mode = 'ENHANCED';
  } else {
    mode = 'SIMPLE';
  }

  const canRun = blockers.length === 0;
  const ok = canRun && warnings.length === 0;
  const availableCount = checks.filter(c => c.status === 'ok').length;
  const totalCount = checks.length;

  const summary = canRun
    ? `Pipeline can run in ${mode} mode (${availableCount}/${totalCount} services available)`
    : `Pipeline BLOCKED: ${blockers.join('; ')}`;

  const response: ValidationResponse = {
    ok,
    canRun,
    mode,
    checks,
    blockers,
    warnings,
    summary,
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(response, null, 2),
  };
};
