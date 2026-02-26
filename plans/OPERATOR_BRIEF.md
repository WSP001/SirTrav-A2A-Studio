# ≡ƒº¡ OPERATOR BRIEF v2 ΓÇö SirTrav A2A Studio
## For the Commons Good Programming & Engineering Team

**Date:** 2026-02-15 | **Gates:** 10/10 PASS | **Runtime:** Node v24 (Bun 1.3.9 on PATH)
**Last Proof:** tweetId `2023121795121897961` | Cost: $0.0012 | 12.6s end-to-end

---

## ≡ƒÄ» Two Tracks (Parallel)

### Track 1: Ripple Effect
YouTube upload ΓåÆ auto-format ΓåÆ publish to X + LinkedIn (later IG/TikTok).

### Track 2: Pulse & Plaque
Weekly "Pulse" (harvest ΓåÆ analyze ΓåÆ mood graph) + Command HUD "Plaque" in UI.

---

## Γ£à Definition of Done (Prototype)

| Check | Command | Current |
|-------|---------|---------|
| X Publish | `node scripts/test-x-publish.mjs --live` | Γ£à tweetId: 2023121795121897961 |
| Agentic Harness | `just agentic-test-x` | Γ£à 6/6 PASS |
| No Fake Success | Verified in harness | Γ£à VERIFIED |
| YouTube Upload | `just youtube-dry` | ≡ƒö┤ Needs YOUTUBE_REFRESH_TOKEN |
| Cross-Post | YouTube ΓåÆ X (Γëñ280) + LinkedIn | ≡ƒö┤ Needs CC-R2 |
| HUD Plaque | SystemStatusEmblem renders | ≡ƒö┤ Needs CX-012 |
| Weekly Pulse | Harvest ΓåÆ Analyze ΓåÆ Mood Graph | ≡ƒö┤ Needs CC-PULSE |
| Schema Enforcement | `just validate-schemas` | ≡ƒö┤ Needs AG schemas |

---

## ≡ƒæñ HUMAN-ONLY (Scott)

1. Set env vars in Netlify Dashboard (names only, never paste values in chat)
2. Trigger deploy after env changes
3. Approve merges to main
4. Merge `claude/trusting-hamilton` ΓåÆ main when ready

---

## ≡ƒôî AGENT INSTRUCTIONS (Copy-Paste Per Agent)

### ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
### ≡ƒî¼∩╕Å WINDSURF MASTER ΓÇö Orchestrator / Release Scribe
### ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

