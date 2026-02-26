# ≡ƒªà MISSION BRIEF: "THE PULSE & THE PLAQUE"
## Weekly Analog Signal + Command HUD

**Date:** 2026-02-14
**Sprint Phase:** Layer 3 (Design/UI) + Layer 4 (Intelligence)
**Prerequisites:** Layer 1 (Truth) Γ£à SOLID | Layer 2 (Wiring) Γ£à VERIFIED | 10/10 Gates PASS

---

## Context

The SirTrav A2A Studio pipeline is PROVEN end-to-end:
- 10/10 cycle gates PASS
- X/Twitter LIVE (3 verified tweets, tweetId: 2022766799083737341)
- Agentic test harness: 6/6 PASS ├ù 3 modes
- Healthcheck: `degraded` (2/5 social platforms ΓÇö X + YouTube active)

**Goal:** Build two new capabilities on top of this proven foundation:
1. **The Plaque** ΓÇö A visual System Status Emblem (HUD) showing live system health
2. **The Pulse** ΓÇö A Weekly Harvest engine that ingests photos and generates mood analysis

---

## Agent Assignments

| Agent | Role | Task IDs | Layer |
|-------|------|----------|-------|
| **Codex** | The Artist | CX-012 | L3 (Design) |
| **Claude Code** | The Engineer | CC-011, CC-012 | L4 (Intelligence) |
| **Antigravity** | The Validator | AG-011 | L2/L4 (Contracts) |
| **Windsurf Master** | Infrastructure | WM-006 | L1 (Commands) |
| **Scott (Human)** | Keys + Approval | ENV-003 | Manual |

---

## Execution Order

```
Phase 1 ΓÇö SCAFFOLDING (parallel)
Γö£ΓöÇΓöÇ Windsurf: Add new justfile commands (WM-006)
Γö£ΓöÇΓöÇ Claude Code: Create harvest script skeleton (CC-011)
ΓööΓöÇΓöÇ Scott: Set Google Photos API key if available

Phase 2 ΓÇö BUILD (parallel after Phase 1)
Γö£ΓöÇΓöÇ Codex: Build SystemStatusEmblem component (CX-012)
Γö£ΓöÇΓöÇ Claude Code: Build weekly analysis pipeline (CC-012)
ΓööΓöÇΓöÇ Antigravity: Create validation schema (AG-011)

Phase 3 ΓÇö VERIFY (sequential)
Γö£ΓöÇΓöÇ Antigravity: Run full validation (agentic-test + schema check)
Γö£ΓöÇΓöÇ Claude Code: Run cycle-all to verify no regressions
ΓööΓöÇΓöÇ Scott: Browser verify at localhost:8888
```

---

## Merge Prerequisite

Before agents start, merge `claude/trusting-hamilton` ΓåÆ main:
```bash
git checkout main
git pull origin main
git merge claude/trusting-hamilton
git push origin main
```

This gives all agents the Lean Protocol v3, agentic test harness, and 10/10 gate system.
