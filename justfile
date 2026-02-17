# SirTrav-A2A-Studio Command Runner (justfile)
# =============================================
# A minimalist command runner for standardizing agent workflows
# Usage: just <command>
# Install just: https://github.com/casey/just
#
# Pattern: Inherited from WSP2agent "Golden Path" principles
# - No Fake Success: Commands report real status
# - Click2Kick: Read before execute
# - Commons Good: 20% markup tracking

# Use PowerShell on Windows
set shell := ["powershell", "-NoProfile", "-Command"]

# Default: show all available commands
default:
    just --list

# ============================================
# 🚀 SETUP & INSTALLATION
# ============================================

# Install all dependencies (run once)
install:
    @echo "🔧 SirTrav-A2A-Studio Installation..."
    npm install
    @echo "✅ Dependencies installed!"

# Initialize project (first-time setup)
init:
    @echo "🎯 SirTrav-A2A-Studio Initialization..."
    @just install
    @just create-dirs
    @just preflight
    @echo "✅ Project initialized! Run: just dev"

# Create required directories
create-dirs:
    @echo "📁 Creating directories..."
    @powershell -Command "if (!(Test-Path data)) { mkdir data }"
    @powershell -Command "if (!(Test-Path output)) { mkdir output }"
    @powershell -Command "if (!(Test-Path artifacts)) { mkdir artifacts }"
    @powershell -Command "if (!(Test-Path tmp)) { mkdir tmp }"
    @echo "✅ Directories ready!"

# ============================================
# 🔧 MAINTENANCE
# ============================================

# Run maintenance tasks
maintain:
    @echo "🔧 SirTrav-A2A-Studio Maintenance..."
    @just update-deps
    @just clean-logs
    @just security-audit
    @echo "✅ Maintenance complete!"

# Update all dependencies
update-deps:
    @echo "📦 Updating dependencies..."
    npm update
    @echo "✅ Dependencies updated!"

# Clean old logs and temp files
clean-logs:
    @echo "🧹 Cleaning old logs..."
    @powershell -Command "Get-ChildItem *.log | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) } | Remove-Item -Force -ErrorAction SilentlyContinue"
    @powershell -Command "Get-ChildItem tmp/* -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue"
    @echo "✅ Logs cleaned!"

# Run security audit
security-audit:
    @echo "🔐 Running security audit..."
    @powershell -Command "git log --all --full-history -- .env credentials.json 2>$null || echo 'No secrets in history'"
    @powershell -Command "git check-ignore .env .env.local"
    npm run verify:security
    @echo "✅ Security audit complete!"

# ============================================
# 🚀 APPLICATION
# ============================================

# Start Netlify dev server (includes functions)
dev:
    @echo "🚀 Starting SirTrav-A2A-Studio..."
    @echo "📍 Functions: http://localhost:8888/.netlify/functions/"
    @echo "📍 App: http://localhost:8888"
    netlify dev

# Build for production
build:
    @echo "🏗️ Building for production..."
    npm run build
    @echo "✅ Build complete!"

# Preview production build
preview:
    @echo "👀 Previewing production build..."
    npm run preview

# Run manifest pipeline
manifest:
    @echo "📋 Running manifest pipeline..."
    npm run manifest

# ============================================
# 🎬 REMOTION COMMANDS
# ============================================

# Open Remotion Studio (composition preview)
remotion-studio:
    @echo "🎬 Opening Remotion Studio..."
    npx remotion studio

# Test motion graphic generation
motion-test:
    @echo "🎬 Testing Motion Graphic Agent..."
    node scripts/test_remotion_motion.mjs

# Test narration skill
narrate-test:
    @echo "✍️ Testing Writer Agent (Narration)..."
    npm run test:skill:narrate

# ============================================
# 🤖 AGENT COMMANDS
# ============================================

# Run preflight checks (environment validation)
preflight:
    @echo "🔍 Running preflight checks..."
    npm run preflight

# Healthcheck (structured JSON status - No Fake Success pattern)
healthcheck:
    @echo "📊 Running healthcheck..."
    @powershell -Command "curl -s http://localhost:8888/.netlify/functions/healthcheck 2>$null || echo '{\"error\": \"Server not running. Run: just dev\"}'"

# Start Claude Code with init hook
claude-init:
    @echo "🤖 Starting Claude Code (init mode)..."
    claude --init

