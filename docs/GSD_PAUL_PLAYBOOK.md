# GSD / PAUL Playbook — Two Modes of Work

> **GSD** = Get Stuff Done (execution mode — build, fix, ship)
> **PAUL** = Plan / Audit / Upgrade / Ledger (strategic mode — review, improve, record)
> **Rule:** Know which mode you're in. Don't audit while building. Don't build while auditing.

---

## GSD Mode — Execution Workflow

**When:** You have a ticket assigned and need to build/fix/ship something.

### GSD Sequence

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  1. PREFLIGHT │───▶│  2. BUILD    │───▶│  3. VERIFY   │───▶│  4. SHIP     │
│  Environment  │    │  Your ticket │    │  Your gates  │    │  Push + PR   │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

### GSD Commands (in order)

```powershell
# 1. PREFLIGHT — verify environment is ready
just preflight                    # Node, npm, just versions OK?
just flow                         # On-ticket? DevKit healthy? Machine OK?

# 2. BUILD — do the actual work
# (agent-specific — edit your owned files, run your feature commands)

# 3. VERIFY — run your gates
just cycle-gate <your-gate>       # e.g., healthcheck, no_fake_success, design_tokens
just devkit-quick                 # Quick sanity (tools + env + paths)

# 4. SHIP — push and PR
just pre-merge-guard              # 4-check composite (must pass)
git add <your-files>
git commit -m "feat(<scope>): <ticket> <description>"
git push -u origin feature/WSP-<n>-<slug>
# Open PR via GitHub UI or `gh pr create`
```

### GSD Per-Agent Shortcuts

| Agent | Build Step | Verify Step |
|-------|-----------|-------------|
| **Claude Code** | Edit `netlify/functions/*` | `just cycle-gate healthcheck && just cycle-gate no_fake_success` |
| **Codex** | Edit `src/components/*` | `just cycle-gate design_tokens && just build` |
| **Windsurf** | Edit `justfile`, `scripts/*` | `just devkit-tools && just machine-gate` |
| **Antigravity** | Edit `scripts/test-*` | `just verify-truth && just x-dry-run` |
| **Human Operator** | Manage env vars, review PRs | `just council-flash-cloud && just ops-spine-cloud` |

---

## PAUL Mode — Strategic Review Workflow

**When:** No active ticket. Sprint boundary. Something feels off. Performance review.

### PAUL Sequence

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  P. PLAN     │───▶│  A. AUDIT    │───▶│  U. UPGRADE  │───▶│  L. LEDGER   │
│  Read context │    │  Run all     │    │  Fix what's  │    │  Record what │
│  + assign    │    │  gates       │    │  broken      │    │  happened    │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

### PAUL Commands (in order)

```powershell
# P — PLAN: Read the current state
cat plans/AGENT_ASSIGNMENTS.md      # Who's doing what? Any blocked tickets?
cat AGENTS.md                       # Agent roster, current roles
cat HANDOFF.md                      # Last session's state + next steps
node scripts/cycle-check.mjs status # Gate summary (10 gates)

# A — AUDIT: Run comprehensive verification
just ops-spine-cloud                # Full 5-step cloud spine
just antigravity-suite              # Antigravity's full test battery
just validate-all                   # All validators
just no-fake-success-check          # Honesty audit
just verify-truth                   # Truth Serum composite
just devkit-verify                  # Full 5-layer DevKit check (not --quick)
just check-machine-health           # Machine state + NPU

# U — UPGRADE: Fix what the audit found
# Create worktree for fix:
git worktree add .worktrees/WSP-<n>-<fix-slug> -b feature/WSP-<n>-<fix-slug> origin/main
cd .worktrees/WSP-<n>-<fix-slug>
just flow                           # Validate ticket alignment
# ... make fixes ...
just pre-merge-guard                # Verify fix before push

# L — LEDGER: Record outcomes
# Update AGENT_ASSIGNMENTS.md with ticket status
# Update HANDOFF.md with new state
# Post to Linear with delivery summary
# Tag release if warranted: git tag -a v<x.y.z> -m "<summary>"
```

### PAUL Cadence

| When | What to Run | Time Budget |
|------|-------------|-------------|
| **Daily** (start of session) | `just flow` + `just devkit-quick` | 2 min |
| **Weekly** (sprint boundary) | Full PAUL sequence | 30 min |
| **Pre-merge** (before any PR) | `just pre-merge-guard` + `just verify-truth` | 5 min |
| **Post-incident** (after a failure) | Full Audit + root cause ticket | 1 hour |

---

## Decision Matrix — GSD or PAUL?

| Situation | Mode | First Command |
|-----------|------|--------------|
| "I have a ticket, I know what to build" | **GSD** | `just flow` |
| "Something broke in production" | **GSD** | `just healthcheck-cloud` |
| "Starting a new sprint" | **PAUL** | `cat plans/AGENT_ASSIGNMENTS.md` |
| "Not sure what to work on next" | **PAUL** | `node scripts/cycle-check.mjs status` |
| "PR is ready for review" | **GSD** | `just pre-merge-guard` |
| "Haven't checked gates in a while" | **PAUL** | `just ops-spine-cloud` |
| "New teammate joining" | **PAUL** | `cat docs/TEAM_KNOWLEDGE_BASE.md` |

---

## Performance Maximizers

### For Individual Agents
- **Start every session with `just flow`** — 30 seconds to confirm you're on-ticket and healthy
- **Never skip `pre-merge-guard`** — 4 checks that catch 90% of merge failures
- **Use `--quick` flags** during GSD, full checks during PAUL

### For the Team
- **One ticket per agent** — prevents merge conflicts and attribution confusion
- **Share HANDOFF.md** between sessions — any agent can resume from where you left off
- **Post delivery comments to Linear** — builds the audit trail the Ledger Gate will automate
- **Run PAUL weekly** — 30 minutes of audit prevents hours of incident response

---

*Two modes. One discipline. GSD for velocity. PAUL for integrity. Both for the Commons Good.*
