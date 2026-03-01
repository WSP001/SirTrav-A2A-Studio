#!/usr/bin/env node

const args = process.argv.slice(2);

function parseArg(name) {
  const i = args.indexOf(name);
  if (i === -1) return null;
  return args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : null;
}

const useLocal = args.includes('--local');
const useCloud = args.includes('--cloud');
const baseOverride = parseArg('--baseUrl');
const live = args.includes('--live');
const dryRun = args.includes('--dry-run') || !live;

if (useLocal && useCloud) {
  console.error('Use only one of --local or --cloud');
  process.exitCode = 1;
}

const LOCAL_BASE = 'http://localhost:8888/.netlify/functions';
const CLOUD_BASE = 'https://sirtrav-a2a-studio.netlify.app/.netlify/functions';
const baseUrl = baseOverride || (useLocal ? LOCAL_BASE : useCloud ? CLOUD_BASE : CLOUD_BASE);

if (live && !args.includes('--live')) {
  console.error('Live mode requires explicit --live');
  process.exitCode = 1;
}

const payload = {
  text: live ? `SirTrav live proof ${new Date().toISOString()}` : 'SirTrav dry-run smoke',
  projectId: 'sirtrav-test',
  runId: `x-${Date.now()}`,
  dryRun,
};

function extractXId(data) {
  const candidates = [data?.tweetId, data?.id, data?.xId];
  return candidates.find((v) => typeof v === 'string' && v.length > 0) || null;
}

async function main() {
  if (process.exitCode === 1) return;

  const res = await fetch(`${baseUrl}/publish-x`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  let json;
  try {
    json = await res.json();
  } catch {
    console.error(`Non-JSON response (status ${res.status})`);
    process.exitCode = 1;
    return;
  }

  if (!res.ok) {
    console.error(`HTTP ${res.status}`, json);
    process.exitCode = 1;
    return;
  }

  if (json.success === true) {
    const id = extractXId(json);
    if (!id) {
      console.error('No Fake Success violation: success=true but missing tweet identifier');
      process.exitCode = 1;
      return;
    }
    console.log(`PASS success=true id=${id}`);
    return;
  }

  if (json.disabled === true) {
    if (!json.reason && !json.error && !json.note) {
      console.error('No Fake Success violation: disabled=true but missing reason/error/note');
      process.exitCode = 1;
      return;
    }
    console.log(`PASS disabled=true reason=${json.reason || json.error || json.note}`);
    return;
  }

  console.log(`PASS success=${String(json.success)} disabled=${String(json.disabled)}`);
}

try {
  await main();
} catch (err) {
  console.error(`Request failed: ${err.message}`);
  process.exitCode = 1;
}
