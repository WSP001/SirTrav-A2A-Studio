# Master Audit & Preservation Plan

**Version:** 1.0.0
**Created:** 2026-03-07
**Author:** Claude Code (on behalf of Human Conductor)
**Gate:** `just workspace-audit` must pass before any destructive cleanup

---

## Purpose

Before any workspace cleanup, archival, or deletion, this plan ensures:

1. Unique content is **preserved** before anything is removed
2. Only verified **duplicated recursion** is eligible for deletion
3. The canonical workspace (`WSP001`) remains the single source of truth

---

## Workspace Inventory

| Location | Role | Status |
|----------|------|--------|
| `C:\WSP001\SirTrav-A2A-Studio` | **WRITE** — canonical workspace | Active, main branch |
| `C:\Users\Roberto002\Documents\GitHub\SirTrav-A2A-Studio` | Archive / read-only | Behind by 2 commits (as of 2026-03-07) |
| `C:\Users\Roberto002\OneDrive\Sir James\SirTrav-A2A-Studio` | Archive / read-only | **NOT FOUND** on disk |

### Staging / Safe Archive Location

All preserved content goes to: `C:\WSP001\archive-inspiration\`

Existing recipe: `just path-fix-archive "source" "name"` writes here with manifest.

---

## Pre-Cleanup Guardrail Sequence

Before removing ANY workspace copy or recursive folder:

```bash
# 1. SCAN — see what exists (read-only, no changes)
just path-fix-scan "C:\Users\Roberto002\Documents\GitHub\SirTrav-A2A-Studio"

# 2. DIFF — compare against canonical
just workspace-audit

# 3. ARCHIVE — preserve anything unique to safe location
just path-fix-archive "C:\Users\Roberto002\Documents\GitHub\SirTrav-A2A-Studio" "github-archive"

# 4. VERIFY — confirm archive manifest
cat C:\WSP001\archive-inspiration\github-archive\ARCHIVE_MANIFEST.txt

# 5. ONLY THEN — delete the duplicate (Human-Ops only, never agents)
```

**Rule:** Steps 1-4 are agent-safe. Step 5 is **Human-Ops ONLY**. No agent may execute `rm -rf`, `rmdir /s`, or any recursive deletion on a workspace copy.

---

## What Gets Preserved vs Deleted

### PRESERVE (copy to archive first)

| Category | Example | Reason |
|----------|---------|--------|
| Uncommitted local changes | Modified files not in git | May contain unreplicated work |
| Local `.env` files | `.env`, `.env.local` | Contains credentials (presence only, not values) |
| Stash entries | `git stash list` output | Unmerged work-in-progress |
| Local branches not on remote | `git branch --no-merged` output | Unpushed feature work |
| Non-git files | Files outside repo (adjacent folders) | May be unique |

### SAFE TO DELETE (after archive + verify)

| Category | Condition | Verification |
|----------|-----------|--------------|
| Recursive OneDrive nesting | `SirTrav-A2A-Studio/SirTrav-A2A-Studio/...` | `just path-fix-scan` shows nesting depth > 1 |
| `node_modules/` in archive copies | Always regenerable | `npm ci` recreates |
| `dist/` in archive copies | Build output | `npm run build` recreates |
| `.netlify/` cache in archive copies | Netlify CLI cache | Non-essential |

### NEVER DELETE

| Category | Reason |
|----------|--------|
| `C:\WSP001\SirTrav-A2A-Studio` | Canonical workspace |
| Any `.env` without archiving values | Contains secrets |
| `plans/` directory content | Handoff tickets = institutional memory |
| `artifacts/LEDGER.ndjson` | Cost accounting record |

---

## Recursive Deletion Safety

The ONLY recursive deletion target allowed:

```
Pattern: <parent>/SirTrav-A2A-Studio/SirTrav-A2A-Studio/SirTrav-A2A-Studio/...
```

This is an OneDrive sync artifact where the folder duplicates itself inside itself. The guardrail:

1. `just path-fix-scan` identifies the nesting
2. `just path-fix-archive` copies unique (non-recursive) content to `archive-inspiration/`
3. `just path-fix-quarantine` renames the recursive folder with `_QUARANTINE_` prefix (non-destructive)
4. **Human-Ops** verifies the quarantine, then manually deletes if satisfied

**Safety boundary:** Only the innermost duplicate recursion is quarantined. The outermost copy (which contains the unique content) is always preserved.

---

## Current Unblock Priority Order

Per MASTER.md v3.4.0 and AGENT-OPS.md v1.3.0:

| Priority | Item | Owner | Blocker |
|----------|------|-------|---------|
| 1 | **HO-007** — Remotion Lambda AWS keys | Human-Ops | M9 blocker |
| 2 | **HO-006** — ElevenLabs API key | Human-Ops | M9 blocker |
| 3 | Deploy with new keys | Netlify Agent | Needs HO-006 + HO-007 first |
| 4 | Three Rings verification | Antigravity | Needs deploy first |
| 5 | **CX-019** — Wire metrics panel | Codex #2 | Needs CC-M9-METRICS (done) |

---

## Post-Cleanup Checklist

After any workspace cleanup, verify:

- [ ] `C:\WSP001\SirTrav-A2A-Studio` still exists and `git status` is clean
- [ ] `just cockpit` returns valid output
- [ ] `npm run build` succeeds
- [ ] Archive manifest exists at `C:\WSP001\archive-inspiration\<name>\ARCHIVE_MANIFEST.txt`
- [ ] No unique content was lost (compare `git log` counts between archive and canonical)
- [ ] CLAUDE.md is intact: `head -5 CLAUDE.md` shows agent instructions header

---

## Verification Recipe

Run `just workspace-audit` to check all workspace copies and their drift from canonical:

```
just workspace-audit
```

This compares commit hashes, checks for uncommitted changes, and reports any unique content in archive copies that isn't in the canonical workspace.

---

*This document is the safety net for workspace cleanup. No recursive deletion without this plan.*

**For the Commons Good**
