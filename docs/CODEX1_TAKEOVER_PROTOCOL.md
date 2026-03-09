# CODEX1 TAKEOVER PROTOCOL
> Procedure for Claude Code taking over stranded Codex #2 work
> Maintained by: Antigravity (QA/Verifier)
> Version: 1.0.0 — 2026-03-09

---

## WHEN TO INVOKE THIS PROTOCOL

Invoke when ALL of the following are true:

1. Codex #2 has claimed a commit/PR 3+ times
2. None of the claimed hashes appear on `origin/main` or any remote branch
3. The file(s) Codex claimed do not exist in the repo
4. Scott (Human Conductor) has given explicit approval to proceed with takeover

**This protocol is NOT for routine handoffs — only for confirmed stranded/phantom delivery situations.**

---

## LANE BOUNDARIES (HARD RULES)

Claude Code MAY take over:
- `docs/` — any documentation files
- `scripts/` — CLI tools, verification scripts
- `netlify/functions/` — serverless backend
- `plans/` — handoff tickets
- `justfile` — recipe additions

Claude Code MAY NOT take over (refer to Human-Ops or wait for Codex):
- `src/components/*.tsx` / `src/components/*.jsx` — React components
- `src/pages/` — Route pages
- `src/*.css` — Stylesheets
- `src/App.jsx` / `src/App.tsx` — Main app entry

---

## STEP-BY-STEP TAKEOVER PROCEDURE

### Step 1 — Declare the Phantom (Antigravity)
```bash
# Verify the claimed commit does not exist
git fetch origin
git log --all --oneline | grep <claimed-hash>
# If no output → PHANTOM CONFIRMED

# Verify claimed files don't exist
ls -la <path/to/claimed/file>
# If "No such file or directory" → PHANTOM CONFIRMED
```

### Step 2 — Scope Assessment (Claude Code)
1. Read original Codex ticket/handoff describing what was needed
2. Identify which parts are in-lane (docs, scripts, backend) vs out-of-lane (frontend)
3. Check if in-lane work is still needed (may have been covered by another agent)
4. Get explicit Scott approval before proceeding

### Step 3 — Execute Takeover (Claude Code)
```bash
# Work from canonical workspace only
cd /c/WSP001/SirTrav-A2A-Studio
git status  # Confirm clean working tree

# Create the files
# ... (implement the work) ...

# Stage specific files — no git add -A
git add docs/CODEX2_RED_TO_GREEN_BOARD.md docs/CODEX1_TAKEOVER_PROTOCOL.md

# Verify what's staged before committing
git diff --staged --stat
```

### Step 4 — Deliver with Real Proof
```bash
# Commit
git commit -m "docs(ops): [takeover] <description> [CC-TAKEOVER]"

# GENERATE DELIVERY PROOF (all 4 items required):
echo "=== DELIVERY PROOF ==="
echo "1. HEAD sha:"
git rev-parse HEAD

echo "2. Show output:"
git show --stat HEAD

echo "3. Origin proof (must appear after push):"
git log --oneline origin/main -3

echo "4. Files on disk:"
ls -la docs/CODEX2_RED_TO_GREEN_BOARD.md docs/CODEX1_TAKEOVER_PROTOCOL.md

# Push
git push origin main
```

### Step 5 — Post-Takeover Verification (Antigravity)
```bash
git fetch origin
git log --oneline origin/main -5
# Confirm takeover commit appears in output

# Verify files
curl -s https://api.github.com/repos/WSP001/SirTrav-A2A-Studio/contents/docs/CODEX2_RED_TO_GREEN_BOARD.md | grep '"name"'
```

---

## TAKEOVER RECEIPT TEMPLATE

Copy this block, fill in the blanks, and post to Scott (Master) when takeover is complete:

```
CODEX1 TAKEOVER RECEIPT
=======================
Date: <date>
Triggered by: Phantom commit <hash> (never appeared on origin/main)
Takeover agent: Claude Code

Files delivered:
  <list each file with path>

Commit hash: <git rev-parse HEAD output>
On origin/main: YES / NO
Build: PASS / FAIL

Delivery proof:
1. HEAD sha:     <exact output>
2. Show output:  <exact output>
3. Origin proof: <exact output showing commit in log>
4. Files exist:  <ls -la output>

Out-of-lane items NOT taken over (requires Human-Ops or Codex from WSP001):
  <list frontend files Codex claimed that still need work>
```

---

## CODEX #2 SANDBOX LIMITATION (Root Cause)

Codex #2's environment has a `make_pr` tool that generates commit hashes and PR descriptions that look real but exist only inside Codex's session context. They never reach GitHub.

**Workaround for Codex:** Scott must run Codex from WSP001 (`c:\WSP001\SirTrav-A2A-Studio`) with proper git credentials, not from the Codex web interface. Only then can Codex's commits actually push to origin.

**Until that is resolved:** All Codex deliverables for docs/scripts/backend will be completed via Claude Code takeover per this protocol.

---

## HISTORY

| Date | Triggered By | Files Taken Over | Commit |
|------|-------------|-----------------|--------|
| 2026-03-09 | 5 phantom commits from Codex #2 | CODEX2_RED_TO_GREEN_BOARD.md, CODEX1_TAKEOVER_PROTOCOL.md | `<see git log>` |
