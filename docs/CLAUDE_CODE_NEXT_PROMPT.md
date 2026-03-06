# Claude Code — Next Session Prompt

> Paste this into Claude Code's terminal when starting a new session.
> Updated: 2026-03-06 by Windsurf/Cascade (Acting Master)

---

## Quick Context Paste

```
cd "c:\WSP001\SirTrav-A2A-Studio"
cat CLAUDE.md
just orient-claude-m9
git log --oneline -5
```

## Current State

All your M9 tickets are DELIVERED and merged to main:

| Ticket | Commit | Status |
|--------|--------|--------|
| CC-M9-CP | `2e4fdd50` | ✅ DELIVERED — checkRemotion() in control-plane.ts |
| CC-M9-E2E | `a3362ff1` | ✅ DELIVERED — test-remotion-e2e.mjs |
| CC-M9-METRICS | `0c37cab9` (merged `face3aee`) | ✅ DELIVERED — SSE cost/time tracking |

## What You Can Do Next

### Option A: Standby (recommended if HO-007 keys aren't set yet)

No code changes needed. When Human-Ops sets the Remotion AWS keys:

```bash
just m9-e2e
```

This should automatically report REAL mode instead of FALLBACK. No code changes — the existing code auto-upgrades when keys are present.

### Option B: Worktree Cleanup (housekeeping)

You have several old worktrees that can be pruned:

```bash
git worktree list
git worktree prune
```

### Option C: M10 Backend Prep (if Master assigns a ticket)

Wait for a `plans/HANDOFF_CLAUDECODE_CC-M10-*.md` file to appear. Do NOT start M10 work without a ticket.

## Rules Reminder

- ⛔ Do NOT touch `src/` files — that's Codex #2's domain
- ⛔ Do NOT start M10 without a handoff ticket
- ✅ Read `CLAUDE.md` every session — it was rewritten at `6836785d`
- ✅ Always work from `c:\WSP001\SirTrav-A2A-Studio` — never from Documents\GitHub

---

**For the Commons Good** 🎬
