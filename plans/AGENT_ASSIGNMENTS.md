# 🧭 Agent Assignments (Source of Truth)

**Current Focus:** Motion Graphics (MG) Sprint
**Method:** One-at-a-time Execution Loop

---

## 🚦 Active Ticket (NOW)

**Ticket:** CC-SOCIAL-NORM — Normalize publisher response contracts
**Owner:** Claude (Backend)
**Reviewer:** Antigravity
**Status:** **IN_PROGRESS** (2026-02-18)

### ONE-TICKET RULE (Per Agent)
*   **Codex:** Standby — next task: Error Boundary + Diagnostics Panel
*   **Antigravity:** Standby — update verify-golden-path.mjs for SOCIAL_ENABLED
*   **Claude:** CC-SOCIAL-NORM (this session)

### 🏆 MILESTONE ACHIEVED (2026-02-18):
**X/Twitter LIVE — Real Tweets Posted from Cloud**
| Test | Result |
|------|--------|
| Env vars in Netlify | 4/4 TWITTER_* keys present |
| Cloud healthcheck | 2/5 social platforms (YouTube + X/Twitter = MVP ✅) |
| Local OAuth test | Authenticated as @Sechols002 |
| Local tweet | ID: 2022413188155728040 |
| Cloud tweet | ID: 2022414239688794214 |
| Cost Plus 20% | $0.001 base + $0.0002 markup = $0.0012 total |
| No Fake Success | `success: true` with real tweetId |

Live tweets: https://x.com/Sechols002/status/2022413188155728040

### 🔧 Workflow Available:
Run `/fix-x-api` or read `.agent/workflows/fix-x-api.md` for step-by-step guide.

---

## 📋 Backlog (Prioritized)

### P0 — Core Infrastructure (Completed Sprint)

#### 🎬 MG-001 to MG-003 (Motion Pipeline) ✅
*   **Status:** **Done** (Verified 2026-01-22)
*   **Outcome:** 7-Agent Pipeline, Click-to-Kick UI, Smoke Test Passing.

---

### P1 — Scalability (Completed)

#### 🧙 MG-004 to MG-006 (Registry & Contracts) ✅
*   **Status:** **Done** (Verified 2026-01-22)
*   **Outcome:** Remotion Registry, Site Bundle, API Schemas (`artifacts/contracts/social-post.schema.json`, legacy: `docs/schemas/api-responses.json`).

---

### P2 — Regenerative Loop (Current Focus)

#### 🧠 MG-007 (Claude) — Feedback Capture ✅
*   **ID:** MG-007
*   **Status:** **Done** (2026-01-22)
*   **Outcome:** Feedback persists to `evalsStore` and local memory.

#### 🧭 MG-008 (Codex) — Feedback UI 👈 **IN_PROGRESS**
*   **ID:** MG-008
*   **Priority:** P2
*   **Owner:** Codex
*   **Status:** **IN_PROGRESS** (2026-01-22)
*   **Goal:** Connect UI "Thumbs Up/Down" to `submit-evaluation` endpoint.
*   **DoD:**
    *   [ ] User can click rating.
    *   [ ] Toast notification appears.
    *   [ ] Error handling for network failure.

---

## 🐦 X Agent Backlog (Parallel / Non-Colliding)

#### 🔑 MG-X-LIVE (Antigravity) — Verify X Keys & Publishing ✅
*   **ID:** MG-X-LIVE
*   **Owner:** Antigravity (Test Ops)
*   **Status:** **DONE** (Functions Ready, UI Added, 401 Confirmed)
*   **Goal:** Verify LIVE X API keys function correctly (no "fake success").
*   **Note:** Backend and UI are wired. Keys failed 401 verification (Mismatch). User is aware.
*   **Outcome:** `publish-x.ts` uses OAuth 1.0a. UI has "Post to X" button.

#### 📣 MG-X-002 (X Agent) — Engagement Loop 👈 **IN_PROGRESS**
*   **ID:** MG-X-002
*   **Owner:** X Agent (Ops)
*   **Status:** **IN_PROGRESS**
*   **Goal:** Read replies from X and feed them back into the Memory system for "Regenerative Content" (U2A Feedback).
*   **Deliverables:**
    1.  `netlify/functions/check-x-engagement.ts` (Backend)
    2.  `docs/ENGAGEMENT_TO_MEMORY.md` (Spec)
    3.  Integration with `memory-vault` (Read comments -> Store in Vault).

#### 📣 MG-X-001 — X Release Thread Template
*   **ID:** MG-X-001
*   **Status:** **Done** (2026-01-22)
*   **Goal:** Create `docs/X_RELEASE_TEMPLATE.md` aligned with truth behavior (enabled vs disabled).

