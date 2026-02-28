# 🧠 CC-016 — Healthcheck Local Probe + Sanity Test Mode Awareness

**Owner:** Claude Code
**Priority:** HIGH
**Status:** READY (2026-02-28)
**Blocking:** None — cloud is REAL
**Branch:** `feature/WSP-16-sanity-mode-awareness`

---

## Context

Windsurf Master deployed:
- `master-cockpit.mjs` now emits `truth.cloudVerdict` + `truth.localVerdict`
- `just control-plane-gate` exits 0 when `cloudVerdict === 'REAL'`
- `sanity-test.mjs` runs 45 checks but currently fails on local OPENAI_API_KEY even when testing cloud

Claude Code's job: make the test tooling **mode-aware** so cloud tests don't fail on local-only issues.

---

## Read-First Gate

> "I read CLAUDE.md + AGENT_ASSIGNMENTS.md and I am working ticket CC-016."

---

## Task 1: Make sanity-test.mjs mode-aware

**File:** `scripts/sanity-test.mjs`

Add `--mode cloud` and `--mode local` flags:

| Mode | Behavior |
|------|----------|
| `--mode cloud` (default when no `--local`) | Skip local env key checks. Only test cloud endpoints + agent files + gates + build. |
| `--mode local` (or `--local`) | Test everything including local env keys + localhost endpoints. |
| No mode flag | Auto-detect: if `--local` is passed, use local mode. Otherwise cloud mode. |

**Key change:** In cloud mode, the `testEnvKeys()` function should record local-only keys as `skip` instead of `fail`. This removes the false failure on `OPENAI_API_KEY` when the user is only testing cloud.

**Done when:**
```powershell
node scripts/sanity-test.mjs              # cloud mode — 0 required failures
node scripts/sanity-test.mjs --local      # local mode — shows OPENAI_API_KEY fail honestly
```

---

## Task 2: Add healthcheck ledger enrichment

**File:** `netlify/functions/healthcheck.ts`

The healthcheck already has a `ledger` block. Enhance it to also report:
- `localDevReachable`: boolean (only meaningful when called from localhost — skip in cloud)
- `lastRunId`: string or null (from latest ledger entry)

This gives the cockpit richer data without adding new endpoints.

**Done when:** `curl localhost:8888/.netlify/functions/healthcheck | jq .ledger` shows `lastRunId`.

---

## Task 3: Update AGENT_ASSIGNMENTS.md completed table

Add this row to the Completed table at the bottom of `plans/AGENT_ASSIGNMENTS.md`:

```
| CC-016 | Claude Code | Sanity test mode-awareness + healthcheck ledger enrichment | [date] |
```

---

## Verification Commands

```powershell
# CC-016 verification sequence
node scripts/sanity-test.mjs                    # cloud mode — expect 0 required fails
node scripts/sanity-test.mjs --local            # local mode — expect honest OPENAI fail
just cockpit --json | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);console.log('cloud:',j.truth.cloudVerdict,'local:',j.truth.localVerdict)})"
just control-plane-gate                         # must still pass
```

---

## Exit Conditions

| Outcome | Action |
|---------|--------|
| All tasks pass | CC-016 DONE — commit to branch, open PR |
| sanity-test regresses | Fix regression before closing |
| healthcheck ledger change causes 500 | Revert ledger change — it's informational only, never blocks |

---

## Machine Health Note

Run tests sequentially, not in parallel. Kill orphan processes first:
```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
```

---

*For the Commons Good 🎬*
