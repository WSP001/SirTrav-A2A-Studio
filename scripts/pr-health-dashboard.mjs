#!/usr/bin/env node
// File: scripts/pr-health-dashboard.mjs
// Purpose: Single-command PR + branch + worktree health dashboard
// Author: Claude Code (tender-elion) — closing the "no visibility" gap
//
// Usage:
//   node scripts/pr-health-dashboard.mjs           # Full dashboard
//   node scripts/pr-health-dashboard.mjs --json    # Machine-readable output
//   just team-health                                # via justfile

import { execSync } from 'child_process';

const JSON_OUT = process.argv.includes('--json');

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', timeout: 15000 }).trim();
  } catch {
    return '';
  }
}

function section(title) {
  if (!JSON_OUT) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  ${title}`);
    console.log(`${'═'.repeat(60)}`);
  }
}

// ── 1. Main repo state ──
function getMainState() {
  const branch = run('git branch --show-current');
  const head = run('git rev-parse --short HEAD');
  const originMain = run('git rev-parse --short origin/main');
  const synced = run('git rev-parse main') === run('git rev-parse origin/main');
  return { branch, head, originMain, synced };
}

// ── 2. Open PRs via gh CLI ──
function getOpenPRs() {
  const raw = run('gh pr list --state open --json number,title,headRefName,createdAt,updatedAt,mergeable --limit 20');
  if (!raw) return [];
  try {
    return JSON.parse(raw).map(pr => {
      const age = Math.floor((Date.now() - new Date(pr.createdAt).getTime()) / 86400000);
      const stale = age > 14;
      return {
        number: pr.number,
        title: pr.title.slice(0, 60),
        branch: pr.headRefName,
        mergeable: pr.mergeable,
        ageDays: age,
        stale,
        risk: pr.mergeable === 'CONFLICTING' ? 'CONFLICT' : stale ? 'STALE' : 'OK',
      };
    });
  } catch {
    return [];
  }
}

// ── 3. Worktrees ──
function getWorktrees() {
  const raw = run('git worktree list --porcelain');
  if (!raw) return [];
  const trees = [];
  let current = {};
  for (const line of raw.split('\n')) {
    if (line.startsWith('worktree ')) {
      if (current.path) trees.push(current);
      current = { path: line.replace('worktree ', '') };
    } else if (line.startsWith('HEAD ')) {
      current.head = line.replace('HEAD ', '').slice(0, 8);
    } else if (line.startsWith('branch ')) {
      current.branch = line.replace('branch refs/heads/', '');
    } else if (line === 'detached') {
      current.branch = '(detached)';
    }
  }
  if (current.path) trees.push(current);
  return trees;
}

// ── 4. Branch divergence ──
function getDivergence(branch) {
  const ahead = run(`git rev-list --count origin/main..${branch} 2>/dev/null`);
  const behind = run(`git rev-list --count ${branch}..origin/main 2>/dev/null`);
  return { ahead: parseInt(ahead) || 0, behind: parseInt(behind) || 0 };
}

// ── 5. npm audit summary ──
function getAuditSummary() {
  const raw = run('npm audit --json 2>/dev/null');
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    const meta = data.metadata?.vulnerabilities || {};
    return {
      total: meta.total || 0,
      critical: meta.critical || 0,
      high: meta.high || 0,
      moderate: meta.moderate || 0,
      low: meta.low || 0,
    };
  } catch {
    return null;
  }
}

// ── Collect everything ──
const report = {
  timestamp: new Date().toISOString(),
  main: getMainState(),
  prs: getOpenPRs(),
  worktrees: getWorktrees(),
  audit: getAuditSummary(),
};

// Add divergence to each PR
for (const pr of report.prs) {
  const div = getDivergence(`origin/${pr.branch}`);
  pr.ahead = div.ahead;
  pr.behind = div.behind;
}

// ── Output ──
if (JSON_OUT) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

// Human-readable dashboard
console.log('');
console.log('  🏥  SirTrav A2A Studio — Team Health Dashboard');
console.log(`  📅  ${report.timestamp.split('T')[0]}  ⏰  ${report.timestamp.split('T')[1].split('.')[0]}`);

// Main repo
section('MAIN REPO');
const m = report.main;
const mainIcon = m.synced ? '✅' : '🔴';
console.log(`  Branch:  ${m.branch}  (HEAD: ${m.head})`);
console.log(`  Origin:  ${m.originMain}`);
console.log(`  Synced:  ${mainIcon} ${m.synced ? 'Yes — main tracks origin/main' : 'NO — run: git pull origin main'}`);

// Open PRs
section('OPEN PULL REQUESTS');
if (report.prs.length === 0) {
  console.log('  No open PRs');
} else {
  console.log('  #    | Age  | Merge     | +Ahead/-Behind | Branch');
  console.log('  -----+------+-----------+----------------+' + '-'.repeat(40));
  for (const pr of report.prs) {
    const icon = pr.risk === 'CONFLICT' ? '🔴' : pr.risk === 'STALE' ? '🟡' : '🟢';
    const mergeLabel = pr.mergeable === 'MERGEABLE' ? 'MERGEABLE' : pr.mergeable === 'CONFLICTING' ? 'CONFLICT ' : pr.mergeable || 'UNKNOWN  ';
    console.log(`  ${icon} #${String(pr.number).padEnd(2)} | ${String(pr.ageDays).padStart(2)}d  | ${mergeLabel} | +${pr.ahead}/-${pr.behind}${' '.repeat(Math.max(0, 13 - String(pr.ahead).length - String(pr.behind).length))}| ${pr.branch}`);
  }
}

