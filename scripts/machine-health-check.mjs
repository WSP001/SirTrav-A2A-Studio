#!/usr/bin/env node
/**
 * MachineHealthCheck - Windows / Ryzen AI 9 HX 370
 * Purpose: protect local dev flow (browser + Vite/Netlify loops) from RAM/CPU thrash.
 *
 * Outputs:
 * - Human-readable summary
 * - One-line JSON summary for agent parsing/logs
 *
 * Exit codes:
 * - 0 => proceed (DevReady / DevCaution)
 * - 1 => stop (ThrottlingRequired)
 */

import os from "os";
import { execFileSync } from "child_process";
import { appendFileSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";

const THRESHOLDS = Object.freeze({
  minFreeGb: 6.0,
  warnMemPct: 80,
  critMemPct: 90,
  cpuCautionPct: 85,
  cpuSampleMs: 400,
  topProcCount: 5,
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toGb(bytes) {
  return bytes / 1024 / 1024 / 1024;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

async function getCpuPercent(sampleMs) {
  const cpus1 = os.cpus();
  await sleep(sampleMs);
  const cpus2 = os.cpus();

  let idleDelta = 0;
  let totalDelta = 0;

  for (let i = 0; i < cpus1.length; i++) {
    const t1 = cpus1[i].times;
    const t2 = cpus2[i].times;

    const idle1 = t1.idle;
    const idle2 = t2.idle;
    const total1 = t1.user + t1.nice + t1.sys + t1.idle + t1.irq;
    const total2 = t2.user + t2.nice + t2.sys + t2.idle + t2.irq;

    idleDelta += idle2 - idle1;
    totalDelta += total2 - total1;
  }

  if (totalDelta <= 0) return 0;
  return clamp(Math.round((1 - idleDelta / totalDelta) * 100), 0, 100);
}

function getTopProcesses(limit) {
  const psScript =
    "Get-Process | " +
    "Sort-Object WorkingSet64 -Descending | " +
    `Select-Object -First ${limit} -Property ProcessName,WorkingSet64 | ` +
    "ConvertTo-Json -Compress";
  const shells = ["powershell.exe", "pwsh", "powershell"];

  for (const shell of shells) {
    try {
      const raw = execFileSync(shell, ["-NoProfile", "-Command", psScript], {
        encoding: "buffer",
        stdio: ["ignore", "pipe", "ignore"],
      });

      let output = raw.toString("utf8").trim();
      if (!output.startsWith("{") && !output.startsWith("[")) {
        output = raw.toString("utf16le").trim();
      }
      if (!output) continue;

      const parsed = JSON.parse(output);
      const rows = Array.isArray(parsed) ? parsed : [parsed];

      return rows.map((p) => ({
        name: String(p.ProcessName || "unknown"),
        memGb: Number(toGb(Number(p.WorkingSet64 || 0)).toFixed(2)),
      }));
    } catch {
      // Try next shell candidate.
    }
  }

  return [];
}

function computeStatus({ memPct, freeGb, cpuPct }) {
  let score = 10;
  const issues = [];

  if (memPct >= THRESHOLDS.critMemPct) {
    score -= 5;
    issues.push(`MemoryCritical (>=${THRESHOLDS.critMemPct}%)`);
  } else if (memPct >= THRESHOLDS.warnMemPct) {
    score -= 2;
    issues.push(`MemoryWarning (>=${THRESHOLDS.warnMemPct}%)`);
  }

  if (freeGb < THRESHOLDS.minFreeGb) {
    score -= 3;
    issues.push(`HeadroomLow (<${THRESHOLDS.minFreeGb}GB free)`);
  }

  if (cpuPct >= THRESHOLDS.cpuCautionPct) {
    score -= 3;
    issues.push(`CpuSaturation (>=${THRESHOLDS.cpuCautionPct}%)`);
  }

  score = clamp(score, 0, 10);
  const status = score >= 8 ? "DevReady" : score >= 6 ? "DevCaution" : "ThrottlingRequired";
  return { status, score, issues };
}

function printHeader() {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║  Machine Health Check - Dev Flow Protection (Windows)   ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
}

function printRecommendations({ status, topProcs, freeGb }) {
  const recs = [];

  if (status === "ThrottlingRequired") {
    recs.push("Close heavy RAM hogs (browser tabs, extra IDEs, WSL/Docker, language servers).");
    recs.push("Then rerun: just machine-gate");
  } else if (status === "DevCaution") {
    recs.push("Run one heavy thing at a time (dev OR build OR tests).");
    recs.push("Avoid multiple watchers and excessive browser tabs.");
  } else {
    recs.push("Clear to run dev/build safely.");
  }

  if (freeGb < THRESHOLDS.minFreeGb + 1.5) {
    recs.push("Tip: aim for +1-3GB extra free RAM before long builds.");
  }

  const names = new Set(topProcs.map((p) => p.name.toLowerCase()));
  if (names.has("vmmemwsl")) recs.push("WSL detected: run wsl --shutdown when safe.");
  if (names.has("windsurf")) recs.push("Windsurf detected: close extra windows/workspaces.");
  if ([...names].some((n) => n.includes("language_server"))) {
    recs.push("Language servers detected: restart editor to clear zombie servers.");
  }

  console.log("\n  Recommendations:");
  for (const r of recs) console.log(`    - ${r}`);
}

function writeHealthMetric(summary) {
  try {
    const outPath = resolve("artifacts/metrics/machine_health.ndjson");
    mkdirSync(dirname(outPath), { recursive: true });
    appendFileSync(outPath, `${JSON.stringify(summary)}\n`, "utf8");
  } catch (err) {
    console.log(`  METRIC_LOG_WARNING: ${err?.message || err}`);
  }
}

async function main() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memPct = (usedMem / totalMem) * 100;
  const freeGb = toGb(freeMem);

  const cpuPct = await getCpuPercent(THRESHOLDS.cpuSampleMs);
  const topProcs = getTopProcesses(THRESHOLDS.topProcCount);
  const { status, score, issues } = computeStatus({ memPct, freeGb, cpuPct });

  printHeader();
  console.log(`  CPU:    ${os.cpus()[0]?.model || "AMD Ryzen"} | Load: ${cpuPct}%`);
  console.log(`  Memory: ${toGb(usedMem).toFixed(1)}GB / ${toGb(totalMem).toFixed(1)}GB (${memPct.toFixed(1)}%)`);
  console.log(`  Free:   ${freeGb.toFixed(1)}GB (Target: >${THRESHOLDS.minFreeGb}GB)`);
  console.log("  ---------------------------------------------------------");

  if (topProcs.length > 0) {
    console.log("  Top Memory Consumers:");
    for (const p of topProcs) console.log(`    - ${p.name}: ${p.memGb}GB`);
  } else {
    console.log("  Top Memory Consumers: unavailable (PowerShell child process blocked)");
    console.log("  Hint (PowerShell):");
    console.log("    Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 5 ProcessName,WorkingSet64");
  }

  console.log("  ---------------------------------------------------------");
  console.log(`  HEALTH SCORE: ${score}/10`);
  if (issues.length > 0) console.log(`  Issues: ${issues.join(" | ")}`);
  console.log(`  STATUS: [${status}]`);
  printRecommendations({ status, topProcs, freeGb });

  const summary = {
    ts: new Date().toISOString(),
    status,
    score,
    cpuPct,
    memPct: Number(memPct.toFixed(1)),
    freeGb: Number(freeGb.toFixed(1)),
    minFreeGb: THRESHOLDS.minFreeGb,
    topProcs,
    issues,
  };
  writeHealthMetric(summary);
  console.log("\n  JSON_SUMMARY:", JSON.stringify(summary));

  process.exit(status === "ThrottlingRequired" ? 1 : 0);
}

main().catch((err) => {
  console.error("\nMachineHealthCheck error:", err?.message || err);
  process.exit(1);
});
