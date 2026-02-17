# 🦅 Antigravity Commons Good Instructions
> **From:** Antigravity (Test Coordinator)
> **To:** Programming Team (Codex & Claude Code)
> **Ref:** Commons Good Work Lots (Tasks P1-P2)

This document distributes specific, attributable "Jobs" to our Agents to ensure the SirTrav-A2A-Studio is robust, transparent, and built for the user.

---

## 🏗️ Job Lot 1: U2A Control & Polish (Codex)
**Agent:** `Codex`
**Goal:** Empower the user with creative controls and ensure visual integrity.
**Status:** ⏳ PENDING

### INSTRUCTIONS:
1.  **Enhance Creative Launchpad (`src/App.jsx`):**
    *   **Verify Dropdowns:** Ensure the `voiceStyle` (Serious, Friendly, Hype) and `videoLength` (Short, Long) dropdowns are functional and visually consistent with the dark/glassmorphism theme.
    *   **Wire Up:** Confirm these start parameters are correctly passed to `runPipeline` -> `start-pipeline`.

2.  **Fix CSS Visual Defects (`src/App.css`):**
    *   **Target:** The "Cost Plus Invoice" component in the Results view.
    *   **Defect:** Text overflow on smaller screens or long project IDs.
    *   **Fix:** Apply `text-overflow: ellipsis` or wrapping to `invoice-card` styles. Ensure the Green/Emerald theme is consistent.

3.  **Feedback UI (`src/components/ResultsPreview.tsx`):**
    *   **Wire Up:** Ensure the Thumbs Up/Down and Comment box correctly calls `POST /.netlify/functions/submit-evaluation`.
    *   **User Feedback:** Show a toast/alert on success ("Thank you for improving the ecosystem").

---

## 📡 Job Lot 2: Signal & Contracts (Claude Code)
**Agent:** `Claude Code`
**Goal:** Ensure the backend truthfully serves the frontend and learns from it.
**Status:** ✅ DONE (2026-01-23)

### INSTRUCTIONS:
1.  **Contract Verification (`MG-006` Support):**
    *   **Schema Definition:** Create contract schemas in `artifacts/contracts/` (legacy: `docs/schemas/api-responses.json`) containing the expected JSON structure for:
        *   `GET /render-progress`
        *   `POST /submit-evaluation`
    *   **Purpose:** Allow Antigravity to write Contract Tests against this schema.

2.  **Feedback Loop (`netlify/functions/submit-evaluation.ts`):**
    *   **Verify Storage:** Ensure feedback data is written to a specialized Blob store (`evals`) or appended to a log.
    *   **Structure:** JSON should include `{ runId, rating, feedback, timestamp, buildId }`.

3.  **Maintenance:**
    *   **Security:** Verify `npm audit` is clean or explain acceptable risks.

---

## 🧪 Monitoring Plan (Antigravity)
I will monitor these jobs by:
1.  **Smoke Testing:** Running `npm run test:motion` to verify `start-pipeline` accepts the new parameters without crashing.
2.  **Visual Inspection:** Checking the Invoice component in `ResultsPreview` during a demo run.
3.  **Data Verification:** Inspecting the `evals` Blob store after minimizing a feedback submission.

**Signed:**
*Antigravity*
*Test & Resilience Agent*
