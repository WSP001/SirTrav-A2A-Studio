# Team Knowledge Base — SirTrav A2A Studio

> **Purpose:** Single onboarding doc for any agent or human joining this project.
> **Last Updated:** 2026-02-24
> **Machine:** AMD Ryzen AI 9 HX 370 (24 cores, NPU active) — Windows 11

---

## 1. Repository Map

```
C:\WSP001\SirTrav-A2A-Studio\           # Master repo (main branch)
├── .agent/skills/                       # Per-agent skill docs (5 agents)
├── .claude/worktrees/                   # Claude Code worktrees (gitignored)
├── artifacts/
│   ├── claude/                          # Token budget, progress logs
│   ├── council_events/                  # Council Flash event receipts (4 files)
│   ├── data/                            # Weekly harvest JSONs
│   └── public/metrics/                  # Agentic run reports (24 files)
├── docs/                                # 40+ documentation files
├── netlify/functions/                   # Serverless functions (publish-x, ledger, etc.)
├── plans/                               # AGENT_ASSIGNMENTS.md, sprint plans
├── scripts/                             # 20+ automation scripts (.mjs)
├── src/                                 # React frontend (Codex owns)
├── tasks/                               # Task specs for agents
├── justfile                             # 180 recipes, 1,693 lines
├── agent-state.json                     # 10-gate status tracker
├── AGENTS.md                            # Agent roster + roles
├── HANDOFF.md                           # PR #10 resume bundle
└── CLAUDE.md                            # Claude Code system prompt
```

---

## 2. The Five Agents

| Agent | Ticket Prefix | Layer Ownership | Primary Files |
|-------|--------------|-----------------|---------------|
| **Claude Code** | CC-, CLD-BE- | Backend functions, wiring, storage, API contracts | `netlify/functions/`, `vite.config.js` |
| **Codex** | CX- | Frontend UI, design tokens, React components | `src/components/`, `src/App.*` |
| **Windsurf Master** | WM-, WSP- | Infrastructure, DevKit, justfile, governance | `justfile`, `scripts/verify-*.mjs`, `devkit-spinup.ps1` |
| **Antigravity** | AG- | Testing, truth serum, social dry runs, motion tests | `scripts/test-*.mjs`, `scripts/truth-serum.mjs` |
| **Human Operator** | HUMAN- | Final merge authority, council flash, secret management | `.env`, Netlify dashboard, GitHub merge button |

### Agent File Ownership — Hard Boundaries

```
Claude Code MAY edit:    netlify/functions/*, vite.config.js, package.json
Codex MAY edit:          src/components/*, src/App.*, public/
Windsurf MAY edit:       justfile, scripts/verify-*.mjs, scripts/check-*.mjs, scripts/fix-*.mjs
Antigravity MAY edit:    scripts/test-*.mjs, scripts/truth-serum.mjs
Human Operator only:     .env, Netlify env vars, GitHub merge, social API keys
```

---

## 3. Source of Truth Index

| What | Where | Format |
|------|-------|--------|
| **Gate status** | `agent-state.json` | JSON — 10 gates, each with status/lastChecked |
| **Sprint assignments** | `plans/AGENT_ASSIGNMENTS.md` | Markdown table — ticket/owner/status |
| **Agent skills** | `.agent/skills/<AGENT>.md` | Per-agent playbook with gates, files, protocols |
| **Ops spine** | `docs/AGENT_OPS_SPINE.md` | Ordered command sequence for verification |
| **Cost schema** | `netlify/functions/lib/cost-manifest.ts` | TypeScript — cost tracking types |
| **Weekly metrics** | `artifacts/data/weekly-harvest-*.json` | JSON — aggregated weekly signals |
| **Council events** | `artifacts/council_events/*.json` | JSON — council flash run receipts |
| **Agentic runs** | `artifacts/public/metrics/agentic-run-*.json` | JSON — E2E test results (24 runs tracked) |
| **Governance rules** | `docs/GOVERNANCE_RATIONALE.md` | 10-line rationale for branch discipline |
| **Worktree workflow** | `docs/WORKTREE_FLOW.md` | 7-step PowerShell workflow for all agents |

### Public vs Private Boundary

| Public (safe to commit) | Private (NEVER commit) |
|------------------------|----------------------|
| `artifacts/public/metrics/` — aggregated counters | `.env` — API keys, secrets |
| `agent-state.json` — gate booleans | Netlify env vars — `TWITTER_*`, `OPENAI_*`, `ELEVENLABS_*` |
| `docs/` — all documentation | `data/` subdirs with real customer content |
| `artifacts/council_events/` — run receipts | SSH keys, OAuth tokens |

