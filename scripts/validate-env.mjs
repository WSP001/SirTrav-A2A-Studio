#!/usr/bin/env node
/**
 * validate-env.mjs — SirTrav A2A Studio Environment Key Audit
 *
 * Validates all env keys, classifies as required vs optional,
 * shows masked previews, and exits 1 if any required key is missing.
 *
 * Usage:
 *   node scripts/validate-env.mjs           # Table + summary
 *   node scripts/validate-env.mjs --json    # Machine-readable JSON
 *   just validate-env                        # via justfile
 *
 * Exit codes:
 *   0 = all required keys present
 *   1 = at least one required key missing
 */

import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const JSON_OUT = process.argv.includes('--json');

// ── Key Definitions ──────────────────────────────────────────
const KEYS = [
  // Core AI services
  { name: 'OPENAI_API_KEY',          importance: 'required', group: 'core-ai',        note: 'Director/Writer GPT-4 Vision' },
  { name: 'ELEVENLABS_API_KEY',      importance: 'optional', group: 'core-ai',        note: 'Voice agent narration' },
  { name: 'SUNO_API_KEY',            importance: 'optional', group: 'core-ai',        note: 'Composer music generation' },
  { name: 'GEMINI_API_KEY',          importance: 'optional', group: 'core-ai',        note: 'Gemini narration (alternative LLM)' },

  // Infrastructure
  { name: 'LINEAR_API_KEY',          importance: 'optional', group: 'infra',          note: 'Linear project management API' },
  { name: 'MCP_SECRET_TOKEN',        importance: 'optional', group: 'infra',          note: 'MCP gateway auth token' },
  { name: 'SHARE_SECRET',            importance: 'optional', group: 'infra',          note: 'HMAC share link signing' },

  // Remotion Lambda
  { name: 'REMOTION_SERVE_URL',      importance: 'optional', group: 'remotion',       note: 'Deployed Remotion bundle URL' },
  { name: 'REMOTION_AWS_REGION',     importance: 'optional', group: 'remotion',       note: 'AWS region for Lambda' },
  { name: 'AWS_ACCESS_KEY_ID',       importance: 'optional', group: 'remotion',       note: 'AWS credentials for S3/Lambda' },
  { name: 'AWS_SECRET_ACCESS_KEY',   importance: 'optional', group: 'remotion',       note: 'AWS credentials for S3/Lambda' },

  // X / Twitter
  { name: 'TWITTER_API_KEY',         importance: 'optional', group: 'social-x',       note: 'Consumer API key' },
  { name: 'TWITTER_API_SECRET',      importance: 'optional', group: 'social-x',       note: 'Consumer secret' },
  { name: 'TWITTER_ACCESS_TOKEN',    importance: 'optional', group: 'social-x',       note: 'Access token' },
  { name: 'TWITTER_ACCESS_SECRET',   importance: 'optional', group: 'social-x',       note: 'Access token secret' },

  // LinkedIn
  { name: 'LINKEDIN_CLIENT_ID',      importance: 'optional', group: 'social-linkedin', note: 'OAuth client ID' },
  { name: 'LINKEDIN_CLIENT_SECRET',  importance: 'optional', group: 'social-linkedin', note: 'OAuth client secret' },
  { name: 'LINKEDIN_ACCESS_TOKEN',   importance: 'optional', group: 'social-linkedin', note: 'Publishing access token' },
  { name: 'LINKEDIN_PERSON_URN',     importance: 'optional', group: 'social-linkedin', note: 'Post author URN' },

  // YouTube
  { name: 'YOUTUBE_CLIENT_ID',       importance: 'optional', group: 'social-youtube',  note: 'OAuth client ID' },
  { name: 'YOUTUBE_CLIENT_SECRET',   importance: 'optional', group: 'social-youtube',  note: 'OAuth client secret' },
  { name: 'YOUTUBE_REFRESH_TOKEN',   importance: 'optional', group: 'social-youtube',  note: 'Refresh token for uploads' },

  // TikTok
  { name: 'TIKTOK_CLIENT_KEY',       importance: 'optional', group: 'social-tiktok',   note: 'Client key' },
  { name: 'TIKTOK_CLIENT_SECRET',    importance: 'optional', group: 'social-tiktok',   note: 'Client secret' },

  // Instagram
  { name: 'INSTAGRAM_ACCESS_TOKEN',  importance: 'optional', group: 'social-instagram', note: 'Access token' },
  { name: 'INSTAGRAM_BUSINESS_ID',   importance: 'optional', group: 'social-instagram', note: 'Business account ID' },

  // Bitly
  { name: 'BITLY_ACCESS_TOKEN',      importance: 'optional', group: 'utility',         note: 'URL shortener' },
];

