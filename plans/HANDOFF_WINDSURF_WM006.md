# 🛰️ WINDSURF MASTER INSTRUCTION — Task WM-006: Wire Pulse & Plaque Commands

> **Copy-paste this entire file to Windsurf Master.**

---

## IDENTITY

```
AGENT: Windsurf Master (Infrastructure)
PROTOCOL: Lean v3
MISSION: "The Pulse & The Plaque" — Wire justfile commands for new capabilities
TASK: WM-006 — Add Weekly Pulse + Validation commands to justfile
```

## STEP 0 — ORIENT (mandatory)

```bash
just cycle-next-for windsurf      # 50 tokens — tells you if gates are clear
just cycle-orient windsurf        # 200 tokens — full briefing if needed
```

Your gate: `build` (L1)
If FAILING, fix the build FIRST. If PASS, proceed.

Read your skill file: `.agent/skills/WINDSURF_MASTER_AGENT.md`

---

## TASK WM-006: Add New justfile Sections

Add these sections to the justfile. Place them AFTER the existing "AGENTIC" section (line ~255) and BEFORE the "QUICK REFERENCE" section (line ~261).

### Section 1: Weekly Pulse Commands

```just
# ============================================
# 🧠 WEEKLY PULSE (Intelligence Layer)
# ============================================

# Harvest photos from local directory
weekly-harvest:
    @echo "📸 Running Weekly Photo Harvest..."
    node scripts/harvest-week.mjs

# Harvest photos from Google Photos API
weekly-harvest-api:
    @echo "📸 Running Weekly Harvest (Google Photos API)..."
    node scripts/harvest-week.mjs --api

# Analyze harvested photos (calls OpenRouter)
weekly-analyze:
    @echo "🧠 Running Weekly Signal Analysis..."
    node scripts/weekly-analyze.mjs

# Analyze harvested photos (dry-run, no API call)
weekly-analyze-dry:
    @echo "🧠 Running Weekly Analysis (dry-run)..."
    node scripts/weekly-analyze.mjs --dry-run

# Full Weekly Pulse pipeline (harvest + analyze)
weekly-pulse:
    @echo "🔄 Running Full Weekly Pulse (Harvest + Analyze)..."
    @just weekly-harvest
    @just weekly-analyze

# Full Weekly Pulse pipeline (dry-run)
weekly-pulse-dry:
    @echo "🔄 Running Full Weekly Pulse (dry-run)..."
    @just weekly-harvest
    @just weekly-analyze-dry
```

### Section 2: Schema Validation Commands

```just
# Validate Weekly Pulse output schemas
validate-weekly-pulse:
    @echo "🦅 Validating Weekly Pulse schemas..."
    node scripts/validate-weekly-pulse.mjs
```

### Section 3: Update the Help Command

Add these lines to the existing `help` recipe, under the "Testing:" section:

```
    @echo "Weekly Pulse:"
    @echo "  just weekly-pulse     - Full harvest + analysis"
    @echo "  just weekly-pulse-dry - Dry-run (no API calls)"
    @echo ""
```

---

## VERIFY

```bash
just cycle-gate build        # Your gate must still pass
just --list                  # Verify new commands appear
```

---

## ARCHIVE RULE

Do NOT delete existing justfile recipes without archiving them first.
Archive location: `C:\Users\Roberto002\My Drive\SirTRAV\`
Only Scott decides what to keep or discard.

## FILES YOU MAY EDIT

```
justfile                             ← ADD new sections
docs/COMMONS_AGENT_JUSTFILE_FLOW.md  ← UPDATE with new commands
```

## FILES YOU MUST NOT EDIT

```
scripts/*                    ← Other agents create the scripts
netlify/functions/*          ← Claude Code owns
src/components/*             ← Codex owns
```
