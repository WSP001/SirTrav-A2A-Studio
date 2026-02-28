# 🎯 CX-016 — Control Plane UI + Local Dev Green-Up

**Owner:** Codex #2
**Priority:** HIGH
**Status:** READY (2026-02-28)
**Blocking:** None — cloud is REAL, this turns local from 🟡 to ✅
**Branch:** `feature/WSP-16-control-plane-ui`

---

## Context

The Acting Master (Windsurf/Cascade) has deployed a split-verdict Control Plane:

- `just cockpit --json` now emits **cloudVerdict** + **localVerdict**
- `just control-plane-gate` exits 0 only when `cloudVerdict === 'REAL'`
- Cloud is REAL (32/45 sanity checks pass). Local is CHECK_REQUIRED.

Your job: **turn localVerdict from CHECK_REQUIRED to REAL** and wire the UI to show it.

---

## Read-First Gate

> "I read CLAUDE.md + AGENT_ASSIGNMENTS.md and I am working ticket CX-016."

---

## Task 1: Confirm dist/ is NOT committed (build output only)

```powershell
# Must NOT be tracked in git
git ls-files dist/ | Measure-Object
# Expected: Count = 0
# If Count > 0: add dist/ to .gitignore and remove from tracking
```

**Done when:** `dist/` is in `.gitignore` and not tracked.

---

## Task 2: Wire SystemStatusEmblem to read cloudVerdict + localVerdict

The existing `SystemStatusEmblem` component reads truth state. Update it to show split verdicts:

```
Cloud: REAL ✅    Local: CHECK_REQUIRED 🟡
```

**Source:** Run `just cockpit --json` and look at `truth.cloudVerdict` + `truth.localVerdict`

**File to edit:** `src/components/SystemStatusEmblem.tsx` (or wherever the emblem lives)

**Done when:** Emblem shows both verdicts, color-coded (green/yellow/red).

---

## Task 3: Add a `/diagnostics` dev-only panel

Show on the UI (dev mode only, behind `import.meta.env.DEV`):

| Field | Source |
|-------|--------|
| Cloud Verdict | `/healthcheck` → status |
| Local Verdict | `just cockpit --json` → truth.localVerdict |
| Build Hash | `import.meta.env.VITE_COMMIT_REF` or `'local'` |
| Agent Pipeline | 7/7 files present |
| Cycle Gates | 10/10 |

**Done when:** `npm run dev` → navigate to `/diagnostics` → see real data.

---

## Task 4: Verify no regressions

```powershell
npm run build
just sanity-test
just control-plane-gate
```

**Done when:** All three pass. Build generates `dist/`. Sanity test doesn't regress. Gate returns REAL.

---

## Verification Commands (Copy-Paste Ready)

```powershell
# CX-016 full run
git ls-files dist/ | Measure-Object
npm run build
npm run dev
# → Open browser, check emblem + /diagnostics
just sanity-test
just control-plane-gate
```

---

## Exit Conditions

| Outcome | Action |
|---------|--------|
| All tasks pass | CX-016 DONE — commit to branch, open PR |
| Emblem component missing | Check `src/components/` for alternatives, create if needed |
| Build fails | Check `vite.config.ts` — do NOT change netlify.toml |
| sanity-test regresses | Fix the regression, do not skip tests |

---

## Machine Health Note

**AMD Ryzen AI 9 HX 370** — keep CPU inference reserves healthy:
- Run `npm run build` once, not in watch mode
- Don't start multiple `netlify dev` instances
- Kill any orphan node processes before starting: `Get-Process node | Stop-Process -Force`

---

*For the Commons Good 🎬*