// ── Load local .env ──────────────────────────────────────────
function loadLocalEnv() {
  const envPath = resolve(ROOT, '.env');
  const vars = {};
  if (existsSync(envPath)) {
    const lines = readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m) vars[m[1]] = m[2].trim();
    }
  }
  return vars;
}

function maskValue(v) {
  if (!v) return '-';
  if (v.length <= 6) return '*'.repeat(v.length);
  return `${v.slice(0, 4)}…${v.slice(-2)}`;
}

// ── Collect Results ──────────────────────────────────────────
function collectResults(localEnv) {
  return KEYS.map(k => {
    const raw = localEnv[k.name] || process.env[k.name] || '';
    const present = raw.length > 0;
    return {
      name: k.name,
      importance: k.importance,
      status: present ? 'present' : 'missing',
      group: k.group,
      note: k.note,
      preview: maskValue(raw || undefined),
    };
  });
}

// ── Print Table ──────────────────────────────────────────────
function pad(s, n) { return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length); }

function printTable(rows) {
  console.log('');
  console.log('  SirTrav A2A Studio — Env Key Audit');
  console.log('');
  const header = [
    pad('KEY', 28),
    pad('REQ/OPT', 8),
    pad('STATUS', 8),
    pad('GROUP', 18),
    pad('PREVIEW', 16),
  ].join('  ');
  console.log(`  ${header}`);
  console.log(`  ${'-'.repeat(header.length)}`);

  for (const r of rows) {
    const icon = r.status === 'present' ? '✅' : (r.importance === 'required' ? '❌' : '⬜');
    console.log(`  ${icon} ${[
      pad(r.name, 26),
      pad(r.importance === 'required' ? 'REQ' : 'OPT', 8),
      pad(r.status.toUpperCase(), 8),
      pad(r.group, 18),
      pad(r.preview, 16),
    ].join('  ')}`);
  }
}

function printSummary(rows) {
  const reqPresent  = rows.filter(r => r.importance === 'required' && r.status === 'present').length;
  const reqMissing  = rows.filter(r => r.importance === 'required' && r.status === 'missing');
  const optPresent  = rows.filter(r => r.importance === 'optional' && r.status === 'present').length;
  const optMissing  = rows.filter(r => r.importance === 'optional' && r.status === 'missing').length;

  console.log('');
  console.log('  Summary:');
  console.log(`    Required present: ${reqPresent}`);
  console.log(`    Required missing: ${reqMissing.length}`);
  console.log(`    Optional present: ${optPresent}`);
  console.log(`    Optional missing: ${optMissing}`);

  if (reqMissing.length > 0) {
    console.log('');
    console.log('  ❌ Missing REQUIRED keys (pipeline will degrade):');
    for (const r of reqMissing) {
      console.log(`    - ${r.name} (${r.group}) — ${r.note}`);
    }
  } else {
    console.log('');
    console.log('  ✅ All REQUIRED keys are present.');
  }

  // Group summary
  const groups = [...new Set(rows.map(r => r.group))];
  console.log('');
  console.log('  Group Status:');
  for (const g of groups) {
    const groupRows = rows.filter(r => r.group === g);
    const present = groupRows.filter(r => r.status === 'present').length;
    const total = groupRows.length;
    const icon = present === total ? '✅' : present === 0 ? '❌' : '🟡';
    console.log(`    ${icon} ${pad(g, 18)} ${present}/${total}`);
  }

  console.log('');
  return reqMissing.length;
}

// ── Main ─────────────────────────────────────────────────────
const localEnv = loadLocalEnv();
const rows = collectResults(localEnv);

if (JSON_OUT) {
  const reqMissing = rows.filter(r => r.importance === 'required' && r.status === 'missing').length;
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    results: rows,
    summary: {
      requiredPresent: rows.filter(r => r.importance === 'required' && r.status === 'present').length,
      requiredMissing: reqMissing,
      optionalPresent: rows.filter(r => r.importance === 'optional' && r.status === 'present').length,
      optionalMissing: rows.filter(r => r.importance === 'optional' && r.status === 'missing').length,
      total: rows.length,
    },
  }, null, 2));
  process.exit(reqMissing > 0 ? 1 : 0);
} else {
  printTable(rows);
  const missing = printSummary(rows);
  process.exit(missing > 0 ? 1 : 0);
}
