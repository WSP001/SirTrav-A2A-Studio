# CX-018 — Render Pipeline Status in Diagnostics Page

**Ticket:** CX-018
**Owner:** Codex #2
**Depends on:** CC-M9-CP (Claude Code adds `remotion` to `/control-plane`)
**Created:** 2026-03-04
**Status:** BLOCKED — waiting for CC-M9-CP to land first

---

## Problem

The Diagnostics page (`/diagnostics`) shows split verdicts, 7-agent wiring, and service health — but has **no visibility** into the Remotion render pipeline. When the Editor Agent returns `placeholder: true` because AWS keys are missing, the UI shows nothing about it.

After CC-M9-CP lands, `/control-plane` will return a `remotion` object:

```json
{
  "remotion": {
    "configured": false,
    "mode": "disabled",
    "serveUrl": false,
    "functionName": false,
    "awsKeys": false,
    "region": null,
    "compositions": 4,
    "blocker": "HO-007: No Remotion keys configured"
  }
}
```

## Task

Add a **"Render Pipeline"** section to `DiagnosticsPage.jsx` that displays this data.

### Layout

Add a new `<section>` between "7-Agent Pipeline Wiring" and "Service Health":

```
┌─────────────────────────────────────────────────┐
│  Render Pipeline                                │
│                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ Mode     │  │ AWS Keys │  │ Comps    │      │
│  │ DISABLED │  │ MISSING  │  │ 4/4      │      │
│  │ (red)    │  │ (red)    │  │ (green)  │      │
│  └──────────┘  └──────────┘  └──────────┘      │
│                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ ServeURL │  │ Function │  │ Region   │      │
│  │ MISSING  │  │ MISSING  │  │ N/A      │      │
│  │ (red)    │  │ (red)    │  │ (gray)   │      │
│  └──────────┘  └──────────┘  └──────────┘      │
│                                                 │
│  ⚠️ HO-007: No Remotion keys configured        │
│     See docs/ENV-REMOTION.md                    │
└─────────────────────────────────────────────────┘
```

### Badge Colors

| `remotion.mode` | Badge Color | Label |
|-----------------|-------------|-------|
| `real` | `diag-green` | REAL |
| `fallback` | `diag-yellow` | FALLBACK |
| `disabled` | `diag-red` | DISABLED |

Boolean fields (`serveUrl`, `functionName`, `awsKeys`):
- `true` → `diag-green` + "SET"
- `false` → `diag-red` + "MISSING"

`compositions`:
- `>= 4` → `diag-green` + "4/4"
- `< 4` → `diag-yellow` + "{n}/4"

`blocker`:
- If not null → show as `diag-meta` warning text below the grid
- If null → show "Ready for real rendering" in green

### Implementation

```jsx
{data.remotion && (
  <section className="glass-card p-6">
    <h2 className="section-title mb-4">Render Pipeline</h2>
    <div className="diag-grid-3">
      <div className="diag-tile">
        <p className="diag-label">Mode</p>
        <span className={`diag-badge ${remotionModeClass(data.remotion.mode)}`}>
          {data.remotion.mode.toUpperCase()}
        </span>
      </div>
      <div className="diag-tile">
        <p className="diag-label">AWS Keys</p>
        <span className={`diag-badge ${data.remotion.awsKeys ? 'diag-green' : 'diag-red'}`}>
          {data.remotion.awsKeys ? 'SET' : 'MISSING'}
        </span>
      </div>
      <div className="diag-tile">
        <p className="diag-label">Compositions</p>
        <span className={`diag-badge ${data.remotion.compositions >= 4 ? 'diag-green' : 'diag-yellow'}`}>
          {data.remotion.compositions}/4
        </span>
      </div>
    </div>
    <div className="diag-grid-3 mt-3">
      <div className="diag-tile">
        <p className="diag-label">Serve URL</p>
        <span className={`diag-badge ${data.remotion.serveUrl ? 'diag-green' : 'diag-red'}`}>
          {data.remotion.serveUrl ? 'SET' : 'MISSING'}
        </span>
      </div>
      <div className="diag-tile">
        <p className="diag-label">Function Name</p>
        <span className={`diag-badge ${data.remotion.functionName ? 'diag-green' : 'diag-red'}`}>
          {data.remotion.functionName ? 'SET' : 'MISSING'}
        </span>
      </div>
      <div className="diag-tile">
        <p className="diag-label">Region</p>
        <span className="diag-badge diag-gray">
          {data.remotion.region || 'N/A'}
        </span>
      </div>
    </div>
    {data.remotion.blocker && (
      <p className="diag-meta mt-3">⚠️ {data.remotion.blocker}</p>
    )}
    {!data.remotion.blocker && (
      <p className="diag-meta mt-3 text-green-400">✅ Ready for real rendering</p>
    )}
  </section>
)}
```

Add helper function:

```jsx
function remotionModeClass(mode) {
  if (mode === "real") return "diag-green";
  if (mode === "fallback") return "diag-yellow";
  return "diag-red";
}
```

---

## File to Edit

| File | Change |
|------|--------|
| `src/pages/DiagnosticsPage.jsx` | Add Render Pipeline section + helper |

**One file. ~50 lines of new JSX.**

---

## Rules

- ⛔ Do NOT touch `PlatformToggle.tsx` or `ResultsPreview.tsx` (M8 frozen)
- ⛔ Do NOT touch `control-plane.ts` (that's CC-M9-CP)
- ✅ Use existing `diag-*` CSS classes (already in the stylesheet)
- ✅ Follow the existing pattern from Service Health section

---

## Gate

```bash
npm run build
just sanity-test-local
```

Commit: `feat(m9): add Render Pipeline section to Diagnostics page (CX-018)`

---

## When to Start

**Only after CC-M9-CP is merged to main.** Until then, `data.remotion` will be `undefined` and the section won't render (the `{data.remotion && ...}` guard handles this gracefully).

---

*This ticket closes the observability gap: CLI readiness → backend API → UI — full stack visibility.*
