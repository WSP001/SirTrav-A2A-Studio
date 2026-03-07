# AGENTS.md — SirTrav A2A Studio Team Lineup

> **Purpose**: Master registry of all agents, their domains, instruction files, and current task assignments.
> **Version**: 2.0.0
> **Owner**: Windsurf/Cascade (Acting Master, WSP001)
> **Last Updated**: 2026-03-06
> **Canonical Path**: `c:\WSP001\SirTrav-A2A-Studio`

---

## 📁 Project Info

| Field | Value |
|-------|-------|
| **Canonical Path** | `c:\WSP001\SirTrav-A2A-Studio` ← **ALL writes happen here** |
| **GitHub** | `github.com/WSP001/SirTrav-A2A-Studio` |
| **Purpose** | D2A (Doc-to-Agent) automated video production for the Commons Good |
| **Stack** | React + Vite + Tailwind (frontend), Netlify Functions (backend), Remotion Lambda (rendering) |
| **Entry Points** | `just dev`, `just cockpit`, `just --list` |
| **North Star** | `MASTER.md` — milestones, rules, architecture |

---

## 🤖 Agent Directory & Instruction Files

Every agent reads **two files** on entry:

1. **MASTER.md** — the North Star (milestones, rules, architecture) — everyone reads this
2. **Their own instruction file** — agent-specific rules and boundaries

### 🚨 THE GEMINI PIVOT RULE (Effective 2026-03-06)
**New Priority:** Create a "Gemini-to-Video" bridge.
**The Rule:** If a function requires a missing key (like Remotion/AWS), the agent MUST fallback to Gemini 1.5/2.0 Flash/Pro to generate frame-by-frame descriptive "vision" or utilize Gemini's native video generation capabilities. AWS/Remotion is officially marked **DEPRECATED-BYPASS**.

| # | Agent | Platform | Instruction File | Domain | Memory |
|---|-------|----------|-----------------|--------|--------|
| 0 | **Windsurf/Cascade** (Acting Master) | Windsurf IDE | `MASTER.md` + `AGENT-OPS.md` | Orchestration, justfile, gates, milestones, merges | ✅ Cross-session |
| 1 | **Claude Code** | Terminal (`claude`) | `CLAUDE.md` | Backend: `netlify/functions/`, `scripts/`, `lib/` | Worktree-scoped |
| 2 | **Codex #2** | OpenAI Codex CLI | `AGENT-OPS.md` § Codex #2 | Frontend: `src/components/`, `src/pages/` | ❌ Per-session |
| 3 | **Antigravity** | Gemini CLI / CI | `AGENT-OPS.md` § Antigravity | QA: gates, verification, truth serum | ❌ Per-session |
| 4 | **Netlify Agent** | CLI / Dashboard | `plans/HANDOFF_NETLIFY_AGENT.md` | Deploy + cloud verification only | ❌ Per-session |
| 5 | **Human-Ops** (Scott) | Manual | `MASTER.md` § Human-Ops Queue | API keys, credentials, Netlify Dashboard | N/A |
| 6 | **GitHub Copilot** | VS Code | N/A | Inline autocomplete (passive) | ❌ None |

### About Codex #1 vs Codex #2

- **Codex #2** is the active frontend agent. It delivered CX-016 (Diagnostics UI) and CX-017 (PlatformToggle). Its next ticket is CX-019.
- **Codex #1** is not currently assigned to this project. If a second Codex instance is needed (e.g., for parallel frontend work or a separate task domain), the Master will create a `plans/HANDOFF_CODEX1_*.md` ticket and add a Codex #1 section to `AGENT-OPS.md`.
- **Rule**: No agent works without a handoff ticket in `plans/`. No ticket = no work.

### About the Genie (Gemini CLI)

The Genie (Gemini CLI) was used for CX-018 but wandered into the wrong repo copy and produced incorrect code. Lessons learned:

- Genie lacks persistent memory and path awareness
- Must be given the canonical workspace path explicitly: `c:\WSP001\SirTrav-A2A-Studio`
- Best used for verification tasks (like Antigravity), not multi-file edits
- If used again, give it a strict handoff ticket and monitor closely

---

## 📋 Current Task Lineup (as of 2026-03-06)

### Master (Windsurf/Cascade) — ACTIVE

| Priority | Task | Status |
|----------|------|--------|
| — | Orchestrate all agents, merge branches, update milestones | Ongoing |
| — | Create handoff tickets for new work | As needed |
| DONE | CX-018: Render Pipeline section on DiagnosticsPage | ✅ `91faaae4` |
| DONE | Merge CC-M9-METRICS into main | ✅ `face3aee` |
| DONE | Rewrite CLAUDE.md + AGENT-OPS.md v1.3.0 | ✅ `6836785d` |
| DONE | Sync Documents/GitHub copy | ✅ Both at `6836785d` |

