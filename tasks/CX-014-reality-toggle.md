# TASK: CX-014 — The Reality Toggle (Packet Switch Indicator)

**Owner:** Codex Agent
**Status:** PENDING_ACTIVATION
**Priority:** P1
**Sprint:** Operation Truth Serum
**Depends On:** CX-012 (SystemStatusEmblem.tsx must exist first)
**Protocol:** Visual Honesty

---

## MISSION OBJECTIVE

Add a "Packet Switch" toggle to the Command Plaque (SystemStatusEmblem.tsx)
that shows whether the system is in Simulation Mode or Real Packet Mode.
This is the visual proof that the truth loop is alive.

---

## THE INDICATOR

### UI Behavior

| State | Color | Label | Meaning |
|-------|-------|-------|---------|
| OFF | Gray (#6B7280) | "Simulation Mode" | Free — no real API calls |
| ON | Gold (#D4AF37) | "Real Packet Mode" | Cost Incurred — live API |
| ERROR | Red (#EF4444) | "Keys Missing" | 401/503 — toggle snaps back |

### Placement

Small toggle switch next to the Shield quadrant (TR) of the emblem.
Must be visible at desktop (200px) and tablet (120px) sizes.
At mobile (64px), show as a colored dot only.

---

## THE LOGIC

```typescript
// 1. User clicks toggle to ON
// 2. UI calls GET /.netlify/functions/healthcheck
// 3. Check response.social.twitter.configured
//    - If true: toggle stays ON (Gold), show "Real Packet Mode"
//    - If false: toggle snaps back to OFF, turns RED, show "Keys Missing"
// 4. When ON, POST to issue-intake includes { action: 'kick' } (real mode)
// 5. When OFF, POST includes { action: 'diagnose' } (simulation only)
```

### Key Import (from branding.ts)

```typescript
import { THEME } from '../remotion/branding';

const TOGGLE_COLORS = {
  simulation: '#6B7280',                    // Gray — free mode
  real: '#D4AF37',                          // Gold — cost incurred
  error: THEME.colors.error,               // #ef4444 — keys missing
  background: THEME.colors.background,     // #0f172a
};
```

---

## DATA CONTRACT

The toggle reads from the healthcheck response:

```typescript
// From GET /.netlify/functions/healthcheck
{
  social: {
    twitter: { configured: boolean; enabled: boolean }
  }
}
```

- `configured: true` + `enabled: true` → Gold (Real Mode available)
- `configured: false` → Red snap-back (Keys Missing)
- `enabled: false` → Gray (Simulation Mode, even if keys exist)

---

## SUCCESS CRITERIA

1. Toggle renders next to Shield quadrant at all breakpoints
2. Clicking ON checks healthcheck → Gold if keys configured, Red if not
3. Red state shows "Keys Missing" tooltip/label
4. `just check-zone src/components/SystemStatusEmblem.tsx` confirms toggle exists
5. `just build` passes with the toggle

---

## FILES YOU MAY EDIT

```
src/components/SystemStatusEmblem.tsx   <- MODIFY (add toggle)
src/components/SystemStatusEmblem.css   <- MODIFY (add toggle styles)
```

## FILES YOU MUST NOT EDIT

```
netlify/functions/*          <- Claude Code owns
justfile                     <- Windsurf owns
src/remotion/branding.ts     <- READ ONLY (import tokens, don't modify)
scripts/*                    <- Antigravity owns
```

---

## VERIFY

```bash
just check-zone src/components/SystemStatusEmblem.tsx
just cycle-gate design_tokens
just build
```
