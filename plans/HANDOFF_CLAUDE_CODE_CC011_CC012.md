# 🧠 CLAUDE CODE INSTRUCTION — Tasks CC-011 + CC-012: Weekly Pulse Engine

> **Copy-paste this entire file to Claude Code.**

---

## IDENTITY

```
AGENT: Claude Code (Backend Architect)
PROTOCOL: Lean v3
MISSION: "The Pulse & The Plaque" — Activate the Weekly Pulse Neural Engine
TASKS: CC-011 (Weekly Harvest) + CC-012 (Signal Analysis)
```

## STEP 0 — ORIENT (mandatory)

```bash
just cycle-next-for claude-code   # 50 tokens — tells you if gates are clear
just cycle-orient claude-code     # 200 tokens — full briefing if needed
```

If any of YOUR gates (healthcheck, no_fake_success, wiring) are FAILING, fix them FIRST.
If ALL PASS, proceed to Task CC-011.

Read your skill file: `.agent/skills/CLAUDE_CODE_AGENT.md`

---

## TASK CC-011: The Weekly Harvest

### Goal
Create a script that ingests a folder of images (from local path or Google Photos API)
and outputs a structured JSON manifest of the week's visual content.

### Step 1 — Create the harvest script

Create: `scripts/harvest-week.mjs`

```javascript
#!/usr/bin/env node
/**
 * harvest-week.mjs — Weekly Photo Harvest
 *
 * Reads images from a source directory (or Google Photos API if configured)
 * and produces artifacts/data/current-week-raw.json
 *
 * Usage:
 *   node scripts/harvest-week.mjs                    # Use default path
 *   node scripts/harvest-week.mjs --source ~/Photos  # Custom source
 *   node scripts/harvest-week.mjs --api              # Use Google Photos API
 */
```

### Requirements:
1. **Input sources** (priority order):
   - `--api` flag → Use Google Photos API (requires `GOOGLE_PHOTOS_API_KEY` env var)
   - `--source <path>` flag → Read from local directory
   - Default → Read from `data/weekly-photos/` directory

2. **Image classification** — Separate images into categories:
   - `code_screenshots` — Images with code, terminals, IDEs (detect by filename patterns: `*screenshot*`, `*code*`, `*terminal*`, `*vscode*`)
   - `garden_photos` — Nature, outdoor, organic content (everything else)
   - `ui_captures` — Browser screenshots, app UIs

3. **Output** — Write to `artifacts/data/current-week-raw.json`:
   ```json
   {
     "harvestDate": "2026-02-14T00:00:00Z",
     "source": "local|api",
     "imageCount": 42,
     "categories": {
       "code_screenshots": [
         { "path": "...", "filename": "...", "size": 1234, "created": "..." }
       ],
       "garden_photos": [...],
       "ui_captures": [...]
     },
     "summary": {
       "code_screenshots": 15,
       "garden_photos": 20,
       "ui_captures": 7
     }
   }
   ```

4. **No Fake Success** — If no images found or source is empty:
   ```json
   { "success": false, "error": "No images found in source", "source": "..." }
   ```

5. **runId threading** — Accept `--runId` flag for enterprise tracing.

### Step 2 — Create the data directory

```bash
mkdir -p data/weekly-photos
mkdir -p artifacts/data
```

### Step 3 — Verify

```bash
node scripts/harvest-week.mjs --source data/weekly-photos
# Should produce: artifacts/data/current-week-raw.json
# With empty source, should return { success: false } — NOT fake success
```

---

## TASK CC-012: The Signal Analysis

### Goal
Read the harvest output and use OpenRouter (NOT OpenAI directly) to analyze
the visual content and generate a "Mood Graph" — Technical vs. Organic balance.

### Step 1 — Create the analysis script

Create: `scripts/weekly-analyze.mjs`