---

## 4. Top 15 Commands (ranked by importance)

| # | Command | What | Risk | Owner |
|---|---------|------|------|-------|
| 1 | `just council-flash-cloud` | Human gate: full council verification | P0 | Human-Ops |
| 2 | `just ops-spine-cloud` | 5-step cloud verification spine | P0 | Windsurf |
| 3 | `just golden-path` | End-to-end golden path smoke test | P0 | Antigravity |
| 4 | `just pre-merge-guard` | 4-check composite before merge | P1 | Windsurf |
| 5 | `just flow` | Ticket-first disciplined workflow | P1 | Any agent |
| 6 | `just ticket-status` | Branch → Linear ticket alignment | P1 | Any agent |
| 7 | `just preflight` | Environment check (Node, npm, just) | P2 | Any agent |
| 8 | `just healthcheck` | Netlify function health | P2 | Claude Code |
| 9 | `just healthcheck-cloud` | Live cloud healthcheck | P2 | Claude Code |
| 10 | `just x-dry-run` | X/Twitter dry-run (no posting) | P2 | Antigravity |
| 11 | `just x-live-test` | Real tweet (5s cancel window) | P0 | Antigravity |
| 12 | `just devkit-tools` | 13-tool verification | P2 | Windsurf |
| 13 | `just machine-gate` | Health score ≥ 5 gate | P2 | Windsurf |
| 14 | `just verify-truth` | No Fake Success composite | P1 | Antigravity |
| 15 | `just check-machine-health` | Full AMD Ryzen AI health report | P3 | Windsurf |

---

## 5. Layer Architecture

```
┌─────────────────────────────────────────────┐
│  WSP-GOVERNANCE (Branch Discipline)          │  ticket-status, flow, pre-merge-guard
├─────────────────────────────────────────────┤
│  WM-012 Machine Safety (DevKit)              │  devkit-verify, path-scan, machine-gate
├─────────────────────────────────────────────┤
│  Operation Truth Serum                       │  verify-truth, no-fake-success, verify-x-real
├─────────────────────────────────────────────┤
│  Cycle Gate System v3 (10 gates)             │  cycle-all, cycle-gate, cycle-next-for
├─────────────────────────────────────────────┤
│  Council Flash v1.5 (Human Gate)             │  council-flash, vault-init, wiring-verify
├─────────────────────────────────────────────┤
│  Ops Spine (Verification Sequence)           │  ops-spine, preflight, golden-path
├─────────────────────────────────────────────┤
│  Social Publishers (X, LinkedIn, YouTube)     │  x-dry, x-live, linkedin-dry, linkedin-live
├─────────────────────────────────────────────┤
│  Backend Functions (Netlify v2)              │  healthcheck, publish-x, pipeline, ledger
├─────────────────────────────────────────────┤
│  Frontend UI (React + Vite)                  │  build, dev, design tokens
└─────────────────────────────────────────────┘
```

Each layer is **independent** — a failure in Social Publishers does not block DevKit verification. Governance sits at the top because it gates all other work.

---

## 6. Social Platform Status

| Platform | Status | Recipe | Keys Location |
|----------|--------|--------|---------------|
| **X/Twitter** | LIVE | `just x-dry-run` / `just x-live-test` | Netlify env: `TWITTER_*` |
| **LinkedIn** | LIVE | `just linkedin-dry` / `just linkedin-live` | Netlify env: `LINKEDIN_*` |
| **YouTube** | Pending | — | Not configured |
| **TikTok** | Pending | — | Not configured |
| **Instagram** | Pending | — | Not configured |

---

## 7. Onboarding Checklist (New Agent or Teammate)

```powershell
# 1. Clone and verify
cd C:\WSP001
git clone https://github.com/WSP001/SirTrav-A2A-Studio.git
cd SirTrav-A2A-Studio
npm install

# 2. Check your environment
just preflight

# 3. Verify the machine
just devkit-tools
just check-machine-health

# 4. Read your skill doc
cat .agent/skills/<YOUR_AGENT>.md

# 5. Check gate status
node scripts/cycle-check.mjs all

# 6. Start work on a ticket
# Create worktree (see docs/WORKTREE_FLOW.md)
git worktree add .worktrees/WSP-<n>-<slug> -b feature/WSP-<n>-<slug> origin/main
cd .worktrees/WSP-<n>-<slug>
just flow
```

---

*Generated by Windsurf Master — For the Commons Good.*