#### 📝 MG-X-002 — X Publishing Contract Spec
*   **ID:** MG-X-002
*   **Owner:** X Agent
*   **Status:** Backlog
*   **Goal:** Create `docs/X_PUBLISH_CONTRACT.md` with request/response schemas.

#### 📈 MG-X-003 — Engagement to Memory Loop
*   **ID:** MG-X-003
*   **Owner:** X Agent
*   **Status:** Backlog
*   **Goal:** Create `docs/ENGAGEMENT_TO_MEMORY.md` defining signal-to-learning flows.

#### 🧷 MG-X-004 — Share Card QA Checklist
*   **ID:** MG-X-004
*   **Owner:** X Agent
*   **Status:** Backlog
*   **Goal:** Create `docs/SHARE_CARD_QA.md` for OpenGraph/Twitter card validation.

#### 🧹 MG-X-005 — Backlog Hygiene
*   **ID:** MG-X-005
*   **Owner:** X Agent
*   **Status:** Backlog
*   **Goal:** Maintain `plans/AGENT_ASSIGNMENTS.md` as single source of truth.

---

## 🔒 Role Boundaries
*   🧑💻 **Codex (UI):** Dashboard, Player, Error UX.
*   🧠 **Claude (Backend):** Dispatcher, Validation, Storage, Remotion Calls.
*   🧪 **Antigravity (Tests):** Smoke Tests, Contract Tests, CI Gates.
*   🐦 **X Agent (Ops):** Release Comms, Attribution, Signal, Specs (Non-Coding).

---

## 📖 Read-First Gate (ALL AGENTS)

Before touching code, every agent MUST read these files in order:
1. `CLAUDE.md`
2. `plans/AGENT_ASSIGNMENTS.md`
3. `docs/CODEX_AGENT_PLAYBOOK.md`
4. `docs/COMMONS_GOOD_JOBS.md` 👈 **(NEW: Specific Task Allocations)**
5. `CLAUDE_CODE_HANDOFF.md`

Then begin with this statement:
> "I read CLAUDE.md + AGENT_ASSIGNMENTS.md + COMMONS_GOOD_JOBS.md and I am working ticket MG-XXX."

---

## 🧠 Claude Reviewer Instructions (MG-002)

**Role:** Reviewer ONLY (do not edit UI files during MG-002)

### Review Checklist (must leave comments if any fail):
*   [ ] Endpoint paths exactly match backend:
    *   `/.netlify/functions/render-dispatcher`
    *   `/.netlify/functions/render-progress`
*   [ ] Payload includes U2A fields: `voiceStyle`, `videoLength`
*   [ ] No fake success: disabled features shown as disabled in UI
*   [ ] Progress polling is bounded (max time or max retries)
*   [ ] Error UX is human-readable with recovery action

### If Backend Mismatch Found:
*   Do NOT patch backend during MG-002 unless it's a one-line contract fix
*   Request changes in PR review, OR
*   Open follow-up ticket `MG-002b` (Backend contract alignment) after MG-002 merges

---

## 🚀 Sprint Execution Order

1. **Codex** executes MG-002 (only UI files)
2. **Claude** reviews MG-002 (comments only, unless contract is broken)
3. **Codex** fixes review comments
4. **Merge MG-002**
5. **Antigravity** executes MG-003 (tests + CI gate)
6. **Claude** reviews MG-003
7. **Merge MG-003**
8. Next ticket becomes eligible (MG-004 / MG-006 / CSS overflow, etc.)

---

## ✅ Completed

