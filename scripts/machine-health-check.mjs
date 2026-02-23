#!/usr/bin/env node
/**
 * MachineHealthCheck - Specialized for AMD Ryzen AI 9 HX 370 (Windows)
 * This script provides a reliable health gate for just recipes.
 *
 * Logic:
 * - CPU Sampling (Windows-safe)
 * - Memory Headroom (6GB target)
 * - Process Monitoring (top 5 RAM hogs via PowerShell)
 */

import os from "os";
import { execFileSync } from "child_process";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Samples CPU usage over a short window and returns percentage.
 */
async function getCpuPercent(sampleMs = 400) {
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
  return Math.round((1 - idleDelta / totalDelta) * 100);
}

function toGb(bytes) {
  return bytes / 1024 / 1024 / 1024;
}

/**
 * Gets the top 5 memory-consuming processes via PowerShell.
 */
function getTopProcesses() {
  const psScript =
    "Get-Process | " +
    "Sort-Object WorkingSet64 -Descending | " +
    "Select-Object -First 5 -Property ProcessName,WorkingSet64 | " +
    "ConvertTo-Json -Compress";
  const shells = ["powershell.exe", "pwsh", "powershell"];

  for (const shell of shells) {
    try {
      const raw = execFileSync(
        shell,
        ["-NoProfile", "-Command", psScript],
        { encoding: "buffer", stdio: ["ignore", "pipe", "ignore"] }
      );
      let output = raw.toString("utf8").trim();
      if (!output.startsWith("{") && !output.startsWith("[")) {
        output = raw.toString("utf16le").trim();
      }
      if (!output) continue;

      const parsed = JSON.parse(output);
      const rows = Array.isArray(parsed) ? parsed : [parsed];
      return rows.map((p) => ({
        ProcessName: p.ProcessName,
        MemoryGB: Number(toGb(Number(p.WorkingSet64 || 0)).toFixed(2)),
      }));
    } catch {
      // Try next shell candidate.
    }
  }

  return [];
}

async function run() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsagePercent = (usedMem / totalMem) * 100;
  const freeGb = toGb(freeMem);

  const cpuLoad = await getCpuPercent();
  const topProcs = getTopProcesses();

  // 6.0GB is the "Golden Headroom" for stable local build loops.
  const minFreeGb = 6.0;
  let score = 10;
  const issues = [];

  if (memUsagePercent > 90) {
    score -= 5;
    issues.push("MemoryCritical (>90%): System paging imminent.");
  } else if (memUsagePercent > 80) {
    score -= 2;
    issues.push("MemoryWarning (>80%): Performance may degrade.");
  }

  if (freeGb < minFreeGb) {
    score -= 3;
    issues.push(`HeadroomLow (<${minFreeGb}GB free)`);
  }

  if (cpuLoad > 85) {
    score -= 3;
    issues.push("CpuSaturation (>85%): Throttling build tasks.");
  }

  const status =
    score >= 8 ? "DevReady" :
    score >= 6 ? "DevCaution" :
    "ThrottlingRequired";

  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║  Machine Health Check — RyzenAI Optimization            ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`  CPU:    ${os.cpus()[0]?.model || "AMD Ryzen"} | Load: ${cpuLoad}%`);
  console.log(`  Memory: ${toGb(usedMem).toFixed(1)}GB / ${toGb(totalMem).toFixed(1)}GB (${memUsagePercent.toFixed(1)}%)`);
  console.log(`  Free:   ${freeGb.toFixed(1)}GB (Target: >${minFreeGb}GB)`);
  console.log("  ---------------------------------------------------------");

  if (topProcs.length > 0) {
    console.log("  Top Memory Consumers:");
    topProcs.forEach((p) => {
      console.log(`    - ${p.ProcessName}: ${p.MemoryGB}GB`);
    });
    console.log("  ---------------------------------------------------------");
  } else {
    console.log("  Top Memory Consumers: unavailable (PowerShell child process blocked)");
    console.log("  Hint: run this directly in PowerShell:");
    console.log("    Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 5 ProcessName,WorkingSet64");
    console.log("  ---------------------------------------------------------");
  }

  console.log(`  HEALTH SCORE: ${score}/10`);
  if (issues.length > 0) {
    console.log(`  Issues: ${issues.join(" | ")}`);
  }
  console.log(`  STATUS: [${status}]`);

  // Exit codes for just integration:
  // 0 = proceed, 1 = hard stop.
  if (status === "ThrottlingRequired") {
    console.log("\n  ACTION REQUIRED: Close the processes listed above before proceeding.");
    process.exit(1);
  }

  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