### Claude Code — STANDBY (all M9 tickets delivered)

| Priority | Task | Status |
|----------|------|--------|
| DONE | CC-M9-CP: checkRemotion() in control-plane.ts | ✅ `2e4fdd50` |
| DONE | CC-M9-E2E: test-remotion-e2e.mjs | ✅ `a3362ff1` |
| DONE | CC-M9-METRICS: SSE cost/time tracking | ✅ `0c37cab9` → `face3aee` |
| WAIT | Verify `just m9-e2e` in REAL mode | Blocked on HO-007 keys |
| FUTURE | M10 backend prep | No ticket yet — Master will assign |

**Session start**: `cat CLAUDE.md` then `just orient-claude-m9`

### Codex #2 — ACTIVE (parallel track — decoupled from deployment)

| Priority | Task | Status |
|----------|------|--------|
| DONE | CX-016: Diagnostics UI route | ✅ `21728664` |
| DONE | CX-017: PlatformToggle.tsx | ✅ `16cf32c9` |
| **NEXT** | **CX-019 Phase 1: Wire final invoice into metrics panel** | 🟢 UNBLOCKED |
| NEXT | CX-019 Phase 2: Wire real-time SSE cost into PipelineProgress | 🟢 UNBLOCKED (CC-M9-METRICS delivered) |
| FUTURE | M10 UI: engagement reporting | No ticket yet |

**Session start**: `just orient-codex-m9` then `cat plans/HANDOFF_CODEX2_CX-019.md`

**Files to edit**: `src/App.jsx`, `src/components/PipelineProgress.tsx`
**Files NOT to edit**: `PlatformToggle.tsx`, `ResultsPreview.tsx` (M8 frozen), anything in `netlify/functions/`

### Antigravity — STANDBY (verification queue)

> **Instruction:** Hold position. Await Netlify Agent's green light on healthcheck-cloud,
> then immediately run Three Rings verification (control-plane + CLI + UI).

| Priority | Task | Status |
|----------|------|--------|
| DONE | AG-014: M7 verification receipt | ✅ Signed |
| ✅ | CC-M9-CP verified | checkRemotion() exists |
| ✅ | CC-M9-E2E verified | test-remotion-e2e.mjs exits 0 |
| ✅ | CX-018 verified | Render Pipeline section exists |
| ✅ | CC-M9-METRICS verified | SSE cost/time wired |
| **NEXT** | **Three Rings: control-plane + CLI + UI agree on Remotion state** | ⏳ After env-backed redeploy |

**Session start**: `just orient-antigravity-m9`

**Do NOT run until Netlify Agent confirms healthcheck-cloud passes.** Then:
```bash
npm run build
just sanity-test-local
just control-plane-gate
just m9-e2e
```

### Netlify Agent — BLOCKED (pending env-backed redeploy + cloud verify)

> **Status correction (2026-03-06):** Production deploy already exists for current main.
> Blocker is NOT first deploy. Blocker is HO-006/HO-007 env var confirmation in Netlify Dashboard.
> Function env changes require a fresh build+deploy to take effect.

| Priority | Task | Status |
|----------|------|--------|
| DONE | Initial production deploy | ✅ Code is live, 36 functions deployed |
| **BLOCKED** | **Confirm HO-006 + HO-007 keys in Netlify Dashboard** | ⏳ Waiting on Human-Ops |
| NEXT | Trigger fresh redeploy after env vars confirmed | ⏳ After KEYS SET signal |
| NEXT | Post-redeploy: `just healthcheck-cloud` + `just control-plane-verify-cloud` | ⏳ After redeploy |
| NEXT | `just m9-e2e` — should show REAL mode, not FALLBACK | ⏳ After verify |

**Session start**: `just orient-netlify` then `cat plans/HANDOFF_NETLIFY_AGENT.md`

**Do NOT trigger rebuild until Human-Ops signals "KEYS SET".** Then:
```bash
just deploy                          # Fresh build picks up new env vars
just healthcheck-cloud
just control-plane-verify-cloud
just m9-e2e
```

### Human-Ops (Scott) — ACTION REQUIRED

| Priority | Task | Status |
|----------|------|--------|
| **HIGH** | HO-007: Set Remotion AWS keys in Netlify Dashboard | ⏳ **M9 BLOCKER** |
| **HIGH** | HO-006: Set ELEVENLABS_API_KEY in Netlify Dashboard | ⏳ **M9 BLOCKER** |
| DONE | HO-001: Rotate LinkedIn secrets | ✅ Rotated |
| MEDIUM | HO-003: Set LINEAR_API_KEY + enable Linear↔GitHub | ⏳ Pending |
| LOW | HO-004: Verify Netlify Dashboard build settings | ⏳ Pending |

