# CLD-BE-OPS-002: Ledger Gate — Token Attribution + Linear Sync

> **Agent:** Claude Code (Backend — CLD-BE)
> **Layer:** L1–L2 (Netlify Functions + Backend Scripts)
> **Branch:** `feature/WSP-6-ledger-gate`
> **Create via:** `just sirtrav-worktree name=WSP-6-ledger-gate`
> **Depends On:** WSP-GOVERNANCE deployed ✅ (`just ticket-status` must PASS on your branch)
> **Risk:** Low–Medium — new files only, no existing source modified except `healthcheck.ts`
> **Status:** QUEUED (2026-02-23) — ready for Claude Code pickup

---

## Read-First Gate

Before touching any file, declare:
> "I read CLAUDE.md + AGENT_ASSIGNMENTS.md and I am working ticket CLD-BE-OPS-002."

Then confirm your branch passes governance:
```powershell
just ticket-status   # Must print: LinearAlignment PASS
```

---

## Objective

Build a Netlify Function that records every agent action as a ledger entry,
syncs branch names to Linear ticket IDs, and exposes a `/ledger` endpoint
for the admin HUD. This is the **"Credits on the Book"** system — every token
spent on the Ryzen AI NPU gets attributed to a WSP ticket.

---

## Step 1 — Create `netlify/functions/lib/ledger.ts`

Ledger entry schema:

```typescript
interface LedgerEntry {
  timestamp: string;        // ISO 8601
  ticket: string;           // WSP-5, CC-014, CLD-BE-OPS-002, etc.
  agent: string;            // claude-code | windsurf | codex | antigravity | human
  action: string;           // commit | gate-pass | gate-fail | merge | deploy
  branch: string;           // feature/WSP-5-recursive-directory-nesting
  detail: string;           // Human-readable one-line summary
  tokenCost?: number;       // Estimated tokens spent (optional)
  exitCode?: number;        // 0 = success, 1 = fixable, 3 = blocked-external
}
```

Implement three exported functions:

```typescript
export function recordLedgerEntry(entry: LedgerEntry): void
// Appends one NDJSON line to artifacts/LEDGER.ndjson
// Creates artifacts/ dir if missing (use fs.mkdirSync with recursive)

export function readLedger(opts?: { ticket?: string; agent?: string; limit?: number }): LedgerEntry[]
// Reads + filters LEDGER.ndjson — returns [] if file missing (No Fake Success)
// Default limit: 50

export function extractTicketFromBranch(branch: string): string | null
// Extracts "WSP-5" from "feature/WSP-5-recursive-directory-nesting"
// Returns null if branch doesn't match pattern ^feature\/WSP-([0-9]+)-.+
```

---

## Step 2 — Create `netlify/functions/ledger.ts`

Netlify Function (handler pattern matching existing functions):

```
GET  /.netlify/functions/ledger              → last 50 entries
GET  /.netlify/functions/ledger?ticket=WSP-5 → filtered by ticket
GET  /.netlify/functions/ledger?agent=claude → filtered by agent
POST /.netlify/functions/ledger              → record new entry (JSON body = LedgerEntry)
```

**Success response contract:**
```json
{
  "success": true,
  "entries": [...],
  "count": 50,
  "ticket": "WSP-5"
}
```

**Error response contract (No Fake Success — CRITICAL):**
```json
{
  "success": false,
  "error": "Ledger file not found",
  "disabled": false
}
```

Return `{ success: false, disabled: true }` ONLY if the ledger lib itself is
unavailable (e.g., import fails). Use `{ success: false, error: "..." }` for
operational errors. Never return `success: true` for empty/error states.

---

## Step 3 — Create `scripts/linear-branch-sync.mjs`

Node.js ESM script that:

1. Reads current branch: `git rev-parse --abbrev-ref HEAD`
2. Extracts ticket ID (e.g., `WSP-5` from `feature/WSP-5-recursive-directory-nesting`)
3. If `LINEAR_API_KEY` env var is set → validate ticket exists on Linear API
4. If no API key → print the Linear URL: `https://linear.app/wsp2agent/issue/WSP-5`
5. Exit 0 if branch is valid WSP ticket branch, exit 1 if not

