#!/usr/bin/env node
/**
 * harvest-week.mjs — CC-011 Weekly Harvest Script
 * Collects agent activity, test results, and metrics from the past 7 days.
 *
 * Usage:
 *   node scripts/harvest-week.mjs                  # Harvest last 7 days
 *   node scripts/harvest-week.mjs --since 2026-02-10
 *   node scripts/harvest-week.mjs --output artifacts/data/weekly-harvest.json
 *
 * Output: artifacts/data/weekly-harvest-YYYY-MM-DD.json
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const args = process.argv.slice(2);
let sinceDate = null;
let outputPath = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--since' && args[i + 1]) sinceDate = args[++i];
  if (args[i] === '--output' && args[i + 1]) outputPath = args[++i];
}

// Default: 7 days ago
if (!sinceDate) {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  sinceDate = d.toISOString().split('T')[0];
}

const today = new Date().toISOString().split('T')[0];
if (!outputPath) {
  outputPath = join(ROOT, 'artifacts', 'data', `weekly-harvest-${today}.json`);
}

console.log(`=== Weekly Harvest: ${sinceDate} to ${today} ===\n`);

// ─── 1. Git Commit History ──────────────────────────────────────────
function harvestGitCommits() {
  try {
    const raw = execSync(
      `git log --since="${sinceDate}" --format="%H|%an|%ai|%s" --no-merges`,
      { cwd: ROOT, encoding: 'utf8' }
    ).trim();

    if (!raw) return [];

    return raw.split('\n').map(line => {
      const [hash, author, date, ...msgParts] = line.split('|');
      const subject = msgParts.join('|');
      // Detect agent from commit message
      let agent = 'unknown';
      if (subject.includes('claude-code') || subject.includes('CC-')) agent = 'claude-code';
      else if (subject.includes('windsurf') || subject.includes('WM-')) agent = 'windsurf';
      else if (subject.includes('antigravity') || subject.includes('AG-')) agent = 'antigravity';
      else if (subject.includes('codex') || subject.includes('CX-')) agent = 'codex';
      else if (subject.includes('feat:') || subject.includes('fix:')) agent = 'team';

      return { hash: hash.substring(0, 8), author, date, subject, agent };
    });
  } catch {
    return [];
  }
}

// ─── 2. Task Ticket Status ──────────────────────────────────────────
function harvestTasks() {
  const tasksDir = join(ROOT, 'tasks');
  if (!existsSync(tasksDir)) return [];

  return readdirSync(tasksDir)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const content = readFileSync(join(tasksDir, f), 'utf8');
      const statusMatch = content.match(/## Status:\s*(\S+)/);
      const assignedMatch = content.match(/## Assigned To:\s*(.+)/);
      const priorityMatch = content.match(/## Priority:\s*(\S+)/);
      return {
        file: f,
        status: statusMatch?.[1] || 'unknown',
        assignedTo: assignedMatch?.[1]?.trim() || 'unassigned',
        priority: priorityMatch?.[1] || 'unknown',
      };
    });
}

// ─── 3. Test Results (from artifacts/public/metrics/) ───────────────
function harvestTestResults() {
  const metricsDir = join(ROOT, 'artifacts', 'public', 'metrics');
  if (!existsSync(metricsDir)) return [];

  return readdirSync(metricsDir)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      try {
        const data = JSON.parse(readFileSync(join(metricsDir, f), 'utf8'));
        return {
          file: f,
          passed: data.passed || data.steps?.filter(s => s.status === 'pass').length || 0,
          failed: data.failed || data.steps?.filter(s => s.status === 'fail').length || 0,
          timestamp: data.timestamp || data.startedAt || 'unknown',
        };
      } catch {
        return { file: f, error: 'parse_failed' };
      }
    });
}

// ─── 4. Cycle Gate Snapshot ─────────────────────────────────────────
function harvestCycleGates() {
  const stateFile = join(ROOT, 'agent-state.json');
  if (!existsSync(stateFile)) return null;

  try {
    const state = JSON.parse(readFileSync(stateFile, 'utf8'));
    return state.gates || state;
  } catch {
    return null;
  }
}

// ─── 5. Publisher Status ────────────────────────────────────────────
function harvestPublisherStatus() {
  const publishers = ['publish-x', 'publish-youtube', 'publish-linkedin', 'publish-instagram', 'publish-tiktok'];
  return publishers.map(name => {
    const path = join(ROOT, 'netlify', 'functions', `${name}.ts`);
    if (!existsSync(path)) return { name, exists: false };

    const content = readFileSync(path, 'utf8');
    return {
      name,
      exists: true,
      hasDisabledPattern: content.includes('disabled: true'),
      hasNoFakeSuccess: content.includes('success: false') && content.includes('disabled: true'),
      hasValidation: content.includes('validate') || content.includes('Payload'),
    };
  });
}

// ─── Assemble ───────────────────────────────────────────────────────
const harvest = {
  meta: {
    harvestedAt: new Date().toISOString(),
    period: { since: sinceDate, until: today },
    version: '1.0.0',
  },
  commits: harvestGitCommits(),
  tasks: harvestTasks(),
  testResults: harvestTestResults(),
  cycleGates: harvestCycleGates(),
  publishers: harvestPublisherStatus(),
  summary: {},
};

// Compute summary
const commitsByAgent = {};
for (const c of harvest.commits) {
  commitsByAgent[c.agent] = (commitsByAgent[c.agent] || 0) + 1;
}

const tasksByStatus = {};
for (const t of harvest.tasks) {
  tasksByStatus[t.status] = (tasksByStatus[t.status] || 0) + 1;
}

harvest.summary = {
  totalCommits: harvest.commits.length,
  commitsByAgent,
  totalTasks: harvest.tasks.length,
  tasksByStatus,
  testSuites: harvest.testResults.length,
  publishersWithNFS: harvest.publishers.filter(p => p.hasNoFakeSuccess).length,
};

// Write output
const outDir = dirname(outputPath);
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
writeFileSync(outputPath, JSON.stringify(harvest, null, 2));

// Print summary
console.log(`  Commits:     ${harvest.summary.totalCommits} (${Object.entries(commitsByAgent).map(([k, v]) => `${k}: ${v}`).join(', ')})`);
console.log(`  Tasks:       ${harvest.summary.totalTasks} (${Object.entries(tasksByStatus).map(([k, v]) => `${k}: ${v}`).join(', ')})`);
console.log(`  Test Suites: ${harvest.summary.testSuites}`);
console.log(`  NFS Pubs:    ${harvest.summary.publishersWithNFS}/5`);
console.log(`\n  Output: ${outputPath}`);
