# 🧭 Agent Assignments (Source of Truth)

**Current Focus:** Motion Graphics (MG) Sprint
**Method:** One-at-a-time Execution Loop

---

## 🚦 Active Ticket (NOW)

**Ticket:** MG-002
**Owner:** Codex (Frontend/UI)
**Reviewer:** Claude (Backend)
**Tester:** Antigravity (after merge)
**Status:** **IN_PROGRESS**

### ONE-TICKET RULE
> Only ONE ticket is allowed to be IN_PROGRESS at a time.
> Everyone else is either reviewing or waiting.

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

#### 🔧 MG-P0-A (Claude) — Deterministic Local Verification ✅
*   **ID:** MG-P0-A
*   **Priority:** P0
*   **Owner:** Claude
*   **Reviewer:** Antigravity
*   **Status:** **Done** (2026-01-21)
*   **Goal:** Ensure `netlify dev` + healthcheck is deterministic for local testing.
*   **Files:**
    *   `scripts/preflight.sh` (updated)
*   **DoD:**
    *   [x] Preflight pings healthcheck before running tests
    *   [x] Clear error message if localhost:8888 not running
    *   [x] Document `netlify dev` requirement

#### 🔍 MG-P0-B (Antigravity) — Preflight Ping in Golden Path ✅
*   **ID:** MG-P0-B
*   **Priority:** P0
*   **Owner:** Antigravity
*   **Reviewer:** Claude
*   **Status:** **Done** (2026-01-21)
*   **Goal:** Golden path verifier fails fast with "run netlify dev" message.
*   **Files:**
    *   `scripts/verify-golden-path.mjs`
*   **DoD:**
    *   [x] Ping healthcheck first
    *   [x] Exit with clear message if ECONNREFUSED
    *   [x] Continue if healthy

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

#### 🧱 MG-002 (Codex) — Click-to-Kick UI + Progress + U2A Prefs 👈 **IN_PROGRESS**
*   **ID:** MG-002
*   **Priority:** P0
*   **Owner:** Codex
*   **Reviewer:** Claude
*   **Tester:** Antigravity
*   **Status:** **IN_PROGRESS**
*   **Goal:** UI button triggers dispatcher and polls progress with U2A preferences.
*   **Playbook:** `docs/CODEX_AGENT_PLAYBOOK.md`

##### Files (Codex ONLY may edit):
*   `src/App.jsx`
*   `src/components/CreativeHub.tsx`
*   `src/components/PipelineProgress.tsx`
*   (optional UI-only CSS files for overflow fixes)

##### API Contracts:
*   `POST /.netlify/functions/render-dispatcher` → `{ ok, renderId, bucketName, estimatedDuration }`
*   `GET /.netlify/functions/render-progress?renderId=x&bucketName=y` → `{ progress, phase, done, outputFile, error }`

##### DoD (Definition of Done):
*   [ ] Voice Style dropdown: `serious` | `friendly` | `hype`
*   [ ] Video Length dropdown: `short` (15s) | `long` (60s)
*   [ ] "Click-to-Kick" button calls `POST /.netlify/functions/render-dispatcher`
*   [ ] Poll `GET /.netlify/functions/render-progress` every 2s
*   [ ] UI states: idle → rendering → done/error
*   [ ] Display progress: percent + phase label ("Rendering 45%... Combining...")
*   [ ] Handle No Fake Success: `{ disabled: true }` shows "Disabled" not "Done"
*   [ ] Max poll limit (prevent infinite loop)

##### Verification:
```bash
# Terminal A
netlify dev

# Terminal B
npm run preflight
curl -s http://localhost:8888/.netlify/functions/healthcheck
```

##### PR Template:
Use the Report Template from `docs/CODEX_AGENT_PLAYBOOK.md`

#### 🧪 MG-003 (Antigravity) — Motion Render Smoke Test
*   **ID:** MG-003
*   **Priority:** P0
*   **Owner:** Antigravity
*   **Reviewer:** Claude (or Codex)
*   **Status:** **WAITING** (blocked by MG-002)
*   **Depends On:** MG-002 merged
*   **Goal:** CI command to prove end-to-end render.

##### DoD (Definition of Done):
*   [ ] `scripts/test_motion_graphic.mjs` smoke test script
*   [ ] Hits `render-dispatcher` endpoint
*   [ ] Polls `render-progress` until done/error
*   [ ] Asserts response contract (renderId, bucketName exist)
*   [ ] Asserts "no fake success" (disabled features return `{ success:false, disabled:true }`)
*   [ ] Wire into CI so merges fail if smoke test fails
*   [ ] Add preflight ping step if not already present

##### Smoke Test Must Assert:
*   [ ] `renderId` and `bucketName` exist in response
*   [ ] Progress increases or phase updates
*   [ ] Final output is a valid URL (or valid placeholder in simulated mode)
*   [ ] Disabled features return `{ success:false, disabled:true }` (expected behavior)

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

## 📖 Read-First Gate (ALL AGENTS)

Before touching code, every agent MUST read these files in order:
1. `CLAUDE.md`
2. `plans/AGENT_ASSIGNMENTS.md`
3. `docs/CODEX_AGENT_PLAYBOOK.md`
4. `CLAUDE_CODE_HANDOFF.md`

Then begin with this statement:
> "I read CLAUDE.md + AGENT_ASSIGNMENTS.md + CODEX_AGENT_PLAYBOOK.md + CLAUDE_CODE_HANDOFF.md and I am working ticket MG-XXX."

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

---

## 🔐 Constraints (CLAUDE.md)

- Never run local `ffmpeg`/`remotion render` inside Netlify Functions (timeouts)
- Use Remotion Lambda kickoff + progress polling
- Netlify Background Functions max ~26s - video rendering belongs in Remotion Lambda
- Always thread `runId` through every agent call for tracing
- **No Fake Success:** Social publishers return `{ success: false, disabled: true }` when keys missing
- **Local Dev:** Always run `netlify dev` (port 8888) not just `vite dev`
