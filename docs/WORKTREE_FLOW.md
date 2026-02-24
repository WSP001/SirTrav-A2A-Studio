# Worktree Flow — Standard Agent Workflow

> **Applies to:** All agents (Claude Code, Codex, Windsurf Master, Antigravity, Human Operator)
> **Platform:** Windows PowerShell
> **Prerequisite:** Linear ticket assigned (e.g., WSP-6)

---

## Step 1 — Create Agent Worktree

```powershell
# From the main repo root:
cd c:\WSP001\SirTrav-A2A-Studio

# Create a worktree for your ticket (branch auto-created):
git worktree add .worktrees/WSP-6-ledger-gate -b feature/WSP-6-ledger-gate origin/main

# Enter the worktree:
cd .worktrees/WSP-6-ledger-gate
```

> **Naming rule:** Branch MUST match `feature/WSP-<number>-<slug>` or `just flow` will reject it.

---

## Step 2 — Validate Before Working

```powershell
# Confirm you're on a valid ticket branch:
just ticket-status
# Expected: LinearAlignment PASS — feature/WSP-6-ledger-gate

# Run the full flow check (ticket + devkit + machine health):
just flow
# Expected: FLOW COMPLETE — you are on-ticket and verified
```

If `flow` fails, fix the issue before writing any code.

---

## Step 3 — Do Your Work

Edit only files within your agent's ownership zone (see `.agent/skills/<YOUR_AGENT>.md`).

After making changes, verify your specific gates:

```powershell
# Example for Claude Code:
just cycle-gate healthcheck
just cycle-gate no_fake_success

# Example for Codex:
just cycle-gate design_tokens

# Example for Windsurf:
just devkit-quick
just machine-gate
```

---

## Step 4 — Pre-Merge Guard

```powershell
# Before pushing, run the full discipline check:
just pre-merge-guard
# Expected: 4/4 checks PASS
#   CHECK 1: Working tree clean
#   CHECK 2: Up-to-date with origin
#   CHECK 3: Machine health gate (score ≥ 5)
#   CHECK 4: DevKit quick verify
```

---

## Step 5 — Commit and Push

```powershell
# Stage your changes:
git add <your-files>

# Commit with conventional message:
git commit -m "feat(backend): CLD-BE-OPS-002 Ledger Gate — token attribution"

# Push to remote:
git push -u origin feature/WSP-6-ledger-gate
```

---

## Step 6 — Open PR

```powershell
# Via GitHub CLI (if installed):
gh pr create --title "feat: CLD-BE-OPS-002 Ledger Gate" --base main --head feature/WSP-6-ledger-gate

# Or via GitKraken / GitHub web UI
```

PR title should reference the ticket ID. Description should include:
- What changed (3 bullets)
- Validation commands run + results
- Layer independence confirmation

---

## Step 7 — Cleanup Worktree

After PR is merged:

```powershell
# Return to main repo:
cd c:\WSP001\SirTrav-A2A-Studio

# Remove the worktree:
git worktree remove .worktrees/WSP-6-ledger-gate

# Delete the local branch (remote already merged):
git branch -d feature/WSP-6-ledger-gate

# Verify cleanup:
git worktree list
```

---

## Quick Reference

| Step | Command | Gate |
|------|---------|------|
| Create worktree | `git worktree add .worktrees/<slug> -b feature/WSP-<n>-<slug> origin/main` | — |
| Validate ticket | `just ticket-status` | LinearAlignment |
| Full flow check | `just flow` | ticket + devkit + health |
| Pre-merge guard | `just pre-merge-guard` | clean + up-to-date + health + devkit |
| Push | `git push -u origin feature/WSP-<n>-<slug>` | — |
| Cleanup | `git worktree remove .worktrees/<slug>` | — |
