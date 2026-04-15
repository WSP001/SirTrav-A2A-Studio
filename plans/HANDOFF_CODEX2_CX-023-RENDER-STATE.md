# CX-023 — Studio UI: Veo 2 Rendering State
**Owner:** Codex #2
**Lane:** `src/` — React components only. Do NOT touch netlify/functions/, scripts/, or backend files.
**Status:** READY TO START
**Blocks:** Full end-to-end pipeline proof (Proof 3 — confirmed render completion)
**Created:** 2026-04-14

---

## Context (Read This First)

The Editor Agent (`compile-video.ts`) now runs on Veo 2 via Gemini key.
When Veo 2 dispatches successfully, it returns **HTTP 202** with this shape:

```json
{
  "success": true,
  "status": "rendering",
  "editor_backend": "veo2",
  "jobId": "models/veo-2.0-generate-001/operations/4k9dn7wpu3mq",
  "pollUrl": "/.netlify/functions/render-progress?operationName=...&backend=veo2",
  "duration": 30,
  "resolution": "1080p",
  "cost": { ... }
}
```

The backend pipeline (`run-pipeline-background.ts` Step 5) already handles this:
- It accepts 202 as success
- It detects `data.status === 'rendering' && data.editor_backend === 'veo2'`
- It logs the pollUrl and stores the result

**The gap:** The frontend UI still shows "Editor" as a pipeline step that either passes or fails.
There is no "dispatched — rendering asynchronously" state. When Veo 2 returns 202,
the UI either spins forever or shows a failure. It needs a third state.

---

## What to Build

**In the pipeline progress display** (wherever Step 5 / Editor is shown to the user):

### A. Three Editor states (not two)

Currently the UI shows: `running` → `success` | `failure`

Change to: `running` → `dispatched` | `success` | `failure`

- `dispatched` = Veo 2 job sent, render in progress
  - Icon: spinning film reel or clock (not a checkmark, not an X)
  - Label: "Rendering video with Veo 2..."
  - Sub-label: Job ID (last 8 chars of operationName) for user reference
  - Action: show a "Check progress" link if pollUrl is in the run data

### B. Where to read the data

The run record in Blobs (polled by the UI via `run-status` or equivalent endpoint)
contains `agentResults.editor.data` with:
- `data.status === 'rendering'` → dispatched state
- `data.status` missing or `data.videoUrl` present → completed state
- `data.disabled === true` → failed/disabled state

Read from whatever the UI currently polls for pipeline progress. Do NOT add a new API call.

### C. Render-progress poll (optional, only if the existing poller supports it)

If the UI already has a polling loop for pipeline status, you can extend it to also call
`data.pollUrl` when `status === 'rendering'` and display the Veo 2 progress.

But do NOT build a new polling system from scratch. If the existing system does not
support it cleanly, just show the dispatched state with a static "Rendering in progress"
message and a link to the pollUrl for manual check.

---

## Acceptance Criteria

- [ ] Editor step shows three states: running / dispatched / success / failure
- [ ] When `agentResults.editor.data.status === 'rendering'`, UI shows dispatched state (not failure)
- [ ] Dispatched state shows the Job ID and optionally a link to pollUrl
- [ ] Success state still shows videoUrl when render completes
- [ ] No backend files touched
- [ ] Build passes: `npm run build`

---

## Do NOT Touch

- `netlify/functions/` — Claude Code lane
- `scripts/` — Claude Code lane
- `plans/*.md` — shared docs, read-only for Codex
- `public/` — static assets, not part of this ticket

---

## Files Most Likely to Edit

Read these first to understand the current editor step rendering:
- `src/components/` — find the pipeline step progress component
- `src/pages/` — find where agentResults is consumed

Grep for: `agentResults`, `editor`, `Step 5`, `pipeline`, `progress`

---

*Written by Claude Code after reading run-pipeline-background.ts and compile-video.ts.*
*For the Commons Good — 2026-04-14*
