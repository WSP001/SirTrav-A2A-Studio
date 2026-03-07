# AGENT-OPS.md — SirTrav A2A Studio Agent Operations

**Version:** 1.3.0
**Last Updated:** 2026-03-06
**Signed by:** Windsurf/Cascade (Acting Master, WSP001)

---

## Current State

- **M8:** ✅ FROZEN at `0d220f72` — do NOT re-open without a bug ticket
- **M9:** 🔴 Deployed but runtime blocked — HO-007 (Remotion AWS keys) + HO-006 (ElevenLabs) not yet confirmed in Netlify Dashboard. Function env changes require redeploy.
- **M10:** 📋 Scoped to X + YouTube only; Instagram/TikTok parked
- **Source of truth:** `c:\WSP001\SirTrav-A2A-Studio` on `main`

---

## Next CLI Actions (per agent)

### Master (Windsurf/Cascade)

**Scope:** Coordination, milestones, cross-repo awareness.

```bash
git pull origin main
just cockpit
# Review MASTER.md M9/M10; M8 is DONE at 0d220f72.
```

**Standing order:**
> M8 is CLOSED at `0d220f72`. Nobody touches `PlatformToggle.tsx` or `ResultsPreview.tsx` without a bug ticket. All new work is M9 (Remotion) or M10 (Engagement Loop), both blocked on real keys from Human-Ops.

---

### Human-Ops (Scott / WSP001)

**Scope:** Unblock M9/M10 with real credentials.

**For M9 (Remotion E2E video):**

1. Follow `docs/ENV-REMOTION.md` to deploy Remotion Lambda
2. Set in Netlify Dashboard (never in code):
   - `REMOTION_SERVE_URL`
   - `REMOTION_FUNCTION_NAME`
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
3. Set `ELEVENLABS_API_KEY` in Netlify Dashboard (HO-006)

**For M10 (Engagement Loop):**

- M10 scope = **X + YouTube only**
- Instagram + TikTok are **PARKED** until keys and compliance are ready

**After keys are set, announce to agents:**
> "M9 is now UNBLOCKED: Remotion keys are present in Netlify env. M10 remains blocked for Instagram/TikTok; only X + YouTube are in scope."

---

### Claude Code (Backend / Remotion — M9)

**Scope:** M9 Remotion readiness and E2E video test.

**Quick start:** `just orient-claude-m9`

**Ticket 1: CC-M9-CP** — ✅ DELIVERED at `2e4fdd50`
- Added `checkRemotion()` to `control-plane.ts` (lines 296–323)
- Wired `remotion` into handler response (line 347)
- Added `remotion=real|fallback|disabled` to verdict reasons (lines 246–247)
- Does NOT affect verdict colors (informational only)

**Ticket 2: CC-M9-E2E** — ✅ DELIVERED at `a3362ff1`
- Created `scripts/test-remotion-e2e.mjs` (178 lines)
- Uses IntroSlate composition, reports fallback honestly
- Fixed `just m9-e2e` recipe to allow readiness check to warn

**Both tickets verified by Master at `a3362ff1` on main.**

**Ticket 3: CC-M9-METRICS** — ✅ DELIVERED at `0c37cab9`, merged to main at `face3aee`
- Added `getRunningTotal()` to `ManifestGenerator` in `lib/cost-manifest.ts`
- Wired `runningCost` + `elapsedMs` into all 7 `updateRun()` calls in `run-pipeline-background.ts`
- Fixed `compositions: 4` → `7` in `checkRemotion()` (`control-plane.ts`)
- Worktree: `claude/vigilant-mahavira` — merged by Master (Windsurf/Cascade)

**Future work (when HO-007 keys arrive):**
- Verify `just m9-e2e` reports REAL mode (not FALLBACK)
- No code changes needed — auto-upgrades when keys present

---

### Codex #2 (Frontend / UX)

**Scope:** Only touch UI when there is a clear ticket.

**Quick start:** `just orient-codex-m9`

**Completed ticket:** CX-018 — ✅ DELIVERED at `91faaae4` by Windsurf/Cascade (Acting Master)
- Render Pipeline (Remotion) section added to `DiagnosticsPage.jsx`
- Mode badge (emerald/amber/gray), boolean PRESENT/MISSING tiles, blocker banner
- Version badge bumped CX-016 → CX-018
- Genie attempted this but edited wrong repo — Master took over and delivered

**Active ticket:** CX-019 — Wire Metrics Panel to Live Pipeline Cost + Time

**Rules:**

