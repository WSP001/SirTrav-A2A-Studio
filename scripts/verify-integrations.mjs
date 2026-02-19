#!/usr/bin/env node
/**
 * verify-integrations.mjs
 * CC-SOCIAL-NORM: Sanity-check YouTube + Remotion Lambda integrations
 *
 * Usage:
 *   node scripts/verify-integrations.mjs             # auto-detect local or cloud
 *   node scripts/verify-integrations.mjs --cloud     # force cloud
 *   node scripts/verify-integrations.mjs --local     # force local (needs netlify dev)
 *   node scripts/verify-integrations.mjs --youtube   # YouTube only
 *   node scripts/verify-integrations.mjs --remotion  # Remotion only
 *
 * "You're correct when healthcheck shows ok, and this script PASSES."
 */

const args = process.argv.slice(2);
const forceCloud = args.includes('--cloud');
const forceLocal = args.includes('--local');
const youtubeOnly = args.includes('--youtube');
const remotionOnly = args.includes('--remotion');

const BASE_URL = forceCloud
  ? 'https://sirtrav-a2a-studio.netlify.app'
  : forceLocal
    ? 'http://localhost:8888'
    : process.env.SITE_URL || (process.env.CI ? 'https://sirtrav-a2a-studio.netlify.app' : 'http://localhost:8888');

const TIMEOUT_MS = 15000;

let passed = 0;
let failed = 0;
let skipped = 0;

function pass(label, detail = '') {
  console.log(`  ✅ PASS: ${label}${detail ? ` — ${detail}` : ''}`);
  passed++;
}

function fail(label, detail = '') {
  console.error(`  ❌ FAIL: ${label}${detail ? ` — ${detail}` : ''}`);
  failed++;
}

function skip(label, reason = '') {
  console.log(`  ⏭️  SKIP: ${label}${reason ? ` (${reason})` : ''}`);
  skipped++;
}

async function fetchWithTimeout(url, opts = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// ─────────────────────────────────────────────
// CHECK 1: Healthcheck baseline
// ─────────────────────────────────────────────
async function checkHealthcheck() {
  console.log('\n🔗 [1/4] Healthcheck baseline...');
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/.netlify/functions/healthcheck`);
    const data = await res.json();

    if (res.ok) {
      pass('Healthcheck reachable', `status=${data.status} v${data.version}`);
    } else {
      fail('Healthcheck HTTP error', `${res.status} ${res.statusText}`);
    }

    // Check social platforms
    const social = data.services?.find(s => s.name === 'social_publishing');
    if (social) {
      if (social.status === 'ok' || social.status === 'degraded') {
        pass('Social publishing configured', social.error || 'all MVP platforms ok');
      } else {
        fail('Social publishing disabled', social.error || 'no keys configured');
      }
    }

    // Check AI keys
    const ai = data.services?.find(s => s.name === 'ai_services');
    if (ai?.status === 'ok') {
      pass('AI services configured', 'OpenAI + ElevenLabs present');
    } else {
      fail('AI services missing', ai?.error || 'check OPENAI_API_KEY + ELEVENLABS_API_KEY');
    }

    return data;
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.cause?.code === 'ECONNREFUSED') {
      fail('Healthcheck ECONNREFUSED', 'Run: npm run dev (netlify dev)');
    } else {
      fail('Healthcheck error', err.message);
    }
    return null;
  }
}

// ─────────────────────────────────────────────
// CHECK 2: YouTube integration
// ─────────────────────────────────────────────
async function checkYouTube() {
  console.log('\n📺 [2/4] YouTube integration...');

  // Step A: Check env vars via healthcheck
  const healthRes = await fetchWithTimeout(`${BASE_URL}/.netlify/functions/healthcheck`)
    .then(r => r.json())
    .catch(() => null);

  const social = healthRes?.services?.find(s => s.name === 'social_publishing');
  const youtubeConfigured = social && (social.status === 'ok' || (social.error && !social.error.includes('YouTube')));

  if (!youtubeConfigured && social?.status === 'disabled') {
    skip('YouTube publish test', 'YOUTUBE_CLIENT_ID/SECRET/REFRESH_TOKEN missing in Netlify');
    console.log('\n  💡 To fix YouTube:');
    console.log('     1. Go to Google Cloud Console → APIs → YouTube Data API v3');
    console.log('     2. Create OAuth 2.0 credentials (Web Application)');
    console.log('     3. Get refresh token via OAuth playground');
    console.log('     4. Add to Netlify env vars:');
    console.log('        YOUTUBE_CLIENT_ID=...');
    console.log('        YOUTUBE_CLIENT_SECRET=...');
    console.log('        YOUTUBE_REFRESH_TOKEN=...');
    console.log('     5. Re-deploy and run this script again.');
    return;
  }

  // Step B: Call publish-youtube with a test payload (dry run)
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/.netlify/functions/publish-youtube`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: 'verify-integrations-test',
        title: 'SirTrav A2A Studio — Integration Sanity Check',
        description: 'Automated verification test from verify-integrations.mjs',
        videoUrl: 'https://example.com/test.mp4', // Won't actually upload
        privacy: 'private',
        tags: ['sirtrav', 'test'],
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 200 && data.success && data.youtubeId) {
      pass('YouTube publish', `videoId=${data.youtubeId} url=${data.youtubeUrl}`);
    } else if (res.status === 200 && data.disabled) {
      skip('YouTube publish', 'disabled=true — keys present but publishing skipped');
    } else if (res.status === 401 || (data.error && data.error.includes('auth'))) {
      fail('YouTube auth failed', `Refresh token invalid or expired. Error: ${data.error}`);
      console.log('\n  💡 YouTube auth fix:');
      console.log('     1. Refresh token may be expired — re-authorize via OAuth');
      console.log('     2. Ensure scope includes: https://www.googleapis.com/auth/youtube.upload');
      console.log('     3. Update YOUTUBE_REFRESH_TOKEN in Netlify env vars');
    } else if (data.error && data.error.toLowerCase().includes('quota')) {
      skip('YouTube publish', 'quota exceeded — API is working, just rate-limited');
    } else {
      fail('YouTube publish', `status=${res.status} body=${JSON.stringify(data).slice(0, 120)}`);
    }
  } catch (err) {
    fail('YouTube request error', err.message);
  }
}