| ID | Owner | Goal | Completed |
|----|-------|------|-----------|
| CC-Task 1 | Claude | Consume platform + brief in start-pipeline.ts | 2026-01-21 |
| CC-Task 2 | Claude | Align healthcheck.ts with ENV docs | 2026-01-21 |
| CC-Task 3 | Claude | Plug Upload.tsx into intake-upload.ts | 2026-01-21 |
| CC-Task 4 | Claude | Update App.jsx with Auth header + platform/brief | 2026-01-21 |
| MG-001 | Claude | Render Dispatcher Backend (renderMediaOnLambda wrapper) | 2026-01-21 |
| MG-P0-C | Claude | X/Twitter truth alignment (no fake success) | 2026-01-21 |
| MG-002 | Codex | Click-to-Kick UI + Progress + U2A Prefs | 2026-01-22 |
| MG-003 | Antigravity | Motion Render Smoke Test (scripts/test_motion_graphic.mjs) | 2026-01-22 |
| MG-007 | Claude | Feedback Capture Backend | 2026-01-22 |
| MG-008 | Codex | Feedback UI (Toasts + Error Handling) | 2026-01-23 |
| MG-X-LIVE | Antigravity | X Publishing Backend & UI (OAuth 1.0a Wired) | 2026-01-23 |
| WM-001 | Windsurf Master | Corrected 8→3 blockers, proved pipeline FULLY WIRED (12/12 checks) | 2026-02-06 |
| WM-002 | Windsurf Master | `just wiring-verify` + `just no-fake-success-check` + `just rc1-verify` + `just master-status` | 2026-02-06 |
| WM-003 | Windsurf Master | Updated NETLIFY_AGENT_PROMPT.md with Remotion Lambda + X/Twitter env vars | 2026-02-06 |
| WM-004 | Windsurf Master | Auto-detect local/cloud in verify-golden-path.mjs + test-x-publish.mjs | 2026-02-06 |
| WM-005 | Windsurf Master | `just golden-path-cloud` + `just healthcheck-cloud` + `just golden-path-local` | 2026-02-06 |
| CC-NFS-1 | Claude Code | No Fake Success on all 5 publishers (disabled:true, not placeholder) | 2026-02-06 |
| CC-VAL-1 | Claude Code | Payload validation: validateXPayload, validateLinkedInPayload, validateYouTubePayload | 2026-02-06 |
| CC-ENV-1 | Claude Code | .env.example updated with TWITTER_* + LINKEDIN_* templates | 2026-02-06 |
| CC-HC-1 | Claude Code | healthcheck.ts: better error messages for missing social keys | 2026-02-06 |
| WM-006 | Windsurf Master | Rewrote `NETLIFY_AGENT_PROMPT.md` as 7-task structured handoff (commit e879d1e) | 2026-02-10 |
| WM-007 | Windsurf Master | Created `docs/COMMONS_AGENT_JUSTFILE_FLOW.md` — command-by-command agent matrix (commit 42a6d3f) | 2026-02-11 |
| CC-CYCLE-1 | Claude Code | Cycle gate system + @netlify/vite-plugin + TWITTER_ key standardization (commit 098f384) | 2026-02-11 |
| NAR-001 | Netlify Agent | Netlify Agent Runner report — verified deployment status + team instructions (commit 1ab5a9f) | 2026-02-12 |
| CC-SEC-1 | Claude Code | Updated @aws-sdk/client-s3 to latest — resolves 15 npm vulnerabilities (commit 1c1d5d4) | 2026-02-12 |
| AG-XLIVE | Antigravity | X/Twitter LIVE — 3 verified tweets + updated reports (commit 17b021f) | 2026-02-13 |
| CX-HERO | Codex | Premium hero section with SirTrav signature plaque + agent orbit (commit 86b764a) | 2026-02-13 |
| CC-GATE-V3 | Claude Code | Cycle gate system v3 + agent skill docs + lean protocol (branch: claude/trusting-hamilton, commit d60e36a) | 2026-02-14 |
| CC-SKILLS | Claude Code | Agent skill docs: WINDSURF_MASTER, CLAUDE_CODE, CODEX, HUMAN_OPERATOR, ANTIGRAVITY (.agent/skills/) | 2026-02-14 |
| CC-AGENTIC | Claude Code | Agentic end-to-end test harness (test-agentic-twitter-run.mjs) — 6/6 PASS + real tweet posted | 2026-02-14 |
| WM-008 | Windsurf Master | Fixed WSP001 local main divergence (backup/local-main-aaf2d05f saved, reset to origin/main) | 2026-02-14 |
| WM-009 | Windsurf Master | Phase 3 diagnostics: 12/12 wiring ✅, 8/8 NFS ✅, both repos synced to origin/main | 2026-02-14 |
| CC-0004 | Claude Code | Engagement Loop Backend: twitter-api-v2, evalsStore memory, sentiment analysis, runId threading | 2026-02-17 |
| CC-0005 | Claude Code | Invoice Generation Script: Cost Plus 20%, 5-service line items, --demo mode | 2026-02-17 |
| CC-HC-2 | Claude Code | Healthcheck MVP semantics: X+YouTube=ok, others=disabled (not degraded) | 2026-02-17 |

---

## 🔐 Constraints (CLAUDE.md)

- Never run local `ffmpeg`/`remotion render` inside Netlify Functions (timeouts)
- Use Remotion Lambda kickoff + progress polling
- Netlify Background Functions max ~26s - video rendering belongs in Remotion Lambda
- Always thread `runId` through every agent call for tracing
- **No Fake Success:** Social publishers return `{ success: false, disabled: true }` when keys missing
- **Local Dev:** Always run `netlify dev` (port 8888) not just `vite dev`

