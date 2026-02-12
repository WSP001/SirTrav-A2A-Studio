# COMMONS AGENT JUSTFILE FLOW — Command-by-Command Matrix

**Purpose:** Every agent knows exactly which `just` commands they own, which they read, and the execution order.
**Updated:** 2026-02-11 (Windsurf Master)
**Source of truth:** `justfile` (912 lines, PowerShell shell)

---

## EXECUTION ORDER — The Spine

Run these in order. If any step fails, **STOP** and assign the fix to the owner listed.

```
Step 1:  just preflight              → ANY agent (env validation)
Step 2:  just healthcheck-cloud      → Windsurf Master / Antigravity
Step 3:  just wiring-verify          → Windsurf Master (12 checks)
Step 4:  just no-fake-success-check  → Windsurf Master (8 checks)
Step 5:  just x-dry                  → Antigravity (social dry-run)
Step 6:  just linkedin-dry           → Antigravity (social dry-run)
Step 7:  just golden-path            → Antigravity (auto-detect local/cloud)
Step 8:  just rc1-verify             → Windsurf Master (runs steps 3-7 as a sequence)
```

**Shortcut:** `just rc1-verify` runs steps 3→4→7→5→2 in one command.

---

## AGENT → COMMAND MATRIX

### Legend

- **OWN** = This agent writes/maintains this command
- **RUN** = This agent executes this command as part of their workflow
- **READ** = This agent reads the output but doesn't own or run it

### Windsurf Master (Orchestrator / Infra)

| Command | Role | What It Does |
|---------|------|-------------|
| `just wiring-verify` | **OWN** | Checks 7 pipeline files exist + 5 import chains |
| `just no-fake-success-check` | **OWN** | Checks all 5 publishers have `disabled:true` + validation |
| `just rc1-verify` | **OWN** | 5-step RC1 gate (wiring → NFS → golden-path → x-dry → healthcheck) |
| `just master-status` | **OWN** | Shows all Windsurf Master commands + key docs |
| `just healthcheck-cloud` | **OWN** | Pings live deployment healthcheck |
| `just golden-path-cloud` | **OWN** | Forces golden path against cloud URL |
| `just golden-path-local` | **OWN** | Forces golden path against localhost:8888 |
| `just agent-status` | **OWN** | Dashboard view of all agents |
| `just check-zone <file>` | **OWN** | Shows which agent owns a file path |
| `just quick-status` | **OWN** | Layer 1-2 status in minimal tokens |
| `just preflight` | RUN | Environment validation |
| `just status` | RUN | Git + env check |
| `just activity` | RUN | Recent git log |

**Zone:** `justfile`, `scripts/verify-golden-path.mjs`, `scripts/test-x-publish.mjs`, `netlify.toml`, `NETLIFY_AGENT_PROMPT.md`, `plans/AGENT_ASSIGNMENTS.md`

---

### Claude Code (Backend Builder)

| Command | Role | What It Does |
|---------|------|-------------|
| `just claude-code-init` | **OWN** | Shows assigned tasks + zone |
| `just validate-schemas` | **OWN** | Checks job-costing + social-post schemas exist |
| `just test-contracts` | **OWN** | Runs schema validation script |
| `just generate-types` | **OWN** | TypeScript type generation from schemas |
| `just healthcheck` | **OWN** | Local healthcheck (requires `netlify dev`) |
| `just manifest` | **OWN** | Runs manifest pipeline |
| `just preflight` | RUN | Env validation |
| `just wiring-verify` | READ | Confirms their pipeline code is wired |
| `just no-fake-success-check` | READ | Confirms their publishers pass NFS |

**Zone:** `netlify/functions/*.ts`, `netlify/functions/lib/*.ts`, `artifacts/contracts/`, `artifacts/data/`, `scripts/*.mjs`

---

### Codex Frontend (UI — Seat #1)

| Command | Role | What It Does |
|---------|------|-------------|
| `just codex-frontend-init` | **OWN** | Shows block status + zone |
| `just build` | RUN | Vite production build |
| `just dev` | RUN | Netlify dev server |
| `just preview` | RUN | Preview production build |
| `just design-status` | READ | Brand colors + typography reference |
| `just design-tokens` | READ | Exports design tokens JSON |

