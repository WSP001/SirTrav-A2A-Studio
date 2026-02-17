# Codex Agent — Frontend Builder

> **Agent Name:** Codex (Seat #1 = Frontend, Seat #2 = DevOps)
> **Role:** React Components, UI Integration, Design Tokens
> **Layer Ownership:** L3 (design_tokens)

---

## Session Start — LEAN PROTOCOL v3

```bash
just cycle-next-for codex         # 50 tokens — ONE line: what to do now
just cycle-orient codex           # 200 tokens — full briefing (if needed)
```

Do NOT read full context files. Trust the Cycle Gate.
If `cycle-next` says ALL PASS, skip to logic work immediately.

**CRITICAL:** You are BLOCKED until Layer 1-2 gates all show PASS.

## ARCHIVE RULE (NEVER VIOLATE)

Do NOT delete or overwrite archived files in the operator's Google Drive archive folder.
Only Scott decides what to keep or discard.

---

## Your Gate

| Gate | Layer | What It Checks |
|------|-------|----------------|
| `design_tokens` | L3 | `src/remotion/branding.ts` exports `THEME` and `TEMPLATES` |

### Run Your Gate

```bash
just cycle-gate design_tokens
```

---

## Active Skill: Command Plaque (CX-012)

**Task spec:** `tasks/CX-012-command-plaque.md`
**Handoff:** `plans/HANDOFF_CODEX_CX012.md`

### Mission

Build `src/components/SystemStatusEmblem.tsx` — a heraldic 4-quadrant
status emblem that shows live pipeline health from the healthcheck API.

### Execution Sequence

```bash
# 1. Preflight
just build-hud                    # Check task spec + component exist

# 2. Orient
just cycle-next-for codex         # Confirm gates are clear

# 3. Build the component
#    READ: tasks/CX-012-command-plaque.md for full spec
#    CREATE: src/components/SystemStatusEmblem.tsx
#    CREATE: plans/SIR_TRAVIS_EMBLEM_SPEC.md (if missing)
#    WIRE: Add <SystemStatusEmblem /> to src/App.jsx header

# 4. Verify
just cycle-gate design_tokens     # Your gate
just build                        # Build must pass
just mvp-verify                   # Full truth loop (10/10 + 6/6)

# 5. Report
just weekly-pulse-report          # Should show hudComponent: true
```

### Plaque Component Logic

1. **Fetch** `/.netlify/functions/healthcheck` on mount
2. **Map** response fields to 4 quadrant colors:
   - Lion (TL) = `storage.healthy` → Gold #D4AF37 or Gray
   - Shield (TR) = `ai.configured && social.*` → Azure #007FFF or Red
   - Cross (BL) = build gate status → Silver #C0C0C0 or Orange
   - Phoenix (BR) = `pipeline_mode` → Ember (THEME.accent) or Dark
3. **Render** center "ST" monogram with inverse mode toggle
4. **Handle** loading (skeleton) and error (offline indicator, no fake success)
5. **Respond** to viewport: 200px desktop, 120px tablet, 64px mobile

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

### Click2Kick Integration

The emblem is the **User2Agent interface** — clicking a quadrant kicks
off the diagnostic view for that domain. This is the "Click2Kick"
pattern applied to system observability:

- Click Lion → Resource Monitor (storage, memory usage)
- Click Shield → Network Status (API endpoints, latency)
- Click Cross → Build/Deploy Status (last deploy, errors)
- Click Phoenix → AI Pipeline Mode (agent statuses, pipeline_mode)
- Click "ST" Monogram → Admin Auth toggle (Inverse Mode)

### Success Criteria

1. `just mvp-verify` = 10/10 PASS
2. `SystemStatusEmblem.tsx` renders and fetches healthcheck
3. `just build` passes with the component included
4. `just weekly-pulse-report` shows `hudComponent: true`

---

## Your Files (What You May Edit)

### Seat #1 (Frontend)
```
src/components/*.tsx             # React components
src/components/*.css             # Component styles
src/App.jsx                      # Main app shell
src/App.css                      # App styles
src/remotion/branding.ts         # Design tokens
src/remotion/compositions/**     # Video compositions
```

### Seat #2 (DevOps)
```
scripts/                         # Test scripts (coordinate with Antigravity)
.github/workflows/               # CI workflows
```

## DO NOT EDIT

```
netlify/functions/*              # Claude Code owns backend
justfile                         # Windsurf owns
plans/AGENT_ASSIGNMENTS.md       # Shared coordination doc
CLAUDE.md                        # Project rules
src/remotion/branding.ts         # READ ONLY — import tokens, don't modify
```

---

## Key Rules

1. **Token-first styling.** Colors/spacing/fonts from `branding.ts`, never hardcode.
2. **Schema-first forms.** UI inputs must match API contracts in `docs/schemas/`.
3. **No Fake Success in UI.** Disable buttons when platform shows `disabled: true`.
4. **Register compositions.** New templates MUST be added to `Root.tsx`.

### Adding a New Composition (Checklist)
1. Create `src/remotion/compositions/NewTemplate/index.tsx`
2. Add Zod schema to `src/remotion/types.ts`
3. **Register in `Root.tsx`** (agents frequently forget this!)
4. Add to `TEMPLATES` in `branding.ts`

---

## Codex Trust Setup (One-Time)

If you see "config.toml disabled until trusted project":

Edit `<USERPROFILE>\.codex\config.toml`:
```toml
[projects.'\\?\<USERPROFILE>\Documents\GitHub\SirTrav-A2A-Studio']
trust_level = "trusted"
```

Then: log out and sign in again (single session, no tabs).

---

## After Work Is Done

```bash
just cycle-gate design_tokens   # Verify your gate
just build                       # Make sure build still passes
just cycle-brief                 # Quick gate summary
```
