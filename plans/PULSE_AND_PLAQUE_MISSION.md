# 🦅 MISSION BRIEF: "THE PULSE & THE PLAQUE"
## Weekly Analog Signal + Command HUD

**Date:** 2026-02-14
**Sprint Phase:** Layer 3 (Design/UI) + Layer 4 (Intelligence)
**Prerequisites:** Layer 1 (Truth) ✅ SOLID | Layer 2 (Wiring) ✅ VERIFIED | 10/10 Gates PASS

---

## Context

The SirTrav A2A Studio pipeline is PROVEN end-to-end:
- 10/10 cycle gates PASS
- X/Twitter LIVE (3 verified tweets, tweetId: 2022766799083737341)
- Agentic test harness: 6/6 PASS × 3 modes
- Healthcheck: `degraded` (2/5 social platforms — X + YouTube active)

**Goal:** Build two new capabilities on top of this proven foundation:
1. **The Plaque** — A visual System Status Emblem (HUD) showing live system health
2. **The Pulse** — A Weekly Harvest engine that ingests photos and generates mood analysis

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
Phase 1 — SCAFFOLDING (parallel)
├── Windsurf: Add new justfile commands (WM-006)
├── Claude Code: Create harvest script skeleton (CC-011)
└── Scott: Set Google Photos API key if available

Phase 2 — BUILD (parallel after Phase 1)
├── Codex: Build SystemStatusEmblem component (CX-012)
├── Claude Code: Build weekly analysis pipeline (CC-012)
└── Antigravity: Create validation schema (AG-011)

Phase 3 — VERIFY (sequential)
├── Antigravity: Run full validation (agentic-test + schema check)
├── Claude Code: Run cycle-all to verify no regressions
└── Scott: Browser verify at localhost:8888
```

---

## Merge Prerequisite

Before agents start, merge `claude/trusting-hamilton` → main:
```bash
git checkout main
git pull origin main
git merge claude/trusting-hamilton
git push origin main
```

This gives all agents the Lean Protocol v3, agentic test harness, and 10/10 gate system.
