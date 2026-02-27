#!/usr/bin/env node
// File: scripts/master-cockpit.mjs
// Purpose: Single "Master Pre-Programmer" entry point for the Human Operator
// Shows system health, env var status, Linear board, and generates actionable checklist
//
// Usage:
//   node scripts/master-cockpit.mjs              # Full cockpit dashboard
//   node scripts/master-cockpit.mjs --json       # Machine-readable output
//   node scripts/master-cockpit.mjs --checklist  # Generate MASTER_CHECKLIST.md
//   just cockpit                                  # via justfile

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const JSON_OUT = process.argv.includes('--json');
const CHECKLIST = process.argv.includes('--checklist');

// ── Helpers ──
function run(cmd, cwd = ROOT) {
  try {
    return execSync(cmd, { encoding: 'utf8', cwd, timeout: 15000 }).trim();
  } catch { return ''; }
}

function hr(title) {
  if (JSON_OUT) return;
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${'═'.repeat(60)}`);
}

// ── 1. Git & Branch Status ──
function getGitStatus() {
  const branch = run('git branch --show-current');
  const head = run('git rev-parse --short HEAD');
  const dirty = run('git status --porcelain').length > 0;
  const synced = run('git rev-parse main') === run('git rev-parse origin/main');
  return { branch, head, dirty, synced };
}

// ── 2. Netlify Config Verification ──
function verifyNetlifyConfig() {
  const tomlPath = resolve(ROOT, 'netlify.toml');
  const checks = [];

  if (!existsSync(tomlPath)) {
    checks.push({ name: 'netlify.toml exists', pass: false, detail: 'MISSING at repo root' });
    return checks;
  }

  const toml = readFileSync(tomlPath, 'utf8');

  checks.push({
    name: 'netlify.toml exists',
    pass: true,
    detail: 'Present at repo root'
  });
  checks.push({
    name: '[build] command',
    pass: toml.includes('command = "npm run build"'),
    detail: toml.includes('command = "npm run build"') ? 'npm run build' : 'UNEXPECTED or missing'
  });
  checks.push({
    name: '[build] publish',
    pass: toml.includes('publish = "dist"'),
    detail: toml.includes('publish = "dist"') ? 'dist/' : 'UNEXPECTED'
  });
  checks.push({
    name: '[build] functions',
    pass: toml.includes('functions = "netlify/functions"'),
    detail: toml.includes('functions = "netlify/functions"') ? 'netlify/functions/' : 'UNEXPECTED'
  });
  checks.push({
    name: 'SPA redirect',
    pass: toml.includes('from = "/*"') && toml.includes('to = "/index.html"'),
    detail: toml.includes('from = "/*"') ? '/* → /index.html 200' : 'MISSING'
  });
  checks.push({
    name: 'LinkedIn OAuth redirect',
    pass: toml.includes('/auth/linkedin/callback'),
    detail: toml.includes('/auth/linkedin/callback') ? 'Wired to auth function' : 'MISSING'
  });

  return checks;
}

// ── 3. Environment Variable Status ──
function checkEnvVars() {
  // Required env vars for full system operation
  const required = [
    { key: 'LINEAR_API_KEY',           scope: 'local',    purpose: 'Linear API integration' },
    { key: 'LINKEDIN_CLIENT_ID',       scope: 'netlify',  purpose: 'LinkedIn OAuth' },
    { key: 'LINKEDIN_CLIENT_SECRET',   scope: 'netlify',  purpose: 'LinkedIn OAuth' },
    { key: 'LINKEDIN_ACCESS_TOKEN',    scope: 'netlify',  purpose: 'LinkedIn publishing' },
    { key: 'LINKEDIN_PERSON_URN',      scope: 'netlify',  purpose: 'LinkedIn post author' },
    { key: 'YOUTUBE_CLIENT_ID',        scope: 'netlify',  purpose: 'YouTube OAuth' },
    { key: 'YOUTUBE_CLIENT_SECRET',    scope: 'netlify',  purpose: 'YouTube OAuth' },
    { key: 'YOUTUBE_REFRESH_TOKEN',    scope: 'netlify',  purpose: 'YouTube publishing' },
    { key: 'REMOTION_SERVE_URL',       scope: 'netlify',  purpose: 'Remotion Lambda rendering' },
    { key: 'REMOTION_AWS_REGION',      scope: 'netlify',  purpose: 'Remotion Lambda region' },
  ];

  // Check local .env
  let localEnv = {};
  const envPath = resolve(ROOT, '.env');
  if (existsSync(envPath)) {
    const lines = readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^([A-Z_]+)=(.+)/);
      if (match) localEnv[match[1]] = match[2].length > 0;
    }
  }

  // Check process.env
  return required.map(v => ({
    ...v,
    localSet: !!localEnv[v.key] || !!process.env[v.key],
    // We can't check Netlify env from here — mark as unknown unless we can reach healthcheck
  }));
}

// ── 4. Cycle Gate Status ──
function getCycleGates() {
  const raw = run('node scripts/cycle-check.mjs all 2>&1');
  // Parse from the summary line: "✅ 10 passed  ❌ 0 failed  ⏳ 0 pending"
  const passMatch = raw.match(/(\d+)\s+passed/);
  const failMatch = raw.match(/(\d+)\s+failed/);
  const pendMatch = raw.match(/(\d+)\s+pending/);
  const passed = passMatch ? parseInt(passMatch[1]) : 0;
  const failed = failMatch ? parseInt(failMatch[1]) : 0;
  const pending = pendMatch ? parseInt(pendMatch[1]) : 0;
  return { passed, failed, pending, raw };
}

// ── 5. Open PRs ──
function getOpenPRs() {
  const raw = run('gh pr list --state open --json number,title,mergeable --limit 20');
  try { return JSON.parse(raw); } catch { return []; }
}

// ── 6. Linear Board Status ──
function getLinearStatus() {
  // Check if LINEAR_API_KEY is available
  const hasKey = !!process.env.LINEAR_API_KEY;
  return {
    apiKeySet: hasKey,
    intakeEmail: 'wsp2agent-981d596ce626@intake.linear.app',
    projectUrl: 'https://linear.app/wsp2agent/project/sirtrava2a-studio-14857ab39d4b',
    githubIntegration: false, // TODO: detect via Linear API
  };
}

// ── 7. Human-Ops Items ──
function getHumanOps() {
  return [
    { id: 'HO-001', task: 'Rotate LinkedIn secrets (exposed in chat session)', priority: 'CRITICAL', status: 'PENDING' },
    { id: 'HO-002', task: 'Set LINEAR_API_KEY in local .env', priority: 'HIGH', status: process.env.LINEAR_API_KEY ? 'DONE' : 'PENDING' },
    { id: 'HO-003', task: 'Enable Linear ↔ GitHub integration in Linear settings', priority: 'HIGH', status: 'PENDING' },
    { id: 'HO-004', task: 'Verify Netlify Dashboard build command = "npm run build"', priority: 'MEDIUM', status: 'PENDING' },
    { id: 'HO-005', task: 'Verify Netlify Dashboard publish dir = "dist"', priority: 'MEDIUM', status: 'PENDING' },
    { id: 'HO-006', task: 'Close stale Linear issues WSP-5, WSP-6 (work completed)', priority: 'LOW', status: 'PENDING' },
  ];
}

// ═══════════════════════════════════════
// COLLECT EVERYTHING
// ═══════════════════════════════════════
const report = {
  timestamp: new Date().toISOString(),
  git: getGitStatus(),
  netlify: verifyNetlifyConfig(),
  envVars: checkEnvVars(),
  gates: getCycleGates(),
  prs: getOpenPRs(),
  linear: getLinearStatus(),
  humanOps: getHumanOps(),
};

// ═══════════════════════════════════════
// OUTPUT: JSON
// ═══════════════════════════════════════
if (JSON_OUT) {
  const { raw, ...gatesClean } = report.gates;
  console.log(JSON.stringify({ ...report, gates: gatesClean }, null, 2));
  process.exit(0);
}

// ═══════════════════════════════════════
// OUTPUT: CHECKLIST FILE
// ═══════════════════════════════════════
if (CHECKLIST) {
  const lines = [
    `# Master Deployment Checklist`,
    `> Generated: ${report.timestamp}`,
    `> Branch: ${report.git.branch} (${report.git.head})`,
    ``,
    `## Netlify Configuration`,
  ];
  for (const c of report.netlify) {
    lines.push(`- [${c.pass ? 'x' : ' '}] ${c.name}: ${c.detail}`);
  }
  lines.push('', '## Environment Variables');
  for (const v of report.envVars) {
    lines.push(`- [${v.localSet ? 'x' : ' '}] \`${v.key}\` — ${v.purpose} (scope: ${v.scope})`);
  }
  lines.push('', '## Cycle Gates');
  lines.push(`- [${report.gates.failed === 0 ? 'x' : ' '}] ${report.gates.passed} passed, ${report.gates.failed} failed, ${report.gates.pending} pending`);
  lines.push('', '## Open Pull Requests');
  if (report.prs.length === 0) {
    lines.push('- [x] No open PRs — board is clean');
  } else {
    for (const pr of report.prs) {
      lines.push(`- [ ] PR #${pr.number}: ${pr.title} (${pr.mergeable})`);
    }
  }
  lines.push('', '## Linear Board');
  lines.push(`- [${report.linear.apiKeySet ? 'x' : ' '}] LINEAR_API_KEY configured`);
  lines.push(`- [ ] GitHub ↔ Linear integration enabled`);
  lines.push(`- Intake email: \`${report.linear.intakeEmail}\``);
  lines.push(`- Project: ${report.linear.projectUrl}`);
  lines.push('', '## Human-Ops Actions');
  for (const h of report.humanOps) {
    lines.push(`- [${h.status === 'DONE' ? 'x' : ' '}] **${h.id}** [${h.priority}] ${h.task}`);
  }
  lines.push('', '---', '*Generated by `just cockpit --checklist` — For the Commons Good.*', '');

  const outPath = resolve(ROOT, 'MASTER_CHECKLIST.md');
  writeFileSync(outPath, lines.join('\n'));
  console.log(`✅ Checklist written to MASTER_CHECKLIST.md`);
  process.exit(0);
}

