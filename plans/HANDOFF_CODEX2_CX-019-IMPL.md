# CX-019 Implementation Spec — Wire Metrics Panel to Live Pipeline Cost + Time

**Ticket:** CX-019  
**Agent:** Codex #2 (frontend)  
**Priority:** HIGH — fixes the metrics panel showing `$0.00` / `0.0s` permanently  
**Created:** 2026-03-06  
**Status:** UNBLOCKED (CC-M9-METRICS merged at `face3aee`)  
**Depends on:** None — all backend work is complete  

---

## Problem

The metrics panel in `App.jsx` shows `$0.00` and `0.0s` permanently because `setMetrics` is never called after initialization. The backend already sends `runningCost` and `elapsedMs` in all 7 agent progress events (CC-M9-METRICS), but the frontend ignores them.

---

## Files to Edit

| File | Change |
|------|--------|
| `src/App.jsx` | Add `useRef` import, add `startTimeRef`, wire invoice in `handlePipelineComplete`, pass `onMetricsUpdate` prop |
| `src/components/PipelineProgress.tsx` | Extend `ProgressEvent` interface, add `onMetricsUpdate` prop, call it in SSE handler |

## Files NOT to Edit

- ⛔ `PlatformToggle.tsx` — M8 frozen at `0d220f72`
- ⛔ `ResultsPreview.tsx` — M8 frozen at `0d220f72`
- ⛔ Any `netlify/functions/*` — backend is complete

---

## Implementation Steps

### Step 1: Update React import in App.jsx (line 1)

**File:** `src/App.jsx`  
**Line:** 1  

**BEFORE:**
```jsx
import React, { useState, useCallback, useEffect } from "react";
```

**AFTER:**
```jsx
import React, { useState, useCallback, useEffect, useRef } from "react";
```

---

### Step 2: Add startTimeRef after metrics state in App.jsx (line 30)

**File:** `src/App.jsx`  
**Line:** After line 30 (after `const [metrics, setMetrics] = useState({ cost: 0, time: 0 });`)  

**BEFORE:**
```jsx
  const [metrics, setMetrics] = useState({ cost: 0, time: 0 });
  const [logs, setLogs] = useState({});
```

**AFTER:**
```jsx
  const [metrics, setMetrics] = useState({ cost: 0, time: 0 });
  const startTimeRef = useRef(0);  // CX-019: Track pipeline start time for elapsed calculation
  const [logs, setLogs] = useState({});
```

---

### Step 3: Capture startTime in runPipeline (line 104)

**File:** `src/App.jsx`  
**Line:** 104  

**BEFORE:**
```jsx
    setMetrics({ cost: 0, time: 0 });
    const startTime = Date.now();

    // Reset agent states
```

**AFTER:**
```jsx
    setMetrics({ cost: 0, time: 0 });
    startTimeRef.current = Date.now();  // CX-019: Capture start time in ref for handlePipelineComplete

    // Reset agent states
```

---

### Step 4: Wire invoice in handlePipelineComplete (line 190-191)

**File:** `src/App.jsx`  
**Line:** After `setPipelineStatus('completed');` (line 191)  

**BEFORE:**
```jsx
  const handlePipelineComplete = (data) => {
    setPipelineStatus('completed');

    // Validate videoUrl
    const videoUrl = data.artifacts?.videoUrl;
```

**AFTER:**
```jsx
  const handlePipelineComplete = (data) => {
    setPipelineStatus('completed');

    // CX-019 Phase 1: Wire final invoice into metrics panel
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    if (data.artifacts?.invoice) {
      setMetrics({ 
        cost: data.artifacts.invoice.totalDue || 0, 
        time: elapsed 
      });
    }

    // Validate videoUrl
    const videoUrl = data.artifacts?.videoUrl;
```

---

### Step 5: Extend ProgressEvent interface in PipelineProgress.tsx (lines 19-27)

**File:** `src/components/PipelineProgress.tsx`  
**Line:** 19-27  

**BEFORE:**
```tsx
interface ProgressEvent {
  projectId: string;
  runId?: string;
  agent: string;
  status: 'started' | 'running' | 'completed' | 'failed';
  message: string;
  timestamp: string;
  progress: number;
}
```

**AFTER:**
```tsx
interface ProgressEvent {
  projectId: string;
  runId?: string;
  agent: string;
  status: 'started' | 'running' | 'completed' | 'failed';
  message: string;
  timestamp: string;
  progress: number;
  runningCost?: number;   // CX-019: Real-time cost from CC-M9-METRICS
  elapsedMs?: number;     // CX-019: Elapsed time in milliseconds
}
```

---

### Step 6: Add onMetricsUpdate prop to PipelineProgressProps (lines 36-40)

**File:** `src/components/PipelineProgress.tsx`  
**Line:** 36-40  

