# AGENT-METRICS.md — Quantifying Agent Teamwork

**Owner:** Windsurf/Cascade (Acting Master #2, WSP001)
**Created:** 2026-03-04
**Purpose:** Measure what matters across the agent team — not vanity metrics.

---

## The Five Rings (Observability Layers)

Every system state should be visible through at least one ring. If a state is only visible in one ring, that's a single point of failure for awareness.

```
Ring 1: PUBLIC API     → /control-plane, /healthcheck (browser, agents, CI)
Ring 2: CLI SCRIPTS    → master-cockpit, m9-readiness-check, sanity-test (agents only)
Ring 3: UI DASHBOARD   → DiagnosticsPage, SystemStatusEmblem, PlatformToggle (humans)
Ring 4: ARTIFACTS      → LEDGER.ndjson, contracts/, memory_index.json (audit trail)
Ring 5: GIT HISTORY    → commits, PRs, AGENT_ASSIGNMENTS.md (provenance)
```

### Coverage Matrix (current state)

| System State | Ring 1 | Ring 2 | Ring 3 | Ring 4 | Ring 5 | Gap? |
|-------------|--------|--------|--------|--------|--------|------|
| Pipeline wiring (7 agents) | ✅ | ✅ | ✅ | - | ✅ | No |
| Storage health | ✅ | ✅ | ✅ | - | - | No |
| AI service keys | ✅ | ✅ | ✅ | - | - | No |
| Social publisher status | ✅ | ✅ | ✅ | - | - | No |
| Split verdicts | ✅ | ✅ | ✅ | - | - | No |
| Platform toggle state | ✅ | - | ✅ | - | ✅ | No |
| **Remotion render mode** | ❌ | ✅ | ❌ | - | ✅ | **YES — CC-M9-CP + CX-018** |
| Cycle gates (10-point) | - | ✅ | - | ✅ | ✅ | Ring 1+3 missing |
| Env key parity | - | ✅ | - | - | - | Single ring |
| Ledger entries | ✅ | ✅ | - | ✅ | - | Ring 3 missing |
| Cost estimates | - | - | ✅ | ✅ | - | Ring 1+2 missing |

**Rule:** Any state in only 1 ring is fragile. Target: 3+ rings for critical states.

---

## Agent Performance Metrics

### Per-Agent Scorecard

| Metric | How to Measure | Target |
|--------|---------------|--------|
| **Tickets completed** | Count in `AGENT_ASSIGNMENTS.md` | Tracked per milestone |
| **Build impact** | Does `npm run build` still pass after their commit? | 100% pass rate |
| **No Fake Success** | Did they claim success honestly? | Zero violations |
| **Gate compliance** | Did they run gates before merge? | Every commit |
| **File discipline** | Did they only touch files in their ticket scope? | Zero scope creep |
| **Handoff quality** | Can the next agent read their work without asking? | Self-documenting |

### Team-Level Metrics

| Metric | Current Value | Source |
|--------|--------------|--------|
| Milestones DONE | 8 (M0–M0.8, M6, M7, M8) | MASTER.md |
| Milestones blocked | 2 (M9, M10) | MASTER.md |
| Sanity checks passing | 33/33 | `just sanity-test-local` |
| Cycle gates GREEN | 10/10 | `just cycle-status` |
| Build modules | 1357 | `npm run build` |
| Build errors | 0 | `npm run build` |
| Agents active | 2 (Master, Claude Code) | AGENT-OPS.md |
| Agents waiting | 2 (Codex #2, Antigravity) | AGENT-OPS.md |
| Human-Ops blockers | 2 (HO-006, HO-007) | MASTER.md |
| Observability gaps | 1 (Remotion in Ring 1+3) | This file |

---

## Immutable Schema (Forward Gear)

The agent teamwork flow follows a one-way forward chain with parallel backward consensus:

```
FORWARD (one-way, immutable):
  Human-Ops → Master → Claude Code → Codex #2 → Antigravity
  (keys)      (plan)   (backend)     (UI)        (verify)

BACKWARD (consensus, read-only):
  Antigravity → Master → All Agents
  (truth)       (gate)   (read MASTER.md)

PARALLEL (independent, any order):
  Claude Code ‖ Codex #2   (different files, no conflicts)
  Master ‖ Antigravity      (plan vs verify, no conflicts)
```

### Rules

1. **Forward only:** Tickets flow from Master to agents, never backwards
2. **Consensus backward:** Antigravity's verification flows back to Master, Master updates MASTER.md, all agents read it
3. **Parallel safe:** Agents working on different files can run in parallel
4. **Immutable commits:** Once a milestone is FROZEN, its commits are immutable ring-fenced history
5. **No fake success at any layer:** Every ring must report honestly

---

## How to Run a Team Health Check

```bash
# Ring 1: API health
curl -s https://sirtrav-a2a-studio.netlify.app/.netlify/functions/control-plane | jq '.verdict'
curl -s https://sirtrav-a2a-studio.netlify.app/.netlify/functions/healthcheck | jq '.status'

# Ring 2: CLI checks
just cockpit
just m9-check
just sanity-test-local
just cycle-status

# Ring 3: UI (manual)
# Visit https://sirtrav-a2a-studio.netlify.app/diagnostics

# Ring 4: Artifacts
cat artifacts/LEDGER.ndjson | wc -l

# Ring 5: Git provenance
git log --oneline -10 main
```

---

*Measure what matters. If you can't see it in 3 rings, you can't trust it.*

**For the Commons Good** 🎬
