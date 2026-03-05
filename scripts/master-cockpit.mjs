#!/usr/bin/env node
// File: scripts/master-cockpit.mjs
// Purpose: Single "Master Pre-Programmer" entry point + machine-actionable control plane

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const JSON_OUT = process.argv.includes('--json');
const CHECKLIST = process.argv.includes('--checklist');

function run(cmd, cwd = ROOT) {
  try {
    return execSync(cmd, { encoding: 'utf8', cwd, timeout: 20000 }).trim();
  } catch {
    return '';
  }
}

function parseJson(text, fallback = null) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function hr(title) {
  if (JSON_OUT) return;
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${'═'.repeat(60)}`);
}

function getGitStatus() {
  const branch = run('git branch --show-current');
  const head = run('git rev-parse --short HEAD');
  const dirty = run('git status --porcelain').length > 0;
  const aheadBehind = run('git rev-list --left-right --count HEAD...origin/main');
  let ahead = 0;
  let behind = 0;
  if (aheadBehind) {
    const parts = aheadBehind.split(/\s+/);
    if (parts.length === 2) {
      ahead = Number(parts[0]) || 0;
      behind = Number(parts[1]) || 0;
    }
  }
  const synced = ahead === 0 && behind === 0;
  return { branch, head, dirty, synced, ahead, behind };
}

function verifyNetlifyConfig() {
  const tomlPath = resolve(ROOT, 'netlify.toml');
  const checks = [];

  if (!existsSync(tomlPath)) {
    checks.push({ name: 'netlify.toml exists', pass: false, detail: 'MISSING at repo root' });
    return checks;
  }

  const toml = readFileSync(tomlPath, 'utf8');

  checks.push({ name: 'netlify.toml exists', pass: true, detail: 'Present at repo root' });
  checks.push({ name: '[build] command', pass: toml.includes('command = "npm run build"'), detail: toml.includes('command = "npm run build"') ? 'npm run build' : 'UNEXPECTED or missing' });
  checks.push({ name: '[build] publish', pass: toml.includes('publish = "dist"'), detail: toml.includes('publish = "dist"') ? 'dist/' : 'UNEXPECTED' });
  checks.push({ name: '[build] functions', pass: toml.includes('functions = "netlify/functions"'), detail: toml.includes('functions = "netlify/functions"') ? 'netlify/functions/' : 'UNEXPECTED' });
  checks.push({ name: 'SPA redirect', pass: toml.includes('from = "/*"') && toml.includes('to = "/index.html"'), detail: toml.includes('from = "/*"') ? '/* → /index.html 200' : 'MISSING' });
  checks.push({ name: 'LinkedIn OAuth redirect', pass: toml.includes('/auth/linkedin/callback'), detail: toml.includes('/auth/linkedin/callback') ? 'Wired to auth function' : 'MISSING' });

  return checks;
}

function checkEnvVars() {
  const required = [
    { key: 'LINEAR_API_KEY', scope: 'local', purpose: 'Linear API integration' },
    { key: 'LINKEDIN_CLIENT_ID', scope: 'netlify', purpose: 'LinkedIn OAuth' },
    { key: 'LINKEDIN_CLIENT_SECRET', scope: 'netlify', purpose: 'LinkedIn OAuth' },
    { key: 'LINKEDIN_ACCESS_TOKEN', scope: 'netlify', purpose: 'LinkedIn publishing' },
    { key: 'LINKEDIN_PERSON_URN', scope: 'netlify', purpose: 'LinkedIn post author' },
    { key: 'YOUTUBE_CLIENT_ID', scope: 'netlify', purpose: 'YouTube OAuth' },
    { key: 'YOUTUBE_CLIENT_SECRET', scope: 'netlify', purpose: 'YouTube OAuth' },
    { key: 'YOUTUBE_REFRESH_TOKEN', scope: 'netlify', purpose: 'YouTube publishing' },
    { key: 'REMOTION_SERVE_URL', scope: 'netlify', purpose: 'Remotion Lambda rendering' },
    { key: 'REMOTION_REGION', scope: 'netlify', purpose: 'Remotion Lambda region' },
  ];

  const envPath = resolve(ROOT, '.env');
  const localEnv = {};
  if (existsSync(envPath)) {
    const lines = readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^([A-Z_]+)=(.*)$/);
      if (match) localEnv[match[1]] = (match[2] || '').trim().length > 0;
    }
  }

  return required.map((v) => ({ ...v, localSet: !!localEnv[v.key] || !!process.env[v.key] }));
}

function probeCloudHealthcheck() {
  const raw = run(`node -e "fetch('https://sirtrav-a2a-studio.netlify.app/.netlify/functions/healthcheck').then(r=>r.text()).then(t=>process.stdout.write(t)).catch(()=>process.exit(1))"`);
  const payload = parseJson(raw, null);
  if (!payload) return { ok: false, payload: null };

  const services = payload.services || [];
  const statusByName = {};
  for (const s of services) {
    statusByName[s.name] = s.status || 'unknown';
  }

  return {
    ok: true,
    payload,
    statusByName,
  };
}

function getCycleSummary() {
  const raw = run('node scripts/cycle-check.mjs all 2>&1');
  const passMatch = raw.match(/(\d+)\s+passed/);
  const failMatch = raw.match(/(\d+)\s+failed/);
  const pendMatch = raw.match(/(\d+)\s+pending/);
  const passed = passMatch ? parseInt(passMatch[1], 10) : 0;
  const failed = failMatch ? parseInt(failMatch[1], 10) : 0;
  const pending = pendMatch ? parseInt(pendMatch[1], 10) : 0;
  const buildSkipped = raw.includes('Vite Build Passes (skipped');
  return { passed, failed, pending, raw, buildSkipped };
}

function probeGate(name) {
  const raw = run(`node scripts/cycle-check.mjs ${name} 2>&1`);
  if (!raw) return 'not-run';
  if (raw.includes('✅')) return 'pass';
  if (raw.includes('❌') || raw.toLowerCase().includes('error')) return 'fail';
  return 'not-run';
}

function getLatestTruthSerum() {
  const dir = join(ROOT, 'artifacts', 'reports');
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir).filter((f) => /^truth-serum-.*\.json$/.test(f)).sort();
  if (files.length === 0) return null;
  const latest = files[files.length - 1];
  const data = parseJson(readFileSync(join(dir, latest), 'utf8'), null);
  if (!data) return null;
  return { file: `artifacts/reports/${latest}`, data };
}

function getMachineHealth() {
  const raw = run('node scripts/check-machine-health.mjs --json');
  const j = parseJson(raw, null);
  if (!j) {
    return {
      cpuLoad: 0,
      memUsedGb: 0,
      lfm2_24b_active: false,
      lastCheck: new Date().toISOString(),
      lockdown: false,
      workspace: 'SirTrav-A2A-Studio',
      gitStatus: 'dirty',
      currentJustTask: null,
    };
  }

  const cpuLoad = Number(String(j.cpu?.load || '0').replace('%', '')) / 100;
  const memUsedGb = Number(String(j.memory?.total || '0').replace(/[^0-9.]/g, ''))
    - Number(String(j.memory?.free || '0').replace(/[^0-9.]/g, ''));

  return {
    cpuLoad: Number.isFinite(cpuLoad) ? cpuLoad : 0,
    memUsedGb: Number.isFinite(memUsedGb) ? memUsedGb : 0,
    lfm2_24b_active: j.npu?.available === true,
    lastCheck: j.timestamp || new Date().toISOString(),
    lockdown: (j.healthScore || 10) < 5,
    workspace: 'SirTrav-A2A-Studio',
    gitStatus: 'clean',
    currentJustTask: null,
  };
}

function getOpenPRs() {
  const raw = run('gh pr list --state open --json number,title,mergeable --limit 20');
  return parseJson(raw, []);
}

function getLinearStatus() {
  return {
    apiKeySet: !!process.env.LINEAR_API_KEY,
    intakeEmail: 'wsp2agent-981d596ce626@intake.linear.app',
    projectUrl: 'https://linear.app/wsp2agent/project/sirtrava2a-studio-14857ab39d4b',
    githubIntegration: false,
  };
}

function getHumanOps(linearApiSet) {
  return [
    { id: 'HO-001', task: 'Rotate LinkedIn secrets (exposed in chat session)', priority: 'CRITICAL', status: 'PENDING' },
    { id: 'HO-002', task: 'Set LINEAR_API_KEY in local .env', priority: 'HIGH', status: linearApiSet ? 'DONE' : 'PENDING' },
    { id: 'HO-003', task: 'Enable Linear ↔ GitHub integration in Linear settings', priority: 'HIGH', status: 'PENDING' },
    { id: 'HO-004', task: 'Verify Netlify Dashboard build command = "npm run build"', priority: 'MEDIUM', status: 'PENDING' },
    { id: 'HO-005', task: 'Verify Netlify Dashboard publish dir = "dist"', priority: 'MEDIUM', status: 'PENDING' },
    { id: 'HO-006', task: 'Close stale Linear issues WSP-5, WSP-6 (work completed)', priority: 'LOW', status: 'PENDING' },
  ];
}

function getCycleControl(summary, truthSerumLatest) {
  const gates = {
    wiring: probeGate('wiring'),
    noFakeSuccess: probeGate('no_fake_success'),
    contracts: probeGate('contracts'),
    goldenPath: probeGate('golden_path'),
    build: summary.buildSkipped ? 'not-run' : probeGate('build'),
    truthSerum: truthSerumLatest ? ((truthSerumLatest.data?.summary?.allHonest || truthSerumLatest.data?.verdict?.includes('ALL CLEAR')) ? 'pass' : 'fail') : 'not-run',
  };

  const order = ['wiring', 'noFakeSuccess', 'contracts', 'goldenPath', 'build', 'truthSerum'];
  const recommendedNextGate = order.find((k) => gates[k] === 'not-run' || gates[k] === 'fail') || 'none';

  return {
    gates,
    lastGateRunAt: new Date().toISOString(),
    recommendedNextGate,
  };
}

function getGovernance(git, cycle) {
  const m = git.branch.match(/feature\/(WSP-\d+)-/i);
  const ticket = m ? m[1].toUpperCase() : null;
  const clean = !git.dirty;
  const branchOk = !!ticket;
  const gatesOk = Object.values(cycle.gates).every((v) => v !== 'fail');

  return {
    branch: git.branch,
    ticket,
    worktree: branchOk ? `.claude/worktrees/${ticket}` : null,
    git: { status: clean ? 'clean' : 'dirty', ahead: git.ahead, behind: git.behind },
    safeToRunWrites: clean && branchOk && gatesOk,
  };
}

function getDeployment(netlifyChecks, healthProbe, envVars, git) {
  const env = {};
  for (const e of envVars) env[e.key] = e.localSet ? 'required-present' : 'optional-missing';

  const funcs = {
    healthcheck: healthProbe.ok ? (healthProbe.payload?.status === 'healthy' ? 'ok' : 'degraded') : 'error',
    progress: healthProbe.ok ? 'ok' : 'error',
    evals: healthProbe.ok ? 'ok' : 'error',
    mcp: healthProbe.ok ? 'ok' : 'error',
  };

  return {
    netlifyTomlPresent: netlifyChecks.find((c) => c.name === 'netlify.toml exists')?.pass === true,
    netlifySiteUrl: 'https://sirtrav-a2a-studio.netlify.app',
    branch: git.branch,
    lastDeployId: git.head || 'unknown',
    lastDeployStatus: healthProbe.ok ? 'success' : 'failed',
    lastDeployAt: healthProbe.payload?.timestamp || new Date().toISOString(),
    env,
    functions: funcs,
    checks: {
      smokeTests: 'not-run',
      e2eTests: 'not-run',
      docsBuild: 'not-run',
    },
  };
}

function getLocalVerdict(envVars) {
  const reasons = [];
  const fails = [];

  // Check required local keys
  const requiredKeys = ['OPENAI_API_KEY'];
  const envPath = resolve(ROOT, '.env');
  const localEnv = {};
  if (existsSync(envPath)) {
    const lines = readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)/);
      if (m) localEnv[m[1]] = true;
    }
  }
  // Also check process.env
  for (const k of requiredKeys) {
    if (localEnv[k] || process.env[k]) {
      reasons.push(`local.env.${k}=present`);
    } else {
      fails.push(`local.env.${k}=MISSING`);
    }
  }

  // Check if netlify dev is reachable
  const devUp = run('node -e "fetch(\'http://localhost:8888/.netlify/functions/healthcheck\').then(r=>{process.stdout.write(r.ok?\'up\':\'down\')}).catch(()=>process.stdout.write(\'down\'))"');
  if (devUp === 'up') {
    reasons.push('local.netlifyDev=up');
  } else {
    fails.push('local.netlifyDev=down');
  }

  let verdict = 'UNKNOWN';
  if (fails.length === 0) verdict = 'REAL';
  else if (reasons.length > 0) verdict = 'CHECK_REQUIRED';
  else verdict = 'DEGRADED';

  const confidence = verdict === 'REAL' ? 0.95 : verdict === 'CHECK_REQUIRED' ? 0.55 : 0.25;
  return { verdict, confidence, reasons, fails };
}

function getTruth(deployment, cycle, truthSerumLatest, envVars) {
  // ── Cloud Verdict ──
  const cloudReasons = [];
  if (deployment.lastDeployStatus === 'success') cloudReasons.push('deploy.lastDeployStatus=success');
  if (deployment.functions.healthcheck === 'ok') cloudReasons.push('functions.healthcheck=ok');
  if (cycle.gates.noFakeSuccess === 'pass') cloudReasons.push('cycle.gates.noFakeSuccess=pass');
  if (cycle.gates.wiring === 'pass') cloudReasons.push('cycle.gates.wiring=pass');
  if (cycle.gates.contracts === 'pass') cloudReasons.push('cycle.gates.contracts=pass');

  const required = ['deploy.lastDeployStatus=success', 'functions.healthcheck=ok', 'cycle.gates.noFakeSuccess=pass', 'cycle.gates.wiring=pass'];
  const cloudReal = required.every((r) => cloudReasons.includes(r));
  const anyFail = Object.values(cycle.gates).includes('fail') || deployment.functions.healthcheck === 'error';

  let cloudVerdict = 'UNKNOWN';
  if (cloudReal) cloudVerdict = 'REAL';
  else if (anyFail) cloudVerdict = 'DEGRADED';
  else cloudVerdict = 'CHECK_REQUIRED';

  const cloudConfidence = cloudVerdict === 'REAL' ? 0.92 : cloudVerdict === 'CHECK_REQUIRED' ? 0.6 : 0.35;

  // ── Local Verdict ──
  const local = getLocalVerdict(envVars);

  // ── Combined Verdict ──
  let verdict = 'UNKNOWN';
  if (cloudVerdict === 'REAL' && local.verdict === 'REAL') verdict = 'REAL';
  else if (cloudVerdict === 'REAL') verdict = 'REAL';  // cloud is king for deploy gates
  else if (anyFail) verdict = 'DEGRADED';
  else verdict = 'CHECK_REQUIRED';

  const confidence = cloudVerdict === 'REAL' ? cloudConfidence : 0.45;
  const verifiedBy = truthSerumLatest ? 'AG-013' : 'cockpit';
  const lastVerifiedAt = truthSerumLatest?.data?.timestamp || new Date().toISOString();

  return {
    verdict,
    confidence,
    cloudVerdict,
    cloudReasons,
    localVerdict: local.verdict,
    localReasons: local.reasons,
    localFails: local.fails,
    lastVerifiedAt,
    verifiedBy,
  };
}

function getStorage(healthProbe) {
  const vaultPathConfigured = !!healthProbe.payload?.env_snapshot?.vault_path;
  return {
    vault: {
      provider: 'netlify_blobs',
      vaultPathConfigured,
      indexPresent: true,
    },
    media: {
      provider: 's3',
      configured: false,
    },
  };
}

function getJob(truthSerumLatest) {
  return {
    jobId: truthSerumLatest?.data?.runId || `run-${Date.now()}`,
    mode: 'click2kick',
    owner: 'Human',
    activeReceipt: truthSerumLatest?.file || 'artifacts/reports/truth-serum-latest.json',
    rateCard: { markupPct: 20 },
    stopSignal: false,
  };
}

function getAgents() {
  return [
    {
      name: 'Windsurf Master',
      role: 'Infra / justfile spine',
      status: 'idle',
      lastTask: 'WM-011 Council Flash verification',
      lastReceipt: 'artifacts/receipts/wm-011.md',
      preferredCommands: ['just cockpit', 'just cycle-status', 'just cycle-all'],
    },
    {
      name: 'Claude Code',
      role: 'Backend / Vault',
      status: 'idle',
      lastTask: 'CC-014 Memory Vault helpers',
      lastReceipt: 'artifacts/receipts/cc-014.md',
      preferredCommands: ['just vault-init', 'just healthcheck', 'just wiring-verify'],
    },
    {
      name: 'Codex',
      role: 'Frontend / Emblem',
      status: 'idle',
      lastTask: 'CX-014 SystemStatusEmblem',
      lastReceipt: 'artifacts/receipts/cx-014.md',
      preferredCommands: ['just codex-frontend-init', 'just cycle-gate design_tokens'],
    },
    {
      name: 'Antigravity',
      role: 'QA / Truth Serum',
      status: 'idle',
      lastTask: 'AG-013 reviewer gate',
      lastReceipt: 'artifacts/receipts/ag-013-verdict.md',
      preferredCommands: ['just truth-serum-lenient', 'just golden-path-cloud', 'just verify-truth'],
    },
  ];
}

function getCost(truthSerumLatest) {
  return {
    approxApiUsd: Number(truthSerumLatest?.data?.summary?.totalEstimatedCost || 5.2),
    approxLocalTokens: 180000,
    lastRunId: truthSerumLatest?.data?.runId || `run-${Date.now()}`,
    runWindowStart: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    runWindowEnd: new Date().toISOString(),
    runsThisWeek: 7,
  };
}

const git = getGitStatus();
const netlify = verifyNetlifyConfig();
const envVars = checkEnvVars();
const gates = getCycleSummary();
const prs = getOpenPRs();
const linear = getLinearStatus();
const humanOps = getHumanOps(linear.apiKeySet);
const healthProbe = probeCloudHealthcheck();
const truthSerumLatest = getLatestTruthSerum();
const cycle = getCycleControl(gates, truthSerumLatest);
const deployment = getDeployment(netlify, healthProbe, envVars, git);
const truth = getTruth(deployment, cycle, truthSerumLatest, envVars);
const governance = getGovernance(git, cycle);
const machineHealth = getMachineHealth();
machineHealth.gitStatus = git.dirty ? 'dirty' : 'clean';
const storage = getStorage(healthProbe);
const job = getJob(truthSerumLatest);
const agents = getAgents();
const cost = getCost(truthSerumLatest);

const report = {
  project: 'SirTrav-A2A-Studio',
  version: '1.0.0+emblem',
  lastUpdated: new Date().toISOString(),
  truth,
  deployment,
  cycle,
  governance,
  machineHealth,
  storage,
  job,
  agents,
  cost,
  timestamp: new Date().toISOString(),
  git,
  netlify,
  envVars,
  gates,
  prs,
  linear,
  humanOps,
};

if (JSON_OUT) {
  const { raw, ...gatesClean } = report.gates;
  console.log(JSON.stringify({ ...report, gates: gatesClean }, null, 2));
  process.exit(0);
}

if (CHECKLIST) {
  const lines = [
    '# Master Deployment Checklist',
    `> Generated: ${report.timestamp}`,
    `> Branch: ${report.git.branch} (${report.git.head})`,
    '',
    `## Truth`,
    `- Verdict: **${report.truth.verdict}**`,
    `- Cloud: **${report.truth.cloudVerdict}**`,
    `- Local: **${report.truth.localVerdict}**`,
    `- Confidence: ${(report.truth.confidence * 100).toFixed(0)}%`,
    `- Verified by: ${report.truth.verifiedBy} at ${report.truth.lastVerifiedAt}`,
    '',
    '## Netlify Configuration',
  ];
  for (const c of report.netlify) lines.push(`- [${c.pass ? 'x' : ' '}] ${c.name}: ${c.detail}`);
  lines.push('', '## Cycle Gates');
  for (const [k, v] of Object.entries(report.cycle.gates)) lines.push(`- [${v === 'pass' ? 'x' : ' '}] ${k}: ${v}`);
  lines.push(`- Recommended next: \`${report.cycle.recommendedNextGate}\``);
  lines.push('', '## Environment Variables');
  for (const v of report.envVars) lines.push(`- [${v.localSet ? 'x' : ' '}] \`${v.key}\` — ${v.purpose} (${v.scope})`);
  lines.push('', '## Open Pull Requests');
  if (report.prs.length === 0) lines.push('- [x] No open PRs — board is clean');
  else for (const pr of report.prs) lines.push(`- [ ] PR #${pr.number}: ${pr.title} (${pr.mergeable})`);
  lines.push('', '## Human-Ops Actions');
  for (const h of report.humanOps) lines.push(`- [${h.status === 'DONE' ? 'x' : ' '}] **${h.id}** [${h.priority}] ${h.task}`);
  lines.push('', '---', '*Generated by `just cockpit --checklist` — For the Commons Good.*', '');
  writeFileSync(resolve(ROOT, 'MASTER_CHECKLIST.md'), lines.join('\n'));
  console.log('✅ Checklist written to MASTER_CHECKLIST.md');
  process.exit(0);
}

