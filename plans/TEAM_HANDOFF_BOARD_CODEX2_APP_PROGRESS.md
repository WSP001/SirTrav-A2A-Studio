# Codex #2 Frontend Lane Board — App + PipelineProgress

Codex #2 is owning a narrow frontend lane only — `src/App.jsx` and `src/components/PipelineProgress.tsx` — and is not changing backend/runtime/pipeline infrastructure.

## Purpose

This board defines **Codex #2's assigned frontend lane** for:

- `src/App.jsx`
- `src/components/PipelineProgress.tsx`

It is the canonical scope sheet for:

- Producer Brief input wiring
- accessibility fixes in directly touched App controls
- in-place pipeline progress rendering
- progress UI restraint, clarity, and honesty

This file is intended to help the team work in parallel **without crossing lanes**.

## Scope Boundary

This board **does cover**:

- frontend shell work in `src/App.jsx`
- frontend progress UI work in `src/components/PipelineProgress.tsx`
- directly related accessibility improvements in touched UI surfaces

This board **does not cover**:

- `netlify/functions/*`
- storage, runtime, control-plane, or backend reliability changes
- new polling loops, new routes, or new API contracts
- Remotion/AWS/render infrastructure changes

## How to Read Status

- `Ready` = approved to start
- `In Progress` = actively being implemented
- `Review` = ready for human or QA check
- `Done` = done signal directly observed
- `Blocked` = cannot proceed in this lane
- `Locked` = other lanes should not disturb this area

## Current State

This file is a **lane board and working contract**, not a release note.

That means:

- rows marked `Ready` describe approved work items
- rows marked `Done` must be backed by the listed done signal
- this document shows **what Codex #2 owns and how success is measured**
- it should not be read as proof that every listed task is already completed

## Team Handoff Board

| Owner | File | Task | Risk | Done Signal | Status | Dependency |
|---|---|---|---|---|---|---|
| Codex #2 / Frontend Shell | `src/App.jsx` | Add Producer Brief textarea and bind it to local state | User intent stays hardcoded and launch input does not match what Director receives | Typed brief is visible in the existing `start-pipeline` request body as `brief.story` | Ready | None |
| Codex #2 / Frontend Shell | `src/App.jsx` | Preserve fallback story when Producer Brief is empty | Empty input breaks current launch behavior | Empty textarea still sends ``Weekly recap for ${projectId}`` | Ready | None |
| Codex #2 / Frontend Shell | `src/App.jsx` | Keep pipeline progress in the right-side Agent Orchestration panel after launch | Launch flow feels disconnected and workspace context disappears | After launch, progress remains visible on the right without route change or full-view replacement | Ready | Backend events stable |
| Codex #2 / Accessibility | `src/App.jsx` | Add associated labels to directly touched form controls | Screen reader ambiguity and avoidable accessibility regressions | Project ID input and Producer Brief textarea each have clear associated labels | Ready | None |
| Codex #2 / Accessibility | `src/App.jsx` | Give directly touched icon-only nav/button surfaces discernible names | Accessibility audit failure from unnamed controls | Touched icon-only control(s) expose an accessible name in the DOM | Ready | None |
| Codex #2 / Progress UI | `src/components/PipelineProgress.tsx` | Keep the existing progress data flow and render it in-place, not as a separate experience | Team accidentally invents a second progress system or breaks the current one | `PipelineProgress` remains the only progress data consumer and still renders from existing SSE/polling logic | Ready | None |
| Codex #2 / Progress UI | `src/components/PipelineProgress.tsx` | Reduce default visual weight so progress supports the workspace instead of replacing it | Full 7-card pending grid overwhelms the main flow before real status exists | Default state shows compact progress emphasis first; detailed status only appears when real run state exists | Ready | Backend events stable |
| Codex #2 / Progress UI | `src/components/PipelineProgress.tsx` | Keep per-run feedback honest when backend is unstable | UI may imply the pipeline is healthy when backend still crashes early | Error or stalled state is shown without claiming end-to-end execution is fixed | Ready | Claude lazy-storage patch not yet verified |

## Working Rules

| Rule | Meaning |
|---|---|
| One row = one lane | `src/App.jsx` rows stay in shell/accessibility lane; `PipelineProgress.tsx` rows stay in progress lane |
| No backend drift | No `netlify/functions/*`, no storage/runtime/control-plane edits |
| No new transport | No new polling loop, route, or API contract |
| Binary done signals | Each row closes only when the signal is directly observable |
| Dependency stays explicit | Anything relying on backend progress stability remains marked `Backend events stable` |

## Status Vocabulary

| Value | Use |
|---|---|
| `Ready` | Safe to start now |
| `In Progress` | Active implementation |
| `Blocked` | Cannot proceed in this lane |
| `Review` | Ready for human/QA check |
| `Done` | Done signal observed |
| `Locked` | Other lanes should not disturb it |

## Dependency Vocabulary

| Value | Use |
|---|---|
| `None` | Fully frontend-local |
| `Backend events stable` | UI depends on existing progress feed behaving consistently |
| `Claude lazy-storage patch not yet verified` | Partial verification only; do not claim runtime fixed |

## Completion Summary

### What this board already establishes

- Codex #2 is confined to the **frontend App + PipelineProgress lane**
- Codex #2 is **not authorized** to drift into backend/runtime/storage changes
- all work items include a file target, risk, and binary done signal
- dependency-sensitive frontend work remains explicitly marked
- the team has one canonical sheet for this lane under `plans/`

### What this board does not yet claim

- that all listed rows are complete
- that backend progress reliability is fully resolved
- that UI progress honesty can be upgraded independent of backend stability
- that Remotion/rendering is part of this frontend lane

### Team interpretation

Use this file as:

- the **assignment sheet**
- the **boundary map**
- the **frontend done-definition** for Codex #2

Do **not** use this file alone as a final completion report unless the relevant rows are updated to `Done`.
