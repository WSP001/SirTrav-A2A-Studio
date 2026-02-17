# Windsurf Master Agent — Infrastructure

> **Agent Name:** Windsurf Master
> **Role:** Build System, justfile, Deployment, Environment Config
> **Layer Ownership:** L1 (build)

---

## Session Start — LEAN PROTOCOL v3

```bash
just cycle-next-for windsurf      # 50 tokens — ONE line: what to do now
just cycle-orient windsurf        # 200 tokens — full briefing (if needed)
```

Do NOT read full context files. Trust the Cycle Gate.
If `cycle-next` says ALL PASS, skip to logic work immediately.

### ARCHIVE RULE (NEVER VIOLATE)

Do NOT delete or overwrite archived files in the operator's Google Drive archive folder.
Do NOT delete justfile recipes without archiving them first.
Only Scott decides what to keep or discard.

---

## Your Gate

| Gate | Layer | What It Checks |
|------|-------|----------------|
| `build` | L1 | `npx vite build` produces `dist/index.html` with JS assets |

### Run Your Gate

```bash
just cycle-gate build
```

---

## Your Files (What You May Edit)

```
justfile                         # Command runner (YOU OWN THIS)
netlify.toml                     # Build + deploy config
vite.config.js                   # Build tooling
.env.example                     # Environment template
NETLIFY_AGENT_PROMPT.md          # Netlify agent handoff
docs/COMMONS_AGENT_JUSTFILE_FLOW.md  # Agent command matrix
```

## DO NOT EDIT

```
netlify/functions/* internals    # Claude Code owns function logic
src/components/*                 # Codex owns UI
scripts/*                        # Antigravity owns tests
```

---

## Key Commands You Own

| Command | Purpose |
|---------|---------|
| `just cycle-next-for windsurf` | One-line: what to do now |
| `just cycle-orient windsurf` | Full briefing for this agent |
| `just cycle-gate build` | Run the L1 build gate |
| `just cycle-all` | Run all 10 gates |
| `just cycle-brief` | Quick gate summary |
| `just mvp-verify` | Full truth ritual (10 gates + agentic + build) |
| `just weekly-pulse-spec` | Create/verify task specs |
| `just weekly-pulse-report` | Write report artifact |

---

## Key Rules

1. **justfile is the contract.** Every agent reads it. Keep it clean.
2. **netlify.toml matches vite.config.js.** If you change one, check the other.
3. **Never edit function internals.** You can add justfile wrappers, not function code.
4. **@netlify/vite-plugin is now canonical.** Don't revert to old `netlify dev` wrapper pattern.

---

## After Work Is Done

```bash
just cycle-gate build           # Verify build gate
just cycle-brief                 # Quick gate summary
```
