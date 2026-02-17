# 🧭 OPERATOR BRIEF v2 — SirTrav A2A Studio
## For the Commons Good Programming & Engineering Team

**Date:** 2026-02-15 | **Gates:** 10/10 PASS | **Runtime:** Node v24 (Bun 1.3.9 on PATH)
**Last Proof:** tweetId `2023121795121897961` | Cost: $0.0012 | 12.6s end-to-end

---

## 🎯 Two Tracks (Parallel)

### Track 1: Ripple Effect
YouTube upload → auto-format → publish to X + LinkedIn (later IG/TikTok).

### Track 2: Pulse & Plaque
Weekly "Pulse" (harvest → analyze → mood graph) + Command HUD "Plaque" in UI.

---

## ✅ Definition of Done (Prototype)

| Check | Command | Current |
|-------|---------|---------|
| X Publish | `node scripts/test-x-publish.mjs --live` | ✅ tweetId: 2023121795121897961 |
| Agentic Harness | `just agentic-test-x` | ✅ 6/6 PASS |
| No Fake Success | Verified in harness | ✅ VERIFIED |
| YouTube Upload | `just youtube-dry` | 🔴 Needs YOUTUBE_REFRESH_TOKEN |
| Cross-Post | YouTube → X (≤280) + LinkedIn | 🔴 Needs CC-R2 |
| HUD Plaque | SystemStatusEmblem renders | 🔴 Needs CX-012 |
| Weekly Pulse | Harvest → Analyze → Mood Graph | 🔴 Needs CC-PULSE |
| Schema Enforcement | `just validate-schemas` | 🔴 Needs AG schemas |

---

## 👤 HUMAN-ONLY (Scott)

1. Set env vars in Netlify Dashboard (names only, never paste values in chat)
2. Trigger deploy after env changes
3. Approve merges to main
4. Merge `claude/trusting-hamilton` → main when ready

---

## 📌 AGENT INSTRUCTIONS (Copy-Paste Per Agent)

### ─────────────────────────────────────────
### 🌬️ WINDSURF MASTER — Orchestrator / Release Scribe
### ─────────────────────────────────────────

```
@Windsurf
ROLE: Orchestrator / Release Scribe
PROTOCOL: Lean v3 → run: just cycle-orient windsurf

MISSION: Wire the Weekly Pulse commands, enforce ownership boundaries,
and provide safe commit/push discipline. You do NOT create feature
scripts — you verify, report, and release.

SCOPE YOU OWN:
- justfile (command surface)
- netlify.toml, vite.config.js (build config)
- docs/** (documentation)
- tasks/** (task specs for other agents)
- artifacts/reports/** (verification reports)

SCOPE YOU DO NOT OWN:
- scripts/harvest-week.mjs (Claude Code)
- src/components/* (Codex)
- artifacts/contracts/* (Antigravity)
- netlify/functions/* (Claude Code)

─── TASK WM-PULSE-001: Create Task Specs ───

Run: just weekly-pulse-spec
This creates tasks/ files for Claude Code, Codex, and Antigravity.
Verify: ls tasks/

─── TASK WM-PULSE-002: Verify Full Loop ───

Run: just mvp-verify
This runs: cycle-brief + agentic-dry + build
All must pass green.

─── TASK WM-PULSE-003: Write Report ───

Run: just weekly-pulse-report
Output: artifacts/reports/weekly-pulse-report.json
Report shows which files exist and which are still missing.

─── TASK WM-PULSE-004: Clean Repo (from Windsurf's code review) ───

Fix these issues found in your own code review:
1. dist/index.html is tracked but in .gitignore:
   git rm --cached dist/index.html
2. nul file at repo root (Windows artifact):
   Remove-Item nul -ErrorAction SilentlyContinue
3. plansAGENT_ASSIGNMENTS.md (missing path separator):
   Remove-Item plansAGENT_ASSIGNMENTS.md -ErrorAction SilentlyContinue

─── SAFE COMMIT/PUSH (after all tasks done) ───

Step 1: just guard-clean         # Tree must be clean
Step 2: just guard-up-to-date    # Must be synced with origin
Step 3: just release-stage-allowed  # Stage ONLY owned files
Step 4: git commit -m "chore(windsurf): weekly pulse orchestration + task specs"
Step 5: git push (only after Scott approves)

⚠️ NEVER commit files owned by other agents.
⚠️ NEVER auto-scaffold scripts that other agents must create.

─── COMMANDS YOU OWN ───

just weekly-pulse-spec         # Create/verify task specs
just weekly-pulse-report       # Write report artifact
just guard-clean               # Check working tree is clean
just guard-up-to-date          # Check synced with origin
just release-stage-allowed     # Stage only your files
just mvp-verify                # Full truth ritual
just cycle-gate build          # Your gate
just --list                    # Verify commands appear
just skills                    # Show agent skill files

─── REPORT BACK WITH ───

□ just mvp-verify result (PASS/FAIL)
□ just weekly-pulse-spec result (specs created)
□ just weekly-pulse-report output (what's missing)
□ Repo cleanup done (dist/index.html, nul, plansAGENT_ASSIGNMENTS.md)
□ What blocked you
```

