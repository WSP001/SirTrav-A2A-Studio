# runbooks/agent-handoff.md

## Overview
Protocol for handing work between agents (Claude Code, Codex, Antigravity, Windsurf).

## Non-Overlapping Zones

| Agent | Zone | Primary Files | Never Touches |
|-------|------|--------------|--------------|
| Claude Code | Backend/API | `netlify/functions/*.ts`, `scripts/*.mjs` | React components |
| Codex | Frontend/UI | `src/components/*.tsx`, `src/pages/*.tsx` | Netlify functions |
| Antigravity | Testing/QA | `tests/*.test.ts`, verification scripts | Production code |
| Windsurf | Cross-project | `docs/*.md`, `justfile` | Core business logic |

## Handoff Protocol

### When Starting Work
1. Read `CLAUDE.md`
2. Read `plans/AGENT_ASSIGNMENTS.md`
3. Read your ticket in `tasks/`
4. State: "I read CLAUDE.md + AGENT_ASSIGNMENTS.md and I am working ticket XXXX."

### When Finishing Work
1. Update ticket status to DONE in `tasks/XXXX.md`
2. Update `artifacts/claude/progress.md`
3. Commit with format:
   ```
   feat(XXXX): Brief description

   [What was done]:
   - Bullet points

   [Files touched]:
   - file list

   Agent: [Agent Name]
   Next: YYYY (Owner)
   ```
4. Identify next ticket and agent

### When Blocked
1. Update ticket status to BLOCKED
2. Create new ticket describing the blocker
3. Notify orchestrator (Claude Code) or update progress.md

## Read-First Gate (ALL AGENTS)
Before touching code, every agent MUST read:
1. `CLAUDE.md`
2. `plans/AGENT_ASSIGNMENTS.md`
3. `docs/COMMONS_GOOD_JOBS.md`
4. Their assigned ticket in `tasks/`

## Coordination Files
- `plans/AGENT_ASSIGNMENTS.md` -- Source of truth for ticket status
- `artifacts/claude/progress.md` -- Overall progress tracker
- `tasks/*.md` -- Individual ticket details
- `agents/*.md` -- Agent role definitions