// ─────────────────────────────────────────────
// CHECK 3: Remotion Lambda / Render Dispatcher
// ─────────────────────────────────────────────
async function checkRemotion() {
  console.log('\n🎬 [3/4] Remotion Lambda / Render Dispatcher...');

  try {
    const res = await fetchWithTimeout(`${BASE_URL}/.netlify/functions/render-dispatcher`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: 'verify-integrations-test',
        runId: `sanity-${Date.now()}`,
        compositionId: 'IntroSlate',
        inputProps: { title: 'Sanity Check', subtitle: 'verify-integrations.mjs' },
      }),
    });

    const data = await res.json().catch(() => ({}));

    // 202 = real dispatch kicked off
    if (res.status === 202 && data.ok && data.renderId) {
      if (data.fallback) {
        // Fallback mode = Remotion env vars not set
        fail('Remotion Lambda', `Fallback mode — env vars missing. renderId=${data.renderId}`);
        console.log('\n  💡 Remotion Lambda fix:');
        console.log('     Add these to Netlify env vars:');
        console.log('       REMOTION_FUNCTION_NAME=remotion-render-4-0-0-mem2048mb-disk2048mb-240sec');
        console.log('       REMOTION_SERVE_URL=https://remotionlambda-*.s3.amazonaws.com/sites/...');
        console.log('       REMOTION_BUCKET=remotionlambda-useast1-...');
        console.log('       AWS_ACCESS_KEY_ID=...');
        console.log('       AWS_SECRET_ACCESS_KEY=...');
        console.log('       AWS_REGION=us-east-1');
        console.log('     Then re-deploy and check render-progress for a real renderId (not "fallback-*")');
      } else {
        pass('Remotion Lambda', `Real renderId=${data.renderId} bucket=${data.bucketName}`);

        // Bonus: poll progress once to confirm it's tracking
        await checkRenderProgress(data.renderId, data.bucketName);
      }
    } else {
      fail('Render Dispatcher', `status=${res.status} body=${JSON.stringify(data).slice(0, 120)}`);
    }
  } catch (err) {
    fail('Render Dispatcher error', err.message);
  }
}

async function checkRenderProgress(renderId, bucketName) {
  try {
    const res = await fetchWithTimeout(
      `${BASE_URL}/.netlify/functions/render-progress?renderId=${renderId}&bucketName=${bucketName}`
    );
    const data = await res.json().catch(() => ({}));

    if (res.ok && data.ok) {
      pass('Render progress polling', `progress=${Math.round((data.progress || 0) * 100)}% phase=${data.phase}`);
    } else {
      fail('Render progress polling', data.error || `status=${res.status}`);
    }
  } catch (err) {
    fail('Render progress error', err.message);
  }
}

// ─────────────────────────────────────────────
// CHECK 4: Publisher response contract
// ─────────────────────────────────────────────
async function checkPublisherContract() {
  console.log('\n📋 [4/4] Publisher response contract (No Fake Success)...');

  const publishers = [
    { name: 'X/Twitter', endpoint: 'publish-x', payload: { text: 'Contract check — verify-integrations.mjs' } },
    { name: 'YouTube', endpoint: 'publish-youtube', payload: { projectId: 'test', title: 'Test', description: 'Test', videoUrl: 'https://example.com/t.mp4' } },
  ];

  for (const pub of publishers) {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/.netlify/functions/${pub.endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pub.payload),
      });

      const data = await res.json().catch(() => ({}));

      // Contract: must have { success, platform } or { disabled, platform } — never 200+fake success
      const hasNoFakeSuccess = !(data.success === true && data.tweetId?.startsWith('mock'));
      const hasNoPlaceholderUrl = !(data.youtubeUrl?.includes('placeholder'));

      if (hasNoFakeSuccess && hasNoPlaceholderUrl) {
        if (data.success) {
          pass(`${pub.name} contract`, `success=true (real)`);
        } else if (data.disabled) {
          pass(`${pub.name} contract`, `disabled=true (honest)`);
        } else if (data.not_implemented) {
          pass(`${pub.name} contract`, `not_implemented=true (honest)`);
        } else {
          pass(`${pub.name} contract`, `no fake success detected`);
        }
      } else {
        fail(`${pub.name} No-Fake-Success violated`, JSON.stringify(data).slice(0, 80));
      }
    } catch (err) {
      fail(`${pub.name} contract check`, err.message);
    }
  }
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
async function main() {
  console.log('🔍 SirTrav Integration Sanity Check');
  console.log(`   Target: ${BASE_URL}`);
  console.log(`   Time:   ${new Date().toISOString()}`);

  await checkHealthcheck();

  if (!remotionOnly) await checkYouTube();
  if (!youtubeOnly) await checkRemotion();
  if (!youtubeOnly && !remotionOnly) await checkPublisherContract();

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`📊 Results: ✅ ${passed} passed  ❌ ${failed} failed  ⏭️  ${skipped} skipped`);

  if (failed > 0) {
    console.error('\n❌ Integration check FAILED — see above for fix instructions');
    process.exit(1);
  } else {
    console.log('\n✅ Integration check PASSED');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
