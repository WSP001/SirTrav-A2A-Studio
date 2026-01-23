# 🧭 Agent Assignments (Source of Truth)

**Current Focus:** Motion Graphics (MG) Sprint
**Method:** One-at-a-time Execution Loop

---

## 🚦 Active Ticket (NOW)

**Ticket:** MG-008 & MG-X-LIVE
**Owner:** Codex & Antigravity
**Reviewer:** Claude
**Status:** **IN_PROGRESS**

### ONE-TICKET RULE (Per Agent)
*   **Codex:** Working MG-008 (Feedback UI).
*   **Antigravity:** Working MG-X-LIVE (X Key Verification).
*   **Claude:** Support/Review.

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

#### 🔑 MG-X-LIVE (Antigravity) — Verify X Keys & Publishing 👈 **IN_PROGRESS**
*   **ID:** MG-X-LIVE
*   **Owner:** Antigravity (Test Ops)
*   **Status:** **IN_PROGRESS** (2026-01-22)
*   **Goal:** Verify LIVE X API keys function correctly (no "fake success").
*   **Instructions:**
    1.  **SysAdmin (User):** Set `X_API_KEY`, etc. in Netlify Env.
    2.  **Antigravity:** Run `curl localhost:8888/.netlify/functions/healthcheck` -> Assert 'x' is 'configured'.
    3.  **Antigravity:** Run `node scripts/test_motion_graphic.mjs` -> Assert real success or explicit auth error (not disabled).

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

---

## 🔐 Constraints (CLAUDE.md)

- Never run local `ffmpeg`/`remotion render` inside Netlify Functions (timeouts)
- Use Remotion Lambda kickoff + progress polling
- Netlify Background Functions max ~26s - video rendering belongs in Remotion Lambda
- Always thread `runId` through every agent call for tracing
- **No Fake Success:** Social publishers return `{ success: false, disabled: true }` when keys missing
- **Local Dev:** Always run `netlify dev` (port 8888) not just `vite dev`
