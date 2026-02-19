/**
 * vault-helpers.ts — CC-014: Memory Vault Write Helpers
 *
 * Provides two atomic write primitives for the SirTrav memory vault:
 *   1. recordJobPacket()   — logs every pipeline agent step (cost, status, result)
 *   2. recordCouncilEvent() — logs every Council Flash / Truth Serum gate run
 *
 * Storage: Netlify Blobs via runsStore() / artifactsStore()
 * Schema: artifacts/contracts/job-packet.schema.json
 *
 * RULE: No real run leaves without a row in job_packets.
 *       No Council Flash / Truth Serum run leaves without a row in council_events.
 */

import { runsStore, artifactsStore } from './storage';

// ─── Job Packet Types ───────────────────────────────────────────────────────

export type AgentName =
  | 'director'
  | 'writer'
  | 'voice'
  | 'composer'
  | 'editor'
  | 'attribution'
  | 'publisher'
  | 'quality-gate'
  | 'cost-manifest'
  | 'claude-code'
  | 'codex'
  | 'antigravity'
  | 'windsurf'
  | 'x-agent'
  | 'human';

export type JobStatus = 'success' | 'failed' | 'disabled' | 'skipped' | 'running';

export interface JobPacketCost {
  baseCost: number;
  markup: number;       // Always 20% of baseCost
  totalDue: number;
  apiCalls?: number;
  tokenUsage?: {
    input?: number;
    output?: number;
    total?: number;
  };
}

export interface JobPacket {
  packet: string;         // Unique packet ID: "{runId}-{agent}-{timestamp}"
  public: {
    jobType: string;      // Human-readable label e.g. "Director Agent - Curate Media"
    logicVersion: string; // Git SHA or "local"
    agent: AgentName;
    status: JobStatus;
    timestamp: string;    // ISO-8601
    runId: string;
    projectId?: string;
    action?: string;      // What the agent did: "curate_scenes", "narrate_script", etc.
    publicResult?: Record<string, unknown>;  // tweetIds, sceneCount, duration, etc.
  };
  private: {
    costBreakdown?: JobPacketCost;
    variance?: {
      budgeted?: number;
      actual?: number;
      delta?: number;
      withinBudget?: boolean;
    };
    error?: string;
    durationMs?: number;
    userFeedback?: {
      rating: 'good' | 'bad' | 'none';
      comment?: string;
    };
  };
}

// ─── Council Event Types ─────────────────────────────────────────────────────

export type CouncilEventKind =
  | 'council-flash'
  | 'truth-serum'
  | 'truth-serum-lenient'
  | 'golden-path'
  | 'cycle-gate'
  | 'ag-full-suite'
  | 'verify-truth'
  | 'wiring-verify'
  | 'no-fake-success-check';

export type CouncilVerdict = 'PASS' | 'FAIL' | 'LIAR_DETECTED' | 'DISABLED' | 'SKIPPED' | 'UNKNOWN';

export interface CouncilEvent {
  eventId: string;         // "{kind}-{timestamp}"
  kind: CouncilEventKind;
  timestamp: string;       // ISO-8601
  runId?: string;          // If triggered by a pipeline run
  triggeredBy?: AgentName; // Which agent triggered this gate
  verdict: CouncilVerdict;
  summary: string;         // One-line human summary
  gateResults?: Array<{
    gate: string;
    verdict: CouncilVerdict;
    detail?: string;
  }>;
  reportPath?: string;     // Path to full report artifact
  durationMs?: number;
}

// ─── Helper: generate unique IDs ────────────────────────────────────────────

function makePacketId(runId: string, agent: string): string {
  return `${runId}-${agent}-${Date.now()}`;
}

function makeEventId(kind: string): string {
  return `${kind}-${Date.now()}`;
}

function getLogicVersion(): string {
  return (process.env.COMMIT_REF || 'local').substring(0, 7);
}

// ─── recordJobPacket ─────────────────────────────────────────────────────────

/**
 * Record a job packet for a pipeline agent step.
 * Stored at: sirtrav-runs / job_packets/{runId}/{agent}-{timestamp}.json
 *
 * @example
 * await recordJobPacket({
 *   runId: 'abc123',
 *   projectId: 'week4_recap',
 *   agent: 'director',
 *   action: 'curate_scenes',
 *   jobType: 'Director Agent - Curate Media',
 *   status: 'success',
 *   publicResult: { sceneCount: 12, selectedScenes: 8 },
 *   cost: { baseCost: 0.09, markup: 0.018, totalDue: 0.108 },
 *   durationMs: 2340,
 * });
 */
