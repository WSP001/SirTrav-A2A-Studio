#!/usr/bin/env node
/**
 * validate-cloud-env.mjs — SirTrav A2A Studio Cloud Environment Audit
 *
 * Fetches Netlify site environment variables directly into memory, masks them
 * for output, and never writes secret values to disk. Exits 1 if any required
 * cloud keys are missing.
 */

import { spawnSync } from 'child_process';
import { KEYS, maskValue, pad } from './lib/env-contract.mjs';

const JSON_OUT = process.argv.includes('--json');

function fetchCloudEnv() {
  const result = process.platform === 'win32'
    ? spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'npx netlify env:list --json'], {
        encoding: 'utf8',
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    : spawnSync('npx', ['netlify', 'env:list', '--json'], {
        encoding: 'utf8',
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe'],
      });

  if (result.status !== 0) {
    const stderr = (result.stderr || '').trim();
    console.error('❌ Failed to fetch Netlify environment. Make sure `netlify login` is valid and this repo is linked.');
    if (stderr) console.error(stderr);
    process.exit(1);
  }

  try {
    const parsed = JSON.parse(result.stdout || '{}');
    const vars = {};
    for (const [key, val] of Object.entries(parsed)) {
      vars[key] = val && typeof val === 'object' && 'value' in val ? val.value : val;
    }
    return vars;
  } catch (error) {
    console.error('❌ Netlify env:list returned unreadable JSON.');
    process.exit(1);
  }
}

function collectResults(cloudEnv) {
  return KEYS.map((k) => {
    const raw = typeof cloudEnv[k.name] === 'string' ? cloudEnv[k.name] : '';
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
  console.log('  SirTrav A2A Studio — CLOUD Env Key Audit');
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
  const reqPresent = rows.filter((r) => r.importance === 'required' && r.status === 'present').length;
  const reqMissing = rows.filter((r) => r.importance === 'required' && r.status === 'missing');
  const optPresent = rows.filter((r) => r.importance === 'optional' && r.status === 'present').length;
  const optMissing = rows.filter((r) => r.importance === 'optional' && r.status === 'missing').length;

  console.log('');
  console.log('  Summary:');
  console.log(`    Required present: ${reqPresent}`);
  console.log(`    Required missing: ${reqMissing.length}`);
  console.log(`    Optional present: ${optPresent}`);
  console.log(`    Optional missing: ${optMissing}`);

  if (reqMissing.length > 0) {
    console.log('');
    console.log('  ❌ Missing REQUIRED cloud keys (cloud pipeline will degrade):');
    for (const r of reqMissing) {
      console.log(`    - ${r.name} (${r.group}) — ${r.note}`);
    }
  } else {
    console.log('');
    console.log('  ✅ All REQUIRED cloud keys are present.');
  }

  console.log('');
  return reqMissing.length;
}

const cloudEnv = fetchCloudEnv();
const rows = collectResults(cloudEnv);

if (JSON_OUT) {
  const reqMissing = rows.filter((r) => r.importance === 'required' && r.status === 'missing').length;
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    source: 'netlify-cloud',
    results: rows,
    summary: {
      requiredPresent: rows.filter((r) => r.importance === 'required' && r.status === 'present').length,
      requiredMissing: reqMissing,
      optionalPresent: rows.filter((r) => r.importance === 'optional' && r.status === 'present').length,
      optionalMissing: rows.filter((r) => r.importance === 'optional' && r.status === 'missing').length,
      total: rows.length,
    },
  }, null, 2));
  process.exit(reqMissing > 0 ? 1 : 0);
} else {
  console.log('🔎 Audit scope: LIVE Netlify cloud environment only');
  printTable(rows);
  const missing = printSummary(rows);
  process.exit(missing > 0 ? 1 : 0);
}
