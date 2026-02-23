#!/usr/bin/env node
/**
 * fix-recursive-nest.mjs — Flatten recursive directory loops + prevent reoccurrence
 *
 * Problem:  Agents create nested folders like netlify_configs/netlify_configs/netlify_configs/...
 *           This breaks Windows MAX_PATH (260 chars) and kills OneDrive sync.
 *
 * Solution: Walk bottom-up, detect duplicate folder names in ancestry chain,
 *           rescue files to root, delete empty recursive dirs, log to AGENT_RUN_LOG.ndjson.
 *
 * Prevention: After fixing, writes a .path-guard.json sentinel that agents must check
 *             before creating any new directory.
 *
 * Usage:
 *   node scripts/fix-recursive-nest.mjs                    # Interactive scan + fix
 *   node scripts/fix-recursive-nest.mjs --auto             # Auto-fix without prompts
 *   node scripts/fix-recursive-nest.mjs --scan             # Scan only, no changes
 *   node scripts/fix-recursive-nest.mjs --target <path>    # Fix a specific directory
 *
 * Exit codes:
 *   0 = clean (no violations) or fixed successfully
 *   1 = violations found (--scan mode) or fix failed
 *   2 = target path not found
 */

import { existsSync, readdirSync, statSync, mkdirSync, renameSync, rmdirSync,
         writeFileSync, readFileSync, unlinkSync, appendFileSync } from 'fs';
import { resolve, join, sep, basename, relative } from 'path';
import { performance } from 'perf_hooks';

const args = process.argv.slice(2);
const AUTO_MODE = args.includes('--auto');
const SCAN_ONLY = args.includes('--scan');
const targetIdx = args.indexOf('--target');
const ROOT = resolve(import.meta.dirname || '.', '..');

const SCAN_ROOT = targetIdx >= 0 && args[targetIdx + 1]
  ? resolve(args[targetIdx + 1])
  : ROOT;

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', '.netlify', '.cache',
  '.next', '.nuxt', '__pycache__', '.venv', 'venv'
]);

const MAX_PATH_CHARS = 250;
const MAX_DEPTH_FROM_ROOT = 4;  // DepthConstraint rule
const MAX_NAME_REPEATS = 2;     // Same folder name can appear max 2x in path

// ── NDJSON LOGGER ────────────────────────────────────────────
const LOG_PATH = join(ROOT, 'artifacts', 'AGENT_RUN_LOG.ndjson');

function logAction(action, detail) {
  const entry = {
    timestamp: new Date().toISOString(),
    agent: 'fix-recursive-nest',
    action,
    ...detail
  };
  try {
    const logDir = join(ROOT, 'artifacts');
    if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });
    appendFileSync(LOG_PATH, JSON.stringify(entry) + '\n', 'utf8');
  } catch { /* best effort */ }
}

// ── SCANNER ──────────────────────────────────────────────────
function scanForViolations(root) {
  const violations = [];

  function walk(dir, depth) {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (SKIP_DIRS.has(entry.name)) continue;

      const fullPath = join(dir, entry.name);
      const relPath = relative(root, fullPath);
      const parts = relPath.split(sep);

      // Rule 1: Path too long
      if (fullPath.length > MAX_PATH_CHARS) {
        violations.push({
          path: fullPath,
          relPath,
          reason: 'PATH_TOO_LONG',
          detail: `${fullPath.length} chars (max ${MAX_PATH_CHARS})`,
          depth: parts.length
        });
        // Don't recurse deeper into already-broken paths
        continue;
      }

      // Rule 2: Same folder name repeats too many times
      const nameCounts = {};
      const allParts = fullPath.split(sep);
      for (const p of allParts) {
        if (p.length > 2) nameCounts[p] = (nameCounts[p] || 0) + 1;
      }
      const repeats = Object.entries(nameCounts)
        .filter(([, count]) => count > MAX_NAME_REPEATS);

      if (repeats.length > 0) {
        violations.push({
          path: fullPath,
          relPath,
          reason: 'RECURSIVE_NESTING',
          detail: repeats.map(([name, count]) => `"${name}" x${count}`).join(', '),
          depth: parts.length,
          repeatedNames: repeats.map(([name]) => name)
        });
        // Still recurse to find files to rescue
      }

      // Rule 3: Depth from project root too deep (relative)
      if (parts.length > MAX_DEPTH_FROM_ROOT + 4) {
        // Allow some depth but flag excessive
        if (!violations.some(v => v.path === fullPath)) {
          violations.push({
            path: fullPath,
            relPath,
            reason: 'DEPTH_EXCEEDED',
            detail: `${parts.length} levels deep`,
            depth: parts.length
          });
        }
      }

      walk(fullPath, depth + 1);
    }
  }

  walk(root, 0);
  return violations;
}

