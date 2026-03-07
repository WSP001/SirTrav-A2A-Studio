# CLIMASTER — Agent Flight Deck

**Version:** 2026.03.07
**Status:** REQUIRED READING FOR ALL AGENTS
**Reconciled with:** MASTER.md, AGENT-OPS.md, AGENTS.md, justfile

This is the quick-start flight deck. It points to the real commands that exist in the justfile — no aspirational commands, no invented recipes.

---

### 1. The Read Stack (Before You Write Anything)

| Order | File | Purpose |
| :--- | :--- | :--- |
| 1 | `MASTER.md` | North Star — milestones, rules, architecture |
| 2 | `AGENTS.md` | Agent roster — who does what, current task lineup |
| 3 | `AGENT-OPS.md` | Operational assignments — per-agent rules and status |
| 4 | `CLAUDE.md` | Claude Code agent instructions (if you are Claude Code) |
| 5 | `justfile` | Command contract — run `just --list` to see all recipes |
| 6 | `plans/HANDOFF_<AGENT>_<TICKET>.md` | Your specific ticket |
| 7 | `cockpit/state.json` | Tactical status — milestone + blockers (manual) |

### 2. Real Commands (These Exist in justfile)

```bash
# ─── ORIENTATION (run first every session) ───
just cockpit                    # Full dashboard: state + gates + last 5 logs
just orient-claude-m9           # Claude Code quick context
just orient-codex-m9            # Codex #2 quick context
just orient-antigravity-m9      # Antigravity quick context
just orient-netlify             # Netlify Agent quick context
just orient-human-m9            # Human-Ops quick context

# ─── GATES (run before every commit) ───
npm run build                   # 0 errors required
just sanity-test-local          # 33+ pass, 0 fail
just control-plane-gate         # Verdict check

# ─── VERIFICATION ───
just healthcheck-cloud          # Cloud health
just control-plane-verify-cloud # 33 assertions
just m9-e2e                     # Remotion E2E test
just validate-env               # 28-key env audit
just env-diff                   # Local vs cloud comparison
```

### 3. The Golden Rules

1. **No Fake Success** — If a gate fails, fix the underlying issue. Never bypass.
2. **Read Before Write** — Always `cat` the file before editing. Never cite line numbers from memory.
3. **Domain Isolation** — Each agent edits only their allowed files (see AGENTS.md).
4. **Gate Before Merge** — Build + sanity + control-plane must all pass before commit.
5. **Canonical Workspace** — Push only from `c:\WSP001\SirTrav-A2A-Studio`.

### 4. The Gemini Pivot (Effective 2026-03-06)

**New Priority:** If a function requires a missing key (like Remotion/AWS), the agent MUST fallback to Gemini 1.5/2.0 Flash/Pro for video generation capabilities. AWS/Remotion is marked **DEPRECATED-BYPASS**.

**Gemini Signal Check:**

```bash
# Quick test — does Gemini respond?
just gemini-test

# Full narration smoke test (requires netlify dev)
just sanity-test-local
```

---

**GOAL:** Pass `just control-plane-gate` with a `REAL` verdict.

**For the Commons Good** 🎬