// ═══════════════════════════════════════
// OUTPUT: HUMAN-READABLE DASHBOARD
// ═══════════════════════════════════════
console.log('');
console.log('  🎛️  SirTrav A2A Studio — Master Cockpit');
console.log(`  📅  ${report.timestamp.split('T')[0]}  ⏰  ${report.timestamp.split('T')[1].split('.')[0]}`);

// Git
hr('GIT STATUS');
const g = report.git;
console.log(`  Branch:  ${g.branch}  (${g.head})`);
console.log(`  Clean:   ${g.dirty ? '🔴 Uncommitted changes' : '✅ Working tree clean'}`);
console.log(`  Synced:  ${g.synced ? '✅ main = origin/main' : '🔴 Out of sync — run: git pull'}`);

// Netlify Config
hr('NETLIFY CONFIG');
for (const c of report.netlify) {
  console.log(`  ${c.pass ? '✅' : '❌'} ${c.name}: ${c.detail}`);
}

// Env Vars
hr('ENVIRONMENT VARIABLES');
const setCount = report.envVars.filter(v => v.localSet).length;
console.log(`  ${setCount}/${report.envVars.length} keys detected locally:`);
for (const v of report.envVars) {
  const icon = v.localSet ? '✅' : '❌';
  console.log(`  ${icon} ${v.key.padEnd(28)} ${v.purpose} (${v.scope})`);
}
if (setCount < report.envVars.length) {
  console.log(`\n  💡 Missing keys? For Netlify-scoped vars, set in Netlify Dashboard > Environment.`);
  console.log(`     For local vars, add to .env file at repo root.`);
}