# Start Claude Code with maintenance hook
claude-maintain:
    @echo "🔧 Starting Claude Code (maintenance mode)..."
    claude --maintenance

# Start Codex agent
codex:
    @echo "🤖 Starting Codex agent..."
    codex "Read CLAUDE.md and plans/AGENT_ASSIGNMENTS.md, then help with the current task"

# ============================================
# 📱 SOCIAL MEDIA PUBLISHERS
# ============================================

# Test X/Twitter publish (dry-run)
x-dry:
    @echo "🐦 Testing X/Twitter Publisher (dry-run)..."
    node scripts/test-x-publish.mjs --dry-run

# Test X/Twitter publish (live)
x-live:
    @echo "🐦 Testing X/Twitter Publisher (LIVE)..."
    @echo "⚠️  This will post to X/Twitter!"
    @powershell -Command "Start-Sleep -Seconds 3"
    node scripts/test-x-publish.mjs --live

# Test LinkedIn publish (dry-run)
linkedin-dry:
    @echo "💼 Testing LinkedIn Publisher (dry-run)..."
    node scripts/test-linkedin-publish.mjs --dry-run

# Test LinkedIn publish (live)
linkedin-live:
    @echo "💼 Testing LinkedIn Publisher (LIVE)..."
    @echo "⚠️  This will post to LinkedIn!"
    @powershell -Command "Start-Sleep -Seconds 3"
    node scripts/test-linkedin-publish.mjs --live

# Test YouTube publish (dry-run)
youtube-dry:
    @echo "📺 Testing YouTube Publisher (dry-run)..."
    node scripts/test-youtube-publish.mjs --dry-run

# ============================================
# 🌐 DEPLOYMENT
# ============================================

# Deploy to Netlify (production)
deploy:
    @echo "🚀 Deploying to Netlify..."
    netlify deploy --prod

# Deploy preview
deploy-preview:
    @echo "👀 Deploying preview..."
    netlify deploy

# ============================================
# 🧪 TESTING
# ============================================

# Run all tests
test:
    @echo "🧪 Running all tests..."
    npm run test:all

# Run full test suite (includes stress tests)
test-full:
    @echo "🧪 Running FULL test suite..."
    npm run test:full

# Run Golden Path smoke test
golden-path:
    @echo "🏆 Running Golden Path test..."
    npm run practice:test

# Verify idempotency
test-idempotency:
    @echo "🔄 Testing idempotency..."
    npm run verify:idempotency

# Stress test SSE
stress-sse:
    @echo "💪 Stress testing SSE..."
    npm run stress:sse

# ─── AGENTIC "AROUND THE BLOCK" TEST ─────
# End-to-end: healthcheck → start → SSE → results → publish-x
# Outputs: artifacts/public/metrics/agentic-run-*.json + .md

# Agentic test (cloud, read-only — no tweets)
agentic-test:
    @echo "🧪 Agentic Around-the-Block Test (cloud)..."
    node scripts/test-agentic-twitter-run.mjs

# Agentic test + live tweet to X
agentic-test-x:
    @echo "🧪 Agentic Test + LIVE X publish..."
    @echo "⚠️  This will post a real tweet!"
    @powershell -Command "Start-Sleep -Seconds 3"
    node scripts/test-agentic-twitter-run.mjs --publish-x

# Agentic test against local (netlify dev)
agentic-test-local:
    @echo "🧪 Agentic Test (local)..."
    node scripts/test-agentic-twitter-run.mjs --local

# Dry-run: validate endpoint shapes only (no pipeline start)
agentic-dry:
    @echo "🧪 Agentic Dry-Run (shape validation only)..."
    node scripts/test-agentic-twitter-run.mjs --dry-run

# Validate social media contracts
validate-contracts:
    @echo "📋 Validating social media contracts..."
    node scripts/validate-social-contracts.mjs

# ============================================
# 📋 QUICK REFERENCE
# ============================================

# Show project status
status:
    @echo "📊 SirTrav-A2A-Studio Status"
    @echo "============================="
    @git status --short
    @echo ""
    @echo "Environment:"
    @just preflight

# Show recent git activity
activity:
    @echo "📋 Recent Activity"
    git log --oneline -10

# Open project in VS Code
code:
    code .