**Zone:** `src/components/*.tsx`, `src/App.jsx`, `src/App.css`, `src/hooks/`
**Blocked until:** Layer 2 schemas exist (`just codex-frontend-init` checks this)

---

### Codex DevOps (CI/CD — Seat #2)

| Command | Role | What It Does |
|---------|------|-------------|
| `just codex-devops-init` | **OWN** | Shows block status + zone |
| `just deploy` | **OWN** | `netlify deploy --prod` |
| `just deploy-preview` | **OWN** | `netlify deploy` (preview) |
| `just deploy-preview-safe` | **OWN** | Runs antigravity-suite first, then deploy |
| `just pre-commit-check` | **OWN** | Scans for leaked secrets |
| `just security-audit` | **OWN** | Full security audit |
| `just install` | **OWN** | `npm install` |
| `just update-deps` | **OWN** | `npm update` |
| `just clean-logs` | **OWN** | Remove old logs/temp files |
| `just maintain` | **OWN** | Full maintenance cycle |

**Zone:** `scripts/`, `.github/workflows/deploy*.yml`, `netlify.toml` (shared with Windsurf Master)
**Blocked until:** Layer 4 (Integration)

---

### Antigravity (Test Ops / QA)

| Command | Role | What It Does |
|---------|------|-------------|
| `just antigravity-suite` | **OWN** | Full test suite (contracts → dry-runs → healthcheck) |
| `just antigravity-status` | **OWN** | Shows all testing + design commands |
| `just antigravity-reset` | **OWN** | Fresh context load + task list |
| `just antigravity-design` | **OWN** | Design mode (Stitch MCP) |
| `just validate-all` | **OWN** | Comprehensive contract validation |
| `just validate-all-live` | **OWN** | Live contract validation |
| `just validate-contracts` | **OWN** | Social media contract check |
| `just golden-path` | **OWN** | Auto-detect local/cloud smoke test |
| `just golden-path-full` | **OWN** | Full integration (contracts → social → motion) |
| `just golden-path-quick` | **OWN** | Quick smoke (contracts + healthcheck) |
| `just x-dry` | RUN | X/Twitter dry-run |
| `just x-dry-run` | RUN | X/Twitter dry-run (cloud) |
| `just x-healthcheck` | RUN | Check X/Twitter config |
| `just x-full-test` | RUN | Full X sequence (healthcheck → dry → live) |
| `just x-live-test` | RUN | LIVE tweet (requires confirmation) |
| `just x-report <status> <note>` | **OWN** | Log test result to progress.md |
| `just linkedin-dry` | RUN | LinkedIn dry-run |
| `just youtube-dry` | RUN | YouTube dry-run |
| `just motion-test` | RUN | Test motion graphic agent |
| `just narrate-test` | RUN | Test writer agent |
| `just check-layers-1-2` | RUN | Verify Layer 1-2 completion |
| `just layers-1-2-gate` | RUN | Final Layer 1-2 validation gate |
| `just design-status` | RUN | Design system info |
| `just design-tokens` | RUN | Export design tokens |
| `just design-audit` | RUN | Check design artifacts |

**Zone:** `tests/`, `.github/workflows/social-media-tests.yml`, `.github/workflows/motion-graphics-ci.yml`, `artifacts/antigravity/`

---

### Human Operator (Scott)

| Command | Role | What It Does |
|---------|------|-------------|
| `just dev` | RUN | Start local dev server |
| `just build` | RUN | Build for production |
| `just status` | RUN | Project + env status |
| `just help` | RUN | Show all commands |
| `just agent-status` | RUN | See all agent states |
| `just progress` | RUN | Sprint progress board |
| `just task-log` | RUN | See all task activity |
| `just quick-status` | RUN | Minimal token status |
| `just rc1-verify` | RUN | Full verification gate |

