# CC-M9-METRICS — Wire Real-Time Cost + Time into SSE Progress Events

**Ticket:** CC-M9-METRICS
**Agent:** Claude Code (backend)
**Priority:** HIGH — fixes the #1 audit finding from Master's landing page review
**Created:** 2026-03-04
**Status:** READY — not blocked on any keys

---

## Problem

The UI metrics panel shows `$0.00` and `0.0s` during and after pipeline runs. The backend tracks costs perfectly via `ManifestGenerator` in `run-pipeline-background.ts`, but the SSE progress events sent through `appendProgress()` never include running cost totals. The invoice only arrives at completion in `data.artifacts.invoice`.

**Root cause:** `appendProgress()` calls don't pass cost data → `PipelineProgress.tsx` never receives it → `App.jsx setMetrics()` is never called during the run.

---

## What to Fix

### 1. Add `runningCost` to SSE progress events

In `netlify/functions/run-pipeline-background.ts`, after each `manifest.addEntry()` call, include running totals in the next `appendProgress()` or `updateRun()`:

```typescript
// After each manifest.addEntry(), compute running totals:
const runningItems = manifest.getItems(); // You may need to add this getter
const runningCost = runningItems.reduce((sum, item) => sum + item.total, 0);

// Include in the progress update:
await appendProgress(projectId, runId, {
  agent: 'director',
  status: 'completed',
  runningCost,          // <-- NEW: accumulated cost so far
  elapsedMs,            // <-- NEW: Date.now() - startTime
});
```

### 2. Add `getItems()` or `getRunningTotal()` to ManifestGenerator

In `netlify/functions/lib/cost-manifest.ts`, add a method to expose running totals:

```typescript
getRunningTotal(): { subtotal: number; markupTotal: number; totalDue: number } {
    const subtotal = this.items.reduce((sum, item) => sum + item.baseCost, 0);
    const markupTotal = this.items.reduce((sum, item) => sum + item.markup, 0);
    const totalDue = this.items.reduce((sum, item) => sum + item.total, 0);
    return { subtotal, markupTotal, totalDue };
}
```

### 3. Fix `compositions: 4` hardcode in checkRemotion()

In `netlify/functions/control-plane.ts` line ~318, change:

```typescript
// BEFORE:
const compositions = 4;

// AFTER — count actual registered compositions:
const compositions = 7; // IntroSlate, SirTrav-Main, EmblemComposition, EmblemThumbnail, MotionGraphicButtons, WeeklyRecap, EngagementReport
```

Or better, import the count dynamically if feasible.

---

## Files to Edit

| File | Change |
|------|--------|
| `netlify/functions/run-pipeline-background.ts` | Add `runningCost` + `elapsedMs` to progress events |
| `netlify/functions/lib/cost-manifest.ts` | Add `getRunningTotal()` method |
| `netlify/functions/control-plane.ts` | Fix `compositions: 4` → `7` |

## Files NOT to Edit

- ⛔ `src/App.jsx` — that's Codex #2's domain
- ⛔ `src/components/PipelineProgress.tsx` — Codex #2 will wire the UI side
- ⛔ Any M8 files (`PlatformToggle.tsx`, `ResultsPreview.tsx`)

---

## Gates Before Merge

```bash
npm run build              # 0 errors
just sanity-test-local     # 33+ pass
just control-plane-gate    # verdict check
```

## Commit Message Pattern

```
feat(m9): wire real-time cost tracking into SSE progress events

- Add getRunningTotal() to ManifestGenerator
- Include runningCost + elapsedMs in appendProgress calls
- Fix compositions count: 4 → 7 in checkRemotion()
```

---

## Why This Matters

The Master's landing page audit found 18/23 components PRODUCTION-READY but the metrics panel is stuck at PROTOTYPE because it never updates. This is the backend half of the fix. Codex #2 will wire the frontend half (reading `runningCost` from SSE events into `setMetrics`).

**For the Commons Good** 🎬