---

## 🛰️ WINDSURF MASTER REVIEW — STATUS (2026-02-06)

The following are **fixed and must not be "re-fixed"**:

- ✅ Vite outDir → `dist`
- ✅ `netlify.toml` publish → `dist`
- ✅ Build command → `npm install --include=dev && npm run build`
- ✅ Storage fallback uses `/tmp` with `NETLIFY_BLOBS_CONTEXT` detection
- ✅ `start-pipeline.ts` lock mechanism fixed (check-then-set, not broken `onlyIfNew`)
- ✅ `index.html` has loading fallback + `window.onerror` capture
- ✅ `public/_redirects` added for SPA routing
- ✅ Golden Path: start-pipeline → SSE → results now works (status `queued`/`running`)
- ✅ `verify-golden-path.mjs` aligned with real system behavior (accepts `running` as success)

**Golden Path CI may still show warnings** because tests run against a long-running pipeline.
This is expected — the test passes if the pipeline starts, SSE streams, and no hard 5xx errors occur.

---

## 🎯 AGENT TASKS (NEXT PHASE)

### 🤖 Codex — Frontend / Blank-Screen Guard

**Goals:** Ensure the app renders reliably in browser. Surface runtime errors to the user and logs.

**Tasks:**
1. Reproduce the site in Chrome with DevTools open — capture any console error stack traces.
2. Add an error boundary / top-level error panel — show "Something went wrong, see console" instead of blank screen.
3. Add a small "diagnostics" panel in dev mode — shows build hash, healthcheck status, last error message.

**Rules:** No changes to Netlify build command or publish dir.

---

### 🧠 Claude Code — Backend / Contracts

**Goals:** Lock storage + publisher contracts so tests match reality.

**Tasks:**
1. **Storage mode** — Ensure production uses Blobs when `NETLIFY_BLOBS_CONTEXT` is present. Log `storage_mode=blobs|tmp` at function start (no secrets).
2. **Pipeline completion** — Verify background worker completes all 7 agents within timeout. Update tests if needed.
3. **Social publishers** — Normalize responses from all publishers to:
   ```json
   { "platform": "twitter", "status": "ok|error|skipped", "url": "...", "error": "..." }
   ```
   Make tests treat platforms **not** in `SOCIAL_ENABLED` as `skipped`, not `broken`.

---

### 🦅 Antigravity — Tests / Quality Gates

**Goals:** Make CI failures meaningful, not noisy.

**Tasks:**
1. Update `scripts/verify-golden-path.mjs` — respect `SOCIAL_ENABLED` env. Platforms not listed → `SKIPPED`.
2. Adjust timeouts — treat "pipeline started + SSE events + status running" as strong success signal. Only fail on no SSE activity or hard 5xx.
3. Keep "No Fake Success" — if any core step (healthcheck, start, SSE, results) fails, CI must fail with clear reason.

---

### 🛰️ Netlify / Release Engineer — Human-Only

**Tasks (manual):**
1. Confirm Netlify UI matches `NETLIFY_BUILD_RULES.md`.
2. Trigger deploy, then open site, hard refresh (Ctrl+Shift+R).
3. F12 → Console & Network — save screenshot & notes in ticket.

**Rules:** No CLI version hopping (`netlify-cli`) unless explicitly assigned.

---

## 🔴➡️🟢 WINDSURF MASTER VERIFICATION — CORRECTED STATUS (2026-02-06 17:00 PST)

> Source: Windsurf Master code inspection of ALL 6 critical files
> **CORRECTION**: Antigravity's report had 5 false negatives. Most "blockers" are already wired.
> The real issue is **missing Netlify environment variables**, not missing code.

### ✅ ALREADY WIRED (Antigravity Report Was Wrong)

| # | Reported As | Actual Status | Evidence |
|---|------------|---------------|----------|
| 1 | compile-video NOT wired to render-dispatcher | **WIRED** | `compile-video.ts:171-223` calls render-dispatcher, handles 202 response |
| 3 | generate-attribution.ts NOT CREATED | **EXISTS + UPDATED** | 207 lines, has `for_the_commons_good`, `ai_attribution`, `cost_plus_20_percent` |
| 5 | Cost Manifest NOT CALLED | **WIRED** | `run-pipeline-background.ts:16` imports, line 532 instantiates, lines 552-709 tracks all 6 agents |
| 6 | Quality Gate NOT CALLED | **WIRED** | `run-pipeline-background.ts:17` imports, lines 667-690 checks + blocks on failure |
| 7 | MG-001 Render Dispatcher NOT BUILT | **EXISTS** | `render-dispatcher.ts` (260 lines) + `remotion-client.ts` (294 lines) with full Remotion Lambda integration |

