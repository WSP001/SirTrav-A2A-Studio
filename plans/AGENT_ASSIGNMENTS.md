# 🧭 Agent Assignments (Source of Truth)

**Current Focus:** Motion Graphics (MG) Sprint
**Method:** One-at-a-time Execution Loop

---

## 🚦 Active Ticket (NOW)

**Ticket:** MG-002
**Owner:** Codex (Frontend/UI)
**Status:** **Ready** (unblocked by MG-001)

---

## 📋 Backlog (Prioritized)

### P0 — Core Infrastructure (NEW: Alignment Sprint)

#### 🐦 MG-P0-C (Claude) — X/Twitter Truth Alignment ✅
*   **ID:** MG-P0-C
*   **Priority:** P0
*   **Owner:** Claude
*   **Reviewer:** Codex
*   **Tester:** Antigravity
*   **Status:** **Done** (2026-01-21)
*   **Goal:** X/Twitter returns explicit `disabled` or `not_implemented`, never fake success.
*   **Files:**
    *   `netlify/functions/publish-x.ts`
    *   `netlify/functions/healthcheck.ts`
    *   `CLAUDE.md`
*   **DoD:**
    *   [x] Return `{ success: false, disabled: true }` when keys missing
    *   [x] Return 501 `{ not_implemented: true }` when keys present but no implementation
    *   [x] Add X/Twitter to healthcheck social platforms check
    *   [x] Add "No Fake Success" constraint to CLAUDE.md

#### 🔧 MG-P0-A (Claude) — Deterministic Local Verification
*   **ID:** MG-P0-A
*   **Priority:** P0
*   **Owner:** Claude
*   **Reviewer:** Antigravity
*   **Status:** Ready
*   **Goal:** Ensure `netlify dev` + healthcheck is deterministic for local testing.
*   **Files:**
    *   `scripts/preflight.mjs` (update)
    *   `docs/LOCAL_DEV.md` (optional)
*   **DoD:**
    *   [ ] Preflight pings healthcheck before running tests
    *   [ ] Clear error message if localhost:8888 not running
    *   [ ] Document `netlify dev` requirement

#### 🔍 MG-P0-B (Antigravity) — Preflight Ping in Golden Path
*   **ID:** MG-P0-B
*   **Priority:** P0
*   **Owner:** Antigravity
*   **Reviewer:** Claude
*   **Status:** Ready (blocked by MG-P0-A)
*   **Goal:** Golden path verifier fails fast with "run netlify dev" message.
*   **Files:**
    *   `scripts/verify-golden-path.mjs`
*   **DoD:**
    *   [ ] Ping healthcheck first
    *   [ ] Exit with clear message if ECONNREFUSED
    *   [ ] Continue if healthy

---

### P0 — Motion Graphics Infrastructure

#### 🎬 MG-001 (Claude) — Render Dispatcher Backend ✅
*   **ID:** MG-001
*   **Priority:** P0
*   **Owner:** Claude
*   **Status:** **Done** (2026-01-21)
*   **Goal:** Implement `renderMediaOnLambda` wrapper returning `{renderId, bucketName}` fast.
*   **Files:**
    *   `netlify/functions/render-dispatcher.ts`
    *   `netlify/functions/render-progress.ts`
    *   `netlify/functions/lib/remotion-client.ts`
*   **DoD:**
    *   [x] Zod-validate payload (projectId, compositionId, inputProps)
    *   [x] Call Remotion Lambda kickoff via `renderMediaOnLambda`
    *   [x] Return within Netlify limits (<10s, no waiting)
    *   [x] Store renderId metadata in runs record (Blobs)
    *   [x] Return `{ ok, renderId, bucketName, estimatedDuration }`
    *   [x] Graceful fallback on errors

#### 🧱 MG-002 (Codex) — Click-to-Kick UI 👈 **NEXT**
*   **ID:** MG-002
*   **Priority:** P0
*   **Owner:** Codex
*   **Status:** **Ready** (MG-001 done)
*   **Goal:** UI button triggers dispatcher and polls progress.
*   **API to call:**
    *   `POST /render-dispatcher` → `{ renderId, bucketName }`
    *   `GET /render-progress?renderId=x&bucketName=y` → `{ progress, phase, done, outputFile }`
*   **DoD:**
    *   [ ] Button states: idle → rendering → done/error
    *   [ ] Poll render-progress endpoint every 2s
    *   [ ] Show percent/stage ("Rendering 45%... Combining...")

#### 🧪 MG-003 (Antigravity) — Motion Render Smoke Test
*   **ID:** MG-003
*   **Priority:** P0
*   **Owner:** Antigravity
*   **Status:** Backlog
*   **Goal:** CI command to prove end-to-end render.
*   **DoD:**
    *   [ ] `scripts/test_motion_graphic.mjs`
    *   [ ] Fails on invalid URL/Timeout
    *   [ ] Prints renderId

### P1 — Scalability

#### 🧙 MG-004 (Claude) — Magic Manual Composition Registry
*   **ID:** MG-004
*   **Priority:** P1
*   **Owner:** Claude
*   **Status:** Backlog
*   **Goal:** Create `src/remotion` root and branding.

#### ☁️ MG-005 (Claude) — Deploy Site Bundle
*   **ID:** MG-005
*   **Priority:** P1
*   **Owner:** Claude
*   **Status:** Backlog
*   **Goal:** Scripted `npx remotion lambda sites create`.

#### 🧾 MG-006 (Antigravity) — Contract Tests
*   **ID:** MG-006
*   **Priority:** P1
*   **Owner:** Antigravity
*   **Status:** Backlog
*   **Goal:** Validate API response shapes with JSON Schema/AJV.

### P2 — Regenerative Loop

#### 🧠 MG-007 (Claude) — Feedback Capture
*   **ID:** MG-007
*   **Priority:** P2
*   **Owner:** Claude
*   **Status:** Backlog
*   **Goal:** Write feedback to `memory-index.json`.

#### 🧭 MG-008 (Codex) — Feedback UI
*   **ID:** MG-008
*   **Priority:** P2
*   **Owner:** Codex
*   **Status:** Backlog
*   **Goal:** UI for feedback and regeneration.

#### 📜 MG-009 (Claude) — Auto-Update Rules
*   **ID:** MG-009
*   **Priority:** P2
*   **Owner:** Claude
*   **Status:** Backlog
*   **Goal:** Script to append learned constraints to `CLAUDE.md`.

---

## 🔒 Role Boundaries
*   🧑💻 **Codex (UI):** Dashboard, Player, Error UX.
*   🧠 **Claude (Backend):** Dispatcher, Validation, Storage, Remotion Calls.
*   🧪 **Antigravity (Tests):** Smoke Tests, Contract Tests, CI Gates.

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

---

## 🔐 Constraints (CLAUDE.md)

- Never run local `ffmpeg`/`remotion render` inside Netlify Functions (timeouts)
- Use Remotion Lambda kickoff + progress polling
- Netlify Background Functions max ~26s - video rendering belongs in Remotion Lambda
- Always thread `runId` through every agent call for tracing
- **No Fake Success:** Social publishers return `{ success: false, disabled: true }` when keys missing
- **Local Dev:** Always run `netlify dev` (port 8888) not just `vite dev`
