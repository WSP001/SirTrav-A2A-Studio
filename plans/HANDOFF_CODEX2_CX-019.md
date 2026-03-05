# CX-019 — Wire Metrics Panel to Live Pipeline Cost + Time

**Ticket:** CX-019
**Agent:** Codex #2 (frontend)
**Priority:** HIGH — fixes the metrics panel PROTOTYPE gap
**Created:** 2026-03-04
**Status:** BLOCKED on CC-M9-METRICS (Claude Code adds runningCost to SSE events)
**Depends on:** CC-M9-METRICS (Claude Code) + CX-018 (Codex #2, do this first)

---

## Problem

The metrics panel in `App.jsx` (lines 521-551) shows `$0.00` and `0.0s` permanently. The `setMetrics` state (line 29) is initialized but never updated during or after pipeline runs.

**Two data sources exist but aren't wired:**

1. **Real-time SSE** — After CC-M9-METRICS, progress events will include `runningCost` and `elapsedMs`
2. **Final invoice** — `handlePipelineComplete` already receives `data.artifacts.invoice` (line 208) with `totalDue`, `subtotal`, `markupTotal`

---

## What to Fix

### Phase 1: Wire final invoice into metrics (can do NOW, no dependency)

In `src/App.jsx`, inside `handlePipelineComplete` (line 190), add:

```javascript
// After setPipelineStatus('completed'):
const elapsed = (Date.now() - startTime) / 1000; // Need to capture startTime
if (data.artifacts?.invoice) {
  setMetrics({
    cost: data.artifacts.invoice.totalDue || 0,
    time: elapsed,
  });
}
```

**Note:** `startTime` is defined at line 104 inside `runPipeline` scope. You'll need to lift it to component state or a ref so `handlePipelineComplete` can access it.

### Phase 2: Wire real-time SSE cost (AFTER CC-M9-METRICS delivers)

In `src/components/PipelineProgress.tsx`, when SSE events arrive with `runningCost`:

```javascript
// In the SSE event handler, call a new onMetricsUpdate prop:
if (event.runningCost !== undefined) {
  onMetricsUpdate?.({
    cost: event.runningCost,
    time: event.elapsedMs ? event.elapsedMs / 1000 : 0,
  });
}
```

Then in `App.jsx`, pass the callback:

```jsx
<PipelineProgress
  projectId={projectId}
  runId={currentRunId}
  onComplete={handlePipelineComplete}
  onError={handlePipelineError}
  onMetricsUpdate={(m) => setMetrics(m)}  // <-- NEW
/>
```

---

## Files to Edit

| File | Change |
|------|--------|
| `src/App.jsx` | Phase 1: wire invoice into setMetrics in handlePipelineComplete |
| `src/App.jsx` | Phase 2: pass onMetricsUpdate to PipelineProgress |
| `src/components/PipelineProgress.tsx` | Phase 2: read runningCost from SSE, call onMetricsUpdate |

## Files NOT to Edit

- ⛔ `PlatformToggle.tsx` — M8 frozen
- ⛔ `ResultsPreview.tsx` — M8 frozen
- ⛔ Any `netlify/functions/*` — that's Claude Code's domain

---

## Execution Order

1. **CX-018 FIRST** — Render Pipeline section in DiagnosticsPage.jsx (already assigned)
2. **CX-019 Phase 1** — Wire final invoice into metrics (no backend dependency)
3. **CX-019 Phase 2** — Wire real-time SSE cost (after CC-M9-METRICS merges)

---

## READ BEFORE WRITE Rule

⚠️ Before editing ANY file, run `cat` on the real file to verify current line numbers and content. Do NOT cite line numbers from memory or from this handoff — they may have shifted. This rule exists because CX-018 prep had 12/13 citations wrong.

---

## Gates

```bash
npm run build              # 0 errors
just sanity-test-local     # 33+ pass
```

## Commit Message Pattern

```
feat(ui): wire metrics panel to pipeline cost + time (CX-019)
```

---

**For the Commons Good** 🎬
