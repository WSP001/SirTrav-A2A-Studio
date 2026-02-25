# Copilot CLI — Safe Ops Protocol (SirTrav-A2A-Studio)

> **Purpose:** Rules for GitHub Copilot CLI sessions operating in this repo.
> **Last Updated:** 2026-02-25
> **Author:** Windsurf Master (completing what Copilot CLI started)

---

## Non-Destructive Rule

**Never delete untracked "inspiration" or artifacts.** Archive to:
`.archive/inbox/<timestamp>/` (gitignored)

```powershell
$stamp = Get-Date -Format "yyyy-MM-dd_HH-mm"
$ARCH  = Join-Path $REPO ".archive\inbox\$stamp"
New-Item -ItemType Directory -Force -Path $ARCH | Out-Null
git -C $REPO status --porcelain | Out-File (Join-Path $ARCH "status_before.txt")
```

---

## Git Command Rule (Copilot shell may not persist `cd`)

Always use the `-C` flag to target the repo:

```powershell
$REPO = "c:\Users\Roberto002\Documents\GitHub\SirTrav-A2A-Studio"
git -C $REPO <command>
```

**Why:** Copilot CLI sometimes loses the working directory between commands. The `-C` flag ensures every git command targets the correct repo regardless of `pwd`.

---

## Never Commit These Files

| File | Reason |
|------|--------|
| `.claude/settings.json` | Agent-local config, differs per machine |
| `.env*` | Secrets, API keys |
| `artifacts/metrics/` | Transient run data (gitignored) |
| `.archive/` | Recovery inbox (gitignored) |

If you accidentally stage one: `git -C $REPO restore --staged <file>`

---

## Standard Startup Sequence

Run this at the start of every Copilot CLI session:

```powershell
$REPO = "c:\Users\Roberto002\Documents\GitHub\SirTrav-A2A-Studio"
git -C $REPO rev-parse --show-toplevel
git -C $REPO status --porcelain
git -C $REPO branch --show-current
git -C $REPO rev-parse --short HEAD
```

Expected output: repo root, clean status, current branch, short HEAD hash.

---

## Archive Before Cleanup

Before moving or archiving untracked files:

```powershell
$stamp = Get-Date -Format "yyyy-MM-dd_HH-mm"
$ARCH  = Join-Path $REPO ".archive\inbox\$stamp"
New-Item -ItemType Directory -Force -Path $ARCH | Out-Null
git -C $REPO status --porcelain | Out-File (Join-Path $ARCH "status_before.txt")

# Move untracked items (NEVER delete)
$src = Join-Path $REPO "artifacts\metrics"
if (Test-Path $src) {
  New-Item -ItemType Directory -Force -Path (Join-Path $ARCH "artifacts_metrics") | Out-Null
  Move-Item -Force $src (Join-Path $ARCH "artifacts_metrics\")
}
```

---

## Forbidden Actions

- **No `git clean -fd`** — moves items to archive instead
- **No commits on `main`** — always pivot to `feature/WSP-*` branch
- **No force-push** — ever
- **No editing `.env` or secrets** — Human Operator only
- **No `git rebase` without rescue branch first**

```powershell
# Always create rescue branch before rebase
$ts = Get-Date -Format "yyyyMMdd-HHmmss"
git -C $REPO branch "rescue/pre-rebase-$ts" HEAD
```

---

## Verification Commands

```powershell
just healthcheck-cloud    # Cloud deployment healthy?
just devkit-tools         # 12-tool check (9/12 expected on this machine)
just devkit-ci            # Full CI gate (20/22 expected)
npx vite build            # Frontend compiles?
```

---

*Protocol established after AG-014 Copilot CLI session — 2026-02-25.*
