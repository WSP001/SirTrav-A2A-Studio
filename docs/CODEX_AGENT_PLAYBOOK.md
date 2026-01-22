# Codex Agent Playbook (SirTrav-A2A-Studio)

**Role:** Frontend/UI Implementation Agent
**Scope:** Dashboard, buttons, polling/progress UI, error UX, video player
**Version:** 1.1.0 | **Date:** 2026-01-22

Use this page as the shared, copy/paste-ready checklist for Codex agents, reviewers, and testers. It standardizes:

* What to ask your programmer.
* Which scripts to run for RC-1 validation.
* What each script proves.
* A single-command option.
* The RC-1 Execution List (P6-P9).
* A reporting template for completed work (with testing + screenshot notes).

---

## READ-FIRST GATE (MANDATORY)

Before touching any code, you MUST read these files in order:

1. `CLAUDE.md` - Critical constraints
2. `plans/AGENT_ASSIGNMENTS.md` - Current ticket assignments
3. `docs/CODEX_AGENT_PLAYBOOK.md` - This file
4. `CLAUDE_CODE_HANDOFF.md` - Session handoff context

**Then begin your work with this statement:**

> "I read CLAUDE.md + AGENT_ASSIGNMENTS.md + CODEX_AGENT_PLAYBOOK.md + CLAUDE_CODE_HANDOFF.md and I am working ticket MG-XXX."

---

## FILES YOU ARE ALLOWED TO EDIT

### Primary UI Files
- `src/App.jsx` - Main React entry point
- `src/components/CreativeHub.tsx` - Upload + pipeline trigger UI
- `src/components/PipelineProgress.tsx` - SSE progress display
- `src/components/Click2KickButton.tsx` - Pipeline trigger button
- `src/components/Upload.tsx` - Drag & drop file upload
- `src/components/ResultsPreview.tsx` - Video preview + feedback
- `src/components/Dashboard.tsx` - Metrics visualization

### CSS Files (only for UI fixes)
- `src/App.css`
- `src/index.css`
- Any component-specific CSS

### Documentation (only if UI verification steps change)
- `docs/CODEX_AGENT_PLAYBOOK.md` - This file

---

## FILES YOU MUST NOT EDIT

- `netlify/functions/*` - Backend (Claude owns)
- `scripts/*` - Testing (Antigravity owns)
- `plans/AGENT_ASSIGNMENTS.md` - Manager updates only
- `CLAUDE.md` - Constraints file (Claude owns)

---

## API CONTRACTS (Endpoints You Call)

### Render Dispatcher
```
POST /.netlify/functions/render-dispatcher
Content-Type: application/json
Authorization: Bearer <token>

{
  "projectId": "string (required)",
  "compositionId": "string (optional)",
  "inputProps": {
    "voiceStyle": "serious" | "friendly" | "hype",
    "videoLength": "short" | "long",
    "platform": "string",
    "brief": "string"
  }
}

Response:
{
  "ok": true,
  "renderId": "string",
  "bucketName": "string",
  "estimatedDuration": number
}
```

### Render Progress
```
GET /.netlify/functions/render-progress?renderId=xxx&bucketName=yyy

Response:
{
  "progress": 0-100,
  "phase": "rendering" | "stitching" | "uploading" | "done" | "error",
  "done": boolean,
  "outputFile": "string (URL when done)",
  "error": "string (if error)"
}
```

### Start Pipeline (Legacy)
```
POST /.netlify/functions/start-pipeline
Content-Type: application/json
Authorization: Bearer <token>

{
  "projectId": "string",
  "runId": "string (optional)",
  "platform": "string",
  "brief": "string",
  "voiceStyle": "serious" | "friendly" | "hype",
  "videoLength": "short" | "long"
}
```

### Healthcheck
```
GET /.netlify/functions/healthcheck

Response:
{
  "status": "ok",
  "version": "2.1.0",
  "build": { "commit": "...", "id": "...", "context": "...", "branch": "..." },
  "services": { ... }
}
```

---

## NO FAKE SUCCESS RULE

When backend returns `{ success: false, disabled: true }` or `{ disabled: true }`:

- **DO NOT** show "Done" or green checkmark
- **DO** show "Disabled" or "Not Available" with the reason
- **DO** make it visually distinct (gray, warning icon)

