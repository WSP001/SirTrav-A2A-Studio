#!/usr/bin/env node
/**
 * Workspace Audit — compare all known copies against canonical WSP001
 * Read-only, non-destructive. Reports drift, uncommitted changes, stashes.
 * See: docs/MASTER_AUDIT_PRESERVATION_PLAN.md
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

const canonical = 'C:\\WSP001\\SirTrav-A2A-Studio';
const copies = [
  { path: 'C:\\Users\\Roberto002\\Documents\\GitHub\\SirTrav-A2A-Studio', label: 'GitHub Archive' },
  { path: 'C:\\Users\\Roberto002\\OneDrive\\Sir James\\SirTrav-A2A-Studio', label: 'OneDrive Archive' },
];

function git(cwd, args) {
  try {
    return execSync(`git -C "${cwd}" ${args}`, { encoding: 'utf8', timeout: 10000 }).trim();
  } catch {
    return null;
  }
}

console.log('🔍 Workspace Audit — comparing copies against canonical WSP001');
console.log('━'.repeat(62));

// Canonical
console.log(`\n📍 Canonical: ${canonical}`);
if (!existsSync(canonical)) {
  console.log('  ❌ CANONICAL NOT FOUND — critical problem');
  process.exit(1);
}

const canonHash = git(canonical, 'rev-parse --short HEAD');
if (!canonHash) {
  console.log('  ❌ Cannot read git repo');
  process.exit(1);
}
console.log(`  Commit: ${canonHash}`);

const canonDirty = git(canonical, 'status --short');
console.log(`  Status: ${canonDirty ? '⚠️  Dirty' : '✅ Clean'}`);
if (canonDirty) {
  canonDirty.split('\n').slice(0, 5).forEach(l => console.log(`    ${l}`));
}

const claudeMd = existsSync(path.join(canonical, 'CLAUDE.md'));
console.log(`  CLAUDE.md: ${claudeMd ? '✅ Present' : '❌ MISSING'}`);

const masterMd = existsSync(path.join(canonical, 'MASTER.md'));
console.log(`  MASTER.md: ${masterMd ? '✅ Present' : '❌ MISSING'}`);

// Copies
let issues = 0;
for (const copy of copies) {
  console.log(`\n📂 ${copy.label}: ${copy.path}`);

  if (!existsSync(copy.path)) {
    console.log('  ⚪ NOT FOUND on disk');
    continue;
  }

  const copyHash = git(copy.path, 'rev-parse --short HEAD');
  if (!copyHash) {
    console.log('  ⚠️  Not a git repo or corrupted');
    issues++;
    continue;
  }

  const inSync = copyHash === canonHash;
  console.log(`  Commit: ${copyHash} ${inSync ? '✅ In sync' : `🟡 BEHIND (${copyHash} vs ${canonHash})`}`);
  if (!inSync) issues++;

  const copyDirty = git(copy.path, 'status --short');
  if (copyDirty) {
    const lines = copyDirty.split('\n');
    console.log(`  ⚠️  Uncommitted changes: ${lines.length} files`);
    lines.slice(0, 5).forEach(l => console.log(`    ${l}`));
    if (lines.length > 5) console.log(`    ... and ${lines.length - 5} more`);
    issues++;
  } else {
    console.log('  Status: ✅ Clean');
  }

  const stashes = git(copy.path, 'stash list');
  if (stashes) {
    const count = stashes.split('\n').length;
    console.log(`  📦 Stash entries: ${count} (may contain unique work)`);
    issues++;
  }

  // Check for local branches not on remote
  const localOnly = git(copy.path, 'branch --format="%(refname:short)" --no-merged origin/main');
  if (localOnly) {
    const branches = localOnly.split('\n').filter(b => b.trim());
    if (branches.length) {
      console.log(`  🌿 Local-only branches: ${branches.length}`);
      branches.slice(0, 3).forEach(b => console.log(`    ${b}`));
      issues++;
    }
  }
}

// Summary
console.log('\n' + '━'.repeat(62));
if (issues === 0) {
  console.log('✅ All workspace copies are in sync or absent. Safe to proceed.');
} else {
  console.log(`⚠️  ${issues} issue(s) found. Review before any cleanup.`);
  console.log('   Run: just path-fix-archive to preserve unique content first.');
}
console.log('📋 Plan: docs/MASTER_AUDIT_PRESERVATION_PLAN.md');
console.log('━'.repeat(62));