export async function recordJobPacket(params: {
  runId: string;
  projectId?: string;
  agent: AgentName;
  action?: string;
  jobType: string;
  status: JobStatus;
  publicResult?: Record<string, unknown>;
  cost?: Partial<JobPacketCost>;
  error?: string;
  durationMs?: number;
  userFeedback?: JobPacket['private']['userFeedback'];
}): Promise<{ ok: boolean; packetId?: string; error?: string }> {
  try {
    const packetId = makePacketId(params.runId, params.agent);
    const now = new Date().toISOString();

    // Build cost with 20% markup
    let costBreakdown: JobPacketCost | undefined;
    if (params.cost?.baseCost !== undefined) {
      const base = params.cost.baseCost;
      const markup = Math.round(base * 0.20 * 10000) / 10000;
      costBreakdown = {
        baseCost: base,
        markup,
        totalDue: Math.round((base + markup) * 10000) / 10000,
        apiCalls: params.cost.apiCalls,
        tokenUsage: params.cost.tokenUsage,
      };
    }

    const packet: JobPacket = {
      packet: packetId,
      public: {
        jobType: params.jobType,
        logicVersion: getLogicVersion(),
        agent: params.agent,
        status: params.status,
        timestamp: now,
        runId: params.runId,
        projectId: params.projectId,
        action: params.action,
        publicResult: params.publicResult,
      },
      private: {
        costBreakdown,
        error: params.error,
        durationMs: params.durationMs,
        userFeedback: params.userFeedback,
      },
    };

    // Write to sirtrav-runs blob store
    const store = runsStore();
    const key = `job_packets/${params.runId}/${params.agent}-${Date.now()}.json`;
    await store.setJSON(key, packet);

    console.log(`[Vault] Job packet recorded: ${key} (${params.status})`);
    return { ok: true, packetId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Vault] recordJobPacket failed:', msg);
    // Non-fatal — vault writes must never crash the pipeline
    return { ok: false, error: msg };
  }
}

// ─── recordCouncilEvent ──────────────────────────────────────────────────────

/**
 * Record a Council Flash / Truth Serum gate event.
 * Stored at: sirtrav-artifacts / council_events/{kind}-{timestamp}.json
 *
 * @example
 * await recordCouncilEvent({
 *   kind: 'truth-serum',
 *   verdict: 'PASS',
 *   summary: 'X/Twitter: real tweet ID verified. YouTube: disabled (honest).',
 *   triggeredBy: 'antigravity',
 *   gateResults: [
 *     { gate: 'x-publisher', verdict: 'PASS', detail: 'tweetId: 2022413188155728040' },
 *     { gate: 'youtube-publisher', verdict: 'DISABLED', detail: 'disabled:true (honest)' },
 *   ],
 *   reportPath: 'artifacts/reports/truth-serum-2026-02-18.json',
 *   durationMs: 3200,
 * });
 */
export async function recordCouncilEvent(params: {
  kind: CouncilEventKind;
  verdict: CouncilVerdict;
  summary: string;
  runId?: string;
  triggeredBy?: AgentName;
  gateResults?: CouncilEvent['gateResults'];
  reportPath?: string;
  durationMs?: number;
}): Promise<{ ok: boolean; eventId?: string; error?: string }> {
  try {
    const eventId = makeEventId(params.kind);
    const now = new Date().toISOString();

    const event: CouncilEvent = {
      eventId,
      kind: params.kind,
      timestamp: now,
      runId: params.runId,
      triggeredBy: params.triggeredBy,
      verdict: params.verdict,
      summary: params.summary,
      gateResults: params.gateResults,
      reportPath: params.reportPath,
      durationMs: params.durationMs,
    };

    // Write to sirtrav-artifacts blob store
    const store = artifactsStore();
    const key = `council_events/${params.kind}-${Date.now()}.json`;
    await store.setJSON(key, event);

    console.log(`[Vault] Council event recorded: ${key} (${params.verdict})`);
    return { ok: true, eventId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Vault] recordCouncilEvent failed:', msg);
    // Non-fatal — must never block gate runs
    return { ok: false, error: msg };
  }
}

// ─── listJobPackets ──────────────────────────────────────────────────────────

/**
 * List all job packets for a given run.
 * Useful for debugging and invoice generation.
 */
export async function listJobPackets(runId: string): Promise<JobPacket[]> {
  try {
    const store = runsStore();
    const result = await store.list({ prefix: `job_packets/${runId}/` });
    if (!result.ok || !result.keys) return [];

    const packets: JobPacket[] = [];
    for (const key of result.keys) {
      const packet = await store.getJSON(key) as JobPacket | null;
      if (packet) packets.push(packet);
    }
    return packets;
  } catch {
    return [];
  }
}

/**
 * Get total cost for a run (sum of all job packet costs).
 */
export async function getRunCost(runId: string): Promise<{ baseCost: number; markup: number; totalDue: number }> {
  const packets = await listJobPackets(runId);
  let baseCost = 0;
  let markup = 0;
  let totalDue = 0;

  for (const p of packets) {
    if (p.private.costBreakdown) {
      baseCost += p.private.costBreakdown.baseCost;
      markup += p.private.costBreakdown.markup;
      totalDue += p.private.costBreakdown.totalDue;
    }
  }

  return {
    baseCost: Math.round(baseCost * 10000) / 10000,
    markup: Math.round(markup * 10000) / 10000,
    totalDue: Math.round(totalDue * 10000) / 10000,
  };
}
