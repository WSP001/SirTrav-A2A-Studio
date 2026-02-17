# TASK: CX-012 — Command Plaque Mission

**Owner:** Codex Agent
**Status:** PENDING_ACTIVATION
**Priority:** P0 (CRITICAL)
**Sprint:** The Pulse & The Plaque

---

## MISSION OBJECTIVE

Build and mount the "Command Plaque" — a heraldic System Status Emblem
that shows live health of the SirTrav A2A pipeline at a glance.
The emblem is the visual proof that the truth loop is alive.

---

## TRUTH RITUAL (Execution Commands)

Run these in sequence to satisfy the mission contract:

```bash
# 1. PREFLIGHT — check task spec + component status
just build-hud

# 2. ORIENT — confirm Layer 1-2 gates are clear
just cycle-next-for codex

# 3. BUILD — create the component (your work goes here)
# See STEP-BY-STEP below

# 4. VERIFY — full truth loop
just mvp-verify

# 5. REPORT — generate pulse report
just weekly-pulse-report
```

---

## THE GOLDEN PATH (Checklist)

- [ ] **L1 Verify:** `just cycle-gate build` returns PASS
- [ ] **L2 Contract:** `just cycle-gate contracts` returns PASS
- [ ] **L3 Design:** `just cycle-gate design_tokens` returns PASS
- [ ] **L3 Plaque:** `src/components/SystemStatusEmblem.tsx` exists and renders
- [ ] **L3 Colors:** Gold (#D4AF37) used for healthy quadrant via `THEME` import
- [ ] **L4 Social:** `just agentic-dry` confirms shape validation (6/6 PASS)
- [ ] **Build:** `just build` succeeds with no errors

---

## COMPONENT SPEC

### File: `src/components/SystemStatusEmblem.tsx`

**Data source:** `GET /.netlify/functions/healthcheck`

**4-Quadrant Layout:**

| Quadrant | Symbol | Domain | Healthy Color | Unhealthy |
|----------|--------|--------|---------------|-----------|
| TL | Lion | Storage/Infra | Gold #D4AF37 | Gray #6B7280 |
| TR | Shield | Network/API | Azure #007FFF | Red #EF4444 |
| BL | Cross | Build/Deploy | Silver #C0C0C0 | Orange #F97316 |
| BR | Phoenix | AI Pipeline | Ember (THEME.accent) | Dark #374151 |

**Center:** "ST" monogram in Inter Bold

**Interactions:**
- Click quadrant → detail panel for that domain
- Click monogram → toggle Inverse Mode (admin auth)
- Loading → skeleton pulse animation
- Error → "offline" indicator (no fake success!)

**Responsive:**
- Desktop: 200x200px, full detail
- Tablet: 120x120px, symbols only
- Mobile: 64x64px, single color dot

### Brand Token Import (REQUIRED)

```typescript
import { THEME } from '../remotion/branding';

const EMBLEM_COLORS = {
  gold: '#D4AF37',
  azure: '#007FFF',
  silver: '#C0C0C0',
  ember: THEME.colors.accent,      // #f59e0b
  dark: THEME.colors.background,   // #0f172a
  unhealthy: '#6B7280',
};
```

### Healthcheck Response Shape

```typescript
interface HealthcheckResponse {
  status: 'ok' | 'degraded' | 'error';
  version: string;
  storage: { mode: string; healthy: boolean };
  ai: { configured: boolean; provider: string };
  social: {
    twitter: { configured: boolean; enabled: boolean };
    youtube: { configured: boolean; enabled: boolean };
    linkedin: { configured: boolean; enabled: boolean };
    instagram: { configured: boolean; enabled: boolean };
    tiktok: { configured: boolean; enabled: boolean };
  };
  pipeline_mode: string;
}
```

---

## DATA CONTRACTS

| Artifact | Path | Status |
|----------|------|--------|
| HUD Component | `src/components/SystemStatusEmblem.tsx` | CREATE |
| HUD Styles | `src/components/SystemStatusEmblem.css` | CREATE (optional) |
| Design Spec | `plans/SIR_TRAVIS_EMBLEM_SPEC.md` | CREATE if missing |
| App Wiring | `src/App.jsx` | EDIT (add import + placement) |
| Pulse Report | `artifacts/reports/weekly-pulse-report.json` | VERIFY (from Windsurf) |
| Agentic Metrics | `artifacts/public/metrics/agentic-run-*.json` | ARCHIVE (read-only) |

---

## STEP-BY-STEP

1. **Read spec:** `plans/SIR_TRAVIS_EMBLEM_SPEC.md` (create if missing — see handoff)
2. **Create component:** `src/components/SystemStatusEmblem.tsx`
   - Import `THEME` from `../remotion/branding` — NEVER hardcode colors
   - Fetch `/.netlify/functions/healthcheck` on mount
   - Render 4 quadrants with dynamic coloring based on health
   - Add loading skeleton + error state (no fake success)
3. **Wire into App:** Add `<SystemStatusEmblem />` to header in `src/App.jsx`
4. **Verify gate:** `just cycle-gate design_tokens`
5. **Build test:** `just build`
6. **Full verify:** `just mvp-verify`

---

## MISSION SUCCESS CRITERIA

1. `just mvp-verify` reports 10/10 PASS
2. `src/components/SystemStatusEmblem.tsx` renders the 4-quadrant emblem
3. Healthcheck data flows into the emblem (live colors update)
4. `just build` passes with the new component included
5. `just weekly-pulse-report` shows `hudComponent: true`

---

## FILES YOU MAY EDIT

```
src/components/SystemStatusEmblem.tsx   <- CREATE
src/components/SystemStatusEmblem.css   <- CREATE (if needed)
src/App.jsx                              <- ADD import + placement
plans/SIR_TRAVIS_EMBLEM_SPEC.md         <- CREATE if missing
```

## FILES YOU MUST NOT EDIT

```
netlify/functions/*          <- Claude Code owns backend
justfile                     <- Windsurf owns
src/remotion/branding.ts     <- READ ONLY (import tokens, don't modify)
scripts/*                    <- Antigravity owns tests
```

---

## HANDOFF

Upon completion:
1. Set CX-012 to DONE in `plans/AGENT_ASSIGNMENTS.md`
2. Run `just cycle-brief` to log final gate status
3. Trigger `plans/HANDOFF_CODEX_CX012.md` for reviewer