**BEFORE:**
```tsx
interface PipelineProgressProps {
  projectId: string;
  runId?: string;
  onComplete?: (result: ProgressData) => void;
  onError?: (error: string) => void;
}
```

**AFTER:**
```tsx
interface PipelineProgressProps {
  projectId: string;
  runId?: string;
  onComplete?: (result: ProgressData) => void;
  onError?: (error: string) => void;
  onMetricsUpdate?: (metrics: { cost: number; time: number }) => void;  // CX-019
}
```

---

### Step 7: Destructure onMetricsUpdate in component signature (line 52)

**File:** `src/components/PipelineProgress.tsx`  
**Line:** 52  

**BEFORE:**
```tsx
export default function PipelineProgress({ projectId, runId, onComplete, onError }: PipelineProgressProps) {
```

**AFTER:**
```tsx
export default function PipelineProgress({ projectId, runId, onComplete, onError, onMetricsUpdate }: PipelineProgressProps) {
```

---

### Step 8: Call onMetricsUpdate in SSE progress handler (lines 83-95)

**File:** `src/components/PipelineProgress.tsx`  
**Line:** 83-95  

**BEFORE:**
```tsx
        es.addEventListener('progress', (event: any) => {
          try {
            const evt: ProgressEvent = JSON.parse(event.data);
            setEvents(prev => {
              // Avoid duplicates
              if (prev.find(e => e.timestamp === evt.timestamp && e.agent === evt.agent && e.status === evt.status)) {
                return prev;
              }
              return [...prev, evt];
            });
          } catch (err) {
            console.error('[PipelineProgress] Parse error:', err);
          }
        });
```

**AFTER:**
```tsx
        es.addEventListener('progress', (event: any) => {
          try {
            const evt: ProgressEvent = JSON.parse(event.data);
            setEvents(prev => {
              // Avoid duplicates
              if (prev.find(e => e.timestamp === evt.timestamp && e.agent === evt.agent && e.status === evt.status)) {
                return prev;
              }
              return [...prev, evt];
            });
            // CX-019 Phase 2: Wire real-time cost updates to parent
            if (evt.runningCost !== undefined) {
              onMetricsUpdate?.({ 
                cost: evt.runningCost, 
                time: (evt.elapsedMs || 0) / 1000 
              });
            }
          } catch (err) {
            console.error('[PipelineProgress] Parse error:', err);
          }
        });
```

---

### Step 9: Pass onMetricsUpdate callback from App.jsx (lines 559-564)

**File:** `src/App.jsx`  
**Line:** 559-564  

**BEFORE:**
```jsx
              <PipelineProgress
                projectId={projectId}
                runId={currentRunId}
                onComplete={handlePipelineComplete}
                onError={handlePipelineError}
              />
```

**AFTER:**
```jsx
              <PipelineProgress
                projectId={projectId}
                runId={currentRunId}
                onComplete={handlePipelineComplete}
                onError={handlePipelineError}
                onMetricsUpdate={(m) => setMetrics(m)}
              />
```

---

## Verification

After implementing all 9 steps:

```bash
npm run build                 # Must pass (1357+ modules, no type errors)
just sanity-test-local        # 33+ checks must pass
just control-plane-gate       # CI gate must pass
```

**Manual verification:**
1. Start `netlify dev`
2. Upload test images and run a pipeline
3. Confirm metrics panel updates from `$0.00` during the run (real-time SSE)
4. Confirm metrics panel shows final cost at completion (invoice wiring)

---

## Invoice Object Shape (for reference)

The `data.artifacts.invoice` object from the backend has this shape:

```typescript
{
  runId: string;
  projectId: string;
  subtotal: number;      // Base API costs
  markupTotal: number;   // 20% Commons Good markup
  totalDue: number;      // subtotal + markupTotal (this is what we display)
  currency: 'USD';
  lineItems: Array<{
    agent: string;
    service: string;
    units: number;
    unitCost: number;
    totalCost: number;
  }>;
}
```

---

## Commit Message

```
feat(ui): wire metrics panel to live pipeline cost + time [CX-019]

- Add startTimeRef to track pipeline start time
- Wire final invoice.totalDue into setMetrics on completion
- Extend ProgressEvent interface with runningCost + elapsedMs
- Add onMetricsUpdate callback prop to PipelineProgress
- Call onMetricsUpdate on each SSE progress event

Fixes: metrics panel showing $0.00 / 0.0s permanently
Depends: CC-M9-METRICS (face3aee) - backend already sends cost data
```

---

## READ BEFORE WRITE Rule

⚠️ Before editing ANY file, run `cat` on the real file to verify current line numbers and content. Line numbers in this spec are from 2026-03-06. If the file has been modified since then, adjust accordingly.

---

**For the Commons Good** 🎬