# Show help
help:
    @echo "SirTrav-A2A-Studio Command Runner"
    @echo "=================================="
    @echo ""
    @echo "Quick Start:"
    @echo "  just init           - First-time setup"
    @echo "  just dev            - Start Netlify dev server"
    @echo "  just build          - Build for production"
    @echo ""
    @echo "Remotion:"
    @echo "  just remotion-studio - Open composition preview"
    @echo "  just motion-test     - Test motion graphic agent"
    @echo "  just narrate-test    - Test writer agent"
    @echo ""
    @echo "Social Media:"
    @echo "  just x-dry          - Test X/Twitter (dry-run)"
    @echo "  just linkedin-dry   - Test LinkedIn (dry-run)"
    @echo "  just youtube-dry    - Test YouTube (dry-run)"
    @echo ""
    @echo "Testing:"
    @echo "  just test           - Run all tests"
    @echo "  just golden-path    - Run Golden Path smoke test"
    @echo "  just healthcheck    - Check service status"
    @echo ""
    @echo "Agents:"
    @echo "  just claude-init    - Claude Code (init)"
    @echo "  just codex          - Start Codex agent"
    @echo ""
    @echo "Deploy:"
    @echo "  just deploy         - Deploy to production"
    @echo "  just deploy-preview - Deploy preview"
    @echo ""
    @echo "Run 'just --list' for all commands"

# ============================================
# 🔗 CROSS-PROJECT NAVIGATION (Multi-Agent)
# ============================================

# Jump to WSP2agent project
wsp2:
    @echo "🔗 Switching to WSP2agent..."
    @echo "Run: cd c:/Users/Roberto002/OneDrive/DevHub/WSP2agent && just --list"

# Show both project statuses
projects-status:
    @echo "📊 Multi-Project Status"
    @echo "========================"
    @echo ""
    @echo "📁 SirTrav-A2A-Studio (current)"
    @git status --short 2>$null || echo "  Not in git repo"
    @echo ""
    @echo "📁 WSP2agent"
    @powershell -Command "Push-Location c:/Users/Roberto002/OneDrive/DevHub/WSP2agent; git status --short 2>$null; Pop-Location" || echo "  Not accessible"

# Test LinkedIn disabled state (No Fake Success pattern)
test-linkedin-disabled:
    @echo "🧪 Verifying LinkedIn 'No Fake Success' pattern..."
    node scripts/test-linkedin-publish.mjs

# Test X disabled state (No Fake Success pattern)
test-x-disabled:
    @echo "🧪 Verifying X/Twitter 'No Fake Success' pattern..."
    node scripts/test-x-publish.mjs

# ============================================
# 🤖 GITHUB CLI HELPERS
# ============================================

# Install GitHub Copilot CLI extension (DEPRECATED - use Windsurf AI instead)
gh-copilot-install:
    @echo "⚠️  The gh-copilot extension was deprecated in Sept 2025."
    @echo "📖 See: https://github.blog/changelog/2025-09-25-upcoming-deprecation-of-gh-copilot-cli-extension"
    @echo ""
    @echo "✅ You don't need it - use Windsurf/Antigravity AI assistants instead!"

# Check gh extensions status
gh-extensions:
    @echo "🔌 GitHub CLI Extensions:"
    gh extension list

# Authenticate GitHub CLI
gh-auth:
    @echo "🔐 Authenticating GitHub CLI..."
    gh auth login

# ============================================
# 🏆 GOLDEN PATH (Combined Tests)
# ============================================

# Full Golden Path test (all services)
golden-path-full:
    @echo "🏆 Running Full Golden Path Test..."
    @echo ""
    @echo "Step 1: Contract Validation"
    @just validate-contracts
    @echo ""
    @echo "Step 2: Social Media Dry-Runs"
    @just x-dry
    @just linkedin-dry
    @echo ""
    @echo "Step 3: Motion Graphics"
    @just motion-test
    @echo ""
    @echo "✅ Golden Path Complete!"

# Quick Golden Path (just healthcheck + contracts)
golden-path-quick:
    @echo "🏆 Quick Golden Path..."
    @just validate-contracts
    @just healthcheck
    @echo "✅ Quick Golden Path Complete!"

# ============================================
# 🦅 ANTIGRAVITY AGENT (Test Ops)
# ============================================

# Validate ALL API contracts (comprehensive)
validate-all:
    @echo "🦅 Antigravity: Comprehensive Contract Validation..."
    node scripts/validate-all-contracts.mjs

# Validate ALL contracts against live server
validate-all-live:
    @echo "🦅 Antigravity: Live Contract Validation..."
    node scripts/validate-all-contracts.mjs --live --verbose

