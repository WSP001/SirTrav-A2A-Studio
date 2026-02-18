#!/usr/bin/env node
/**
 * weekly-analyze.mjs — CC-012 Weekly Pulse Analysis
 * Reads a harvest JSON and produces a human-readable pulse report.
 *
 * Usage:
 *   node scripts/weekly-analyze.mjs                                  # Auto-find latest harvest
 *   node scripts/weekly-analyze.mjs artifacts/data/weekly-harvest-2026-02-17.json
 *   node scripts/weekly-analyze.mjs --format md                      # Markdown output
 *   node scripts/weekly-analyze.mjs --format json                    # JSON summary
 *
 * Output: artifacts/data/weekly-pulse-YYYY-MM-DD.md (or .json)
 */

import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'artifacts', 'data');

const args = process.argv.slice(2);
let harvestPath = null;
let format = 'md';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--format' && args[i + 1]) format = args[++i];
  else if (!args[i].startsWith('--') && !harvestPath) harvestPath = args[i];
}

// Auto-find latest harvest
if (!harvestPath) {
  if (!existsSync(DATA_DIR)) {
    console.error('No artifacts/data/ directory. Run harvest-week.mjs first.');
    process.exit(1);
  }
  const harvests = readdirSync(DATA_DIR)
    .filter(f => f.startsWith('weekly-harvest-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (harvests.length === 0) {
    console.error('No weekly-harvest-*.json found. Run: node scripts/harvest-week.mjs');
    process.exit(1);
  }
  harvestPath = join(DATA_DIR, harvests[0]);
}

if (!existsSync(harvestPath)) {
  console.error(`Harvest file not found: ${harvestPath}`);
  process.exit(1);
}

const harvest = JSON.parse(readFileSync(harvestPath, 'utf8'));
const today = new Date().toISOString().split('T')[0];

console.log(`=== Weekly Pulse Analysis ===`);
console.log(`  Harvest: ${harvestPath}`);
console.log(`  Period: ${harvest.meta.period.since} to ${harvest.meta.period.until}\n`);

// ─── Analysis ───────────────────────────────────────────────────────

function analyzeVelocity(commits) {
  if (commits.length === 0) return { rating: 'idle', detail: 'No commits this period' };
  if (commits.length >= 10) return { rating: 'high', detail: `${commits.length} commits — strong velocity` };
  if (commits.length >= 5) return { rating: 'medium', detail: `${commits.length} commits — steady progress` };
  return { rating: 'low', detail: `${commits.length} commits — slow week` };
}

function analyzeTaskHealth(tasks) {
  const done = tasks.filter(t => t.status === 'DONE').length;
  const ready = tasks.filter(t => t.status === 'READY').length;
  const blocked = tasks.filter(t => t.status === 'BLOCKED').length;
  const total = tasks.length;

  if (blocked > 0) return { rating: 'blocked', detail: `${blocked} tasks blocked, ${done}/${total} done` };
  if (done === total) return { rating: 'complete', detail: `All ${total} tasks done` };
  if (done / total >= 0.7) return { rating: 'healthy', detail: `${done}/${total} done, ${ready} ready` };
  return { rating: 'behind', detail: `${done}/${total} done, ${ready} ready` };
}

function analyzeQuality(publishers) {
  const nfsCount = publishers.filter(p => p.hasNoFakeSuccess).length;
  const total = publishers.filter(p => p.exists).length;

  if (nfsCount === total) return { rating: 'excellent', detail: `${nfsCount}/${total} publishers enforce No Fake Success` };
  if (nfsCount >= 3) return { rating: 'good', detail: `${nfsCount}/${total} NFS compliant` };
  return { rating: 'needs-work', detail: `Only ${nfsCount}/${total} NFS compliant` };
}

function analyzeAgentContribution(commitsByAgent) {
  const entries = Object.entries(commitsByAgent).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return { topAgent: 'none', distribution: 'no activity' };

  return {
    topAgent: entries[0][0],
    distribution: entries.map(([agent, count]) => `${agent}: ${count}`).join(', '),
  };
}

const velocity = analyzeVelocity(harvest.commits);
const taskHealth = analyzeTaskHealth(harvest.tasks);
const quality = analyzeQuality(harvest.publishers);
const agents = analyzeAgentContribution(harvest.summary.commitsByAgent || {});

const pulse = {
  meta: {
    analyzedAt: new Date().toISOString(),
    harvestFile: harvestPath,
    period: harvest.meta.period,
  },
  velocity,
  taskHealth,
  quality,
  agents,
  recommendations: [],
};

// Generate recommendations
if (velocity.rating === 'idle') pulse.recommendations.push('No commits — check if agents are blocked');
if (taskHealth.rating === 'blocked') pulse.recommendations.push('Unblock tasks — check AGENT_ASSIGNMENTS.md for blockers');
if (quality.rating === 'needs-work') pulse.recommendations.push('Run No Fake Success audit: just no-fake-success-check');
if (!harvest.cycleGates) pulse.recommendations.push('Run cycle gates: just cycle-all');

// ─── Output ─────────────────────────────────────────────────────────

if (format === 'json') {
  const outPath = join(DATA_DIR, `weekly-pulse-${today}.json`);
  if (!existsSync(dirname(outPath))) mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(pulse, null, 2));
  console.log(`  Output: ${outPath}`);
} else {
  // Markdown report
  const md = `# Weekly Pulse Report — ${harvest.meta.period.since} to ${harvest.meta.period.until}

> Generated: ${pulse.meta.analyzedAt}

## Velocity: ${velocity.rating.toUpperCase()}
${velocity.detail}

## Task Health: ${taskHealth.rating.toUpperCase()}
${taskHealth.detail}

| Task | Status | Assigned To | Priority |
|------|--------|-------------|----------|
${harvest.tasks.map(t => `| ${t.file} | ${t.status} | ${t.assignedTo} | ${t.priority} |`).join('\n')}

## Quality: ${quality.rating.toUpperCase()}
${quality.detail}

## Agent Contributions
Top agent: **${agents.topAgent}**
Distribution: ${agents.distribution}

| Commit | Agent | Subject |
|--------|-------|---------|
${harvest.commits.slice(0, 15).map(c => `| ${c.hash} | ${c.agent} | ${c.subject} |`).join('\n')}

## Recommendations
${pulse.recommendations.length > 0 ? pulse.recommendations.map(r => `- ${r}`).join('\n') : '- All systems nominal'}

---
*For The Commons Good*
`;

  const outPath = join(DATA_DIR, `weekly-pulse-${today}.md`);
  if (!existsSync(dirname(outPath))) mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, md);
  console.log(`  Output: ${outPath}`);
}

// Print summary
console.log(`\n  Velocity:    ${velocity.rating} — ${velocity.detail}`);
console.log(`  Tasks:       ${taskHealth.rating} — ${taskHealth.detail}`);
console.log(`  Quality:     ${quality.rating} — ${quality.detail}`);
console.log(`  Top Agent:   ${agents.topAgent} (${agents.distribution})`);
if (pulse.recommendations.length > 0) {
  console.log(`  Actions:     ${pulse.recommendations.join('; ')}`);
}