---

## UI STATE MACHINE

For any async operation, implement these states:

```
idle -> loading -> success | error | disabled
```

### Progress Polling Pattern
```jsx
const pollProgress = async (renderId, bucketName) => {
  const MAX_POLLS = 150; // 5 minutes at 2s intervals
  let polls = 0;

  while (polls < MAX_POLLS) {
    const res = await fetch(
      `/.netlify/functions/render-progress?renderId=${renderId}&bucketName=${bucketName}`
    );
    const data = await res.json();

    if (data.done) return data;
    if (data.error) throw new Error(data.error);

    setProgress(data.progress);
    setPhase(data.phase);

    await new Promise(r => setTimeout(r, 2000)); // 2s interval
    polls++;
  }

  throw new Error('Render timed out');
};
```

---

## What to Ask Your Programmer (copy/paste)

Please run these in the **SirTrav-A2A-Studio** repo and report results + logs:

```bash
npm run preflight
npm run test:runner
npm run practice:test
npm run verify:security
```

Also confirm:

* Which branch you ran them on.
* Whether Netlify Dev was running.
* Any env vars used (URL, PUBLISH_TOKEN_SECRET, etc.).

---

## What Each Script Proves

1) `npm run preflight`
**Purpose:** basic safety check
**Verifies:** required files exist, environment sanity, and no obvious setup issues.
**Outcome:** quick "go/no-go" before deeper tests.

2) `npm run test:runner`
**Purpose:** manifest smoke test
**Verifies:** the pipeline runner can execute the manifest steps without crashing.

3) `npm run practice:test`
**Purpose:** end-to-end practice flow
**Verifies:** the stub pipeline can complete end-to-end with progress events.

4) `npm run verify:security`
**Purpose:** handshake correctness
**Verifies:**
* 401 when token is missing
* 403 when token is invalid
* 202 when token is valid

---

## Single Command Option

```bash
npm run preflight && npm run test:runner && npm run practice:test && npm run verify:security
```

---

## RC-1 Execution List (P6-P9)

### P6 - Repo Hygiene Gate
**Goal:** Stop local artifacts from leaking into public repo.

**Do this:**
* Verify `.gitignore` includes:
  * `.local-blobs/`
  * `verify_log*.txt`, `verify_output*.txt`, `verify_result*.txt`
  * `.claude/settings.local.json`
  * `dist/`

**Success criteria:**
`git status --porcelain` is clean with no local artifacts tracked.

### P7 - Security Handshake
**Goal:** Real token auth + consistent HTTP semantics.

**Do this:**
* Audit `netlify/functions/start-pipeline.ts`
* Ensure token verification uses `PUBLISH_TOKEN_SECRET` (not prefix checks).
* Standardize response codes: 401 missing, 403 invalid, 202 accepted.

**Success criteria:**
`npm run verify:security` passes.

### P8 - Publishing Exchange (Pick ONE)
**Goal:** Single secure output path.

**Option A (fastest): S3 presigned URLs**
* Return `{ publicUrl, expiresAt }` from AWS signing

**Option B (Netlify-native): Netlify Blobs + Edge Guard**
* Signed token + Edge Function

**Success criteria:**
`publish.ts` returns a single secure URL and does not leak raw blob paths.

### P9 - Idempotency + SSE Reliability
**Goal:** No duplicate runs, live progress works consistently.

**Success criteria:**
* Two calls with same idempotency key return same run
* SSE keeps connection alive and updates UI

---

## LOCAL DEVELOPMENT

```bash
# Terminal A (Backend)
netlify dev

# Terminal B (Verification)
npm run preflight
curl -s http://localhost:8888/.netlify/functions/healthcheck
```

**NEVER** rely on just `vite` or `npm run dev` for backend functions.

---

## CURRENT TICKET: MG-002

### Click-to-Kick UI + Progress Bar + U2A Preferences

**Owner:** Codex
**Reviewer:** Claude
**Tester:** Antigravity
**Status:** VERIFIED (2026-01-22)

### Files to Edit
- `src/App.jsx`
- `src/components/CreativeHub.tsx`
- `src/components/PipelineProgress.tsx`

