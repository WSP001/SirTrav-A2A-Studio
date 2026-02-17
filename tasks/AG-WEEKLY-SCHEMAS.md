# AG-WEEKLY-SCHEMAS — Schema Enforcement Mission

> **Agent:** Antigravity (Test Ops + Design)
> **Tickets:** AG-011 + AG-012
> **Sprint:** The Pulse & The Plaque
> **Status:** ✅ DONE (2026-02-17)

---

## 🎯 Mission Objective

Create and enforce JSON Schema contracts for the Weekly Pulse pipeline outputs,
and build integration tests for the Click2Kick issue-intake flow.

## 📋 Truth Ritual

Before starting, verify:

```bash
just orient-antigravity            # Read your gates
just cycle-gate contracts          # L2: API Contracts Match Schemas
just validate-schemas              # Existing schemas valid
```

---

## 📦 Deliverables

### AG-011: Schema Enforcement

| # | Deliverable | File | Status |
|---|-------------|------|--------|
| 1 | Weekly Harvest Schema | `artifacts/contracts/weekly-harvest.schema.json` | ✅ DONE |
| 2 | Weekly Pulse Analysis Schema | `artifacts/contracts/weekly-pulse-analysis.schema.json` | ✅ DONE |
| 3 | Validation Script | `scripts/validate-weekly-pulse.mjs` | ✅ DONE |

**Weekly Harvest Schema** defines the output contract for `scripts/harvest-week.mjs`:
- Harvest ID pattern: `harvest-YYYY-WNN`
- Items array with mood, classification, location, tags, confidence
- 8 moods: joyful, adventurous, contemplative, energetic, serene, dramatic, playful, inspiring
- 9 classifications: travel, family, food, nature, urban, event, portrait, creative, other
- Cost manifest with Commons Good 20% markup tracking
- Self-validating example included

**Weekly Pulse Analysis Schema** defines the output contract for `scripts/weekly-analyze.mjs`:
- Analysis ID pattern: `pulse-YYYY-WNN`
- Mood graph with distribution, dominant mood, trend direction
- AI insights: summary, up to 5 recommendations, top 3 performers
- Content calendar with suggested posts per day/platform
- Model + token usage tracking
- Self-validating example included

**Validation Script** (`validate-weekly-pulse.mjs`):
- Zero-dependency JSON Schema validator
- Validates both schemas' examples against themselves (self-test)
- Regression checks existing social-post + job-costing schemas
- Supports `--dry-run`, `--harvest <file>`, `--analysis <file>` flags
- Exits 1 on failure (No Fake Success)

### AG-012: Click2Kick Integration Test

| # | Deliverable | File | Status |
|---|-------------|------|--------|
| 1 | Issue Intake Test | `scripts/test-issue-intake.mjs` | ✅ DONE |

**Integration Test** (`test-issue-intake.mjs`):
- 5 test cases covering success + failure scenarios
- Domain mapping validation (storage→Lion, network→Shield, build→Cross, pipeline→Phoenix)
- Supports `--dry-run` (default) and `--live --url <base-url>` modes
- Validates response contract shapes
- Click2Kick round-trip chain documented and tested

---

## ✅ Verification Commands

```bash
# AG-011: Schema validation
node scripts/validate-weekly-pulse.mjs --dry-run

# AG-012: Issue intake test
node scripts/test-issue-intake.mjs

# Full gate check
just cycle-gate contracts
just validate-schemas
just mvp-verify
```

## 📁 File Boundaries

### Antigravity OWNS (create/edit):
- `artifacts/contracts/weekly-harvest.schema.json`
- `artifacts/contracts/weekly-pulse-analysis.schema.json`
- `scripts/validate-weekly-pulse.mjs`
- `scripts/test-issue-intake.mjs`
- `tasks/AG-WEEKLY-SCHEMAS.md` (this file)

### Antigravity does NOT edit:
- `netlify/functions/*` (Claude Code)
- `src/components/*` (Codex)
- `scripts/harvest-week.mjs` (Claude Code — writes to harvest schema)
- `scripts/weekly-analyze.mjs` (Claude Code — writes to analysis schema)

---

## 🏆 Mission Success Criteria

- [ ] `node scripts/validate-weekly-pulse.mjs --dry-run` exits 0
- [ ] `node scripts/test-issue-intake.mjs` exits 0
- [ ] `just cycle-gate contracts` shows ✅
- [ ] `just validate-schemas` shows ✅
- [ ] `npm run build` passes
- [ ] All schemas in `artifacts/contracts/` are valid JSON with examples