### ─────────────────────────────────────────
### 🛠️ CLAUDE CODE — Backend / Orchestrator
### ─────────────────────────────────────────

```
@Claude-Code
ROLE: Backend Architect / Orchestrator
PROTOCOL: Lean v3 → run: just cycle-orient claude-code

MISSION: Build the "Weekly Pulse" data pipeline and enable
"Ripple Effect" cross-posting. Use Node (Bun 1.3.9 also available).

SCOPE YOU OWN:
- netlify/functions/* (all backend functions)
- scripts/harvest-week.mjs (CREATE)
- scripts/weekly-analyze.mjs (CREATE)
- lib/ helpers for social formatting

SCOPE YOU DO NOT OWN:
- justfile (Windsurf owns — commands already wired for you)
- src/components/* (Codex owns)
- artifacts/contracts/* (Antigravity owns)

─── TASK CC-PULSE-001: Weekly Harvest Script ───

Read spec: tasks/CC-WEEKLY-HARVEST.md
Create: scripts/harvest-week.mjs

Requirements:
- Node ESM (Bun 1.3.9 also on PATH if preferred)
- --dry-run mode (print shape, no writes)
- --source <path> (custom directory)
- Default reads from data/weekly-photos/
- Writes: artifacts/data/current-week-raw.json
- Classify images: code_screenshots, garden_photos, ui_captures
- NO FAKE SUCCESS: empty source → exit 1

Test after creating:
  node scripts/harvest-week.mjs --dry-run
  just harvest-dry-run
  just weekly-harvest

─── TASK CC-PULSE-002: Weekly Analyze Script ───

Create: scripts/weekly-analyze.mjs

Requirements:
- Reads artifacts/data/current-week-raw.json
- Calls OpenRouter (OPENROUTER_API_KEY), NOT direct OpenAI
- --dry-run mode (mock analysis, no API call)
- Writes: artifacts/data/weekly-pulse-analysis.json
- Mood Graph: { technical_pct, organic_pct, dominant_mood }
- NO FAKE SUCCESS: missing input → exit 1

Test after creating:
  node scripts/weekly-analyze.mjs --dry-run
  just weekly-analyze-dry

─── TASK CC-R2: Cross-Post Formatter (Ripple Effect) ───

Create: netlify/functions/lib/social-formatters.ts

Given YouTube metadata (title, description, url):
- X format: ≤ 280 chars, link, #CommonsGood, 1-3 tags
- LinkedIn format: Professional paragraph + link
- Truncate intelligently (don't break links)

─── TASK CC-R3: Healthcheck Semantics ───

Already done on main. Verify:
- MVP platforms (X+YouTube) → "ok" when configured
- Missing TikTok/Instagram/LinkedIn → "disabled" not "degraded"

─── YOUR COMMANDS (already in justfile) ───

just cycle-next-for claude-code    # What to do now (50 tokens)
just cycle-orient claude-code      # Full briefing (200 tokens)
just cycle-gate healthcheck        # Your L1 gate
just cycle-gate no_fake_success    # Your L1 gate
just cycle-gate wiring             # Your L2 gate
just weekly-harvest                # Run YOUR harvest script
just harvest-dry-run               # Dry-run YOUR harvest
just weekly-analyze                # Run YOUR analysis script
just weekly-analyze-dry            # Dry-run YOUR analysis
just agentic-test                  # Cloud e2e test
just agentic-dry                   # Shape validation
just build                         # Verify build

─── REPORT BACK WITH ───

□ scripts/harvest-week.mjs created and working
□ scripts/weekly-analyze.mjs created and working
□ just harvest-dry-run output (shaped JSON)
□ just weekly-harvest output (artifact path)
□ Artifacts created with paths
□ What Antigravity should run to verify your work
□ What blocked you
```

