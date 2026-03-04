# CC-M9-CP — Add Remotion Status to Control Plane

**Ticket:** CC-M9-CP
**Owner:** Claude Code
**Depends on:** Nothing (can start immediately)
**Blocks:** CX-018 (Codex #2 Render Pipeline UI)
**Created:** 2026-03-04
**Status:** READY TO START

---

## Problem

`/control-plane` reports pipeline wiring, services, publishers, and verdicts — but has **zero visibility** into the Remotion render pipeline. The Editor Agent (`compile-video.ts`) silently returns `placeholder: true` when AWS keys are missing. Neither the UI nor agents can see this without running the CLI readiness checker.

## Task

Add a `remotion` section to the `/control-plane` JSON response.

### 1. Add to `ControlPlaneResponse` type

```typescript
remotion: {
  configured: boolean;
  mode: 'real' | 'fallback' | 'disabled';
  serveUrl: boolean;       // REMOTION_SERVE_URL present (never expose the value)
  functionName: boolean;   // REMOTION_FUNCTION_NAME present
  awsKeys: boolean;        // AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY present
  region: string | null;   // REMOTION_REGION value or null
  compositions: number;    // Count of registered compositions (4 expected)
  blocker: string | null;  // Human-readable blocker or null if ready
};
```

### 2. Add `checkRemotion()` function

```typescript
function checkRemotion(): ControlPlaneResponse['remotion'] {
  const serveUrl = !!process.env.REMOTION_SERVE_URL;
  const functionName = !!process.env.REMOTION_FUNCTION_NAME;
  const awsKeys = !!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.REMOTION_REGION || null;
  const configured = serveUrl && functionName && awsKeys;

  let mode: 'real' | 'fallback' | 'disabled';
  let blocker: string | null = null;

  if (configured) {
    mode = 'real';
  } else if (serveUrl || functionName) {
    mode = 'fallback';
    blocker = 'Partial config: missing ' +
      [!serveUrl && 'REMOTION_SERVE_URL', !functionName && 'REMOTION_FUNCTION_NAME', !awsKeys && 'AWS keys']
        .filter(Boolean).join(', ');
  } else {
    mode = 'disabled';
    blocker = 'HO-007: No Remotion keys configured — see docs/ENV-REMOTION.md';
  }

  // 4 compositions registered in src/remotion/Root.tsx
  const compositions = 4;

  return { configured, mode, serveUrl, functionName, awsKeys, region, compositions, blocker };
}
```

### 3. Wire into handler

In the handler (line ~294), add:

```typescript
const remotion = checkRemotion();
```

Add `remotion` to the response object (line ~304):

```typescript
const response: ControlPlaneResponse = {
  ...existing fields,
  remotion,    // NEW
};
```

### 4. Update verdict logic

In `computeVerdict()`, add Remotion to the reasons array:

```typescript
if (remotion.configured) reasons.push('remotion=real');
else reasons.push(`remotion=${remotion.mode}`);
```

Do NOT make Remotion status affect the overall verdict color yet — it's informational until M9 is unblocked.

---

## Files to Edit

| File | Change |
|------|--------|
| `netlify/functions/control-plane.ts` | Add type, function, wire into handler + verdict |

**One file. ~30 lines of new code.**

---

## Gate

```bash
npm run build
just sanity-test-local
just control-plane-gate
```

Commit: `feat(m9): add Remotion render status to control-plane endpoint`

---

## What NOT to do

- Do NOT expose actual env var VALUES (only boolean presence)
- Do NOT touch compile-video.ts or DiagnosticsPage.jsx
- Do NOT make Remotion status fail the overall verdict

---

*Once this lands, Codex #2 can read `remotion` from the control-plane JSON and build the UI tile (CX-018).*