# Run complete Antigravity test suite
antigravity-suite:
    @echo "🦅 ═══════════════════════════════════════════════════════════"
    @echo "🦅 ANTIGRAVITY: Complete Test Suite"
    @echo "🦅 ═══════════════════════════════════════════════════════════"
    @echo ""
    @echo "📋 Step 1: Contract Definitions"
    @just validate-all
    @echo ""
    @echo "📋 Step 2: Social Media Contracts"
    @just validate-contracts
    @echo ""
    @echo "📋 Step 3: Dry-Run Tests"
    @just linkedin-dry
    @echo ""
    @echo "📋 Step 4: Healthcheck"
    @just healthcheck
    @echo ""
    @echo "🦅 ═══════════════════════════════════════════════════════════"
    @echo "✅ ANTIGRAVITY SUITE COMPLETE"
    @echo "🦅 ═══════════════════════════════════════════════════════════"

# Show Antigravity agent status
antigravity-status:
    @echo "🦅 Antigravity Agent Status"
    @echo "════════════════════════════"
    @echo ""
    @echo "🧪 TESTING COMMANDS:"
    @echo "  just antigravity-suite      - Run complete test suite"
    @echo "  just validate-all           - Validate all contracts (dry)"
    @echo "  just validate-all-live      - Validate contracts (live)"
    @echo "  just golden-path-full       - Full integration test"
    @echo "  just golden-path-quick      - Quick smoke test"
    @echo "  just validate-contracts     - Social media contracts"
    @echo ""
    @echo "🎨 DESIGN COMMANDS:"
    @echo "  just design-status          - Show design system info"
    @echo "  just design-tokens          - Export design tokens"
    @echo "  just design-audit           - Check design files"
    @echo ""
    @echo "📁 Key Files:"
    @echo "  .agent/skills/ANTIGRAVITY_AGENT.md   - Agent documentation"
    @echo "  runbooks/stitch-design.md            - Design system runbook"
    @echo "  artifacts/antigravity/               - Design outputs"
    @echo ""
    @echo "🔄 CI Workflows:"
    @echo "  .github/workflows/social-media-tests.yml"
    @echo "  .github/workflows/motion-graphics-ci.yml"

# ============================================
# 🎨 ANTIGRAVITY DESIGN (Stitch MCP)
# ============================================

# Show design system status
design-status:
    @echo "🎨 SirTrav Design System"
    @echo "════════════════════════════"
    @echo ""
    @echo "📋 Brand Colors:"
    @echo "  Primary:    #1a1a2e (Dark Navy)"
    @echo "  Secondary:  #16213e (Deep Blue)"
    @echo "  Accent:     #e94560 (Coral)"
    @echo "  Success:    #0f3460 (Ocean Blue)"
    @echo ""
    @echo "📝 Typography: Inter, JetBrains Mono"
    @echo "📐 Spacing: 8px grid system"
    @echo "📁 Design Runbook: runbooks/stitch-design.md"
    @echo ""
    @echo "🎨 To generate designs (requires Stitch MCP):"
    @echo "  /design [component description]"

# Export design tokens as JSON
design-tokens:
    @echo "🎨 Exporting design tokens..."
    @echo '{"colors":{"primary":"#1a1a2e","secondary":"#16213e","accent":"#e94560","success":"#0f3460","text":"#ffffff","textMuted":"#a0a0a0","border":"#2a2a4a"},"fonts":{"heading":"Inter","body":"Inter","mono":"JetBrains Mono"},"spacing":{"xs":"4px","sm":"8px","md":"16px","lg":"24px","xl":"32px"},"radii":{"sm":"4px","md":"8px","lg":"16px","pill":"9999px"}}' > artifacts/antigravity/design-tokens.json
    @echo "✅ Exported to artifacts/antigravity/design-tokens.json"

# Audit design artifacts
design-audit:
    @echo "🎨 Auditing design artifacts..."
    @if (Test-Path artifacts/antigravity) { Get-ChildItem artifacts/antigravity -Recurse | Format-Table Name, Length, LastWriteTime } else { echo "No artifacts found. Run design commands first." }

# ============================================
# 🔄 AGENT CYCLE SYSTEM (v3 — MASTER.md Aligned)
# ============================================
# Gates map to Layers 1-4 from the sprint Definition of Done.
# State file = ~200 tokens. Replaces re-reading 10+ files (~5000 tokens).
# Note: concurrent writes to agent-state.json are unlikely but not locked.
# Pattern: read state -> run next gate -> advance pointer -> report -> loop

