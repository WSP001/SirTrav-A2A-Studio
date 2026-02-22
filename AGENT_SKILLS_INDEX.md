# 🗂️ Agent Skills Index — SirTrav A2A Studio

> **Single source of truth for justfile skill entrypoints.**
> Update this file whenever a new recipe section is added to the justfile.
> For the full worktree policy, see: `docs/AGENT_SKILL_ROUTER.md`

---

## 🌿 Worktree Starters (Isolated Agent Sessions)

Use these when an agent will **write code**. Each command launches Claude in an isolated
git worktree so `main` stays clean and Lens/GitKraken are never disrupted.

| Command | Purpose |
|---------|---------|
| `just sirtrav-worktree name=STRAV-###` | SirTrav video pipeline — agent edits code in isolation |
| `just agent-worktree name=<ticket>` | Generic — any project, any ticket ID |
| `just worktree-list` | Show all active worktrees (what agents are running) |
| `just worktree-status` | Show worktrees + which branches haven't merged to main yet |
| `just worktree-clean name=<ticket>` | Remove finished worktree (run AFTER merging to main) |

**Naming convention:** `<PROJECT>-<TICKET_NUM>-<short-slug>`
**Example:** `just sirtrav-worktree name=STRAV-123-sse-timeout-fix`

---

## 🤖 Agent Orientation

Run these to brief a specific agent before assigning work:

| Command | Agent | Purpose |
|---------|-------|---------|
| `just orient-claude` | Claude Code | Backend orientation + current ticket |
| `just orient-codex` | Codex | Frontend orientation + current ticket |
| `just orient-antigravity` | Antigravity | QA/testing orientation + current ticket |
| `just orient-windsurf` | Windsurf | Cross-project command spine orientation |
| `just orient-human` | Human Operator | ENV var checklist + gate status |

---

## 🔍 Verification & Health Gates

| Command | Layer | Purpose |
|---------|-------|---------|
| `just devkit-tools` | 0 | Tool version check — no network required |
| `just devkit-verify` | 0–4 | Full 5-layer devkit verification (local auto-detect) |
| `just devkit-ci` | 0–4 | CI-safe: cloud + lenient truth-serum |
| `just devkit-quick` | 0–2 | Tools + env + healthcheck only (skip pipeline) |
| `just preflight` | 1 | Env + required file validation |
| `just healthcheck` | 2 | Healthcheck endpoint JSON |
| `just golden-path` | 3 | End-to-end pipeline smoke test (auto-detect local/cloud) |
| `just golden-path-cloud` | 3 | Golden path forced to cloud deployment |
| `just truth-serum` | 4 | No Fake Success validator (strict — disabled=FAIL) |
| `just truth-serum-lenient` | 4 | No Fake Success validator (lenient — disabled=PASS) |
| `just verify-truth` | 4 | Composite: lenient truth-serum + golden-path-cloud |
| `just cycle-all` | 0–4 | All 4 layer gates (TRUTH → WIRING → DESIGN → DELIVER) |
| `just cycle-quick` | 0–2 | Fast cycle: layers 0–2 only |
| `just council-flash-cloud` | ALL | 5-gate Council Flash (cloud, no local runtime needed) |
| `just wm-011` | ALL | vault-init + council-flash-cloud + verdict template |

---

## 🎬 Motion Graphics & Video

| Command | Purpose |
|---------|---------|
| `just remotion-studio` | Open Remotion Studio (preview compositions) |
| `just test-motion` | Motion graphic smoke test |
| `just test-narrate` | Writer Agent narration smoke test |

---

## 📣 Social Publishing

| Command | Purpose |
|---------|---------|
| `just x-dry` | X/Twitter dry-run (validates payload, no post) |
| `just x-live-test` | X/Twitter live post (REAL TWEET — use carefully) |
| `just linkedin-dry` | LinkedIn dry-run |
| `just youtube-dry` | YouTube dry-run |
| `just validate-contracts` | Validate all social response contracts |
| `just truth-serum-lenient` | Verify all 5 publishers (lenient mode) |

---

## 🏛️ Council Flash + Memory Vault

| Command | Purpose |
|---------|---------|
| `just vault-init` | Bootstrap Memory Vault (Netlify Blobs KV) — safe to re-run |
| `just council-flash-cloud` | 5-gate cloud Council Flash verification |
| `just wm-011` | Composite: vault-init + council-flash-cloud + verdict |

---

## 🛠️ Setup & Dev

| Command | Purpose |
|---------|---------|
| `just install` | npm install (first-time setup) |
| `just dev` | Start Netlify dev server (port 8888) |
| `just build` | Production build |
| `just deploy` | Deploy to Netlify production |

---

## 📚 Key Documentation

| Doc | Purpose |
|-----|---------|
| `docs/AGENT_SKILL_ROUTER.md` | Worktree layer policy — when and how to use |
| `runbooks/agent-handoff.md` | Handoff protocol + non-overlapping zones |
| `plans/AGENT_ASSIGNMENTS.md` | **Source of truth** — all ticket status and ownership |
| `.agent/skills/ANTIGRAVITY_AGENT.md` | Antigravity agent role + command matrix |
| `docs/COMMONS_AGENT_JUSTFILE_FLOW.md` | Full command matrix by agent role |
| `PROJECT-JUSTFILE-INFO.md` | Quick reference: tech stack + key commands |
| `CLAUDE.md` | Critical constraints (read before any work) |

---

## 🔢 Ticket ID Schema

| Prefix | Agent | Example |
|--------|-------|---------|
| `CC-NNN` | Claude Code | CC-016 |
| `WM-NNN` | Windsurf Master | WM-013 |
| `AG-NNN` | Antigravity | AG-014 |
| `CX-NNN` | Codex | CX-015 |
| `STRAV-NNN-slug` | Worktree ticket | STRAV-123-sse-fix |

---

## 🔄 One-Ticket Rule

Each agent works **one ticket at a time**. Check `plans/AGENT_ASSIGNMENTS.md` for current assignments before starting new work. No parallel tickets per agent.

---

*Maintained by Windsurf Master. Last updated: 2026-02-21 (WM-013)*