**Guide**: `just orient-human-m9` or read `docs/ENV-REMOTION.md`

---

## 🔗 The Harness Chain (Wire-to-Wire)

```
MASTER.md (North Star — everyone reads this)
    │
    ├── CLAUDE.md (Claude Code's instructions)
    ├── AGENT-OPS.md (all agents' operational rules + tasks)
    ├── AGENTS.md (THIS FILE — registry + lineup)
    │
    ├── plans/HANDOFF_CLAUDECODE_*.md (Claude Code's tickets)
    ├── plans/HANDOFF_CODEX2_*.md (Codex #2's tickets)
    ├── plans/HANDOFF_NETLIFY_AGENT.md (Netlify Agent's ticket)
    │
    └── justfile (60+ recipes — the operating system)
        ├── just orient-claude-m9
        ├── just orient-codex-m9
        ├── just orient-antigravity-m9
        ├── just orient-netlify
        └── just orient-human-m9
```

Every agent enters through the same door:
1. Read `MASTER.md` (milestones, rules)
2. Read their instruction file (boundaries, commands)
3. Run their `just orient-*` command (current context)
4. Read their handoff ticket in `plans/` (exact task)
5. Work → gates → commit → report to Master

---

## 🎯 Core Patterns (All Agents Must Follow)

| Pattern | Description | Implementation |
|---------|-------------|----------------|
| **No Fake Success** | Disabled services report `{ success: false, disabled: true }` | All publishers |
| **Click2Kick** | Read Before Execute + prereq check + verification | justfile commands |
| **Commons Good** | 20% markup on API costs | `cost.markup: 0.20` |
| **runId Threading** | Trace every agent call | `{ projectId, runId, ...payload }` |
| **Gate Before Merge** | `npm run build` + `just sanity-test-local` + `just control-plane-gate` | Every commit |

---

## 🛡️ Security Rules (All Agents)

1. **Never commit secrets** — `.gitignore` includes `.env`, `credentials.json`
2. **Always dry-run first** — `just x-dry`, `just linkedin-dry`, `just youtube-dry`
3. **No local FFmpeg in Functions** — Use Remotion Lambda
4. **Boolean presence checks only** — Never log env var values, only `!!process.env.KEY`
5. **Canonical workspace only** — Push only from `c:\WSP001\SirTrav-A2A-Studio`

---

## � Agent Contributions (Commit Log)

| Date | Agent | Contribution | Commit |
|------|-------|--------------|--------|
| 2026-01 | Claude Code | Remotion Lambda architecture | — |
| 2026-01 | Claude Code | IntroSlate + EmblemComposition | — |
| 2026-01-27 | Windsurf/Cascade | justfile (30+ commands) | — |
| 2026-02 | Windsurf/Cascade | Control plane, split verdicts, repo hygiene | v3.0.0 |
| 2026-03-02 | Windsurf/Cascade | M7 backend: control-plane.ts + AG-014 | `88d7fe69` |
| 2026-03-02 | Codex #2 | CX-016: Diagnostics UI | `21728664` |
| 2026-03-03 | Codex #2 | CX-017: PlatformToggle.tsx | `16cf32c9` |
| 2026-03-03 | Claude Code | CC-019: Editor graceful degradation | `9f076332` |
| 2026-03-04 | Claude Code | CC-M9-CP: checkRemotion() | `2e4fdd50` |
| 2026-03-04 | Claude Code | CC-M9-E2E: test-remotion-e2e.mjs | `a3362ff1` |
| 2026-03-05 | Windsurf/Cascade | CX-018: Render Pipeline section | `91faaae4` |
| 2026-03-05 | Claude Code | CC-M9-METRICS: SSE cost tracking | `0c37cab9` |
| 2026-03-05 | Windsurf/Cascade | Merge CC-M9-METRICS | `face3aee` |
| 2026-03-06 | Windsurf/Cascade | CLAUDE.md rewrite + AGENT-OPS v1.3.0 | `6836785d` |
| 2026-03-06 | Windsurf/Cascade | AGENTS.md v2.0.0 (this update) | — |

---

## 🔄 Session Handoff Protocol

When starting a new session with ANY agent, provide this context:

```
Project: SirTrav-A2A-Studio
Path: c:\WSP001\SirTrav-A2A-Studio  ← ONLY this path
Read: MASTER.md, AGENTS.md, AGENT-OPS.md
Run: just orient-<your-agent>-m9
Then: cat plans/HANDOFF_<YOUR_AGENT>_<TICKET>.md
```

---

*This file is the team registry. All agents read it before starting work.*

**For the Commons Good** 🎬