# ─── PROGRESSIVE CONTEXT-LEAN COMMANDS ─────────
# Sorted by token cost (cheapest first).
# Strategy: next(50) → brief(150) → orient(200) → status(400)
# Saves ~4800 tokens/session vs. reading 10 files.

# 🎯 CHEAPEST: What should I do RIGHT NOW? (~50 tokens)
# THIS IS THE FIRST COMMAND EVERY AGENT SESSION SHOULD RUN
cycle-next:
    @node scripts/cycle-check.mjs next

# Agent-specific next action (~50 tokens)
cycle-next-for agent:
    @node scripts/cycle-check.mjs next {{agent}}

# Ultra-compact status: 1 line per gate (~150 tokens)
cycle-brief:
    @node scripts/cycle-check.mjs brief

# Agent orientation briefing (~200 tokens)
cycle-orient agent:
    @node scripts/cycle-check.mjs orient {{agent}}

# Token budget calculator (~100 tokens)
cycle-budget:
    @node scripts/cycle-check.mjs budget

# Test only one layer (~80 tokens)
cycle-layer layer:
    @node scripts/cycle-check.mjs layer {{layer}}

# ─── STANDARD COMMANDS (higher token cost) ─────

# Full decorated status (~400 tokens)
cycle-status:
    @node scripts/cycle-check.mjs status

# Run a specific gate by name
cycle-gate gate:
    @node scripts/cycle-check.mjs {{gate}}

# Run all gates except build (fast)
cycle-quick:
    @node scripts/cycle-check.mjs quick

# Run ALL gates in sequence (full sweep)
cycle-all:
    @node scripts/cycle-check.mjs all

# ============================================
# 🤖 AGENT ORIENTATION (Per-Role Quick Start)
# ============================================
# Each agent runs their orientation command FIRST to know what to do.

# ─── LEAN ORIENTATION (uses cycle-check orient mode) ──
# Each outputs ~200 tokens — role + gates + next action.
# Replaces the old 400+ token orientation commands.

# Claude Code orientation (~200 tokens)
orient-claude:
    @node scripts/cycle-check.mjs orient claude-code

# Codex orientation (~200 tokens)
orient-codex:
    @node scripts/cycle-check.mjs orient codex

# Antigravity orientation (~200 tokens)
orient-antigravity:
    @node scripts/cycle-check.mjs orient antigravity

# Windsurf orientation (~200 tokens)
orient-windsurf:
    @node scripts/cycle-check.mjs orient windsurf

# Human (Scott) orientation (~200 tokens)
orient-human:
    @node scripts/cycle-check.mjs orient human

# ============================================
# 📖 AGENT SKILL FILES (Read Before You Code)
# ============================================
# Each agent has a skill instruction file in .agent/skills/
# These tell you EXACTLY what to edit, what to run, and what NOT to touch.

# Show which skill files exist
skills:
    @echo "📖 Agent Skill Files"
    @echo "====================="
    @echo ""
    @echo "Read YOUR file before starting work:"
    @echo "  .agent/skills/CLAUDE_CODE_AGENT.md      - Backend (functions, wiring)"
    @echo "  .agent/skills/CODEX_AGENT.md             - Frontend (components, design)"
    @echo "  .agent/skills/ANTIGRAVITY_AGENT.md       - Testing + Design"
    @echo "  .agent/skills/WINDSURF_MASTER_AGENT.md   - Infrastructure (justfile, deploy)"
    @echo "  .agent/skills/HUMAN_OPERATOR.md           - Scott (env vars, keys)"
    @echo ""
    @echo "Quick start: just orient-<your-name>"

# ============================================
# 🧠 WEEKLY PULSE (Discover → Harvest → Validate → Display)
# ============================================
# Runtime: Node (not Bun). Composio integration planned.
# Pattern: Script must exist before command runs (no auto-scaffolding).
# Owner: Claude Code creates scripts, Windsurf wires commands.

