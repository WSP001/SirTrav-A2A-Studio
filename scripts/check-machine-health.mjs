#!/usr/bin/env node
/**
 * check-machine-health.mjs — Hardware-Aware Machine Health Check
 *
 * Detects AMD Ryzen AI 9 HX CPU/NPU, monitors path depth,
 * checks disk/memory, and returns a health score (1-10).
 *
 * Purpose: Agents check this BEFORE heavy inference tasks.
 * If score < 5, agent enters LowEnergyMode (smaller batches, no parallel writes).
 *
 * Usage:
 *   node scripts/check-machine-health.mjs           # Full report
 *   node scripts/check-machine-health.mjs --json    # JSON output for agents
 *   node scripts/check-machine-health.mjs --gate    # Exit 1 if unhealthy
 *
 * Exit codes:
 *   0 = healthy (score >= 5)
 *   1 = unhealthy (score < 5) — only in --gate mode
 */

import { execSync } from 'child_process';
import { existsSync, readdirSync, statSync } from 'fs';
import { resolve, join, sep } from 'path';
import { totalmem, freemem, cpus, platform, arch, hostname } from 'os';

const ROOT = resolve(import.meta.dirname || '.', '..');
const args = process.argv.slice(2);
const JSON_MODE = args.includes('--json');
const GATE_MODE = args.includes('--gate');

function cmd(command) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 10000 }).trim();
  } catch { return null; }
}