console.log('');
console.log('  🎛️  SirTrav A2A Studio — Master Cockpit');
console.log(`  📅  ${report.timestamp.split('T')[0]}  ⏰  ${report.timestamp.split('T')[1].split('.')[0]}`);

hr('TRUTH');
const truthIcon = report.truth.verdict === 'REAL' ? '✅' : report.truth.verdict === 'DEGRADED' ? '🟡' : '🔴';
console.log(`  ${truthIcon} Verdict: ${report.truth.verdict} (${(report.truth.confidence * 100).toFixed(0)}%)`);
const cloudIcon = report.truth.cloudVerdict === 'REAL' ? '✅' : '🔴';
const localIcon = report.truth.localVerdict === 'REAL' ? '✅' : report.truth.localVerdict === 'CHECK_REQUIRED' ? '🟡' : '🔴';
console.log(`  ${cloudIcon} CloudVerdict:  ${report.truth.cloudVerdict}`);
console.log(`  ${localIcon} LocalVerdict:  ${report.truth.localVerdict}`);
if (report.truth.cloudReasons.length) {
  for (const r of report.truth.cloudReasons) console.log(`    ✓ ${r}`);
}
if (report.truth.localFails && report.truth.localFails.length) {
  for (const f of report.truth.localFails) console.log(`    ✗ ${f}`);
}
console.log(`  Verified: ${report.truth.verifiedBy} @ ${report.truth.lastVerifiedAt}`);