- ⛔ No more M8 work — `PlatformToggle.tsx` and `ResultsPreview.tsx` are frozen
- ⚠️ **READ BEFORE WRITE** — always `cat` the real file before citing line numbers or code. Codex #2's M9 map (2026-03-04) had 12/13 citations wrong, 3 fabricated function names. The flow logic was correct but code details were hallucinated. This is not acceptable for production edits.
- Only edit `src/pages/DiagnosticsPage.jsx` for CX-018 — no other files

**Next ticket (after CX-018):** CX-019 — Wire Metrics Panel to Live Pipeline Cost + Time
- Phase 1 (no dependency): Wire `data.artifacts.invoice` into `setMetrics` in `handlePipelineComplete`
- Phase 2 (after CC-M9-METRICS): Read `runningCost` from SSE events in `PipelineProgress.tsx`
- See `plans/HANDOFF_CODEX2_CX-019.md`

**Future tasks (after CX-019):**

- M10 UI for engagement reporting (only when `check-x-engagement` and keys exist)

```bash
git pull origin main
just cockpit
# Work in feature branch only when ticket exists
```

---

### Antigravity (QA / Truth Serum)

**Scope:** Keep milestones honest; run gates.

**Quick start:** `just orient-antigravity-m9`

```bash
git pull origin main
npm run build
just sanity-test-local
just control-plane-gate
just m9-e2e
```

**M9 Verification checklist:**

- ✅ CC-M9-CP: `checkRemotion()` exists in `control-plane.ts`
- ✅ CC-M9-E2E: `test-remotion-e2e.mjs` exits 0 in fallback mode
- ✅ CX-018: Render Pipeline section in DiagnosticsPage (Master, `91faaae4`)
- ✅ CC-M9-METRICS: SSE cost/time tracking wired (Claude Code, `0c37cab9`, merged `face3aee`)
- ⏳ Three Rings agree: control-plane + CLI + UI show same Remotion state

**Standing order:**
> Do NOT mark M9 as DONE until the E2E dry-run script reports success and control-plane sees Remotion health as ok.

---

### Netlify Agent (Deployment & Cloud Ops)

**Scope:** Deploy, verify cloud health, audit env var presence.

**Quick start:** `just orient-netlify`

**Spec:** `plans/HANDOFF_NETLIFY_AGENT.md`

> **Status correction (2026-03-06):** Production deploy already exists for current main.
> Blocker is NOT first deploy. Blocker is HO-006/HO-007 env var confirmation in Netlify Dashboard.
> Function env changes require a fresh build+deploy to take effect.

**Current mission: Environment Variable Redeploy & Cloud Verification**

Do NOT trigger rebuild until Human-Ops signals "KEYS SET". Then:

```bash
just deploy                          # Fresh build picks up new env vars
just healthcheck-cloud
just control-plane-verify-cloud
just m9-e2e
```

**Rules:**

- ⛔ Do NOT modify application code
- ⛔ Do NOT set env vars — that's Human-Ops
- ⛔ Do NOT trigger rebuild before Human-Ops confirms KEYS SET
- ✅ Report deploy status to Master after each deploy

---

## SeaTrace003 (Business Repo)

**Rules:**

- Do NOT re-push old cockpit to `origin/main` yet
- Master will decide how to re-attach 5x5 protocol to new vessel code
- Work only on feature branches that don't change governance (`cockpit/`, `AGENT-OPS.md`) for now

---

## SirTrav Copies — Source of Truth

| Location | Role |
|----------|------|
| `c:\WSP001\SirTrav-A2A-Studio` | **WRITE** — only active workspace |
| `C:\Users\Roberto002\Documents\GitHub\SirTrav-A2A-Studio` | Archive / read-only |
| `C:\Users\Roberto002\OneDrive\Sir James\SirTrav-A2A-Studio` | Archive / read-only |

**Rule:** No agent pushes from any copy except `WSP001`.

---

## Token-Efficient Orientation Commands

Every agent runs ONE command at session start to get full M9 context:

| Agent | Command | Tokens Saved |
|-------|---------|-------------|
| Claude Code | `just orient-claude-m9` | ~5 file reads |
| Codex #2 | `just orient-codex-m9` | ~3 file reads |
| Antigravity | `just orient-antigravity-m9` | ~4 file reads |
| Netlify Agent | `just orient-netlify` | ~3 file reads |
| Human-Ops | `just orient-human-m9` | ~2 file reads |

---

*This file is the agent operating manual. All agents read this before starting work.*

**For the Commons Good** 🎬
