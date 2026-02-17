# 🧭 Agent Assignments (Source of Truth)

**Current Sprint:** The Pulse & The Plaque
**Method:** Parallel Execution — each agent owns distinct deliverables
**Date:** 2026-02-15

---

## 🚦 Active Tickets (NOW)

| Agent | Ticket | Status | Deliverable |
|-------|--------|--------|-------------|
| Claude Code | CC-011 + CC-012 | READY | `scripts/harvest-week.mjs` + `scripts/weekly-analyze.mjs` |
| Codex | CX-012 | READY | `src/components/SystemStatusEmblem.tsx` |
| Antigravity | AG-011 | READY | `artifacts/contracts/*.schema.json` + `scripts/validate-weekly-pulse.mjs` |
| Windsurf | WM-006 | DONE | justfile commands wired, task specs created |

### RESOLVED (was blocking, now fixed):
- ~~X API keys from different apps~~ → Fixed. X publish LIVE (tweetId: 2023121795121897961)
- ~~Bun not installed~~ → Bun 1.3.9 on PATH. Project uses Node.
- ~~Schema path mismatch~~ → Aligned to `artifacts/contracts/` everywhere

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
| WM-001 | Windsurf Master | Corrected 8→3 blockers, proved pipeline FULLY WIRED (12/12 checks) | 2026-02-06 |
| WM-002 | Windsurf Master | `just wiring-verify` + `just no-fake-success-check` + `just rc1-verify` + `just master-status` | 2026-02-06 |
| WM-003 | Windsurf Master | Updated NETLIFY_AGENT_PROMPT.md with Remotion Lambda + X/Twitter env vars | 2026-02-06 |
| WM-004 | Windsurf Master | Auto-detect local/cloud in verify-golden-path.mjs + test-x-publish.mjs | 2026-02-06 |
| WM-005 | Windsurf Master | `just golden-path-cloud` + `just healthcheck-cloud` + `just golden-path-local` | 2026-02-06 |
| CC-NFS-1 | Claude Code | No Fake Success on all 5 publishers (disabled:true, not placeholder) | 2026-02-06 |
| CC-VAL-1 | Claude Code | Payload validation: validateXPayload, validateLinkedInPayload, validateYouTubePayload | 2026-02-06 |
| CC-ENV-1 | Claude Code | .env.example updated with TWITTER_* + LINKEDIN_* templates | 2026-02-06 |
| CC-LEAN-1 | Claude Code | Progressive Context-Lean System v3 (cycle-check.mjs) | 2026-02-14 |
| CC-TEST-1 | Claude Code | Agentic "Around the Block" test harness (6/6 PASS × 3 modes) | 2026-02-14 |
| CC-ARCH-1 | Claude Code | Archive system (4 files to Google Drive + ARCHIVE RULE) | 2026-02-14 |
| WM-PUSH-1 | Windsurf Master | Pushed claude/trusting-hamilton to origin (d60e36ac) | 2026-02-14 |
| CC-HC-1 | Claude Code | healthcheck.ts: better error messages for missing social keys | 2026-02-06 |

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

## 🎯 CURRENT SPRINT: "THE PULSE & THE PLAQUE" (2026-02-14)

> **Full mission brief:** `plans/PULSE_AND_PLAQUE_MISSION.md`
> **Prerequisites:** 10/10 Gates PASS, X/Twitter LIVE, Lean Protocol v3 active

### 🎨 Codex — CX-012: System Status Emblem (The Plaque)

**Handoff:** `plans/HANDOFF_CODEX_CX012.md`
**Goal:** Build a heraldic HUD showing live system health.
**Deliverables:**
- `src/components/SystemStatusEmblem.tsx` — 4-quadrant status emblem
- `plans/SIR_TRAVIS_EMBLEM_SPEC.md` — Design spec (create if missing)
- Wire into `src/App.jsx`

**Verify:** `just cycle-gate design_tokens && just build`

---

### 🧠 Claude Code — CC-011 + CC-012: Weekly Pulse Engine (The Pulse)

**Handoff:** `plans/HANDOFF_CLAUDE_CODE_CC011_CC012.md`
**Goal:** Build the photo harvest + AI mood analysis pipeline.
**Deliverables:**
- CC-011: `scripts/harvest-week.mjs` → `artifacts/data/current-week-raw.json`
- CC-012: `scripts/weekly-analyze.mjs` → `artifacts/data/weekly-pulse-analysis.json`

**Verify:** `node scripts/harvest-week.mjs && node scripts/weekly-analyze.mjs --dry-run`

---

### 🦅 Antigravity — AG-011: Schema Enforcement

**Handoff:** `plans/HANDOFF_ANTIGRAVITY_AG011.md`
**Goal:** Create JSON schemas + validation for Weekly Pulse outputs.
**Deliverables:**
- `artifacts/contracts/weekly-harvest.schema.json`
- `artifacts/contracts/weekly-pulse-analysis.schema.json`
- `scripts/validate-weekly-pulse.mjs`

**Verify:** `just agentic-test && just validate-contracts`

---

### 🛰️ Windsurf Master — WM-006: Wire Pulse Commands

**Handoff:** `plans/HANDOFF_WINDSURF_WM006.md`
**Goal:** Add Weekly Pulse justfile commands.
**Deliverables:**
- Add `weekly-harvest`, `weekly-analyze`, `weekly-pulse` commands to justfile
- Add `validate-weekly-pulse` command
- Update help recipe

**Verify:** `just cycle-gate build && just --list`

---

### 👤 Scott (Human) — ENV-003: Keys + Merge Approval

**Tasks (manual):**
1. Merge `claude/trusting-hamilton` → main (approval required)
2. Set Remotion Lambda env vars in Netlify Dashboard (P1)
3. Set Google Photos API key if available (P2)
4. Browser verify at localhost:8888 after agents complete

---

## 🎯 PREVIOUS PHASE TASKS (Completed or Carried Forward)

### 🤖 Codex — Frontend / Blank-Screen Guard (CARRY FORWARD)

**Goals:** Ensure the app renders reliably in browser. Surface runtime errors to the user and logs.

**Tasks:**
1. Reproduce the site in Chrome with DevTools open — capture any console error stack traces.
2. Add an error boundary / top-level error panel — show "Something went wrong, see console" instead of blank screen.
3. Add a small "diagnostics" panel in dev mode — shows build hash, healthcheck status, last error message.

**Rules:** No changes to Netlify build command or publish dir.

---

### 🧠 Claude Code — Backend / Contracts (CARRY FORWARD)

**Goals:** Lock storage + publisher contracts so tests match reality.

**Tasks:**
1. **Storage mode** — Ensure production uses Blobs when `NETLIFY_BLOBS_CONTEXT` is present.
2. **Pipeline completion** — Verify background worker completes all 7 agents within timeout.
3. **Social publishers** — Normalize responses to `{ platform, status, url, error }`.

---

### 🦅 Antigravity — Tests / Quality Gates (CARRY FORWARD)

**Goals:** Make CI failures meaningful, not noisy.

**Tasks:**
1. Update `scripts/verify-golden-path.mjs` — respect `SOCIAL_ENABLED` env.
2. Adjust timeouts — pipeline started + SSE events = strong success signal.
3. Keep "No Fake Success" — core step failures must break CI with clear reason.

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