// Worktrees
section('WORKTREES');
console.log(`  ${report.worktrees.length} worktrees active:`);
for (const wt of report.worktrees) {
  const shortPath = wt.path.split(/[/\\]/).slice(-2).join('/');
  console.log(`    ${wt.head || '????????'}  ${(wt.branch || '(unknown)').padEnd(35)} ${shortPath}`);
}

// Security
section('SECURITY (npm audit)');
if (report.audit) {
  const a = report.audit;
  const icon = a.critical > 0 ? '🔴' : a.high > 0 ? '🟡' : '🟢';
  console.log(`  ${icon}  ${a.total} vulnerabilities: ${a.critical} critical, ${a.high} high, ${a.moderate} moderate, ${a.low} low`);
  if (a.critical > 0) console.log('  ⚠️  CRITICAL vulnerabilities need SEC-001 ticket!');
} else {
  console.log('  ⚠️  Could not run npm audit');
}

// Recommendations
section('RECOMMENDED ACTIONS');
const actions = [];

if (!report.main.synced) {
  actions.push('🔴 Main is out of sync — run: git checkout main && git pull origin main');
}

for (const pr of report.prs) {
  if (pr.mergeable === 'MERGEABLE' && pr.behind === 0) {
    actions.push(`🟢 PR #${pr.number} is MERGEABLE and clean — ready to merge now`);
  }
  if (pr.mergeable === 'CONFLICTING') {
    actions.push(`🔴 PR #${pr.number} has CONFLICTS (+${pr.ahead}/-${pr.behind}) — needs rebase`);
  }
  if (pr.stale && pr.mergeable !== 'CONFLICTING') {
    actions.push(`🟡 PR #${pr.number} is ${pr.ageDays} days old — review or close`);
  }
}

if (report.worktrees.length > 5) {
  actions.push(`🟡 ${report.worktrees.length} worktrees active — consider cleaning stale ones`);
}

if (report.audit?.critical > 0) {
  actions.push(`🔴 ${report.audit.critical} critical vulnerability — create SEC ticket`);
}

if (actions.length === 0) {
  console.log('  ✅ All clear — no immediate actions needed');
} else {
  for (let i = 0; i < actions.length; i++) {
    console.log(`  ${i + 1}. ${actions[i]}`);
  }
}

console.log(`\n${'═'.repeat(60)}\n`);
