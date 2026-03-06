# CLAUDE.md — Claude Code Agent Instructions

> This file is read automatically by Claude Code when entering this repo.
> It is the single source of truth for how Claude Code operates here.
> Human Conductor: Scott (Roberto002 / WSP001)

---

## STOP. READ BEFORE YOU WRITE.

Every time you start work, execute this exact sequence:

```bash
just cockpit
cat MASTER.md
cat AGENT-OPS.md
just --list
```

Then read the handoff ticket in `plans/` for your current assignment.

---

## CANONICAL WORKSPACE

| Location | Role |
|----------|------|
| `c:\WSP001\SirTrav-A2A-Studio` | **WRITE** — the only active workspace |
| `C:\Users\Roberto002\Documents\GitHub\SirTrav-A2A-Studio` | Archive / read-only — DO NOT push from here |
| `C:\Users\Roberto002\OneDrive\Sir James\SirTrav-A2A-Studio` | Archive / read-only |

**Rule:** No agent pushes from any copy except `WSP001`. If your cwd is not `c:\WSP001\SirTrav-A2A-Studio`, STOP.

---

## REPO STRUCTURE (Know where you are)

```
.
├── CLAUDE.md              ← YOU ARE HERE. Your instructions.
├── MASTER.md              ← North Star. Mission + rules + milestones.
├── AGENT-OPS.md           ← Agent assignments, handoff log, forbidden zones.
├── AGENTS.md              ← Agent registry + team patterns.
├── justfile               ← 60+ CLI recipes. Never guess — run `just --list`.
│
├── plans/                 ← HANDOFF TICKETS per agent.
│   ├── HANDOFF_CLAUDECODE_*.md    ← Your assignments
│   ├── HANDOFF_CODEX2_*.md        ← Codex #2's assignments (hands off)
│   └── AGENT_ASSIGNMENTS.md       ← Completed task log
│
├── netlify/functions/     ← SERVERLESS BACKEND (your domain).
│   ├── curate-media.ts         # Agent 1: Director (Vision AI)
│   ├── narrate-project.ts      # Agent 2: Writer (Gemini → GPT-4)
│   ├── text-to-speech.ts       # Agent 3: Voice (ElevenLabs)
│   ├── generate-music.ts       # Agent 4: Composer (Suno)
│   ├── compile-video.ts        # Agent 5: Editor → render-dispatcher.ts
│   ├── generate-attribution.ts # Agent 6: Attribution
│   ├── publish.ts              # Agent 7: Publisher
│   ├── control-plane.ts        # Health + diagnostics endpoint
│   ├── run-pipeline-background.ts  # Orchestrator (SSE + cost tracking)
│   └── lib/                    # Shared: storage, ledger, cost-manifest
│
├── scripts/               ← CLI tools, readiness checks, reports.
├── src/                   ← FRONTEND (Codex #2's domain — DO NOT TOUCH).
│   ├── components/        ← React UI components
│   └── pages/             ← Route pages (DiagnosticsPage, etc.)
├── docs/                  ← Team documentation.
├── artifacts/             ← Pipeline outputs + JSON schema contracts.
└── dist/                  ← BUILD OUTPUT. Do not edit directly.
```

---

## YOUR AGENT CLASS

| Agent | Class | Allowed | Forbidden |
|-------|-------|---------|-----------|
| **Claude Code** | Deep Implementer | Backend, APIs, wiring, infra, schemas, tests | UI/frontend components |
| Codex #2 | UI Implementer | React, Vite/Tailwind, frontend tests | Backend/API changes |
| Windsurf/Cascade | Acting Master | Orchestration, justfile, gates, milestones | — |
| Antigravity | Verifier/Tester | QA, gate checks, truth serum | Writing product code |

**You are Claude Code. You do backend. You do NOT touch React components, JSX, or CSS.**

If a ticket asks you to edit a file in `src/pages/` or `src/components/` → **STOP. Hand off to Codex #2.**

---

## THE 5 LAWS

### 1. NoFakeSuccess
If a key is missing, return `disabled: true`. Never return placeholder success.
If a test is skipped, log `skipped` with reason. Never log `passed`.
If you cannot verify something, say so. Do not guess.

### 2. Read-Before-Write
Always read the file you plan to edit BEFORE editing it.
Always read the handoff ticket in `plans/` before starting work.

### 3. RunIdThreading
Every log entry carries `{ projectId, runId }`.
Every commit message references the ticket ID.

### 4. WorktreeDiscipline
Work in `.claude/worktrees/` when available.
Never write directly to `main` without gate passage.
Always run gates before committing.

### 5. Gate Before Merge
Before every commit:
```bash
npm run build
just sanity-test-local
just control-plane-gate
```
If any gate fails → **fix it or stop. Do not push broken code.**

---

## COMMAND REFERENCE (just recipes)

```bash
# ─── SEE REALITY ───
just cockpit                    # Token + state + cycle + last 5 logs
just orient-claude-m9           # Quick M9 context (saves ~5 file reads)
just wiring-verify              # Check all required files exist

# ─── GATES ───
just control-plane-gate         # Must pass before merge
just sanity-test-local          # Build + lint + basic checks

# ─── REPORTS ───
just validate-env               # 28-key env audit with masked previews
just env-diff                   # Local vs cloud key parity
just cycle-status               # 10-point quality gates summary

# ─── TESTING ───
just m9-e2e                     # Remotion E2E dry-run
just sanity-test                # 45-check pipeline test (cloud)
just control-plane-verify       # 33-assertion control-plane test
```

---

## HANDOFF PROTOCOL

When your ticket is done:

1. Run all gates:
   ```bash
   npm run build
   just sanity-test-local
   just control-plane-gate
   ```

2. Commit with ticket reference:
   ```bash
   git commit -m "feat(m9): <what you did> [CC-M9-METRICS]"
   git push origin <branch>
   ```

3. Update the Master by reporting:
   - What you did (commit hash)
   - What's next (who should pick up)
   - Any blockers discovered

---

## DATA CLASSIFICATION

| Class | Who Can See | Rule |
|-------|------------|------|
| `public` | Anyone | Safe for README, Commons Good docs |
| `internal` | Team agents + conductor | Cost ledgers, scorecards, metrics |
| `private` | Named agents with grant | API key presence checks |
| `secret` | Human conductor only | Raw credentials, financial terms |

**Never log secret values. Never expose env var contents. Boolean presence checks only.**

---

## WHEN IN DOUBT

1. Run `just cockpit` — see reality
2. Read the handoff ticket in `plans/`
3. If still unsure → **ask Scott, do not guess**
4. If something is broken → log it honestly, do not paper over it

---

*This file is the agent instruction manual for Claude Code.*

**For the Commons Good** 🎬