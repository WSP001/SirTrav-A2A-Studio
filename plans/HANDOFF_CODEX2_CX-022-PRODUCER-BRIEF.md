# CX-022 - Producer Brief Textarea

**Ticket:** CX-022
**Agent:** Codex #2 (frontend)
**Priority:** HIGH - restores human story intent to Click-to-Kick
**Created:** 2026-03-13
**Status:** READY TO IMPLEMENT, PARTIAL VERIFY ONLY
**Depends on:** Claude Code lazy-storage/background fix for full end-to-end runtime proof
**Blocked-until:** Claude Code lands the lazy-storage patch far enough that pipeline runs are no longer dying before progress

---

## Mission

Add one simple free-text **Producer Brief** textarea to `src/App.jsx` so the human Producer can tell the Director Agent what story to make.

This brief must feed the existing `brief.story` field that the pipeline already sends in `runPipeline()`. No new backend contract, no new API route, no function changes.

---

## Why now

The current UI still hardcodes:

```javascript
story: `Weekly recap for ${projectId}`
```

That means the Director and Writer receive generic intent even when the human already knows the real story prompt.

Claude Code is handling the backend lazy-storage/background-function instability in parallel. Codex #2 does not need to wait to add the UI and payload wiring, but must not claim that the full pipeline is fixed until Claude Code lands that patch.

---

## Read first

1. `MASTER.md`
2. `AGENTS.md`
3. `CLIMASTER.md`
4. `NETLIFY_BUILD_RULES.md`
5. `plans/AGENT_ASSIGNMENTS.md`
6. `src/App.jsx`
7. `src/components/PipelineProgress.tsx`

If `plans/HANDOFF_CODEX2_CX-022-PRODUCER-BRIEF.md` is the file you are reading, treat it as the source of truth for this ticket.

---

## Scope

**In scope:**

- `src/App.jsx` only
- One new `producerBrief` state value
- One new textarea in the Click-to-Kick Launchpad section
- Wiring `brief.story` to the typed brief with a fallback
- Keeping progress visible in the right-side Agent Orchestration panel using the existing UI state
- Small accessibility fixes directly touched by this flow

**Out of scope:**

- `netlify/functions/*`
- Any storage/runtime/control-plane file
- Any workaround for the background-function crash
- Any new polling system
- Any new API route
- Any new route transition

---

## Files to edit

| File | Change |
|------|--------|
| `src/App.jsx` | Add `producerBrief` state, textarea UI, wire `brief.story`, keep progress in the right panel, fix in-lane accessibility issues |

## Files NOT to edit

- `netlify/functions/*` - Claude Code lane
- `src/components/PlatformToggle.tsx` - M8 frozen
- `src/components/ResultsPreview.tsx` - M8 frozen
- `src/components/CreativeBrief.tsx` - parked for future use
- `src/components/CreativeHub.tsx` - parked for future use
- `justfile` - Master lane

If a very small helper component is absolutely necessary, it must live in `src/components/` and remain purely presentational. Default to editing `src/App.jsx` only.

---

## What to build

### 1. Producer Brief state

In `src/App.jsx`, add:

```javascript
const [producerBrief, setProducerBrief] = useState('')
```

### 2. Producer Brief textarea

Inside the Click-to-Kick Launchpad section in `src/App.jsx`, add a labeled multiline textarea:

- Label: `Producer Brief`
- Subtext: `Tell the agents what story to tell this week`
- Placement: between the existing Creative Direction section and the Music Mode Toggle

Example placeholder:

```text
Make a 10-second German Shepherd video for LinkedIn.
```

or

```text
This week: cormorants near Eagle Lake; focus on Florida boat and fishing shots.
```

### 3. Wire into existing request body

In `runPipeline()` where the request body is built, replace the hardcoded `brief.story` value with:

```javascript
story: producerBrief || `Weekly recap for ${projectId}`
```

This preserves current behavior when the textarea is empty.

### 4. Keep progress in the right panel

Use the existing `PipelineProgress` flow already wired in `src/App.jsx`.

The right-side Agent Orchestration panel should remain the place where progress is shown after launch. Do not invent a new polling loop, route, or page transition.

### 5. Accessibility fixes in lane

While touching this UI, fix obvious direct issues only:

- ensure the Project ID input has a proper associated label
- ensure icon-only nav/link/button surfaces touched by this flow have accessible names
- ensure the textarea is keyboard and screen-reader friendly

---

## Technical notes

- `PipelineProgress.tsx` already exists
- `runPipeline()` already builds the `start-pipeline` request body in `src/App.jsx`
- `brief.story` is already the correct field to reuse
- Do not invent `producerPrompt`, `directorPrompt`, or a new top-level object
- The Director Agent already reads the brief payload path being used today

---

## Verification rule

Codex #2 may verify:

- local UI behavior
- textarea rendering and editing
- request payload wiring
- in-place progress rendering behavior in the right panel

Codex #2 may **not** claim:

- that full end-to-end launch is fixed
- that background pipeline execution is healthy
- that the backend crash is resolved

That verification remains blocked on Claude Code's lazy-storage patch.

---

## Acceptance criteria

This ticket is DONE when:

- `src/App.jsx` contains a visible Producer Brief textarea
- the textarea uses local component state
- `brief.story` in `runPipeline()` is wired to `producerBrief || \`Weekly recap for ${projectId}\``
- if the textarea is empty, old behavior still works
- progress remains shown in the right-side Agent Orchestration panel using the existing UI state
- no backend files are changed
- no frozen M8 files are touched
- `npm run build` passes

---

## Stop conditions

Stop and hand back to Master if:

- implementing the textarea would require changing a function signature or serverless handler
- progress behavior turns out to require a new backend exposure
- any required fix crosses into `netlify/functions/*`

---

## Commands

```powershell
git checkout -b codex/cx-022-producer-brief
Get-Content plans/AGENT_ASSIGNMENTS.md
Get-Content src/App.jsx
Get-Content src/components/PipelineProgress.tsx
npm run build
```

---

## Handoff out

When finished, append a short note to `plans/AGENT_ASSIGNMENTS.md` with:

- files touched
- where the Producer Brief now flows in the payload
- how right-panel progress behaves now
- explicit note that end-to-end runtime proof is still blocked on Claude Code lazy-storage work

Notify Antigravity that the UI is ready for a human beta once the backend lane is stable enough to run.

---

**For the Commons Good** 🎬
