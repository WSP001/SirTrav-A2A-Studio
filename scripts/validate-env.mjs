#!/usr/bin/env node
/**
 * validate-env.mjs — SirTrav A2A Studio Environment Key Audit
 *
 * Validates env keys visible to the current process, classifies them as
 * required vs optional, shows masked previews, and exits 1 if any required
 * key is missing.
 *
 * IMPORTANT:
 *   This script audits the current local shell/.env/runtime context only.
 *   It does NOT pull secrets from the Netlify dashboard by itself.
 *   Use it to verify local dev or a shell that already has env injected.
 *   For real cloud proof runs, Netlify site environment variables remain
 *   the canonical runtime secret source of truth.
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
import { KEYS, maskValue, pad } from './lib/env-contract.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const JSON_OUT = process.argv.includes('--json');

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
  console.log('🔎 Audit scope: current shell + local .env only (not Netlify dashboard)');
  printTable(rows);
  const missing = printSummary(rows);
  process.exit(missing > 0 ? 1 : 0);
}