### Definition of Done
- [ ] Voice Style dropdown: `serious` | `friendly` | `hype`
- [ ] Video Length dropdown: `short` (15s) | `long` (60s)
- [ ] "Click-to-Kick" button calls `POST /.netlify/functions/render-dispatcher`
- [ ] Poll `GET /.netlify/functions/render-progress` every 2s
- [ ] UI states: idle -> rendering -> done/error
- [ ] Display progress: percent + phase label
- [ ] Handle No Fake Success responses
- [ ] Update this playbook if verification steps change

---

## INSTRUCTION PACKET (Send to 3 Agents in Order)

### 0) One rule that prevents chaos
Only **ONE** ticket is allowed to be `IN_PROGRESS` at a time.
Everyone else is either reviewing or waiting.

### CODEX - OWNER INSTRUCTIONS (MG-002)
**Files allowed:** `src/App.jsx`, `src/components/CreativeHub.tsx`, `src/components/PipelineProgress.tsx`

**DoD checklist:**
* Voice Style dropdown: `serious | friendly | hype`
* Video Length dropdown: `short (15s) | long (60s)`
* "Click-to-Kick" calls `POST /.netlify/functions/render-dispatcher` then polls `render-progress` every 2s
* UI states: `idle -> rendering -> done/error`
* Handle No Fake Success: `{ disabled: true }` shows "Disabled" not "Done"

### CLAUDE - REVIEWER INSTRUCTIONS (MG-002)
**Role:** Reviewer ONLY (do not edit UI files)

**Review checklist:**
* Endpoint paths match backend exactly
* Payload includes U2A fields: `voiceStyle`, `videoLength`
* No fake success: disabled features shown as disabled
* Progress polling is bounded (max retries)
* Error UX is human-readable

### ANTIGRAVITY - TESTER INSTRUCTIONS (MG-003)
**Status:** WAITING (until MG-002 is DONE)

**Smoke test must assert:**
* `renderId` and `bucketName` exist
* Progress increases or phase updates
* Disabled features return `{ success:false, disabled:true }`

---

## Sprint Execution Order

1. Codex executes **MG-002** (only UI files)
2. Claude reviews **MG-002** (comments only, unless contract is broken)
3. Codex fixes review comments
4. Merge **MG-002**
5. Antigravity executes **MG-003** (tests + CI gate)
6. Claude reviews **MG-003**
7. Merge **MG-003**
8. Next ticket becomes eligible

---

## Report Templates

### Report Template (UI change)

#### Summary
* (Describe UI changes made)

#### Endpoints Used
* `POST /.netlify/functions/render-dispatcher`
* `GET /.netlify/functions/render-progress`

#### Testing
* Commands attempted (or why not)

#### Screenshot
* Attach or note why not applicable

---

### Report Template (docs-only change)

#### Summary
* (Describe docs changes)

#### Testing
* Not run (docs-only change).

---

### Report Template (CSS/UI-only change)

#### Summary
* (Describe layout/style changes)

#### Testing
* Not run (CSS-only change).

---

## What Codex Can Own vs. Review

### Codex Owns (End-to-End):
1. **MG-002**: Click-to-Kick UI + dropdown prefs + progress display
2. **UI overflow & responsiveness**: agent cards + progress grid + mobile
3. **Invoice panel wiring**: show cost/progress data clearly
4. **Operator guidance**: Ready-to-Test banner + links to scripts
5. **Release reporting**: fill report template with command outputs + screenshots

### Codex Reviews Only (Claude/Antigravity Owns):
* Security handshake semantics (401/403/202) - backend/tests
* Publishing exchange (S3 presigned URLs / Netlify blobs) - backend
* CI smoke tests + contract tests - Antigravity
* Idempotency locks + SSE heartbeat correctness - backend/tests

Codex *can* spot contract mismatches, request changes, or open follow-up tickets.

---

## HANDOFF CHECKLIST (When Done)

Before marking ticket complete:

1. [ ] All DoD items checked
2. [ ] PR description uses report template above
3. [ ] No console errors in browser
4. [ ] Preflight passes
5. [ ] Request review from Claude

After merge:

1. [ ] Notify Antigravity that MG-003 is unblocked
2. [ ] Update `plans/AGENT_ASSIGNMENTS.md` status to DONE

---

**Remember:** Only ONE ticket IN_PROGRESS at a time. You own MG-002. Claude reviews. Antigravity tests after merge.
