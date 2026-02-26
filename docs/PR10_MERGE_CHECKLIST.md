# PR #10 Merge Checklist

> **PR:** [feat(infra): Cycle gate system v3 + agent skill docs + lean protocol](https://github.com/WSP001/SirTrav-A2A-Studio/pull/10)
> **Branch:** `claude/trusting-hamilton` → `main`
> **Date:** 2026-02-23

---

## Pre-Merge Checks

### 1. Confirm Clean Status

```powershell
cd c:\WSP001\SirTrav-A2A-Studio\.claude\worktrees\trusting-hamilton
git status
# Expected: "nothing to commit, working tree clean"
# If dirty: stage and commit or stash before proceeding
```

### 2. Confirm Branch Is Up-to-Date

```powershell
git fetch origin
git log --oneline origin/main..HEAD | Measure-Object -Line
# Expected: shows number of commits ahead (should be ~15-20)

git log --oneline HEAD..origin/main | Measure-Object -Line
# Expected: 0 lines (no commits behind main)
# If behind: run `git merge origin/main --no-edit` and resolve any conflicts
```

### 3. Run Pre-Merge Guard

```powershell
just pre-merge-guard
# Expected output:
#   CHECK 1: Working tree clean       ✅
#   CHECK 2: Up-to-date with origin   ✅
#   CHECK 3: Machine health gate      ✅ (score ≥ 5)
#   CHECK 4: DevKit quick verify      ✅
#   Pre-Merge Guard PASSED — safe to merge
```

### 4. Run Full Cycle Gate Check

```powershell
node scripts/cycle-check.mjs all
# Expected: 10 gates checked, summary printed
# Any FAIL gates should be investigated before merge
```

### 5. Verify No Conflict Markers

```powershell
Select-String -Recurse -Include "*.md","*.mjs","*.ts","*.json" -Path "." -Pattern "<<<<|====|>>>>" -SimpleMatch | Where-Object { $_.Path -notmatch "node_modules" }
# Expected: no output (zero matches)
```

---

## Merge Method Recommendation

### **Use: Merge Commit** (not squash, not rebase)

**Why merge commit:**
- This PR spans **8 weeks** of work across **5 agents** with **50+ files** changed
- Individual commits carry attribution: WM-012 (Windsurf), CC-GATE-V3 (Claude Code), CX-014 (Codex), AG-013 (Antigravity)
- Squashing would destroy the per-agent attribution trail that the Ledger Gate system depends on
- The merge commit itself serves as a milestone marker in `git log --first-parent`

**Why NOT squash:**
- Loses granular commit history (WM-012 vs WSP-GOVERNANCE vs CLD-BE-OPS-002 task spec)
- Makes `git blame` useless for multi-agent attribution

**Why NOT rebase:**
- Rewrites commit hashes, breaking Linear issue references and PR comment links
- Risk of conflict cascade across 50+ files

### Merge Command (if merging locally)

```powershell
# Switch to main:
cd c:\WSP001\SirTrav-A2A-Studio
git checkout main
git pull origin main

# Merge with commit:
git merge origin/claude/trusting-hamilton --no-ff -m "Merge PR #10: Cycle gate v3 + agent skills + WM-012 DevKit + WSP-GOVERNANCE"

# Push:
git push origin main
```

### Or via GitHub UI
- Go to https://github.com/WSP001/SirTrav-A2A-Studio/pull/10
- Click **"Merge pull request"** (default merge commit)
- Confirm merge

---

## Post-Merge Steps

### 1. Tag the Release

```powershell
git checkout main
git pull origin main
git tag -a v3.0.0 -m "Cycle Gate v3 + Agent Skills + DevKit + Governance"
git push origin v3.0.0
```

### 2. Delete the Remote Branch

```powershell
git push origin --delete claude/trusting-hamilton
```

> **Note:** GitHub can auto-delete on merge if enabled in repo settings.

### 3. Clean Up Local Worktree

```powershell
cd c:\WSP001\SirTrav-A2A-Studio
git worktree remove .claude/worktrees/trusting-hamilton
git branch -d claude/trusting-hamilton
```

### 4. Verify Main Is Healthy

```powershell
git checkout main
just devkit-tools          # 13 PASS expected
just check-machine-health  # 8/10 expected
just healthcheck           # Local healthcheck
just healthcheck-cloud     # Cloud healthcheck
```

### 5. Close Stale PRs

| PR | Action | Reason |
|----|--------|--------|
| #11 | Close | DevKit files overlap with WM-012 (now merged) |
| #7 | Close | Creative Hub — has conflicts, 1+ month stale |
| #9 | Re-evaluate | UI fix — may still be valid, re-run CI |

### 6. Notify the Team

Post to Linear or team channel:
> PR #10 merged to main. Cycle Gate v3 + Agent Skills + DevKit + Governance are live.
> Next: Claude Code picks up CLD-BE-OPS-002 (Ledger Gate) on `feature/WSP-6-ledger-gate`.
> All agents: use `just flow` on new branches. Old `claude/*` branches are retired.
