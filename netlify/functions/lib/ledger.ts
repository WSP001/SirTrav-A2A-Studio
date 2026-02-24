/**
 * ledger.ts — CLD-BE-OPS-002: Ledger Gate — Token Attribution + Linear Sync
 *
 * Every agent action in the SirTrav system gets recorded as a ledger entry.
 * This is the "Credits on the Book" system — every token spent on the
 * Ryzen AI NPU gets attributed to a WSP ticket.
 *
 * Storage: NDJSON file at artifacts/LEDGER.ndjson
 * Contract: No Fake Success — returns [] when empty, never placeholder data
 *
 * Exports:
 *   recordLedgerEntry(entry)           — Append one NDJSON line
 *   readLedger(opts?)                  — Read + filter entries
 *   extractTicketFromBranch(branch)    — Extract WSP-5 from feature/WSP-5-...
 */

import * as fs from 'fs';
import * as path from 'path';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LedgerEntry {
  timestamp: string;        // ISO 8601
  ticket: string;           // WSP-5, CC-014, CLD-BE-OPS-002, etc.
  agent: string;            // claude-code | windsurf | codex | antigravity | human
  action: string;           // commit | gate-pass | gate-fail | merge | deploy
  branch: string;           // feature/WSP-5-recursive-directory-nesting
  detail: string;           // Human-readable one-line summary
  tokenCost?: number;       // Estimated tokens spent (optional)
  exitCode?: number;        // 0 = success, 1 = fixable, 3 = blocked-external
}

export interface ReadLedgerOptions {
  ticket?: string;
  agent?: string;
  limit?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LEDGER_DIR = path.resolve('artifacts');
const LEDGER_PATH = path.join(LEDGER_DIR, 'LEDGER.ndjson');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ensureArtifactsDir(): void {
  if (!fs.existsSync(LEDGER_DIR)) {
    fs.mkdirSync(LEDGER_DIR, { recursive: true });
  }
}

// ─── Exported Functions ───────────────────────────────────────────────────────

/**
 * Appends one NDJSON line to artifacts/LEDGER.ndjson
 * Creates artifacts/ dir if missing (uses fs.mkdirSync with recursive)
 */
export function recordLedgerEntry(entry: LedgerEntry): void {
  ensureArtifactsDir();
  const line = JSON.stringify(entry) + '\n';
  fs.appendFileSync(LEDGER_PATH, line, 'utf-8');
}

/**
 * Reads + filters LEDGER.ndjson
 * Returns [] if file missing (No Fake Success — never returns placeholder data)
 * Default limit: 50
 */
export function readLedger(opts?: ReadLedgerOptions): LedgerEntry[] {
  if (!fs.existsSync(LEDGER_PATH)) {
    return [];
  }

  const raw = fs.readFileSync(LEDGER_PATH, 'utf-8');
  const lines = raw.trim().split('\n').filter(Boolean);

  let entries: LedgerEntry[] = [];
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line));
    } catch {
      // Skip malformed lines — don't crash the reader
    }
  }

  // Apply filters
  if (opts?.ticket) {
    const t = opts.ticket.toUpperCase();
    entries = entries.filter((e) => e.ticket.toUpperCase() === t);
  }
  if (opts?.agent) {
    const a = opts.agent.toLowerCase();
    entries = entries.filter((e) => e.agent.toLowerCase() === a);
  }

  // Apply limit (default 50), return most recent first
  const limit = opts?.limit ?? 50;
  return entries.slice(-limit).reverse();
}

/**
 * Extracts "WSP-5" from "feature/WSP-5-recursive-directory-nesting"
 * Returns null if branch doesn't match pattern
 *
 * Supports patterns:
 *   feature/WSP-5-description    → WSP-5
 *   worktree-WSP-6-ledger-gate   → WSP-6
 *   claude/keen-swirles           → null (no ticket)
 */
export function extractTicketFromBranch(branch: string): string | null {
  // Match WSP-<number> anywhere in the branch name
  const match = branch.match(/WSP-(\d+)/i);
  if (match) {
    return `WSP-${match[1]}`;
  }
  return null;
}
