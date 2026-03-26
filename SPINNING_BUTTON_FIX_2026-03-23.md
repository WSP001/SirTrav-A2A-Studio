# Spinning Button Fix — 2026-03-23

## Problem: Button Keeps Spinning After Pipeline Completes

User reported: "the pipeline gets past 14% but when you initialize it just keeps button spinning"

## Root Cause Analysis

### The Disconnect
The pipeline was completing successfully (progress=100%), but the UI button stayed in the "spinning" state because of a data structure mismatch:

1. **Pipeline completes** → `run-pipeline-background.ts` writes finalArtifacts to storage
2. **SSE stream emits "complete" event** → `progress.ts` sends minimal data: `{projectId, status: 'completed'}`
3. **UI receives completion** → `PipelineProgress.tsx` calls `onComplete(data)` with minimal event data
4. **UI expects full artifacts** → `App.jsx` `handlePipelineComplete()` tries to read `data.artifacts.videoUrl`, `data.artifacts.invoice`, etc.
5. **❌ Artifacts are undefined** → UI can't extract results, button stays spinning

### The Missing Link
The `/results` endpoint existed but wasn't being called! The completion flow was:
- SSE/polling detected completion ✅
- Called `onComplete` with minimal event data ❌
- **Should have**: Fetched full results from `/results` endpoint before calling `onComplete` ✅ (FIXED)

## Files Changed

### 1. `src/components/PipelineProgress.tsx` (2 fixes)

**Fix A: SSE completion handler**
```typescript
// BEFORE: Only passed minimal event data
es.addEventListener('complete', (event: any) => {
  const data = JSON.parse(event.data);
  onComplete?.(data); // ❌ Missing artifacts
  es.close();
});

// AFTER: Fetch full results before completing
es.addEventListener('complete', async (event: any) => {
  const resultsRes = await fetch(`/.netlify/functions/results?projectId=${projectId}&runId=${runId}`);
  if (resultsRes.ok) {
    const fullResults = await resultsRes.json();
    onComplete?.(fullResults); // ✅ Has artifacts
  }
  es.close();
});
```

**Fix B: Polling completion handler**
```typescript
// BEFORE: Just returned without calling onComplete
if (last?.status === 'completed') {
  clearTimeout(pollIntervalRef.current);
  return; // ❌ Never called onComplete!
}

// AFTER: Fetch full results before completing
if (last?.status === 'completed') {
  const resultsRes = await fetch(`/.netlify/functions/results?projectId=${projectId}&runId=${runId}`);
  if (resultsRes.ok) {
    const fullResults = await resultsRes.json();
    onComplete?.(fullResults); // ✅ Now calls onComplete with artifacts
  }
  clearTimeout(pollIntervalRef.current);
  return;
}
```

### 2. `netlify/functions/results.ts` (structure alignment)

**Fix: Moved top-level fields into artifacts object to match UI expectations**
```typescript
// BEFORE: videoUrl at top level
{
  status: 'completed',
  videoUrl: 'https://...',  // ❌ UI expects data.artifacts.videoUrl
  creditsUrl: '...',
  artifacts: {
    resolution: '1080p',
    invoice: {...}
  }
}

// AFTER: videoUrl inside artifacts
{
  status: 'completed',
  artifacts: {
    videoUrl: 'https://...',  // ✅ Matches UI expectations
    creditsUrl: '...',
    pipelineMode: 'FULL',
    publishTargets: ['x', 'linkedin'],
    resolution: '1080p',
    duration: 30,
    invoice: {...}
  }
}
```

### 3. `netlify/functions/lib/runIndex.ts` (schema update)

**Fix: Added missing `publishTargets` field to RunArtifacts interface**
```typescript
export interface RunArtifacts {
  // ... existing fields ...
  pipelineMode?: string;
  publishTargets?: string[];  // ✅ ADDED - CX-019 M8 social platform targets
  invoice?: Manifest;
}
```

### 4. `netlify/functions/run-pipeline-background.ts` (index forwarding)

**Fix: Forward publishTargets from artifacts to the run index**
```typescript
// Forward artifacts to the index if present
if (patch.artifacts) {
  if (patch.artifacts.videoUrl) indexPatch.videoUrl = patch.artifacts.videoUrl;
  if (patch.artifacts.creditsUrl) indexPatch.creditsUrl = patch.artifacts.creditsUrl;
  if (patch.artifacts.pipelineMode) indexPatch.pipelineMode = patch.artifacts.pipelineMode;
  if ((patch.artifacts as any).invoice) indexPatch.invoice = (patch.artifacts as any).invoice;
  if ((patch.artifacts as any).publishTargets) indexPatch.publishTargets = (patch.artifacts as any).publishTargets; // ✅ ADDED
}
```

## Verification

Build status: ✅ **SUCCESS** (2.51s)
```bash
npm run build
✓ 1357 modules transformed
✓ built in 2.51s
```

## Testing Plan

1. **Start pipeline** → Click the Click2Kick button
2. **Watch progress** → Should see all 7 agents execute (Director → Writer → Voice → Composer → Editor → Attribution → Publisher)
3. **Check completion** → Button should change from "Agents Working..." (spinning) to "Complete!" (green checkmark)
4. **Verify results** → CinematicTheater should display:
   - Video player with real videoUrl (not placeholder)
   - Cost invoice in metrics panel
   - Publish target buttons (X, LinkedIn, YouTube)
   - Pipeline mode badge (FULL/ENHANCED/SIMPLE/DEMO)

## Expected Behavior After Fix

| Before | After |
|--------|-------|
| Button spins forever ❌ | Button shows "Complete!" ✅ |
| No video displayed ❌ | Video player loads ✅ |
| No cost/time metrics ❌ | Invoice displayed ✅ |
| No publish buttons ❌ | Social buttons appear ✅ |

## The 14% Mystery (Bonus Find)

While investigating, found a comment in `progress.ts` line 96:
> "Bug fix: the old check `evt.status === 'completed'` closed the stream when Director finished, causing the UI to stall at 14%."

This was already fixed in a previous commit. The current issue was a **different bug** - completion was detected but results weren't being fetched.

## Why This Matters

7 AI agents are working hard (Director, Writer, Voice, Composer, Editor, Attribution, Publisher), but if the UI can't display their results, it looks like nothing happened. This fix ensures:

✅ Users see the final video
✅ Users see the cost breakdown
✅ Users can publish to social media
✅ Users know which agents worked (pipeline mode)

**For the Commons Good** 🎬