### ─────────────────────────────────────────
### 🎨 CODEX — Frontend / The Plaque + Ripple UI
### ─────────────────────────────────────────

```
@Codex
ROLE: Frontend Architect
PROTOCOL: Lean v3 → run: just cycle-orient codex

MISSION: Build the "Command Plaque" HUD + Ripple Effect cross-post
controls. Truth mirror, not a button farm.

SCOPE YOU OWN:
- src/components/* (all UI files)
- src/App.jsx (main shell)
- src/remotion/compositions/** (video compositions)

SCOPE YOU DO NOT OWN:
- netlify/functions/* (Claude Code)
- justfile (Windsurf)
- artifacts/contracts/* (Antigravity)
- src/remotion/branding.ts (READ ONLY — import, don't modify)

─── TASK CX-PLAQUE: Command Plaque HUD ───

Read spec: tasks/CX-012-command-plaque.md
Create: src/components/SystemStatusEmblem.tsx

Data source: GET /.netlify/functions/healthcheck

4-state truth badges:
- OK: configured + working → Green
- DEGRADED: partial → Yellow + reason
- DISABLED: missing keys → Gray + "keys not configured"
- BLOCKED: gate failing → Red + gate name

Heraldic quadrants:
- Lion (Gold) → Hardware/storage status
- Shield (Azure) → Network/API status
- Cross (Silver) → Build/deploy status
- Phoenix (Ember) → AI pipeline mode

Brand: import { THEME } from '../remotion/branding'
Never hardcode colors. Never display secrets.

Wire into src/App.jsx in the header.

─── TASK CX-RIPPLE: Cross-Platform Toggle ───

Add to pipeline start flow:
- Primary: "Upload to YouTube" button
- Toggles: "Also post to X" / "Also post to LinkedIn"
- Disabled state: lock icon + "Keys not configured"
- Enabled state: green check + platform icon

─── TASK CX-RESULTS: Results Panel ───

Show per-platform results:
- YouTube URL (clickable)
- X post URL (clickable)
- LinkedIn status
- Cost breakdown

─── YOUR COMMANDS (already in justfile) ───

just cycle-next-for codex          # What to do now (50 tokens)
just cycle-orient codex            # Full briefing (200 tokens)
just cycle-gate design_tokens      # Your L3 gate
just build-hud                     # Verify HUD task/component exist
just build                         # Build must pass
npm run dev                        # Visual check

─── REPORT BACK WITH ───

□ src/components/SystemStatusEmblem.tsx created
□ Component renders with all 4 badge states
□ Missing keys → "disabled" not fake "ok"
□ just cycle-gate design_tokens passes
□ just build passes
□ What blocked you
```

### ─────────────────────────────────────────
### 🦅 ANTIGRAVITY — QA / Truth Keeper
### ─────────────────────────────────────────

