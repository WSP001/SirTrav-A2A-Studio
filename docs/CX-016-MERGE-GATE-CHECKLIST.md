# CX-016 Merge Gate Checklist

**PR Branch:** `codex/cx-016-diagnostics-ui` → `main`
**Commit:** `21728664` — `feat(ui): CX-016 implement diagnostics dashboard and wire status emblem`
**Author:** Codex #2
**Reviewer:** Windsurf/Cascade (Acting Master)
**Date:** 2026-03-02

---

## Files in PR (5 — UI only, no backend, no artifacts)

| File | Action | Lines |
|------|--------|-------|
| `src/pages/DiagnosticsPage.jsx` | NEW | +127 |
| `src/components/SystemStatusEmblem.tsx` | MODIFIED | +42 / -50 |
| `src/main.jsx` | MODIFIED | +4 / -1 |
| `src/App.jsx` | MODIFIED | +3 / -0 |
| `src/App.css` | MODIFIED | +109 / -1 |

---

## Pre-Merge Gate Checks

### 1. Build Gate

- [ ] `npm run build` passes with 0 errors on the PR branch
- [ ] No new TypeScript/ESLint errors introduced

### 2. Backend Compatibility

- [ ] PR fetches `/.netlify/functions/control-plane` (exists on main since `88d7fe69`)
- [ ] No backend files modified — clean UI-only change
- [ ] No `dist/` or generated artifacts in the commit

### 3. Route Wiring

- [ ] `src/main.jsx` uses pathname check for `/diagnostics` → `DiagnosticsPage`
- [ ] Default route (`/`) still renders `App` component
- [ ] `public/_redirects` SPA rule (`/* /index.html 200`) covers `/diagnostics`

### 4. SystemStatusEmblem Changes

- [ ] Now fetches `/control-plane` instead of `/healthcheck` — **correct** (M7 endpoint)
- [ ] Maps verdict: GREEN → real, YELLOW → degraded, RED → error
- [ ] Displays split verdict inline: `L:YELLOW C:YELLOW`
- [ ] Removed old packet toggle (simulation/real mode switch) — **acceptable** (was non-functional without social_publishing=ok)
- [ ] Error handling: shows "Control Plane: unavailable" on fetch failure

### 5. DiagnosticsPage Content

- [ ] Split Verdict section: local / cloud / combined tiles with color badges
- [ ] 7-Agent Pipeline Wiring: reads `data.pipeline.agents` → WIRED/MISSING badges
- [ ] Service Health: reads `data.services[]` → status badges with error details
- [ ] 15-second auto-refresh interval
- [ ] Cleanup: `mounted` flag + `clearInterval` on unmount
- [ ] "Back to Studio" link returns to `/`

### 6. Styling

- [ ] CX-016 CSS classes scoped: `.packet-*`, `.diag-*` — no collision risk
- [ ] Responsive breakpoints: 768px (2-col grid), 640px (1-col grid)
- [ ] Color tokens match existing THEME palette

---

## Known Tradeoffs (Master Assessment)

| Item | Verdict | Note |
|------|---------|------|
| Removed packet toggle | ✅ OK | Toggle was tied to social_publishing status; control-plane verdict is the real truth source now |
| No react-router | ✅ OK | Pathname check in main.jsx avoids adding a dependency; SPA `_redirects` handles it |
| No publishers section in DiagnosticsPage | ⚠️ Future | Could add publisher mode tiles (x/linkedin/youtube) in a follow-up |
| No YouTube link policy display | ⚠️ Future | Could show `youtube_link_policy.currentUrl` status |
| No cycle gates display | ⚠️ Future | `data.pipeline.cycleGates` is available but not rendered |

---

## Merge Decision

If all checks above pass:

```bash
# On main branch
git merge --no-ff codex/cx-016-diagnostics-ui -m "Merge CX-016: diagnostics dashboard + status emblem (#XX)"
git push origin main
```

Then update MASTER.md:
- M7 checklist: mark `/diagnostics` route and UI emblem as done
- Milestones summary: M7 → ✅ DONE

---

## Post-Merge Verification

```bash
just sanity-test-local    # Must still pass (33/0)
npm run build             # Must still build clean
# Open http://localhost:8888/diagnostics — verify tiles render
```

---

## For Codex #1 (Stale Clone Fix)

Codex #1 at `C:\Users\Roberto002\Documents\GitHub\SirTrav-A2A-Studio` is STALE.
All "MISSING" file reports are because that clone hasn't pulled recent main commits.

```bash
cd C:\Users\Roberto002\Documents\GitHub\SirTrav-A2A-Studio
git pull origin main
# All M7 files will appear: control-plane.ts, AG-014-RECEIPT.md, verify-control-plane.mjs
```
