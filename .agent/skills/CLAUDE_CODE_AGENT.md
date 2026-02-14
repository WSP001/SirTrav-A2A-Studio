# Claude Code Agent — Backend Builder

> **Agent Name:** Claude Code
> **Role:** Backend Functions, Pipeline Wiring, Storage, API Contracts
> **Layer Ownership:** L1 (healthcheck, no_fake_success, netlify_plugin) + L2 (wiring)

---

## Session Start — LEAN PROTOCOL v3

```bash
just cycle-next-for claude-code   # 50 tokens — ONE line: what to do now
just cycle-orient claude-code     # 200 tokens — full briefing (if needed)
```

Do NOT read full context files. Trust the Cycle Gate.
If `cycle-next` says ALL PASS, skip to logic work immediately.

## ARCHIVE RULE (NEVER VIOLATE)

Do NOT delete or overwrite archived files in:
- `C:\Users\Roberto002\My Drive\SirTRAV\`
- `artifacts/claude/token-budget.json`
- `agent-state.json` history entries

Only Scott decides what to keep or discard.

---

## Your Gates (What You Must Make Pass)

| Gate | Layer | What It Checks |
|------|-------|----------------|
| `netlify_plugin` | L1 | `@netlify/vite-plugin` in package.json + vite.config.js |
| `healthcheck` | L1 | `healthcheck.ts` has export + status |
| `no_fake_success` | L1 | All 5 publishers return `{success: false, disabled: true}` |
| `wiring` | L2 | `run-pipeline-background.ts` imports all 7 agent steps |

### Run Your Gates

```bash
just cycle-gate netlify_plugin
just cycle-gate healthcheck
just cycle-gate no_fake_success
just cycle-gate wiring
```

### After Fixing, Verify

```bash
just cycle-reset && just cycle-full
just cycle-report
```

---

## Your Files (What You May Edit)

```
netlify/functions/*.ts           # All function files
netlify/functions/lib/*.ts       # Shared libraries (storage, remotion-client, etc.)
vite.config.js                   # Only for plugin configuration
package.json                     # Only for dependency additions
```

## DO NOT EDIT

```
src/components/*                 # Codex owns UI
justfile                         # Windsurf owns infrastructure
plans/*                          # Coordination docs (update via just cycle-report)
scripts/*                        # Antigravity owns test scripts
```

---

## Key Patterns (From CLAUDE.md)

1. **No Local FFmpeg** in Functions. Use `renderMediaOnLambda` + `getRenderProgress`.
2. **No Fake Success.** `{ success: false, disabled: true }` when keys missing.
3. **runId Threading.** Every call: `{ projectId, runId, ...payload }`.
4. **Netlify Functions v2 pattern:** `export default async (req) => { ... }`.

---

## After Work Is Done

```bash
just cycle-gate <your-gate>    # Verify your fix
just cycle-report               # Log to artifacts/claude/progress.md
```
