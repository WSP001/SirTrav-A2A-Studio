# ≡ƒÄ¿ CODEX INSTRUCTION ΓÇö Task CX-012: System Status Emblem

> **Copy-paste this entire file to Codex.**

---

## IDENTITY

```
AGENT: Codex (Seat #1 ΓÇö Frontend Architect)
PROTOCOL: Lean v3
MISSION: "The Pulse & The Plaque" ΓÇö Build the Command HUD
TASK: CX-012 ΓÇö System Status Emblem
```

## STEP 0 ΓÇö ORIENT (mandatory)

```bash
just cycle-next-for codex         # 50 tokens ΓÇö tells you if gates are clear
just cycle-orient codex           # 200 tokens ΓÇö full briefing if needed
```

If any Layer 1ΓÇô2 gate is FAILING, STOP. You are BLOCKED until they pass.
If ALL PASS, proceed to Step 1.

Read your skill file: `.agent/skills/CODEX_AGENT.md`

---

## STEP 1 ΓÇö READ THE SPEC

Read `plans/SIR_TRAVIS_EMBLEM_SPEC.md`.

**If the file does NOT exist**, create it at `plans/SIR_TRAVIS_EMBLEM_SPEC.md` with this content:

```markdown
# Sir Travis System Status Emblem ΓÇö Design Spec

## Overview
A heraldic status emblem that shows live system health at a glance.
Replaces the current static healthcheck display.

## Quadrants (4 status indicators)

| Symbol | Domain | Data Source | Healthy Color | Unhealthy Color |
|--------|--------|-------------|---------------|-----------------|
| Lion | Hardware/Infra | healthcheck.storage | Gold (#D4AF37) | Gray (#6B7280) |
| Shield | Network/API | healthcheck.ai + healthcheck.social | Azure (#007FFF) | Red (#EF4444) |
| Cross | Software/Build | cycle-gate build result | Silver (#C0C0C0) | Orange (#F97316) |
| Phoenix | AI Life | healthcheck.pipeline_mode | Ember (#E94560) | Dark (#374151) |

## Layout
- Circular emblem, 200x200px default, responsive
- Dark background (#1a1a2e) matching SirTrav brand
- Quadrants arranged: Lion(TL) Shield(TR) Cross(BL) Phoenix(BR)
- Center monogram: "ST" in Inter Bold

## Interactions
- onClick(Lion) ΓåÆ Open Resource Monitor modal (show storage, memory)
- onClick(Shield) ΓåÆ Show network status detail (API endpoints, latency)
- onClick(Cross) ΓåÆ Show build/deploy status
- onClick(Phoenix) ΓåÆ Show AI pipeline mode + agent statuses
- onClick(Monogram) ΓåÆ Trigger Admin Auth ("Inverse Mode" ΓÇö colors invert)

## Data Contract
Component receives props from healthcheck endpoint:
GET /.netlify/functions/healthcheck ΓåÆ { status, storage, ai, social, pipeline_mode }

## Responsive
- Desktop: 200x200, full detail
- Tablet: 120x120, symbols only
- Mobile: 64x64, single color indicator
```

---

## STEP 2 ΓÇö CREATE THE COMPONENT

Create: `src/components/SystemStatusEmblem.tsx`

### Requirements:
1. **Import brand tokens** from `src/remotion/branding.ts` ΓÇö NEVER hardcode colors
2. **Fetch from healthcheck** endpoint: `/.netlify/functions/healthcheck`
3. **4 quadrant symbols** with dynamic coloring based on health status
4. **Clickable quadrants** ΓÇö each onClick opens a detail panel/modal
5. **Center monogram** ΓÇö "ST" with inverse mode toggle
6. **Loading state** ΓÇö skeleton/pulse animation while fetching
7. **Error state** ΓÇö show "offline" indicator if healthcheck fails

### Color mapping:
```typescript
import { THEME } from '../remotion/branding';

// Use THEME colors as base, extend for emblem-specific:
const EMBLEM_COLORS = {
  gold: '#D4AF37',
  azure: '#007FFF',
  silver: '#C0C0C0',
  ember: THEME.colors.accent,       // #f59e0b (Amber)
  dark: THEME.colors.background,    // #0f172a (Deep Space)
  unhealthy: '#6B7280',
};
```

### Healthcheck response shape (what the API actually returns):
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
  pipeline_mode: string; // "ENHANCED" | "BASIC" | "FALLBACK"
}
```

---

## STEP 3 ΓÇö WIRE INTO APP

Add the emblem to `src/App.jsx` (or wherever the main layout lives).
Place it in the header/nav area so it's always visible.

```tsx
import SystemStatusEmblem from './components/SystemStatusEmblem';

// In the layout:
<SystemStatusEmblem />
```

---

## STEP 4 ΓÇö VERIFY

```bash
just cycle-gate design_tokens    # Your gate must still pass
npm run dev                       # Visual check at localhost:5173
just build                        # Build must succeed
```

---

## STEP 5 ΓÇö REPORT

```bash
just cycle-gate design_tokens    # Final gate check
```

Then update `plans/AGENT_ASSIGNMENTS.md`:
- Set CX-012 to Γ£à DONE
- Note what files were created/modified

---

## FILES YOU MAY EDIT

```
src/components/SystemStatusEmblem.tsx   ΓåÉ CREATE
src/components/SystemStatusEmblem.css   ΓåÉ CREATE (if needed)
src/App.jsx                              ΓåÉ ADD import + placement
plans/SIR_TRAVIS_EMBLEM_SPEC.md         ΓåÉ CREATE if missing
```

## FILES YOU MUST NOT EDIT

```
netlify/functions/*          ΓåÉ Claude Code owns backend
justfile                     ΓåÉ Windsurf owns
src/remotion/branding.ts     ΓåÉ READ ONLY (import tokens, don't modify)
```

## ARCHIVE RULE

Do NOT delete or overwrite archived files in the operator's Google Drive archive folder.
Only Scott decides what to keep or discard.