**Cannot be automated (see NETLIFY_AGENT_PROMPT.md):**
- Set env vars in Netlify Dashboard
- Fix X/Twitter keys (same app)
- Complete OAuth flows (YouTube, TikTok, Instagram)
- Verify build settings in Dashboard

---

### Netlify Agent (Platform-Side)

| Task | What To Check | Reference |
|------|--------------|-----------|
| Env vars exist | REMOTION_*, TWITTER_*, OPENAI_*, ELEVENLABS_*, SUNO_* | NETLIFY_AGENT_PROMPT.md Task 1 |
| Build settings match netlify.toml | Build cmd, publish dir, node version | NETLIFY_AGENT_PROMPT.md Task 2 |
| Function logs for Blobs issue | NETLIFY_BLOBS_CONTEXT injection | NETLIFY_AGENT_PROMPT.md Task 3 |
| Trigger clean deploy | Clear cache and deploy | NETLIFY_AGENT_PROMPT.md Task 5 |
| Hit endpoints | healthcheck, publish-x, progress, start-pipeline | NETLIFY_AGENT_PROMPT.md Task 6 |

**No justfile commands** — Netlify Agent works through the Dashboard, not the terminal.

---

## TASK TRACKING COMMANDS (All Agents)

These are shared — any agent can log their work:

| Command | What It Does |
|---------|-------------|
| `just task-start <id> <agent>` | Log task start |
| `just task-done <id> <agent>` | Log task complete |
| `just task-skip <id> <agent> <reason>` | Log task skipped |
| `just task-fail <id> <agent> <error>` | Log task failed |
| `just task-log` | Show all logged tasks |
| `just progress` | Show sprint progress board |
| `just init-progress` | Initialize fresh progress file |

---

## CONTEXT & ORIENTATION (All Agents)

Every agent should run these first:

| Command | What It Does |
|---------|-------------|
| `just read-anchor` | Load brand/ANCHOR.md context |
| `just agent-brief <seat>` | Minimal-token brief for a seat |
| `just check-zone <file>` | Who owns a file path |

Then run their specific init:

| Agent | Init Command |
|-------|-------------|
| Claude Code | `just claude-code-init` |
| Codex Frontend | `just codex-frontend-init` |
| Codex DevOps | `just codex-devops-init` |
| Antigravity | `just antigravity-reset` |
| Windsurf Master | `just master-status` |

---

## FILE ZONES (No-Overwrite Rules)

| Zone | Owner | Files |
|------|-------|-------|
| Backend Functions | Claude Code | `netlify/functions/*.ts`, `netlify/functions/lib/*.ts` |
| Contracts/Schemas | Claude Code | `artifacts/contracts/`, `artifacts/data/` |
| UI Components | Codex Frontend | `src/components/`, `src/App.jsx`, `src/App.css`, `src/hooks/` |
| CI/CD & Scripts | Codex DevOps | `scripts/`, `.github/workflows/deploy*.yml` |
| Test Workflows | Antigravity | `tests/`, `.github/workflows/social-media-tests.yml` |
| Design Artifacts | Antigravity | `artifacts/antigravity/`, `runbooks/stitch-design.md` |
| Infra & Orchestration | Windsurf Master | `justfile`, `netlify.toml`, `plans/`, `NETLIFY_AGENT_PROMPT.md` |
| Brand | Shared (read-only) | `brand/ANCHOR.md` |

**Rule:** If you need to edit a file outside your zone, open a ticket for the zone owner.

---

## PROGRESSIVE DISCLOSURE LAYERS

| Layer | Name | Gate Command | Owner |
|-------|------|-------------|-------|
| L1 | TRUTH | `just check-layers-1-2` | Antigravity |
| L2 | CONTRACTS | `just layers-1-2-gate` | Antigravity + Claude Code |
| L3 | DESIGN | `just design-audit` | Codex Frontend |
| L4 | DELIVER | `just rc1-verify` | Windsurf Master |

Each layer must PASS before the next layer's agents are UNBLOCKED.

---

**The code is fully wired. The platform config (env vars) is the only blocker.**
**Run `just rc1-verify` to confirm. Then hand off to Netlify Agent with `NETLIFY_AGENT_PROMPT.md`.**