CLI flags:
- `--dry-run` — print what would happen, no API calls
- `--json` — output machine-readable JSON `{ ticket, branch, valid, url }`
- `--help` — show usage

Pattern: follows same flag-hardening style as `scripts/test-linkedin-publish.mjs`
(unknown flag detection, mutual exclusion checks, help output).

---

## Step 4 — Wire into `netlify/functions/healthcheck.ts`

Add ledger status to the health response JSON:

```typescript
import { readLedger } from './lib/ledger.ts';

// In the health response object, add:
ledger: {
  entries: readLedger({ limit: 1 }).length > 0 ? readLedger().length : 0,
  lastEntry: readLedger({ limit: 1 })[0]?.timestamp ?? null,
  status: "ok"   // always "ok" — ledger is informational, never blocks health
}
```

The ledger status is **informational only** — it must never cause healthcheck
to return a non-200 or mark the system as unhealthy.

---

## Constraints (DO NOT MODIFY)

```
justfile                              # Windsurf owns — WSP-GOVERNANCE layer
scripts/check-machine-health.mjs      # WM-012 Machine Safety layer
scripts/fix-recursive-nest.mjs        # WM-012 PathGuard layer
scripts/emergency_path_fixer.py       # WM-012 Python Master Fixer
scripts/verify-devkit.mjs             # WM-012 DevKit layer
.path-guard.json                      # PathGuard sentinel
plans/AGENT_ASSIGNMENTS.md            # Coordination — read-only
docs/AGENT_OPS_SPINE.md              # Coordination — read-only
AGENT_SKILLS_INDEX.md                 # Coordination — read-only
dist/                                 # Build artifact — never commit
```

---

## Validation Sequence

After completing all 4 steps, run in order:

```powershell
just ticket-status              # LinearAlignment PASS (on feature/WSP-6-* branch)
just devkit-tools               # No regressions in tool layer
just devkit-quick               # Layers 0-2 pass (tools + env + healthcheck)
just cycle-gate healthcheck     # Healthcheck returns 200 with ledger field present
just cycle-gate no_fake_success # ledger endpoint returns {success:false} when empty, not fake
just guard-clean                # Working tree clean before PR
```

---

## Commit Message Template

```
feat(backend): CLD-BE-OPS-002 Ledger Gate — token attribution + Linear branch sync

- netlify/functions/lib/ledger.ts: NDJSON ledger (recordLedgerEntry, readLedger,
  extractTicketFromBranch) — No Fake Success, returns [] not fake data when empty
- netlify/functions/ledger.ts: GET/POST endpoint for admin HUD, correct error contracts
- scripts/linear-branch-sync.mjs: branch→WSP ticket validator + Linear URL resolver,
  --dry-run / --json / --help flags
- netlify/functions/healthcheck.ts: ledger.status field added (informational, never blocks)

runId threaded through all ledger responses per CLAUDE.md constraint #5.
No justfile edits. No DevKit/PathGuard files touched.
```

---

## Layer Independence (This Ticket's Boundary)

| Layer | Owner | CLD-BE-OPS-002 touches? |
|-------|-------|------------------------|
| WM-012 Machine Safety | Windsurf | ❌ NO |
| WM-013 Skill Docs | Windsurf | ❌ NO |
| WSP-GOVERNANCE Branch Discipline | Windsurf | ❌ NO (reads ticket-status output, never modifies justfile) |
| CLD-BE-OPS-002 Ledger Gate | **Claude Code** | ✅ YES — your layer |

---

## Worktree Management Note

This task is built for the **one ticket = one worktree** pattern:

```powershell
# Start your isolated session:
just sirtrav-worktree name=WSP-6-ledger-gate

# Work in: .claude/worktrees/WSP-6-ledger-gate
# Branch:  worktree-WSP-6-ledger-gate (auto-created)
# main stays clean — Lens/GitKraken unaffected
```

After completing:
```powershell
just worktree-status    # Confirm your branch is ahead of main
just pre-merge-guard    # All 4 checks must pass before human reviews
```

---

*Task spec created: 2026-02-23 | By: Claude Code (CLD-BE) | For: Commons Good team*