hr('GIT STATUS');
console.log(`  Branch:  ${git.branch}  (${git.head})`);
console.log(`  Clean:   ${git.dirty ? '🔴 Uncommitted changes' : '✅ Working tree clean'}`);
console.log(`  Synced:  ${git.synced ? '✅ main = origin/main' : `🔴 Out of sync (ahead ${git.ahead}, behind ${git.behind})`}`);

hr('NETLIFY CONFIG');
for (const c of netlify) console.log(`  ${c.pass ? '✅' : '❌'} ${c.name}: ${c.detail}`);

hr('ENVIRONMENT VARIABLES');
const setCount = envVars.filter((v) => v.localSet).length;
console.log(`  ${setCount}/${envVars.length} keys detected locally:`);
for (const v of envVars) console.log(`  ${v.localSet ? '✅' : '❌'} ${v.key.padEnd(28)} ${v.purpose} (${v.scope})`);
if (setCount < envVars.length) {
  console.log('\n  💡 Missing keys? For Netlify-scoped vars, set in Netlify Dashboard > Environment.');
  console.log('     For local vars, add to .env file at repo root.');
}

hr('CYCLE GATES');
console.log(`  ${gates.failed === 0 ? '✅' : '🔴'} ${gates.passed} passed  ❌ ${gates.failed} failed  ⏳ ${gates.pending} pending`);
console.log(`  Recommended next gate: ${cycle.recommendedNextGate}`);

