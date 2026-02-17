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