# Harvest photos/signals from local directory (Claude Code owns the script)
weekly-harvest:
    @echo "📸 Running Weekly Photo Harvest..."
    @powershell -NoProfile -Command "if (!(Test-Path scripts/harvest-week.mjs)) { Write-Host '❌ Missing scripts/harvest-week.mjs — Claude Code must create it. See tasks/CC-WEEKLY-HARVEST.md'; exit 1 }"
    @node scripts/harvest-week.mjs
    @powershell -NoProfile -Command "if (!(Test-Path artifacts/data/current-week-raw.json)) { Write-Host '❌ Expected artifacts/data/current-week-raw.json not found'; exit 1 }"
    @echo "✅ Harvest complete → artifacts/data/current-week-raw.json"

# Harvest dry-run (print shape, no writes)
harvest-dry-run:
    @echo "📸 Weekly Harvest (dry-run)..."
    @powershell -NoProfile -Command "if (!(Test-Path scripts/harvest-week.mjs)) { Write-Host '❌ Missing scripts/harvest-week.mjs — Claude Code must create it'; exit 1 }"
    @node scripts/harvest-week.mjs --dry-run

# Analyze harvested data (calls OpenRouter or dry-run)
weekly-analyze:
    @echo "🧠 Running Weekly Signal Analysis..."
    @powershell -NoProfile -Command "if (!(Test-Path scripts/weekly-analyze.mjs)) { Write-Host '❌ Missing scripts/weekly-analyze.mjs — Claude Code must create it'; exit 1 }"
    @node scripts/weekly-analyze.mjs

# Analyze dry-run (no API call)
weekly-analyze-dry:
    @echo "🧠 Weekly Analysis (dry-run)..."
    @powershell -NoProfile -Command "if (!(Test-Path scripts/weekly-analyze.mjs)) { Write-Host '❌ Missing scripts/weekly-analyze.mjs — Claude Code must create it'; exit 1 }"
    @node scripts/weekly-analyze.mjs --dry-run

# Full Weekly Pulse (harvest + analyze)
weekly-pulse:
    @echo "🔄 Full Weekly Pulse (Harvest + Analyze)..."
    @just weekly-harvest
    @just weekly-analyze

# Full Weekly Pulse dry-run
weekly-pulse-dry:
    @echo "🔄 Weekly Pulse (dry-run)..."
    @just harvest-dry-run
    @just weekly-analyze-dry

# ============================================
# ⚖️ SCHEMA VALIDATION (Antigravity owns schemas)
# ============================================

# Validate weekly harvest output against schema
validate-schemas:
    @echo "⚖️ Validating weekly pulse schema..."
    @powershell -NoProfile -Command "if (!(Test-Path artifacts/data/current-week-raw.json)) { Write-Host '❌ No data to validate! Run: just weekly-harvest'; exit 1 }"
    @powershell -NoProfile -Command "if (!(Test-Path artifacts/contracts/weekly-harvest.schema.json)) { Write-Host '❌ Schema missing! Antigravity must create artifacts/contracts/weekly-harvest.schema.json'; exit 1 }"
    @npx -y ajv-cli validate -s artifacts/contracts/weekly-harvest.schema.json -d artifacts/data/current-week-raw.json
    @echo "✅ Weekly pulse schema OK"

# Validate social post output against schema
validate-social:
    @echo "⚖️ Validating social post schema..."
    @powershell -NoProfile -Command "if (!(Test-Path artifacts/output/latest-post.json)) { Write-Host '❌ No social payload found!'; exit 1 }"
    @powershell -NoProfile -Command "if (!(Test-Path artifacts/contracts/social-post.schema.json)) { Write-Host '❌ Schema missing! Antigravity must create artifacts/contracts/social-post.schema.json'; exit 1 }"
    @npx -y ajv-cli validate -s artifacts/contracts/social-post.schema.json -d artifacts/output/latest-post.json
    @echo "✅ Social payload schema OK"

# Validate weekly pulse output schemas
validate-weekly-pulse:
    @echo "🦅 Validating Weekly Pulse schemas..."
    @powershell -NoProfile -Command "if (!(Test-Path scripts/validate-weekly-pulse.mjs)) { Write-Host '❌ Missing scripts/validate-weekly-pulse.mjs — Antigravity must create it'; exit 1 }"
    @node scripts/validate-weekly-pulse.mjs

# ============================================
# 🛡️ HUD / COMMAND PLAQUE (Codex owns component)
# ============================================