function formatBytes(bytes) {
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(1)} GB`;
}

// ── CPU INFO ─────────────────────────────────────────────────
function getCpuInfo() {
  const cpuList = cpus();
  const model = cpuList[0]?.model || 'Unknown';
  const cores = cpuList.length;
  const isAmdRyzen = model.toLowerCase().includes('amd') && model.toLowerCase().includes('ryzen');
  const hasNpu = model.toLowerCase().includes('ai') || model.includes('HX');

  // CPU load (average across cores)
  const loads = cpuList.map(c => {
    const total = Object.values(c.times).reduce((a, b) => a + b, 0);
    return 1 - (c.times.idle / total);
  });
  const avgLoad = loads.reduce((a, b) => a + b, 0) / loads.length;

  return {
    model,
    cores,
    isAmdRyzen,
    hasNpu,
    loadPercent: Math.round(avgLoad * 100),
    speed: `${cpuList[0]?.speed || 0} MHz`
  };
}

// ── MEMORY INFO ──────────────────────────────────────────────
function getMemoryInfo() {
  const total = totalmem();
  const free = freemem();
  const used = total - free;
  const usedPercent = Math.round((used / total) * 100);

  return {
    total: formatBytes(total),
    free: formatBytes(free),
    used: formatBytes(used),
    usedPercent
  };
}

// ── DISK INFO ────────────────────────────────────────────────
function getDiskInfo() {
  // Windows: use wmic or PowerShell
  const diskRaw = cmd('powershell -NoProfile -Command "Get-PSDrive C | Select-Object Used,Free | ConvertTo-Json"');
  if (diskRaw) {
    try {
      const disk = JSON.parse(diskRaw);
      const used = disk.Used || 0;
      const free = disk.Free || 0;
      const total = used + free;
      return {
        total: formatBytes(total),
        free: formatBytes(free),
        usedPercent: total > 0 ? Math.round((used / total) * 100) : 0
      };
    } catch { /* fallthrough */ }
  }
  return { total: 'Unknown', free: 'Unknown', usedPercent: 0 };
}

// ── NPU STATUS ───────────────────────────────────────────────
function getNpuStatus(cpuInfo) {
  if (!cpuInfo.hasNpu) {
    return { available: false, status: 'NotDetected', detail: 'CPU does not advertise NPU' };
  }

  // Check for AMD NPU driver via device manager query
  const npuDriver = cmd('powershell -NoProfile -Command "Get-PnpDevice -Class \\"Processor\\" -ErrorAction SilentlyContinue | Where-Object { $_.FriendlyName -match \'NPU|Neural|AI\' } | Select-Object -First 1 -ExpandProperty Status"');

  if (npuDriver === 'OK') {
    return { available: true, status: 'Optimized', detail: 'AMD NPU driver active' };
  }

  // Check for generic AI accelerator
  const aiDevice = cmd('powershell -NoProfile -Command "Get-PnpDevice -ErrorAction SilentlyContinue | Where-Object { $_.FriendlyName -match \'NPU|Neural|AI Engine\' } | Select-Object -First 1 -ExpandProperty FriendlyName"');

  if (aiDevice) {
    return { available: true, status: 'Detected', detail: aiDevice };
  }

  return { available: false, status: 'Generic', detail: 'NPU-capable CPU but no NPU device detected' };
}

// ── PATH DEPTH CHECK ─────────────────────────────────────────
function getPathHealth() {
  const skipDirs = new Set(['node_modules', '.git', 'dist', '.netlify', '.cache']);
  let maxDepth = 0;
  let maxPathLen = 0;
  let violations = 0;

  function walk(dir, depth) {
    if (depth > 12) return; // Safety limit
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (skipDirs.has(entry.name)) continue;

      const full = join(dir, entry.name);
      const pathLen = full.length;

      if (depth > maxDepth) maxDepth = depth;
      if (pathLen > maxPathLen) maxPathLen = pathLen;
      if (pathLen > 250) violations++;

      // Check recursive naming
      const parts = full.split(sep);
      const counts = {};
      for (const p of parts) { if (p.length > 2) counts[p] = (counts[p] || 0) + 1; }
      if (Object.values(counts).some(c => c >= 3)) violations++;

      walk(full, depth + 1);
    }
  }

  walk(ROOT, 0);
  return { maxDepth, maxPathLen, violations };
}

// ── DOCKER STATUS ────────────────────────────────────────────
function getDockerStatus() {
  const ver = cmd('docker --version');
  if (!ver) return { installed: false, running: false };
  const info = cmd('docker info');
  return { installed: true, running: !!info, version: ver };
}

// ── HEALTH SCORE CALCULATOR ──────────────────────────────────
function calculateScore(cpu, memory, disk, pathHealth, npu) {
  let score = 10;
  const issues = [];

  // CPU load penalty
  if (cpu.loadPercent > 90) { score -= 3; issues.push('CPU overloaded (>90%)'); }
  else if (cpu.loadPercent > 70) { score -= 1; issues.push('CPU high (>70%)'); }

  // Memory pressure
  if (memory.usedPercent > 90) { score -= 3; issues.push('Memory critical (>90%)'); }
  else if (memory.usedPercent > 80) { score -= 1; issues.push('Memory high (>80%)'); }

  // Disk space
  if (disk.usedPercent > 95) { score -= 2; issues.push('Disk nearly full (>95%)'); }
  else if (disk.usedPercent > 90) { score -= 1; issues.push('Disk high (>90%)'); }

  // Path violations (big penalty — this breaks builds)
  if (pathHealth.violations > 0) { score -= 2; issues.push(`${pathHealth.violations} path violation(s)`); }
  if (pathHealth.maxPathLen > 250) { score -= 1; issues.push('Paths exceed 250 chars'); }

  // NPU bonus
  if (npu.available) { score = Math.min(10, score + 1); }

  return { score: Math.max(1, Math.min(10, score)), issues };
}

// ══════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════

const cpu = getCpuInfo();
const memory = getMemoryInfo();
const disk = getDiskInfo();
const pathHealth = getPathHealth();
const npu = getNpuStatus(cpu);
const docker = getDockerStatus();
const { score, issues } = calculateScore(cpu, memory, disk, pathHealth, npu);

const report = {
  timestamp: new Date().toISOString(),
  hostname: hostname(),
  os: `${platform()} ${arch()}`,
  cpu: {
    model: cpu.model,
    cores: cpu.cores,
    load: `${cpu.loadPercent}%`,
    isAmdRyzen: cpu.isAmdRyzen,
    speed: cpu.speed
  },
  npu: npu,
  memory: {
    total: memory.total,
    free: memory.free,
    used: `${memory.usedPercent}%`
  },
  disk: {
    total: disk.total,
    free: disk.free,
    used: `${disk.usedPercent}%`
  },
  paths: {
    maxDepth: pathHealth.maxDepth,
    maxPathLen: pathHealth.maxPathLen,
    violations: pathHealth.violations
  },
  docker: docker,
  healthScore: score,
  maxScore: 10,
  status: score >= 7 ? 'Optimal' : score >= 5 ? 'Acceptable' : 'Degraded',
  issues,
  recommendation: score >= 5
    ? 'Machine is healthy — full inference OK'
    : 'Enter LowEnergyMode — reduce parallel tasks, smaller batches'
};

if (JSON_MODE) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  Machine Health Check — SirTrav DevKit                  ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  🖥️  CPU:    ${cpu.model}`);
  console.log(`             ${cpu.cores} cores @ ${cpu.speed} | Load: ${cpu.loadPercent}%`);
  console.log(`  🧠 NPU:    ${npu.status} — ${npu.detail}`);
  console.log(`  💾 Memory: ${memory.used} / ${memory.total} (${memory.usedPercent}%)`);
  console.log(`  💿 Disk:   ${disk.free} free (${disk.usedPercent}% used)`);
  console.log(`  📂 Paths:  Max depth ${pathHealth.maxDepth} | Max length ${pathHealth.maxPathLen} chars`);
  if (pathHealth.violations > 0) {
    console.log(`             ⚠️  ${pathHealth.violations} path violation(s) — run: just fix-recursive-nest`);
  }
  console.log(`  🐳 Docker: ${docker.installed ? (docker.running ? 'Running' : 'Installed (daemon stopped)') : 'Not installed'}`);
  console.log('');
  console.log(`  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  HEALTH SCORE: ${score}/10 — ${report.status}`);
  if (issues.length > 0) {
    console.log(`  Issues: ${issues.join(', ')}`);
  }
  console.log(`  ${report.recommendation}`);
  console.log(`  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

if (GATE_MODE && score < 5) {
  process.exit(1);
}
process.exit(0);
