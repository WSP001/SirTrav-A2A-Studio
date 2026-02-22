# 🌿 Agent Skill Router — Worktree Layer

**Owner:** Windsurf Master (maintenance)
**Last Updated:** 2026-02-21 (WM-013)
**Related:** `AGENT_SKILLS_INDEX.md`, `runbooks/agent-handoff.md`, `plans/AGENT_ASSIGNMENTS.md`

---

## What It Is

**One ticket = one worktree = one agent run.**

The worktree layer gives each agent an isolated git worktree + branch per ticket so it can safely make code changes without touching the `main` working copy. Your primary IDE (Lens, GitKraken, VS Code) stays on `main`; agents run in `.claude/worktrees/*` — separate directories, separate branches, shared git history.

---

## The Three Layers

| Layer | Who Uses It | Where | Branch |
|-------|-------------|-------|--------|
| **Layer 0 — Main Repo** | Lens, GitKraken, Human Operator | repo root | `main` |
| **Layer 1 — AgentSkillRouter** | justfile read-only planning | repo root | `main` (read) |
| **Layer 2 — Worktree Isolation** | Claude `--worktree` sessions | `.claude/worktrees/<ticket>` | `worktree-<ticket>` |

---

## When to Use Each Layer

| Intent | Command | Layer |
|--------|---------|-------|
| Ask Claude to explain something | `just orient-claude` | Layer 1 (read) |
| Run tests / health checks | `just devkit-ci`, `just golden-path` | Layer 1 (read) |
| **Agent makes code changes** | `just sirtrav-worktree name=STRAV-123` | Layer 2 (isolated) |
| Review + merge agent work | `git diff main...worktree-STRAV-123` | Layer 0 (human) |

> **Rule:** Any time an agent will _write_ files, use a worktree. Read-only analysis stays in main.

---

## Workflow: Start → Work → Merge → Clean

```
1. Human creates ticket ID  →  STRAV-123-fix-sse-timeout
2. Human runs               →  just sirtrav-worktree name=STRAV-123-fix-sse-timeout
3. Claude works in          →  .claude/worktrees/STRAV-123-fix-sse-timeout
                                branch: worktree-STRAV-123-fix-sse-timeout
4. Agent commits and exits
5. Human reviews            →  git diff main...worktree-STRAV-123-fix-sse-timeout
6. Human merges             →  git merge worktree-STRAV-123-fix-sse-timeout
7. Human cleans up          →  just worktree-clean name=STRAV-123-fix-sse-timeout
```

---

## Why Lens and GitKraken Don't Conflict

- **Lens / GitKraken** point at the primary worktree (repo root → `main` branch)
- **Claude sessions** point at `.claude/worktrees/*` — completely separate filesystem paths
- Git worktrees share the same object store (history) but have **independent working directories**
- Two worktrees can never have conflicting file writes because they're in different paths
- Think of it as: **Lens = "On the Bridge"**, **Claude worktrees = "On separate Decks"**

---

## Read-First Gate (Inside the Worktree)

Even inside a worktree, Claude must still follow the project Read-First Gate:

1. Read `CLAUDE.md`
2. Read `plans/AGENT_ASSIGNMENTS.md`
3. Read the assigned ticket
4. Declare: _"I read CLAUDE.md + AGENT_ASSIGNMENTS.md and I am working ticket XXXX."_

The worktree inherits the full repo content — all docs, scripts, and functions are visible.

---

## Naming Convention

```
Format: <PROJECT>-<TICKET_NUM>-<short-slug>

Examples:
  STRAV-123-sse-timeout-fix
  STRAV-124-linkedin-oauth
  STRAV-WM013-worktree-layer
  STRAV-AG014-truth-serum-v2
```

Keep slugs short (3-5 words, kebab-case). The ticket number is the source of truth — check `plans/AGENT_ASSIGNMENTS.md`.

---

## justfile Commands

```powershell
# Start an agent session for SirTrav (most common)
just sirtrav-worktree name=STRAV-123-my-ticket

# Generic (any project)
just agent-worktree name=MY-TICKET-slug

# See all active worktrees
just worktree-list

# See which branches haven't merged yet
just worktree-status

# Clean up after merge (human only, after verifying merge)
just worktree-clean name=STRAV-123-my-ticket
```

---

## Checking Active Sessions

```powershell
just worktree-list
# Output:
#   C:/WSP001/SirTrav-A2A-Studio/.claude/worktrees/eloquent-boyd  ...  [worktree-eloquent-boyd]
#   C:/WSP001/SirTrav-A2A-Studio  ...  [main]

just worktree-status
# Shows all worktrees + branches not yet merged to main
```

---

## Extending to Other Projects

The SeaTrace and SirJames stubs are commented out in the justfile. To activate:

1. Open `justfile` and find the `# SeaTrace — stub` comment block
2. Uncomment those lines
3. Or better: copy the `sirtrav-worktree` recipe to the SeaTrace/SirJames repo's justfile and rename

The `agent-worktree` recipe is the generic canonical entrypoint — always delegate to it:

```just
seatrace-worktree name="seatrace-skill":
    @echo "🌊 SeaTrace worktree: {{name}}"
    @just agent-worktree name={{name}}
```

---

## Non-Overlapping Zones (still apply inside worktrees)

Worktrees do not change which files each agent owns. The zones from `runbooks/agent-handoff.md` still apply:

| Agent | Zone | Primary Files |
|-------|------|--------------|
| Claude Code | Backend/API | `netlify/functions/*.ts`, `scripts/*.mjs` |
| Codex | Frontend/UI | `src/components/*.tsx`, `src/pages/*.tsx` |
| Antigravity | Testing/QA | `tests/*.test.ts`, verification scripts |
| Windsurf | Cross-project | `docs/*.md`, `justfile` |

---

## Future: Artifact Logging Per Worktree

When ready, agent runs can log structured ticket records to `artifacts/tickets/<ticket-id>.json`:

```json
{
  "ticketId": "STRAV-123-sse-timeout-fix",
  "agent": "Claude Code",
  "worktree": ".claude/worktrees/STRAV-123-sse-timeout-fix",
  "branch": "worktree-STRAV-123-sse-timeout-fix",
  "startedAt": "2026-02-21T14:00:00Z",
  "completedAt": "2026-02-21T14:45:00Z",
  "apiCost": 0.042,
  "markup20pct": 0.0084,
  "totalDue": 0.0504,
  "filesChanged": ["netlify/functions/progress.ts"]
}
```

This enables job-costing dashboards and attribution across the Commons Good project portfolio.

---

*Document maintained by Windsurf Master. Update when new project worktree entrypoints are added.*