// Cycle Gates
hr('CYCLE GATES');
const gates = report.gates;
const gateIcon = gates.failed === 0 ? '✅' : '🔴';
console.log(`  ${gateIcon} ${gates.passed} passed  ❌ ${gates.failed} failed  ⏳ ${gates.pending} pending`);

// Open PRs
hr('OPEN PULL REQUESTS');
if (report.prs.length === 0) {
  console.log('  ✅ No open PRs — board is clean');
} else {
  for (const pr of report.prs) {
    const icon = pr.mergeable === 'MERGEABLE' ? '🟢' : pr.mergeable === 'CONFLICTING' ? '🔴' : '🟡';
    console.log(`  ${icon} #${pr.number} ${pr.title.slice(0, 50)} (${pr.mergeable})`);
  }
}

// Linear
hr('LINEAR BOARD');
console.log(`  API Key:     ${report.linear.apiKeySet ? '✅ Set' : '❌ NOT SET — add LINEAR_API_KEY to .env'}`);
console.log(`  Intake:      ${report.linear.intakeEmail}`);
console.log(`  Project:     ${report.linear.projectUrl}`);
console.log(`  GH Link:     ${report.linear.githubIntegration ? '✅ Connected' : '❌ NOT CONNECTED — enable in Linear Settings > Integrations > GitHub'}`);

// Human-Ops
hr('🔴 HUMAN-OPS — Only YOU Can Do These');
const pendingOps = report.humanOps.filter(h => h.status === 'PENDING');
if (pendingOps.length === 0) {
  console.log('  ✅ All human-ops complete');
} else {
  for (const h of report.humanOps) {
    const icon = h.status === 'DONE' ? '✅' : h.priority === 'CRITICAL' ? '🔴' : h.priority === 'HIGH' ? '🟡' : '⚪';
    console.log(`  ${icon} ${h.id} [${h.priority.padEnd(8)}] ${h.task}`);
  }
}

// Summary
hr('NEXT ACTIONS');
const actions = [];
if (!g.synced) actions.push('🔴 Pull latest main: git pull origin main');
if (gates.failed > 0) actions.push(`🔴 Fix ${gates.failed} failing gate(s)`);
if (!report.linear.apiKeySet) actions.push('🟡 Set LINEAR_API_KEY: https://linear.app/wsp2agent/settings/api → .env');
if (pendingOps.length > 0) actions.push(`🟡 ${pendingOps.length} human-ops items pending (see above)`);
if (report.prs.length > 0) actions.push(`🟡 ${report.prs.length} open PR(s) to review`);
if (actions.length === 0) {
  console.log('  ✅ All systems nominal — you are clear to build');
} else {
  for (let i = 0; i < actions.length; i++) {
    console.log(`  ${i + 1}. ${actions[i]}`);
  }
}

console.log(`\n  💡 Run \`just cockpit --checklist\` to generate MASTER_CHECKLIST.md`);
console.log(`${'═'.repeat(60)}\n`);