```
@Windsurf
ROLE: Orchestrator / Release Scribe
PROTOCOL: Lean v3 ΓåÆ run: just cycle-orient windsurf

MISSION: Wire the Weekly Pulse commands, enforce ownership boundaries,
and provide safe commit/push discipline. You do NOT create feature
scripts ΓÇö you verify, report, and release.

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

ΓöÇΓöÇΓöÇ TASK WM-PULSE-001: Create Task Specs ΓöÇΓöÇΓöÇ

Run: just weekly-pulse-spec
This creates tasks/ files for Claude Code, Codex, and Antigravity.
Verify: ls tasks/

ΓöÇΓöÇΓöÇ TASK WM-PULSE-002: Verify Full Loop ΓöÇΓöÇΓöÇ

Run: just mvp-verify
This runs: cycle-brief + agentic-dry + build
All must pass green.

ΓöÇΓöÇΓöÇ TASK WM-PULSE-003: Write Report ΓöÇΓöÇΓöÇ

Run: just weekly-pulse-report
Output: artifacts/reports/weekly-pulse-report.json
Report shows which files exist and which are still missing.

ΓöÇΓöÇΓöÇ TASK WM-PULSE-004: Clean Repo (from Windsurf's code review) ΓöÇΓöÇΓöÇ

Fix these issues found in your own code review:
1. dist/index.html is tracked but in .gitignore:
   git rm --cached dist/index.html
2. nul file at repo root (Windows artifact):
   Remove-Item nul -ErrorAction SilentlyContinue
3. plansAGENT_ASSIGNMENTS.md (missing path separator):
   Remove-Item plansAGENT_ASSIGNMENTS.md -ErrorAction SilentlyContinue

ΓöÇΓöÇΓöÇ SAFE COMMIT/PUSH (after all tasks done) ΓöÇΓöÇΓöÇ

Step 1: just guard-clean         # Tree must be clean
Step 2: just guard-up-to-date    # Must be synced with origin
Step 3: just release-stage-allowed  # Stage ONLY owned files
Step 4: git commit -m "chore(windsurf): weekly pulse orchestration + task specs"
Step 5: git push (only after Scott approves)

ΓÜá∩╕Å NEVER commit files owned by other agents.
ΓÜá∩╕Å NEVER auto-scaffold scripts that other agents must create.

ΓöÇΓöÇΓöÇ COMMANDS YOU OWN ΓöÇΓöÇΓöÇ

just weekly-pulse-spec         # Create/verify task specs
just weekly-pulse-report       # Write report artifact
just guard-clean               # Check working tree is clean
just guard-up-to-date          # Check synced with origin
just release-stage-allowed     # Stage only your files
just mvp-verify                # Full truth ritual
just cycle-gate build          # Your gate
just --list                    # Verify commands appear
just skills                    # Show agent skill files

ΓöÇΓöÇΓöÇ REPORT BACK WITH ΓöÇΓöÇΓöÇ

Γûí just mvp-verify result (PASS/FAIL)
Γûí just weekly-pulse-spec result (specs created)
Γûí just weekly-pulse-report output (what's missing)
Γûí Repo cleanup done (dist/index.html, nul, plansAGENT_ASSIGNMENTS.md)
Γûí What blocked you
```

### ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
### ≡ƒ¢á∩╕Å CLAUDE CODE ΓÇö Backend / Orchestrator
### ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

```
@Claude-Code
ROLE: Backend Architect / Orchestrator
PROTOCOL: Lean v3 ΓåÆ run: just cycle-orient claude-code

MISSION: Build the "Weekly Pulse" data pipeline and enable
"Ripple Effect" cross-posting. Use Node (Bun 1.3.9 also available).

SCOPE YOU OWN:
- netlify/functions/* (all backend functions)
- scripts/harvest-week.mjs (CREATE)
- scripts/weekly-analyze.mjs (CREATE)
- lib/ helpers for social formatting

SCOPE YOU DO NOT OWN:
- justfile (Windsurf owns ΓÇö commands already wired for you)
- src/components/* (Codex owns)
- artifacts/contracts/* (Antigravity owns)

ΓöÇΓöÇΓöÇ TASK CC-PULSE-001: Weekly Harvest Script ΓöÇΓöÇΓöÇ

Read spec: tasks/CC-WEEKLY-HARVEST.md
Create: scripts/harvest-week.mjs

Requirements:
- Node ESM (Bun 1.3.9 also on PATH if preferred)
- --dry-run mode (print shape, no writes)
- --source <path> (custom directory)
- Default reads from data/weekly-photos/
- Writes: artifacts/data/current-week-raw.json
- Classify images: code_screenshots, garden_photos, ui_captures
- NO FAKE SUCCESS: empty source ΓåÆ exit 1

Test after creating:
  node scripts/harvest-week.mjs --dry-run
  just harvest-dry-run
  just weekly-harvest

ΓöÇΓöÇΓöÇ TASK CC-PULSE-002: Weekly Analyze Script ΓöÇΓöÇΓöÇ

Create: scripts/weekly-analyze.mjs

Requirements:
- Reads artifacts/data/current-week-raw.json
- Calls OpenRouter (OPENROUTER_API_KEY), NOT direct OpenAI
- --dry-run mode (mock analysis, no API call)
- Writes: artifacts/data/weekly-pulse-analysis.json
- Mood Graph: { technical_pct, organic_pct, dominant_mood }
- NO FAKE SUCCESS: missing input ΓåÆ exit 1

Test after creating:
  node scripts/weekly-analyze.mjs --dry-run
  just weekly-analyze-dry

ΓöÇΓöÇΓöÇ TASK CC-R2: Cross-Post Formatter (Ripple Effect) ΓöÇΓöÇΓöÇ

Create: netlify/functions/lib/social-formatters.ts

Given YouTube metadata (title, description, url):
- X format: Γëñ 280 chars, link, #CommonsGood, 1-3 tags
- LinkedIn format: Professional paragraph + link
- Truncate intelligently (don't break links)

ΓöÇΓöÇΓöÇ TASK CC-R3: Healthcheck Semantics ΓöÇΓöÇΓöÇ

Already done on main. Verify:
- MVP platforms (X+YouTube) ΓåÆ "ok" when configured
- Missing TikTok/Instagram/LinkedIn ΓåÆ "disabled" not "degraded"

ΓöÇΓöÇΓöÇ YOUR COMMANDS (already in justfile) ΓöÇΓöÇΓöÇ

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

ΓöÇΓöÇΓöÇ REPORT BACK WITH ΓöÇΓöÇΓöÇ

Γûí scripts/harvest-week.mjs created and working
Γûí scripts/weekly-analyze.mjs created and working
Γûí just harvest-dry-run output (shaped JSON)
Γûí just weekly-harvest output (artifact path)
Γûí Artifacts created with paths
Γûí What Antigravity should run to verify your work
Γûí What blocked you
```

### ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
### ≡ƒÄ¿ CODEX ΓÇö Frontend / The Plaque + Ripple UI
### ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

```
@Codex
ROLE: Frontend Architect
PROTOCOL: Lean v3 ΓåÆ run: just cycle-orient codex

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
- src/remotion/branding.ts (READ ONLY ΓÇö import, don't modify)

ΓöÇΓöÇΓöÇ TASK CX-PLAQUE: Command Plaque HUD ΓöÇΓöÇΓöÇ

Read spec: tasks/CX-012-command-plaque.md
Create: src/components/SystemStatusEmblem.tsx

Data source: GET /.netlify/functions/healthcheck

4-state truth badges:
- OK: configured + working ΓåÆ Green
- DEGRADED: partial ΓåÆ Yellow + reason
- DISABLED: missing keys ΓåÆ Gray + "keys not configured"
- BLOCKED: gate failing ΓåÆ Red + gate name

Heraldic quadrants:
- Lion (Gold) ΓåÆ Hardware/storage status
- Shield (Azure) ΓåÆ Network/API status
- Cross (Silver) ΓåÆ Build/deploy status
- Phoenix (Ember) ΓåÆ AI pipeline mode

Brand: import { THEME } from '../remotion/branding'
Never hardcode colors. Never display secrets.

Wire into src/App.jsx in the header.

ΓöÇΓöÇΓöÇ TASK CX-RIPPLE: Cross-Platform Toggle ΓöÇΓöÇΓöÇ

Add to pipeline start flow:
- Primary: "Upload to YouTube" button
- Toggles: "Also post to X" / "Also post to LinkedIn"
- Disabled state: lock icon + "Keys not configured"
- Enabled state: green check + platform icon

ΓöÇΓöÇΓöÇ TASK CX-RESULTS: Results Panel ΓöÇΓöÇΓöÇ

Show per-platform results:
- YouTube URL (clickable)
- X post URL (clickable)
- LinkedIn status
- Cost breakdown

ΓöÇΓöÇΓöÇ YOUR COMMANDS (already in justfile) ΓöÇΓöÇΓöÇ

just cycle-next-for codex          # What to do now (50 tokens)
just cycle-orient codex            # Full briefing (200 tokens)
just cycle-gate design_tokens      # Your L3 gate
just build-hud                     # Verify HUD task/component exist
just build                         # Build must pass
npm run dev                        # Visual check

ΓöÇΓöÇΓöÇ REPORT BACK WITH ΓöÇΓöÇΓöÇ

Γûí src/components/SystemStatusEmblem.tsx created
Γûí Component renders with all 4 badge states
Γûí Missing keys ΓåÆ "disabled" not fake "ok"
Γûí just cycle-gate design_tokens passes
Γûí just build passes
Γûí What blocked you
```

### ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
### ≡ƒªà ANTIGRAVITY ΓÇö QA / Truth Keeper
### ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

```
@Antigravity
ROLE: QA & Truth Keeper
PROTOCOL: Lean v3 ΓåÆ run: just cycle-orient antigravity

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

ΓöÇΓöÇΓöÇ TASK AG-SCHEMA-001: Weekly Harvest Schema ΓöÇΓöÇΓöÇ

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

ΓöÇΓöÇΓöÇ TASK AG-SCHEMA-002: Social Post Schema ΓöÇΓöÇΓöÇ

Create: artifacts/contracts/social-post.schema.json

Must require:
- platform (enum: x|linkedin|youtube)
- text (string, X maxLength: 280)
- createdAt (date-time)
- url (optional, format: uri)

ΓöÇΓöÇΓöÇ TASK AG-TRUTH-001: X Publish Truth Test ΓöÇΓöÇΓöÇ

Run: node scripts/test-x-publish.mjs --live

PASS: success:true + real tweetId
FAIL: 401 ΓåÆ tell Scott to check Netlify env vars

ΓöÇΓöÇΓöÇ TASK AG-TRUTH-002: Agentic Harness ΓöÇΓöÇΓöÇ

Run: just agentic-test-x

Expected: 6/6 PASS with artifacts in artifacts/public/metrics/

ΓöÇΓöÇΓöÇ TASK AG-TRUTH-003: Healthcheck Classification ΓöÇΓöÇΓöÇ

Probe cloud healthcheck:
  node -e "fetch('https://sirtrav-a2a-studio.netlify.app/.netlify/functions/healthcheck').then(r=>r.json()).then(d=>console.log(JSON.stringify(d,null,2)))"

Confirm: degraded because TikTok/Instagram/LinkedIn missing.
Recommend: reclassify as "disabled" for MVP.

ΓöÇΓöÇΓöÇ YOUR COMMANDS (already in justfile) ΓöÇΓöÇΓöÇ

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

ΓöÇΓöÇΓöÇ REPORT BACK WITH ΓöÇΓöÇΓöÇ

Γûí artifacts/contracts/weekly-harvest.schema.json created
Γûí artifacts/contracts/social-post.schema.json created
Γûí X publish test result (PASS/FAIL + tweetId)
Γûí Agentic harness result (6/6 + artifact paths)
Γûí Healthcheck classification recommendation
Γûí What blocked you
```

---

## ≡ƒöü THE ROUND LOOP (Every Agent, Every Session)

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
| PASS/FAIL explicit | Γ£à |
| If FAIL: single owner assigned | Γ£à |
| Artifacts written | Γ£à |
| Next command stated | Γ£à |

---

## ≡ƒöä WEEKLY PULSE EXECUTION SEQUENCE

```
1. Windsurf:    just weekly-pulse-spec        # Create task specs
2. Claude Code: just weekly-harvest           # Harvest signals
3. Antigravity: just validate-schemas         # Validate output
4. Codex:       just build-hud                # Verify HUD exists
5. Windsurf:    just mvp-verify               # Full truth ritual
6. Windsurf:    just weekly-pulse-report       # Write report
```

---

## ≡ƒôè LATEST PROOF (2026-02-15)

| Test | Result | Duration | Proof |
|------|--------|----------|-------|
| Cycle Gates | **10/10 PASS** | <1s | agent-state.json |
| Agentic Cloud + X | **6/6 PASS** | 12.6s | tweetId: 2023121795121897961 |
| No Fake Success | **VERIFIED** | ΓÇö | noFakeSuccess: true |
| Cloud Healthcheck | degraded v2.1.0 | 127ms | 2/5 social platforms |
| Golden Path | **VERIFIED** | ~15s | Pipeline queued + SSE |
| OAuth Keys | **@Sechols002 authenticated** | 1.2s | User ID: 3196650180 |

**Next Round First Command:**
```bash
just cycle-next-for <agent>
```