### Pipeline Code Status — ALL 7 STEPS WIRED

```text
1. Director    ✅ WIRED → curate-media (OpenAI Vision)
2. Writer      ✅ WIRED → narrate-project (GPT-4)
3. Voice       ✅ WIRED → text-to-speech (ElevenLabs)
4. Composer    ✅ WIRED → generate-music (Suno)
5. Editor      ✅ WIRED → compile-video → render-dispatcher → remotion-client
6. Attribution ✅ WIRED → generate-attribution (Commons Good credits)
7. Publisher   ✅ WIRED → publishVideo (secure signed URL)
+  Cost Manifest ✅ WIRED (20% markup on every agent)
+  Quality Gate  ✅ WIRED (blocks pipeline on failures)
```

**The pipeline runs end-to-end in FALLBACK/PLACEHOLDER mode because env vars are missing.**
When Remotion Lambda env vars are set, Step 5 will produce real video instead of placeholder.

### 🔴 REAL REMAINING BLOCKERS (3 items, not 8)

| # | Blocker | Type | Owner | Fix |
|---|---------|------|-------|-----|
| 1 | **Remotion Lambda env vars missing** | CONFIG | Human (Scott) | Set 4 env vars in Netlify Dashboard: `REMOTION_FUNCTION_NAME`, `REMOTION_SERVE_URL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`. Without these, compile-video returns placeholder. |
| 2 | **X/Twitter 401 auth** | CONFIG | Human (Scott) | All 4 `TWITTER_*` keys must be from the **same** Twitter Developer App. Currently mixed. |
| 3 | **submit-evaluation.ts missing** | CODE | Claude Code | The only truly missing function. User feedback loop (👍/👎 → `memory_index.json`). |

### 🟡 NICE-TO-HAVE (Not blocking pipeline)

| # | Item | Owner | Notes |
|---|------|-------|-------|
| 4 | UI Agent Cards CSS overflow | Codex | Visual bug, not blocking functionality |
| 5 | LinkedIn app OAuth setup | Human (Scott) | Needs LinkedIn Developer App registration |
| 6 | Azure AI Evaluation (`evaluate.py`) | Future | Not run regularly, deferred |

### 🎯 CORRECTED FIX ORDER

**HUMAN TASKS (Scott — do first, agents can't help):**
1. Set Remotion Lambda env vars in Netlify Dashboard → Enables real video rendering
2. Fix X/Twitter API keys (same app) → Fixes 401
3. (Optional) Set up LinkedIn Developer App → Enables LinkedIn publishing

**AGENT TASKS (after env vars are set):**
1. Claude Code: Create `submit-evaluation.ts` (feedback loop)
2. Codex: Fix CSS overflow
3. Antigravity: Re-run `just golden-path-cloud` to verify real video output

---

## 🛰️ WINDSURF MASTER REVIEW — PHASE 3 STATUS (2026-02-14)

### Git State (Both Repos Synced)

| Repo | Branch | HEAD | Status |
|------|--------|------|--------|
| `C:\Users\Roberto002\Documents\Github\SirTrav-A2A-Studio` | `main` | `86b764af` | ✅ Clean, up to date with origin/main |
| `C:\WSP001\SirTrav-A2A-Studio` | `main` | `86b764af` | ✅ Reset to origin/main (was 84 behind) |
| `C:\WSP001\...\trusting-hamilton` (worktree) | `claude/trusting-hamilton` | `d60e36ac` | ✅ Pushed, 1 commit ahead of main |

**Orphan commit preserved:** `backup/local-main-aaf2d05f` branch in WSP001

### Pending PR: `claude/trusting-hamilton` → `main`

This branch adds:
- Cycle gate system v3 (cycle-next, cycle-orient, cycle-gate, cycle-status, etc.)
- Agent skill docs (.agent/skills/*.md)
- Lean protocol v3 for token budget management
- @netlify/vite-plugin integration in vite.config.js
- Enhanced scripts/cycle-check.mjs

⚠️ **WARNING:** This branch REMOVES 570 lines from justfile (wiring-verify, no-fake-success-check, rc1-verify, master-status, all task-tracking, agent-status, check-layers-1-2, etc.). Review carefully before merge.

**PR URL:** https://github.com/WSP001/SirTrav-A2A-Studio/pull/new/claude/trusting-hamilton

### Diagnostics (2026-02-14)

```
just wiring-verify:          12/12 ✅
just no-fake-success-check:   8/8 ✅
```
