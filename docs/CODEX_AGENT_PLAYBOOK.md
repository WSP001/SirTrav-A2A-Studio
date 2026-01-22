# CODEX AGENT PLAYBOOK

**Role:** Frontend/UI Implementation Agent
**Scope:** Dashboard, buttons, polling/progress UI, error UX, video player
**Version:** 1.0.0 | **Date:** 2026-01-21

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
  "services": { ... }
}
```

---

## NO FAKE SUCCESS RULE

When backend returns `{ success: false, disabled: true }` or `{ disabled: true }`:

- **DO NOT** show "Done" or green checkmark
- **DO** show "Disabled" or "Not Available" with the reason
- **DO** make it visually distinct (gray, warning icon)

Example:
```jsx
if (response.disabled) {
  return <StatusBadge variant="disabled">Feature Disabled</StatusBadge>;
}
if (!response.success && response.error) {
  return <StatusBadge variant="error">{response.error}</StatusBadge>;
}
```

---

## UI STATE MACHINE

For any async operation, implement these states:

```
idle -> loading -> success | error | disabled
```

### Button States
- **idle**: Default clickable state
- **loading**: Spinner, disabled, "Processing..."
- **success**: Green checkmark, "Done!"
- **error**: Red X, error message, retry option
- **disabled**: Gray, "Not Available"

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

## LOCAL DEVELOPMENT

### Terminal A (Backend)
```bash
netlify dev
# Functions served at http://localhost:8888/.netlify/functions/
```

### Terminal B (Verification)
```bash
npm run preflight
curl -s http://localhost:8888/.netlify/functions/healthcheck | jq '.status'
```

**NEVER** rely on just `vite` or `npm run dev` for backend functions.

---

## PR DESCRIPTION TEMPLATE (UI Changes)

When submitting a PR, include this information:

```markdown
## Summary
[1-3 bullet points describing UI changes]

## Endpoints Used
- `POST /.netlify/functions/render-dispatcher`
- `GET /.netlify/functions/render-progress`

## Commands Run
- [ ] `netlify dev` (backend running)
- [ ] `npm run preflight` (passes)
- [ ] `curl healthcheck` (200 OK)

## UI States Implemented
- [ ] idle
- [ ] loading
- [ ] success
- [ ] error
- [ ] disabled (No Fake Success)

## Screenshots
[Attach screenshots or note why not applicable]

## Test Plan
- [ ] Manual test in browser
- [ ] Verified progress polling stops on completion
- [ ] Verified error state displays correctly
- [ ] Verified disabled features show "Disabled" not "Done"
```

---

## CURRENT TICKET: MG-002

### Click-to-Kick UI + Progress Bar + U2A Preferences

**Owner:** Codex
**Reviewer:** Claude
**Tester:** Antigravity
**Status:** READY -> IN_PROGRESS

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

### Verification
```bash
# Terminal A
netlify dev

# Terminal B
npm run preflight
curl -s http://localhost:8888/.netlify/functions/healthcheck
```

---

## HANDOFF CHECKLIST (When Done)

Before marking ticket complete:

1. [ ] All DoD items checked
2. [ ] PR description uses template above
3. [ ] No console errors in browser
4. [ ] Preflight passes
5. [ ] Request review from Claude

After merge:

1. [ ] Notify Antigravity that MG-003 is unblocked
2. [ ] Update `plans/AGENT_ASSIGNMENTS.md` status to DONE

---

**Remember:** Only ONE ticket IN_PROGRESS at a time. You own MG-002. Claude reviews. Antigravity tests after merge.
