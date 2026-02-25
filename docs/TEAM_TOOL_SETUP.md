# Team Tool Setup — GitKraken + Linear + Claude Code

> How to wire the three tools so every agent and human is on the same page.
> Author: Claude Code (tender-elion) | Date: 2026-02-25

---

## Current Status

| Tool | Status | What's Needed |
|------|--------|---------------|
| **GitKraken Pro / Lens** | Referenced in docs, not confirmed installed | Install + point at repo |
| **Linear** | Script exists (`linear-branch-sync.mjs`), no API key | Set `LINEAR_API_KEY` |
| **Claude Code** | Active (8 worktrees) | Already working |
| **GitHub CLI (gh)** | Installed + authenticated | Working |

---

## Step 1: GitKraken Pro Setup

GitKraken is your "Layer 0" visual tool — it stays on `main` while Claude worktrees operate on feature branches.

### Install
```powershell
winget install Axosoft.GitKraken
```

### Configure
1. Open GitKraken
2. File > Open Repo > `C:\WSP001\SirTrav-A2A-Studio`
3. GitKraken will show `main` branch and all remotes
4. The 8 Claude worktrees appear as separate branches — you can see their commits without switching

### The "Bridge and Decks" Model
```
GitKraken / Lens  →  Always on main  →  "The Bridge" (you see everything)
Claude worktrees  →  Feature branches →  "The Decks" (agents work here)
```

GitKraken will never conflict with Claude's worktrees because they're in separate directories.

---

## Step 2: Linear Setup

Linear is your ticket tracker. Branch names follow `feature/WSP-[number]-description`.

### Get Your API Key
1. Go to: https://linear.app/wsp2agent/settings/api
2. Create a Personal API Key
3. Copy the key

### Set the Environment Variable

**Option A: In `.env` file** (local dev only)
```
LINEAR_API_KEY=lin_api_xxxxxxxxxxxxxxxxxxxx
```

**Option B: In Netlify** (for CI)
```powershell
netlify env:set LINEAR_API_KEY "lin_api_xxxxxxxxxxxxxxxxxxxx"
```

**Option C: In PowerShell session** (temporary)
```powershell
$env:LINEAR_API_KEY = "lin_api_xxxxxxxxxxxxxxxxxxxx"
```

### Verify It Works
```powershell
# From any feature branch:
just ticket-status

# Expected output:
# LinearAlignment PASS
# Branch: feature/WSP-7-persona-vault-restore
# Ticket: WSP-7
# URL: https://linear.app/wsp2agent/issue/WSP-7
```

### What `ticket-status` Does
1. Reads current branch name
2. Extracts ticket ID (e.g., `WSP-7` from `feature/WSP-7-persona-vault-restore`)
3. If `LINEAR_API_KEY` is set: validates ticket exists on Linear API
4. If not set: prints the Linear URL for manual verification

---

## Step 3: Claude Code Worktree Flow

Claude Code already works. Here's how it connects to GitKraken + Linear:

### Create a New Worktree (for a ticket)
```powershell
just sirtrav-worktree name=STRAV-NNN
```
This creates `.claude/worktrees/STRAV-NNN/` with its own branch.

### Check Your Worktrees
```powershell
just worktree-list     # Show all active worktrees
just worktree-status   # Show worktree status + merge state
```

### Full Team Health (NEW)
```powershell
just team-health       # PRs, branches, worktrees, security — one command
just team-health-json  # Machine-readable for automation
```

---

## Step 4: Putting It All Together

### Morning Workflow (Human Operator)
```powershell
# 1. Open GitKraken — see all branches visually
# 2. Run team health dashboard
just team-health

# 3. Check if any PRs are mergeable
# 4. Merge clean PRs (WSP-7 first, then others)
# 5. Run council flash if gates are ready
just council-flash-cloud
```

### Agent Workflow (Claude Code / Windsurf / Codex)
```powershell
# 1. Start in worktree
just sirtrav-worktree name=TICKET-ID

# 2. Verify ticket alignment
just ticket-status

# 3. Do work...

# 4. Pre-merge check
just pre-merge-guard

# 5. Push and create PR
git push -u origin branch-name
```

### QA Workflow (Antigravity)
```powershell
# 1. Run full verification
just verify-truth

# 2. Check all contracts
just validate-all

# 3. Golden path
just golden-path-cloud
```

---

## Quick Reference: Key URLs

| Tool | URL |
|------|-----|
| **GitHub Repo** | https://github.com/WSP001/SirTrav-A2A-Studio |
| **Open PRs** | https://github.com/WSP001/SirTrav-A2A-Studio/pulls |
| **Linear Workspace** | https://linear.app/wsp2agent |
| **Netlify Dashboard** | https://app.netlify.com/sites/sirtrav-a2a-studio |
| **Live Site** | https://sirtrav-a2a-studio.netlify.app |

---

## Troubleshooting

### "just ticket-status says LinearAlignment SKIP"
- `LINEAR_API_KEY` is not set. The script validates branch naming only.
- Set the key per Step 2 above.

### "GitKraken shows conflicts"
- GitKraken is read-only for agent branches. Conflicts are resolved in the agent's worktree.
- Use `just team-health` to see which PRs have conflicts.

### "8 worktrees — which are stale?"
- Run `just worktree-list` to see all worktrees
- Completed tickets (PR merged) should be cleaned: `just worktree-clean name=TICKET`

---

*For the Commons Good.*