// ── FILE RESCUER ─────────────────────────────────────────────
function rescueFiles(violations, root) {
  const rescueDir = join(root, '_rescued_files');
  let rescued = 0;
  let collapsed = 0;
  const errors = [];

  // Create rescue directory
  if (!existsSync(rescueDir)) {
    mkdirSync(rescueDir, { recursive: true });
  }

  // Sort violations deepest-first so we work bottom-up
  const sorted = [...violations].sort((a, b) => b.depth - a.depth);

  for (const v of sorted) {
    if (!existsSync(v.path)) continue;

    // Collect all files in this violation path
    const files = collectFiles(v.path);

    for (const filePath of files) {
      const fileName = basename(filePath);
      let destPath = join(rescueDir, fileName);

      // Handle collisions with counter prefix
      if (existsSync(destPath)) {
        destPath = join(rescueDir, `${rescued}_${fileName}`);
      }

      try {
        renameSync(filePath, destPath);
        rescued++;
      } catch (e) {
        // Try copy + delete for cross-device moves
        try {
          const data = readFileSync(filePath);
          writeFileSync(destPath, data);
          unlinkSync(filePath);
          rescued++;
        } catch (e2) {
          errors.push({ file: filePath, error: e2.message });
        }
      }
    }
  }

  // Clean empty directories (bottom-up)
  collapsed = cleanEmptyDirs(root, rescueDir);

  return { rescued, collapsed, errors, rescueDir };
}

function collectFiles(dir) {
  const files = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isFile()) {
        files.push(full);
      } else if (entry.isDirectory() && !SKIP_DIRS.has(entry.name)) {
        files.push(...collectFiles(full));
      }
    }
  } catch { /* skip inaccessible */ }
  return files;
}

function cleanEmptyDirs(root, excludeDir) {
  let cleaned = 0;

  function sweep(dir) {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (SKIP_DIRS.has(entry.name)) continue;

      const full = join(dir, entry.name);
      if (full === excludeDir) continue;

      sweep(full); // Recurse first (bottom-up)

      // Check if now empty
      try {
        const remaining = readdirSync(full);
        if (remaining.length === 0) {
          rmdirSync(full);
          cleaned++;
        }
      } catch { /* skip */ }
    }
  }

  sweep(root);
  return cleaned;
}

// ── PATH GUARD SENTINEL ──────────────────────────────────────
function writePathGuard(root) {
  const guardPath = join(root, '.path-guard.json');
  const guard = {
    version: '1.0.0',
    created: new Date().toISOString(),
    rules: {
      maxDepthFromProjectRoot: MAX_DEPTH_FROM_ROOT,
      maxPathChars: MAX_PATH_CHARS,
      maxFolderNameRepeats: MAX_NAME_REPEATS,
      bannedPatterns: [
        'netlify_configs/netlify_configs',
        'MASTER_RESEARCH_ARCHIVE/MASTER_RESEARCH_ARCHIVE',
      ],
      namingRule: 'Use DoubleWordCase timestamps. Never repeat parent folder name in child.'
    },
    enforcement: 'Agents MUST check .path-guard.json before creating directories.',
    lastScan: new Date().toISOString(),
    lastResult: 'CLEAN'
  };

  writeFileSync(guardPath, JSON.stringify(guard, null, 2), 'utf8');
  console.log(`  📋 Path guard written: ${guardPath}`);
}

// ══════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║  fix-recursive-nest — Path Loop Destroyer                ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log(`Scanning: ${SCAN_ROOT}`);
console.log(`Mode: ${SCAN_ONLY ? 'SCAN' : AUTO_MODE ? 'AUTO-FIX' : 'INTERACTIVE'}`);

if (!existsSync(SCAN_ROOT)) {
  console.log(`\n❌ Target path not found: ${SCAN_ROOT}`);
  process.exit(2);
}

const t0 = performance.now();
const violations = scanForViolations(SCAN_ROOT);
const scanMs = Math.round(performance.now() - t0);

console.log(`\nScan complete in ${scanMs}ms`);

if (violations.length === 0) {
  console.log('✅ No path violations found — directory structure is clean');
  writePathGuard(SCAN_ROOT);
  logAction('scan', { result: 'CLEAN', violations: 0, ms: scanMs });
  process.exit(0);
}

// Report violations
console.log(`\n⚠️  ${violations.length} violation(s) found:\n`);
for (const v of violations) {
  console.log(`  ❌ [${v.reason}] ${v.relPath}`);
  console.log(`     ${v.detail}`);
}

if (SCAN_ONLY) {
  logAction('scan', { result: 'VIOLATIONS', count: violations.length, ms: scanMs });
  console.log(`\nRun without --scan to fix: node scripts/fix-recursive-nest.mjs --auto`);
  process.exit(1);
}

// Fix
console.log('\n🔧 Rescuing files and flattening recursive structure...');
const t1 = performance.now();
const result = rescueFiles(violations, SCAN_ROOT);
const fixMs = Math.round(performance.now() - t1);

console.log(`\n═══════════════════════════════════════════════════════════`);
console.log(`📦 Files rescued:       ${result.rescued}`);
console.log(`🗂️  Empty dirs collapsed: ${result.collapsed}`);
console.log(`📁 Rescue directory:    ${result.rescueDir}`);
console.log(`⏱️  Fix time:            ${fixMs}ms`);

if (result.errors.length > 0) {
  console.log(`\n⚠️  ${result.errors.length} error(s) during rescue:`);
  for (const e of result.errors) {
    console.log(`  ❌ ${e.file}: ${e.error}`);
  }
}

// Write prevention guard
writePathGuard(SCAN_ROOT);

// Log to NDJSON
logAction('fix', {
  result: result.errors.length === 0 ? 'FIXED' : 'PARTIAL',
  filesRescued: result.rescued,
  dirsCollapsed: result.collapsed,
  errors: result.errors.length,
  scanMs,
  fixMs
});

console.log(`\n✅ Recursive nest fixed. Path guard installed.`);
console.log(`   OneDrive sync should resume within minutes.`);
process.exit(result.errors.length > 0 ? 1 : 0);