```
@Antigravity
ROLE: QA & Truth Keeper
PROTOCOL: Lean v3 → run: just cycle-orient antigravity

MISSION: Prove what is TRUE. Build schemas that catch lies.
Validate every output. Block the pipeline on fake success.

SCOPE YOU OWN:
- artifacts/contracts/*.schema.json (CREATE)
- scripts/validate-*.mjs (validation scripts)
- scripts/test-*.mjs (test harnesses)
- scripts/verify-*.mjs (verification scripts)
- .github/workflows/* (CI)

SCOPE YOU DO NOT OWN:
- scripts/harvest-week.mjs (Claude Code)
- src/components/* (Codex)
- justfile (Windsurf)
- netlify/functions/* (Claude Code)

─── TASK AG-SCHEMA-001: Weekly Harvest Schema ───

Read spec: tasks/AG-WEEKLY-SCHEMAS.md
Create: artifacts/contracts/weekly-harvest.schema.json

Must require:
- harvestDate (date-time)
- source (enum: local|api)
- imageCount (integer, min 0)
- categories with 3 arrays of image entries
- summary matching category counts
- window.start, window.end (date-time)
- collectedAt (date-time)

Must block: empty arrays with non-zero imageCount (lie detection)

─── TASK AG-SCHEMA-002: Social Post Schema ───

Create: artifacts/contracts/social-post.schema.json

Must require:
- platform (enum: x|linkedin|youtube)
- text (string, X maxLength: 280)
- createdAt (date-time)
- url (optional, format: uri)

─── TASK AG-TRUTH-001: X Publish Truth Test ───

Run: node scripts/test-x-publish.mjs --live

PASS: success:true + real tweetId
FAIL: 401 → tell Scott to check Netlify env vars

─── TASK AG-TRUTH-002: Agentic Harness ───

Run: just agentic-test-x

Expected: 6/6 PASS with artifacts in artifacts/public/metrics/

─── TASK AG-TRUTH-003: Healthcheck Classification ───

Probe cloud healthcheck:
  node -e "fetch('https://sirtrav-a2a-studio.netlify.app/.netlify/functions/healthcheck').then(r=>r.json()).then(d=>console.log(JSON.stringify(d,null,2)))"

Confirm: degraded because TikTok/Instagram/LinkedIn missing.
Recommend: reclassify as "disabled" for MVP.

─── YOUR COMMANDS (already in justfile) ───

just cycle-next-for antigravity    # What to do now
just cycle-orient antigravity      # Full briefing
just cycle-gate contracts          # Your L2 gate
just cycle-gate golden_path        # Your L2 gate
just cycle-gate social_dry         # Your L4 gate
just cycle-gate motion_test        # Your L4 gate
just antigravity-suite             # Complete test suite
just validate-all                  # All API contracts
just validate-contracts            # Social media contracts
just validate-schemas              # Weekly pulse (after creating schema)
just validate-social               # Social post (after creating schema)
just agentic-test                  # Cloud e2e (no tweet)
just agentic-test-x               # Cloud e2e + live tweet
just agentic-dry                   # Shape validation

─── REPORT BACK WITH ───

□ artifacts/contracts/weekly-harvest.schema.json created
□ artifacts/contracts/social-post.schema.json created
□ X publish test result (PASS/FAIL + tweetId)
□ Agentic harness result (6/6 + artifact paths)
□ Healthcheck classification recommendation
□ What blocked you
```

---

## 🔁 THE ROUND LOOP (Every Agent, Every Session)

### Round Start
```bash
git pull origin main
just cycle-next-for <your-agent-name>    # 50 tokens
```

### Round End (Proof)
```bash
just cycle-gate <your-gate>              # Your gate passes
just build                                # Build passes
just mvp-verify                           # Full truth ritual
```

### Round Exit Criteria
| Check | Required |
|-------|----------|
| PASS/FAIL explicit | ✅ |
| If FAIL: single owner assigned | ✅ |
| Artifacts written | ✅ |
| Next command stated | ✅ |

---

## 🔄 WEEKLY PULSE EXECUTION SEQUENCE

```
1. Windsurf:    just weekly-pulse-spec        # Create task specs
2. Claude Code: just weekly-harvest           # Harvest signals
3. Antigravity: just validate-schemas         # Validate output
4. Codex:       just build-hud                # Verify HUD exists
5. Windsurf:    just mvp-verify               # Full truth ritual
6. Windsurf:    just weekly-pulse-report       # Write report
```

---

## 📊 LATEST PROOF (2026-02-15)

| Test | Result | Duration | Proof |
|------|--------|----------|-------|
| Cycle Gates | **10/10 PASS** | <1s | agent-state.json |
| Agentic Cloud + X | **6/6 PASS** | 12.6s | tweetId: 2023121795121897961 |
| No Fake Success | **VERIFIED** | — | noFakeSuccess: true |
| Cloud Healthcheck | degraded v2.1.0 | 127ms | 2/5 social platforms |
| Golden Path | **VERIFIED** | ~15s | Pipeline queued + SSE |
| OAuth Keys | **@Sechols002 authenticated** | 1.2s | User ID: 3196650180 |

**Next Round First Command:**
```bash
just cycle-next-for <agent>
```