# Verify HUD task spec + component exist
build-hud:
    @echo "🛡️ Verifying Command Plaque HUD..."
    @powershell -NoProfile -Command "if (!(Test-Path tasks)) { New-Item -ItemType Directory -Path tasks | Out-Null }"
    @powershell -NoProfile -Command "if (Test-Path tasks/CX-012-command-plaque.md) { Write-Host '✅ Task spec exists' } else { Write-Host '⚠️ Missing tasks/CX-012-command-plaque.md — run: just weekly-pulse-spec' }"
    @powershell -NoProfile -Command "if (Test-Path src/components/SystemStatusEmblem.tsx) { Write-Host '✅ HUD component exists' } else { Write-Host '⚠️ Missing src/components/SystemStatusEmblem.tsx — Codex must create it' }"

# ============================================
# 🌬️ WINDSURF MASTER: ORCHESTRATION + RELEASE
# ============================================
# Windsurf does NOT create feature scripts. It verifies + reports + commits safely.

# Create/verify task specs exist (docs only, no code scaffolding)
weekly-pulse-spec:
    @echo "🌬️ [WINDSURF] Ensuring task specs exist..."
    @powershell -NoProfile -Command "New-Item -ItemType Directory -Force tasks,docs,'artifacts/reports' | Out-Null"
    @powershell -NoProfile -Command "if (!(Test-Path tasks/CC-WEEKLY-HARVEST.md)) { Write-Host '📄 Creating tasks/CC-WEEKLY-HARVEST.md'; 'Claude Code: Weekly Harvest`n`nDeliverable: scripts/harvest-week.mjs`nOutput: artifacts/data/current-week-raw.json`nModes: --dry-run (no writes), default (writes)`nNo Fake Success: exit non-zero if empty`nCommands: just weekly-harvest, just harvest-dry-run' | Set-Content tasks/CC-WEEKLY-HARVEST.md -Encoding UTF8 }"
    @powershell -NoProfile -Command "if (!(Test-Path tasks/CX-012-command-plaque.md)) { Write-Host '📄 Creating tasks/CX-012-command-plaque.md'; 'Codex: Command Plaque HUD (CX-012)`n`nSource: GET /.netlify/functions/healthcheck`nComponent: src/components/SystemStatusEmblem.tsx`nBadges: ok / degraded / disabled with reasons`nNever show secrets' | Set-Content tasks/CX-012-command-plaque.md -Encoding UTF8 }"
    @powershell -NoProfile -Command "if (!(Test-Path tasks/AG-WEEKLY-SCHEMAS.md)) { Write-Host '📄 Creating tasks/AG-WEEKLY-SCHEMAS.md'; 'Antigravity: Weekly Schemas`n`nDeliverables: artifacts/contracts/weekly-harvest.schema.json + artifacts/contracts/social-post.schema.json`nDoD: just validate-schemas blocks on mismatch (no fake success)' | Set-Content tasks/AG-WEEKLY-SCHEMAS.md -Encoding UTF8 }"
    @echo "✅ [WINDSURF] Task specs OK"

# Weekly Pulse report artifact
weekly-pulse-report:
    @echo "🌬️ [WINDSURF] Writing report artifact..."
    @powershell -NoProfile -Command "New-Item -ItemType Directory -Force 'artifacts/reports' | Out-Null"
    @node scripts/cycle-check.mjs weekly-report

# Guard: working tree must be clean
guard-clean:
    @node -e "const r=require('child_process').execSync('git status --porcelain',{encoding:'utf8'}).trim();if(r){console.log('Working tree not clean:');console.log(r);process.exit(1)}else{console.log('Working tree clean')}"

# Guard: must be up-to-date with origin
guard-up-to-date:
    @node -e "const x=require('child_process').execSync;try{x('git fetch origin',{stdio:'ignore'})}catch(e){};const l=x('git rev-parse HEAD',{encoding:'utf8'}).trim();let r;try{r=x('git rev-parse origin/main',{encoding:'utf8'}).trim()}catch(e){r=null};if(r&&l!==r){console.log('Not up to date with origin/main — run: git pull origin main');process.exit(1)}else{console.log('Up-to-date')}"

# Stage only Windsurf-owned paths
release-stage-allowed:
    @echo "🌬️ [WINDSURF] Staging allowed paths only..."
    @powershell -NoProfile -Command "git add justfile netlify.toml vite.config.js docs tasks 'artifacts/reports' 2>$$null; exit 0"

# MVP single-command verify (the "truth ritual")
mvp-verify:
    @echo "🏆 MVP Verification (full truth loop)..."
    @just cycle-brief
    @just agentic-dry
    @just build
    @echo "✅ MVP VERIFIED — all gates green, shapes valid, build passes"
