# Windsurf Master: Weekly Pulse Orchestration (WM-006)

## Mission

Wire justfile commands for the Weekly Pulse pipeline. Verify task specs exist
for all agents. Report on missing deliverables. Safe commit/push discipline.

## Deliverables

| File | Status |
|------|--------|
| justfile — Weekly Pulse section (lines 597-641) | DONE |
| justfile — Schema Validation section (lines 642-666) | DONE |
| justfile — HUD/Plaque section (lines 668-677) | DONE |
| justfile — Orchestration section (lines 679-719) | DONE |
| tasks/CC-WEEKLY-HARVEST.md | DONE |
| tasks/CX-012-command-plaque.md | DONE |
| tasks/AG-WEEKLY-SCHEMAS.md | DONE |
| tasks/WM-WEEKLY-PULSE-ORCHESTRATION.md | DONE (this file) |

## Commands Wired

```
just weekly-harvest          # Claude Code's harvest script
just harvest-dry-run         # Dry-run harvest
just weekly-analyze          # Claude Code's analysis script
just weekly-analyze-dry      # Dry-run analysis
just weekly-pulse            # Full harvest + analyze
just weekly-pulse-dry        # Full dry-run
just validate-schemas        # AJV validate harvest output
just validate-social         # AJV validate social post
just validate-weekly-pulse   # Antigravity's validation script
just build-hud               # Check Codex HUD component exists
just weekly-pulse-spec       # Create/verify task specs
just weekly-pulse-report     # Write report artifact
just guard-clean             # Working tree clean check (exit 1 on dirty)
just guard-up-to-date        # Origin sync check (exit 1 if behind)
just release-stage-allowed   # Stage only Windsurf-owned paths
just mvp-verify              # Full truth ritual (10 gates + agentic + build)
```

## Schema Path Contract

All schema files live at `artifacts/contracts/`. Verified in:
- justfile `validate-schemas` (line 650-651)
- justfile `validate-social` (line 658-659)
- justfile `weekly-pulse-spec` (line 690)
- cycle-check.mjs `weekly-report` (lines 522-523)
- AGENT_ASSIGNMENTS.md (lines 15, 269-270)
- HANDOFF_ANTIGRAVITY_AG011.md (lines 40, 89)
- OPERATOR_BRIEF.md (lines 340, 355)
- tasks/AG-WEEKLY-SCHEMAS.md (line 3)

## Verify

```bash
just cycle-gate build        # L1 gate must pass
just mvp-verify              # Full truth ritual
just --list | grep weekly    # All weekly commands appear
just weekly-pulse-report     # Report shows missing files honestly
```

## Done When

- All 16 commands above appear in `just --list`
- `just mvp-verify` passes (10/10 + 6/6 + build)
- Task specs exist for all 4 agents
- Schema paths aligned to `artifacts/contracts/` everywhere
