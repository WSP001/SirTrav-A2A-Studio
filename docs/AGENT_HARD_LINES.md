# Agent Hard Lines — Things That Must Never Happen

> **Enforcement:** Mechanical (justfile gates) where possible, human review where not.
> **Violation response:** Immediate revert + ticket filed against the violating agent.
> **Last Updated:** 2026-02-24

---

## The 10 Hard Lines

### 1. Never Push Directly to Main

All work happens in worktree branches (`feature/WSP-<n>-<slug>`). Only the Human Operator merges to main via GitHub PR. No exceptions. No force-push.

**Enforced by:** `just ticket-status` rejects non-`feature/WSP-*` branches; `just pre-merge-guard` requires clean merge state.

### 2. Never Return Fake Success

If an API key is missing or a service is down, return `{ success: false, disabled: true }` with HTTP 503 — never HTTP 200 with `disabled: true`. If it mocks, it dies.

**Enforced by:** `just no-fake-success-check` scans all 5 publishers; `just verify-x-real` catches mock patterns in `publish-x.ts`.

### 3. Never Run `--live` Social Modes Without Ticket + Human Approval

`just x-live-test` and `just linkedin-live` create real public posts. They require:
- An active ticket in AGENT_ASSIGNMENTS.md
- Human Operator verbal or written approval
- 5-second cancel window honored (do not bypass)

**Enforced by:** 5-second sleep in `x-live-test` recipe; procedural (human must trigger).

### 4. Never Edit Files Outside Your Ownership Zone

Each agent has a defined file boundary (see `.agent/skills/<AGENT>.md`). Cross-boundary edits cause merge conflicts, attribution loss, and gate failures.

| Agent | May Edit | Must Not Touch |
|-------|----------|---------------|
| Claude Code | `netlify/functions/*`, `vite.config.js`, `package.json` | `justfile`, `scripts/*`, `src/components/*` |
| Codex | `src/components/*`, `src/App.*`, `public/` | `netlify/functions/*`, `justfile` |
| Windsurf | `justfile`, `scripts/verify-*`, `scripts/check-*`, `scripts/fix-*` | `netlify/functions/*`, `src/components/*` |
| Antigravity | `scripts/test-*`, `scripts/truth-serum.mjs` | `netlify/functions/*`, `justfile` |
| Human | `.env`, Netlify env vars, merge button | Agent-owned code (delegate to agents) |

### 5. Never Edit or Delete Archived Files

Archived files in the operator's Google Drive, `artifacts/claude/token-budget.json`, and `agent-state.json` history entries are **read-only**. Only Scott decides what to keep or discard.

### 6. Never Run Local FFmpeg in Netlify Functions

Netlify Functions have a 10-second timeout and no FFmpeg binary. Use `renderMediaOnLambda` + `getRenderProgress` for video rendering. Local rendering is for dev testing only.

### 7. One Ticket Per Agent — No Parallel Work

Each agent works on exactly one ticket at a time. Ticket ownership is tracked in `plans/AGENT_ASSIGNMENTS.md`. If you need a second ticket, finish or hand off the first.

**Enforced by:** ONE-TICKET RULE in AGENT_ASSIGNMENTS.md; `just flow` validates you're on-ticket.

### 8. Never Edit `.env` or Secrets Files via Agent

API keys, OAuth tokens, and secrets are managed exclusively by the Human Operator through the Netlify dashboard or local `.env` file. Agents must not create, modify, or read `.env` directly.

### 9. Never Skip the Pre-Merge Guard

Before any PR is merge-ready, `just pre-merge-guard` must pass all 4 checks:
1. Working tree clean
2. Up-to-date with origin/main
3. Machine health score ≥ 5
4. DevKit quick verify passes

No "I'll fix it after merge" — the guard is the gate.

### 10. Never Commit Secrets, PII, or Machine-Specific Paths

No API keys, no personal names in code, no `C:\Users\<username>` hardcoded paths. Use environment variables for secrets and relative paths or placeholders for machine references.

**Enforced by:** `.gitignore` excludes `.env*`; PR review catches leaks; `just security-audit` scans for patterns.

---

## What Happens When a Hard Line Is Violated

| Severity | Response | Who |
|----------|----------|-----|
| **P0** (secrets leaked, fake success) | Immediate revert + rotate keys + incident ticket | Human Operator |
| **P1** (wrong branch, cross-boundary edit) | Revert commit + file correction ticket | Violating agent |
| **P2** (skipped guard, missing ticket) | Warning + retroactive ticket creation | Any agent can flag |

---

*These lines exist because a 5-agent codebase with 4 AI agents and 1 human diverges fast without mechanical enforcement. Governance is cheaper than recovery.*
