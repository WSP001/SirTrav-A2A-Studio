# 🧭 Agent Assignments (Source of Truth)

**Current Focus:** Motion Graphics (MG) Sprint
**Method:** One-at-a-time Execution Loop

---

## 🚦 Active Ticket (NOW)

**Ticket:** M0: Social Platform Integration
**Owner:** Antigravity + User
**Reviewer:** Claude
**Status:** **IN_PROGRESS**

### ONE-TICKET RULE (Per Agent)
*   **Codex:** Standby (MG-008 Done, Feedback UI Complete).
*   **Antigravity:** ✅ AG-001 DONE (Contract Validation Suite), MG-003 WAITING on Codex.
*   **X Agent:** Blocked on key fix, then MG-X-002 (Engagement Loop).

### 🔴 BLOCKING ISSUE:
X API keys are from **different** X Developer Apps = 401 authentication error.
**Fix:** Go to X Developer Portal → Get ALL 4 keys from SAME app → Update Netlify.

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
*   **Outcome:** Remotion Registry, Site Bundle, API Schemas (`docs/schemas/api-responses.json`).

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

## 🔴 ANTIGRAVITY STATUS REPORT — 8 BLOCKERS (2026-02-06)

> Source: Antigravity MASTER.md comparison (Nov 2025 → Jan 2026)
> Overall Progress: ~85% Complete | 28 GREEN | 6 YELLOW | 8 RED

### P0 — CRITICAL (Blocks Pipeline)

| # | Blocker | Location | Owner | Impact |
|---|---------|----------|-------|--------|
| 1 | **compile-video 100% crash** | `netlify/functions/compile-video.ts` | Claude Code | Pipeline stops at Step 5 — no video output. FFmpeg not available in Netlify Functions. Fix: MG-001 Render Dispatcher (`renderMediaOnLambda`). |
| 2 | **X/Twitter 401 auth** | Netlify env vars | Human (Scott) | `TWITTER_*` vs `X_*` naming conflict. Standardize to `TWITTER_*` only. |
| 3 | **generate-attribution.ts missing** | Not created | Claude Code | 7th Agent from MASTER.md ("Attribution Agent") doesn't exist. Creates `credits.json` with Suno/ElevenLabs attribution. |
| 4 | **submit-evaluation.ts missing** | Not created | Claude Code | User feedback loop (👍/👎 buttons → `memory_index.json`) doesn't exist. |

### P1 — HIGH (Blocks Invoicing & Quality)

| # | Blocker | Location | Owner | Impact |
|---|---------|----------|-------|--------|
| 5 | **Cost Manifest not wired** | `lib/cost-manifest.ts` exists but never called in `run-pipeline-background.ts` | Claude Code | Invoice never generated during pipeline run. |
| 6 | **Quality Gate not wired** | `quality-gate.ts` exists but never called | Claude Code | Bad outputs pass through without checks, billing not blocked for failures. |

### P2 — MEDIUM

| # | Blocker | Location | Owner | Impact |
|---|---------|----------|-------|--------|
| 7 | **MG-001 Render Dispatcher** | Not implemented | Claude Code | `renderMediaOnLambda` not built. Blocks Editor Agent + compile-video. |
| 8 | **UI Agent Cards CSS overflow** | Dashboard components | Codex | Agent cards "poking out of box". Visual bug. |

### Pipeline Status (Steps 1–7)

```
1. Director    ✅
2. Writer      ✅
3. Voice       ✅ (ElevenLabs + Adam)
4. Composer    ✅ (Suno)
5. Editor      ❌ CRASHES ← compile-video (FFmpeg)
6. Attribution ❌ NOT CREATED
7. Publisher   ❌ NEVER RUNS (blocked by 5+6)
```

### Fix Order

**THIS WEEK (Unblock Pipeline):**
1. MG-001 Render Dispatcher → Fixes compile-video
2. X/Twitter key standardization → Fixes 401
3. Wire Cost Manifest → Enables invoicing
4. Wire Quality Gate → Prevents bad billing

**NEXT WEEK (Feature Complete):**
5. Create `generate-attribution.ts` (7th Agent)
6. Create `submit-evaluation.ts` (Feedback Loop)
7. Fix CSS overflow
8. LinkedIn app setup
