# 🦅 ANTIGRAVITY INSTRUCTION — Task AG-011: Schema Enforcement

> **Copy-paste this entire file to Antigravity.**

---

## IDENTITY

```
AGENT: Antigravity (QA & Truth Keeper)
PROTOCOL: Lean v3
MISSION: "The Pulse & The Plaque" — Verify the Truth Before We Render
TASK: AG-011 — Schema Enforcement for Weekly Pulse Pipeline
```

## STEP 0 — ORIENT (mandatory)

```bash
just cycle-next-for antigravity   # 50 tokens — tells you if gates are clear
just cycle-orient antigravity     # 200 tokens — full briefing if needed
```

Your gates: `contracts`, `golden_path`, `social_dry`, `motion_test`
If any are FAILING, investigate and fix FIRST.
If ALL PASS, proceed to Task AG-011.

Read your skill file: `.agent/skills/ANTIGRAVITY_AGENT.md`

---

## TASK AG-011: Schema Enforcement for Weekly Pulse

### Goal
Create JSON schemas that validate the outputs of the Weekly Pulse pipeline
(CC-011 harvest + CC-012 analysis). Guard the pipeline so fake or empty data
cannot pass through to rendering.

### Step 1 — Create the harvest schema

Create: `artifacts/contracts/weekly-harvest.schema.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Weekly Harvest Output",
  "description": "Output of scripts/harvest-week.mjs",
  "type": "object",
  "required": ["harvestDate", "source", "imageCount", "categories", "summary"],
  "properties": {
    "harvestDate": { "type": "string", "format": "date-time" },
    "source": { "type": "string", "enum": ["local", "api"] },
    "imageCount": { "type": "integer", "minimum": 0 },
    "categories": {
      "type": "object",
      "required": ["code_screenshots", "garden_photos", "ui_captures"],
      "properties": {
        "code_screenshots": { "type": "array", "items": { "$ref": "#/definitions/imageEntry" } },
        "garden_photos": { "type": "array", "items": { "$ref": "#/definitions/imageEntry" } },
        "ui_captures": { "type": "array", "items": { "$ref": "#/definitions/imageEntry" } }
      }
    },
    "summary": {
      "type": "object",
      "required": ["code_screenshots", "garden_photos", "ui_captures"],
      "properties": {
        "code_screenshots": { "type": "integer", "minimum": 0 },
        "garden_photos": { "type": "integer", "minimum": 0 },
        "ui_captures": { "type": "integer", "minimum": 0 }
      }
    }
  },
  "definitions": {
    "imageEntry": {
      "type": "object",
      "required": ["path", "filename", "size"],
      "properties": {
        "path": { "type": "string" },
        "filename": { "type": "string" },
        "size": { "type": "integer", "minimum": 0 },
        "created": { "type": "string" }
      }
    }
  }
}
```

### Step 2 — Create the analysis schema

Create: `artifacts/contracts/weekly-pulse-analysis.schema.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Weekly Pulse Analysis Output",
  "description": "Output of scripts/weekly-analyze.mjs",
  "type": "object",
  "required": ["analysisDate", "moodGraph", "topThemes", "imageCount"],
  "properties": {
    "analysisDate": { "type": "string", "format": "date-time" },
    "moodGraph": {
      "type": "object",
      "required": ["technical_pct", "organic_pct", "dominant_mood"],
      "properties": {
        "technical_pct": { "type": "number", "minimum": 0, "maximum": 100 },
        "organic_pct": { "type": "number", "minimum": 0, "maximum": 100 },
        "dominant_mood": { "type": "string", "enum": ["technical", "organic", "balanced"] },
        "confidence": { "type": "number", "minimum": 0, "maximum": 1 }
      }
    },
    "topThemes": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 1,
      "maxItems": 10
    },
    "imageCount": { "type": "integer", "minimum": 0 },
    "recommendation": { "type": "string" }
  }
}
```

### Step 3 — Create the validation script

Create: `scripts/validate-weekly-pulse.mjs`

```javascript
#!/usr/bin/env node
/**
 * validate-weekly-pulse.mjs — Schema Enforcement for Weekly Pulse
 *
 * Validates:
 *   1. artifacts/data/current-week-raw.json against weekly-harvest.schema.json
 *   2. artifacts/data/weekly-pulse-analysis.json against weekly-pulse-analysis.schema.json
 *
 * Usage:
 *   node scripts/validate-weekly-pulse.mjs
 *
 * Exit codes:
 *   0 = All valid
 *   1 = Schema violation (data is fake, empty, or malformed)
 */
```

### Requirements:
1. **Use `ajv`** (already in npm ecosystem) or simple manual validation if ajv not available
2. **Check for fake data:**
   - `imageCount` must match actual array lengths in `categories`
   - `technical_pct + organic_pct` must equal ~100 (±2 for rounding)
   - `moodGraph` must not be all zeros
   - `topThemes` must not be empty
3. **No Fake Success** — If validation fails, exit code 1 with clear error message
4. **Output** — Print validation results to console, write summary to `artifacts/data/weekly-pulse-validation.json`

### Step 4 — Verify the existing pipeline still works

```bash
just agentic-test             # Cloud, read-only — verify no regressions
just cycle-gate contracts     # Your L2 gate
just cycle-gate golden_path   # Your L2 gate
just cycle-gate social_dry    # Your L4 gate
just cycle-gate motion_test   # Your L4 gate
```

### Step 5 — Run the full X/Twitter verification

```bash
just agentic-test-x           # Live tweet — verify No Fake Success still holds
```

⚠️ This posts a real tweet. Only run if Scott has approved live testing.

---

## JUSTFILE COMMAND (coordinate with Windsurf)

This command doesn't exist yet. Ask Windsurf to add:

```
# In justfile — under TESTING section
validate-weekly-pulse:
    @echo "🦅 Validating Weekly Pulse schemas..."
    node scripts/validate-weekly-pulse.mjs
```

⚠️ The original instructions said `just validate-schemas` — that command does NOT exist.
The correct existing commands are:
- `just validate-contracts` — Social media contracts
- `just validate-all` — All API contracts
- `just validate-all-live` — Live server validation

---

## FILES YOU MAY CREATE/EDIT

```
artifacts/contracts/weekly-harvest.schema.json        ← CREATE
artifacts/contracts/weekly-pulse-analysis.schema.json  ← CREATE
scripts/validate-weekly-pulse.mjs                      ← CREATE
artifacts/data/weekly-pulse-validation.json            ← OUTPUT
```

## FILES YOU MUST NOT EDIT

```
netlify/functions/*          ← Claude Code owns backend
src/components/*             ← Codex owns UI
justfile                     ← Windsurf owns (coordinate for new commands)
agent-state.json             ← Cycle system writes this
```

## EXISTING COMMANDS YOU OWN (already in justfile)

```bash
just antigravity-suite       # Complete test suite (4 steps)
just validate-all            # All API contracts (dry)
just validate-all-live       # Live server validation
just validate-contracts      # Social media contracts only
just golden-path-full        # Full integration test
just golden-path-quick       # Quick smoke test
just agentic-test            # End-to-end cloud test
just agentic-test-x          # End-to-end + live tweet
just agentic-dry             # Shape validation only
just design-tokens           # Export design token JSON
just design-status           # Show design system info
just design-audit            # Check design artifacts
```

## ARCHIVE RULE

Do NOT delete or overwrite archived files in `C:\Users\Roberto002\My Drive\SirTRAV\`.
Only Scott decides what to keep or discard.
