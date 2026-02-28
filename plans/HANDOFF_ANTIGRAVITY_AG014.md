# 🦅 AG-014 — Control Plane Verification + Golden Path Receipt

**Owner:** Antigravity (QA / Truth)
**Priority:** HIGH
**Status:** READY (2026-02-28) — starts after CX-016 + CC-016 merge
**Blocking:** None
**Branch:** N/A (read-only verification, no code changes)

---

## Context

Windsurf Master deployed the split-verdict Control Plane. Codex #2 wires the UI. Claude Code makes tests mode-aware. Antigravity's job: **prove it all works end-to-end and produce a receipt**.

---

## Read-First Gate

> "I read CLAUDE.md + AGENT_ASSIGNMENTS.md and I am working ticket AG-014."

---

## Gate 1: Control Plane Verdict

```powershell
just cockpit --json
```

Verify JSON output contains:
- `truth.cloudVerdict` = `"REAL"`
- `truth.localVerdict` = `"REAL"` or `"CHECK_REQUIRED"` (both acceptable)
- `truth.cloudReasons` array has >= 4 entries

Record: `cloudVerdict=___ localVerdict=___`

---

## Gate 2: Control Plane Gate (CI enforcer)

```powershell
just control-plane-gate
```

Must exit 0 with `GATE PASSED`.

Record: `exit code=___`

---

## Gate 3: Sanity Test (cloud mode)

```powershell
node scripts/sanity-test.mjs --report
```

Verify:
- 0 required failures (after CC-016 mode fix)
- Report written to `artifacts/reports/sanity-YYYY-MM-DD.md`
- All 7 agent files present
- Cloud healthcheck = healthy

Record: `passed=___ failed=___ degraded=___ report=___`

---

## Gate 4: Social Dry-Run Trio

```powershell
just x-dry
just linkedin-dry
just youtube-dry
```

All three must complete without error. Disabled platforms return `{ disabled: true }` — that is correct, NOT a failure.

Record: `X=___ LinkedIn=___ YouTube=___`

---

## Gate 5: Truth Serum (if available)

```powershell
just truth-serum-lenient
```

If available, verify real tweetId (19 digits), cost > $0, all truthful.

Record: `tweetId=___ cost=___ allTruthful=___`

---

## Receipt Template

After all gates, write this receipt:

```markdown
# AG-014 — Control Plane Verification Receipt

**Date:** [YYYY-MM-DD]
**Agent:** Antigravity
**Ticket:** AG-014

## Results

| Gate | Result | Evidence |
|------|--------|----------|
| Control Plane Verdict | ✅/❌ | cloudVerdict=___, localVerdict=___ |
| Control Plane Gate | ✅/❌ | exit code=___ |
| Sanity Test (cloud) | ✅/❌ | passed=___, failed=___, report=___ |
| Social Dry-Runs | ✅/❌ | X=___, LinkedIn=___, YouTube=___ |
| Truth Serum | ✅/❌/SKIP | tweetId=___, allTruthful=___ |

## Verdict

> "Control Plane AG-014: [ALL GATES GREEN / X gates failed].
> Split verdict working: cloud=___, local=___.
> No Fake Success confirmed. Antigravity reviewer gate CLOSED."
> — Antigravity, [date]
```

Save to: `artifacts/receipts/ag-014-control-plane.md`

---

## Machine Health Note

All commands are read-only probes. No builds, no installs. Safe for low-resource runs.

---

*For the Commons Good 🎬*
