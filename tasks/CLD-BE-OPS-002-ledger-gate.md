# CLD-BE-OPS-002: Ledger Gate — Token Attribution + Linear Sync

> **Agent:** Claude Code (Backend Builder)
> **Layer:** L1–L2 (Backend Functions + Wiring)
> **Branch:** `feature/WSP-6-ledger-gate` (create via `just agent-worktree name=WSP-6-ledger-gate`)
> **Depends On:** WSP-GOVERNANCE (ticket-status recipe must pass on your branch)
> **Risk:** Low–Medium (new function + lib file, no existing code modified)

---

## Objective

Build a Netlify Function that records every agent action as a ledger entry, syncs branch names to Linear ticket IDs, and exposes a `/ledger` endpoint for the admin HUD. This is the "Credits on the Book" system — every token spent on the Ryzen AI gets attributed to a WSP ticket.

---

## Step 1 — Create `netlify/functions/lib/ledger.ts`

Ledger entry schema:

```typescript
interface LedgerEntry {
  timestamp: string;        // ISO 8601
  ticket: string;           // WSP-5, CC-014, etc.
  agent: string;            // claude-code | windsurf | codex | antigravity | human
  action: string;           // commit | gate-pass | gate-fail | merge | deploy
  branch: string;           // feature/WSP-5-recursive-directory-nesting
  detail: string;           // Human-readable summary
  tokenCost?: number;       // Estimated tokens spent (optional)
  exitCode?: number;        // 0 = success, 1 = fixable, 3 = blocked
}
```

Functions to implement:

```typescript
export function recordLedgerEntry(entry: LedgerEntry): void
// Appends NDJSON line to artifacts/LEDGER.ndjson

export function readLedger(opts?: { ticket?: string; agent?: string; limit?: number }): LedgerEntry[]
// Reads + filters LEDGER.ndjson

export function extractTicketFromBranch(branch: string): string | null
// Extracts WSP-5 from "feature/WSP-5-recursive-directory-nesting"
// Returns null if branch doesn't match pattern
```

---

## Step 2 — Create `netlify/functions/ledger.ts`

Netlify Function v2 endpoint:

```
GET  /.netlify/functions/ledger              → last 50 entries (JSON)
GET  /.netlify/functions/ledger?ticket=WSP-5 → filtered by ticket
GET  /.netlify/functions/ledger?agent=claude  → filtered by agent
POST /.netlify/functions/ledger              → record new entry (JSON body)
```

Response contract:

```json
{
  "success": true,
  "entries": [...],
  "count": 50,
  "ticket": "WSP-5"    // if filtered
}
```

Error contract (No Fake Success):

```json
{
  "success": false,
  "error": "Ledger file not found",
  "disabled": false
}
```

---

## Step 3 — Create `scripts/linear-branch-sync.mjs`

A Node.js script that:

1. Reads current branch via `git rev-parse --abbrev-ref HEAD`
2. Extracts ticket ID (e.g., `WSP-5` from `feature/WSP-5-recursive-directory-nesting`)
3. Validates the ticket exists on Linear (uses Linear API if `LINEAR_API_KEY` is set)
4. If no API key, prints the expected Linear URL: `https://linear.app/wsp2agent/issue/WSP-5`
5. Returns exit 0 if valid, exit 1 if branch doesn't match pattern

CLI flags:
- `--dry-run` — print what would happen, no API calls
- `--json` — output as JSON for agent consumption

---

## Step 4 — Wire into existing gates

In `netlify/functions/healthcheck.ts`, add ledger status to the health response:

```typescript
ledger: {
  entries: ledgerCount,
  lastEntry: lastTimestamp,
  status: "ok"  // or "empty" if no entries yet
}
```

---

## Constraints (DO NOT MODIFY)

```
justfile                              # Windsurf owns
scripts/check-machine-health.mjs      # WM-012 Machine Safety layer
scripts/fix-recursive-nest.mjs        # WM-012 PathGuard layer
scripts/emergency_path_fixer.py       # WM-012 Python Master Fixer
scripts/verify-devkit.mjs             # WM-012 DevKit layer
.path-guard.json                      # PathGuard sentinel
plans/*                               # Coordination docs
```

---

## Validation

After completing all steps, run:

```bash
just ticket-status                    # Must PASS (you're on feature/WSP-6-*)
just cycle-gate healthcheck           # Healthcheck still passes with ledger field
just cycle-gate no_fake_success       # Ledger returns {success:false} when empty, not fake
just devkit-tools                     # No regressions in tool layer
```

---

## Commit Message

```
feat(backend): CLD-BE-OPS-002 Ledger Gate — token attribution + Linear branch sync

- netlify/functions/lib/ledger.ts: NDJSON ledger with ticket/agent/action schema
- netlify/functions/ledger.ts: GET/POST endpoint for admin HUD
- scripts/linear-branch-sync.mjs: branch→ticket validation + Linear URL resolver
- healthcheck.ts: ledger status field added to health response
```

---

## Layer Independence

| Layer | Owner | This ticket touches? |
|-------|-------|---------------------|
| WM-012 Machine Safety | Windsurf | NO |
| WM-013 Skill Docs | Windsurf | NO |
| WSP-GOVERNANCE Branch Discipline | Windsurf | NO (reads ticket-status, doesn't modify) |
| CLD-BE-OPS-002 Ledger Gate | **Claude Code** | **YES — this is your layer** |