```javascript
#!/usr/bin/env node
/**
 * weekly-analyze.mjs — Weekly Signal Analysis
 *
 * Reads artifacts/data/current-week-raw.json
 * Sends image summaries to OpenRouter Vision API
 * Produces artifacts/data/weekly-pulse-analysis.json
 *
 * Usage:
 *   node scripts/weekly-analyze.mjs
 *   node scripts/weekly-analyze.mjs --dry-run   # Skip API call, use mock
 */
```

### Requirements:
1. **Read** `artifacts/data/current-week-raw.json` (output of CC-011)
2. **If `--dry-run`**, generate mock analysis without API call
3. **If live**, call OpenRouter API (env var: `OPENROUTER_API_KEY`):
   - Model: `openai/gpt-4o` (via OpenRouter)
   - Prompt: "Analyze these image categories. Return a Mood Graph showing Technical vs. Organic balance as a percentage. Include: dominant_mood, technical_pct, organic_pct, top_themes[]"
4. **Output** to `artifacts/data/weekly-pulse-analysis.json`:
   ```json
   {
     "analysisDate": "2026-02-14T00:00:00Z",
     "moodGraph": {
       "technical_pct": 65,
       "organic_pct": 35,
       "dominant_mood": "technical",
       "confidence": 0.82
     },
     "topThemes": ["coding", "debugging", "garden", "architecture"],
     "imageCount": 42,
     "recommendation": "Balance with more outdoor content this week"
   }
   ```
5. **No Fake Success** — If harvest file missing or empty, return `{ success: false }`
6. **Cost tracking** — Log token usage and cost to console (Commons Good 20% markup)

### Step 2 — Verify

```bash
node scripts/weekly-analyze.mjs --dry-run
# Should produce: artifacts/data/weekly-pulse-analysis.json with mock data
```

---

## JUSTFILE COMMANDS (ask Windsurf to add, or add yourself)

These commands DON'T exist yet. Create them or coordinate with Windsurf:

```
# In justfile — under a new section "🧠 WEEKLY PULSE"

weekly-harvest:
    @echo "📸 Running Weekly Photo Harvest..."
    node scripts/harvest-week.mjs

weekly-harvest-api:
    @echo "📸 Running Weekly Harvest (Google Photos API)..."
    node scripts/harvest-week.mjs --api

weekly-analyze:
    @echo "🧠 Running Weekly Signal Analysis..."
    node scripts/weekly-analyze.mjs

weekly-analyze-dry:
    @echo "🧠 Running Weekly Analysis (dry-run)..."
    node scripts/weekly-analyze.mjs --dry-run

weekly-pulse:
    @echo "🔄 Running Full Weekly Pulse (Harvest + Analyze)..."
    @just weekly-harvest
    @just weekly-analyze
```

⚠️ **IMPORTANT:** If you add these to the justfile yourself, you are crossing into Windsurf's territory. Best practice: create the scripts, then ask Windsurf to wire the justfile commands.

---

## FILES YOU MAY EDIT/CREATE

```
scripts/harvest-week.mjs              ← CREATE
scripts/weekly-analyze.mjs            ← CREATE
artifacts/data/current-week-raw.json  ← OUTPUT (generated)
artifacts/data/weekly-pulse-analysis.json ← OUTPUT (generated)
```

## FILES YOU MUST NOT EDIT

```
src/components/*                 ← Codex owns UI
justfile                         ← Windsurf owns (coordinate for new commands)
src/remotion/*                   ← Don't touch compositions
```

## KEY PATTERNS (from CLAUDE.md)

1. **Use OpenRouter** (env: `OPENROUTER_API_KEY`), NOT direct OpenAI
2. **No Fake Success** — If source is empty, say so honestly
3. **runId threading** — Accept `--runId` for tracing
4. **Commons Good cost tracking** — Log cost + 20% markup

## ARCHIVE RULE

Do NOT delete or overwrite:
- `C:\Users\Roberto002\My Drive\SirTRAV\*`
- `artifacts/claude/token-budget.json`
- `agent-state.json`