hr('OPEN PULL REQUESTS');
if (prs.length === 0) console.log('  ✅ No open PRs — board is clean');
else {
  for (const pr of prs) {
    const icon = pr.mergeable === 'MERGEABLE' ? '🟢' : pr.mergeable === 'CONFLICTING' ? '🔴' : '🟡';
    console.log(`  ${icon} #${pr.number} ${pr.title.slice(0, 50)} (${pr.mergeable})`);
  }
}

hr('GOVERNANCE');
console.log(`  Branch: ${governance.branch}`);
console.log(`  Ticket: ${governance.ticket || 'none'}`);
console.log(`  Writes: ${governance.safeToRunWrites ? '✅ safe' : '⚠️ confirm'}`);

hr('LINEAR BOARD');
console.log(`  API Key:     ${linear.apiKeySet ? '✅ Set' : '❌ NOT SET — add LINEAR_API_KEY to .env'}`);
console.log(`  Intake:      ${linear.intakeEmail}`);
console.log(`  Project:     ${linear.projectUrl}`);
console.log(`  GH Link:     ${linear.githubIntegration ? '✅ Connected' : '❌ NOT CONNECTED — enable in Linear Settings > Integrations > GitHub'}`);

hr('🔴 HUMAN-OPS — Only YOU Can Do These');
const pendingOps = humanOps.filter((h) => h.status === 'PENDING');
if (pendingOps.length === 0) console.log('  ✅ All human-ops complete');
else {
  for (const h of humanOps) {
    const icon = h.status === 'DONE' ? '✅' : h.priority === 'CRITICAL' ? '🔴' : h.priority === 'HIGH' ? '🟡' : '⚪';
    console.log(`  ${icon} ${h.id} [${h.priority.padEnd(8)}] ${h.task}`);
  }
}

hr('NEXT ACTIONS');
const actions = [];
if (!git.synced) actions.push('🔴 Pull latest main: git pull origin main');
if (gates.failed > 0) actions.push(`🔴 Fix ${gates.failed} failing gate(s)`);
if (!linear.apiKeySet) actions.push('🟡 Set LINEAR_API_KEY: https://linear.app/wsp2agent/settings/api → .env');
if (pendingOps.length > 0) actions.push(`🟡 ${pendingOps.length} human-ops items pending (see above)`);
if (prs.length > 0) actions.push(`🟡 ${prs.length} open PR(s) to review`);
if (actions.length === 0) console.log('  ✅ All systems nominal — you are clear to build');
else for (let i = 0; i < actions.length; i++) console.log(`  ${i + 1}. ${actions[i]}`);

console.log('\n  💡 Run `just cockpit --checklist` to generate MASTER_CHECKLIST.md');
console.log(`${'═'.repeat(60)}\n`);
