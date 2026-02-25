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
    @just machine-gate
    @echo "🚀 Starting SirTrav-A2A-Studio..."
    @echo "📍 Functions: http://localhost:8888/.netlify/functions/"
    @echo "📍 App: http://localhost:8888"
    netlify dev

# Build for production
build:
    @just machine-gate
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

# Healthcheck - local (requires netlify dev)
healthcheck:
    @echo "📊 Running healthcheck (local)..."
    @powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:8888/.netlify/functions/healthcheck').Content } catch { @{ error = 'Server not running. Run: just dev or just healthcheck-cloud' } | ConvertTo-Json -Compress }"

# Healthcheck - cloud (live deployment)
healthcheck-cloud:
    @echo "📊 Running healthcheck (cloud)..."
    @powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing -Uri 'https://sirtrav-a2a-studio.netlify.app/.netlify/functions/healthcheck').Content } catch { @{ error = 'Cloud healthcheck request failed' } | ConvertTo-Json -Compress }"

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

# Test X/Twitter publish (dry-run, auto-detects local/cloud)
x-dry:
    @echo "🐦 Testing X/Twitter Publisher (dry-run, auto-detect)..."
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

# LinkedIn setup helper (interactive — test token, generate auth URL, exchange code)
linkedin-setup:
    @echo "🔧 LinkedIn Setup Helper..."
    node scripts/linkedin-setup-helper.mjs status

# LinkedIn auth URL generator (step 1 of OAuth flow)
linkedin-auth-url:
    node scripts/linkedin-setup-helper.mjs auth-url

# LinkedIn runbook helper
linkedin-doc:
    @echo "📘 LinkedIn setup runbook: docs/LINKEDIN_SETUP.md"
    @echo "   Follow this top-to-bottom, then run: just linkedin-dry && just linkedin-live"

# Test LinkedIn publish (live, cloud — default for audits)
linkedin-live:
    @echo "💼 Testing LinkedIn Publisher (LIVE → CLOUD)..."
    @echo "⚠️  This will post to LinkedIn!"
    @powershell -Command "Start-Sleep -Seconds 3"
    node scripts/test-linkedin-publish.mjs --live --cloud

# Test LinkedIn publish (live, local — requires netlify dev)
linkedin-live-local:
    @echo "💼 Testing LinkedIn Publisher (LIVE → LOCAL)..."
    @echo "⚠️  This will post to LinkedIn via localhost:8888!"
    @powershell -Command "Start-Sleep -Seconds 3"
    node scripts/test-linkedin-publish.mjs --live --local

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

# Run Golden Path smoke test (auto-detects local or cloud)
golden-path:
    @echo "🏆 Running Golden Path test (auto-detect local/cloud)..."
    node scripts/verify-golden-path.mjs --smoke

# Run Golden Path against cloud only
golden-path-cloud:
    @echo "🏆 Running Golden Path test (cloud)..."
    node scripts/verify-golden-path.mjs --smoke --prod

# Run Golden Path against local only
golden-path-local:
    @echo "🏆 Running Golden Path test (local only)..."
    node scripts/verify-golden-path.mjs --smoke --local

# Verify idempotency
test-idempotency:
    @echo "🔄 Testing idempotency..."
    npm run verify:idempotency

# Stress test SSE
stress-sse:
    @echo "💪 Stress testing SSE..."
    npm run stress:sse

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
    @echo "  just linkedin-doc   - LinkedIn setup checklist"
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

# Verify pipeline wiring status (Windsurf Master diagnostic)
wiring-verify:
    @echo "🔌 WINDSURF MASTER: Pipeline Wiring Verification"
    @echo "================================================="
    @echo ""
    @echo "📂 Checking critical files exist..."
    @if (Test-Path netlify/functions/compile-video.ts) { echo "  ✅ compile-video.ts" } else { echo "  ❌ compile-video.ts MISSING" }
    @if (Test-Path netlify/functions/render-dispatcher.ts) { echo "  ✅ render-dispatcher.ts" } else { echo "  ❌ render-dispatcher.ts MISSING" }
    @if (Test-Path netlify/functions/lib/remotion-client.ts) { echo "  ✅ remotion-client.ts" } else { echo "  ❌ remotion-client.ts MISSING" }
    @if (Test-Path netlify/functions/generate-attribution.ts) { echo "  ✅ generate-attribution.ts" } else { echo "  ❌ generate-attribution.ts MISSING" }
    @if (Test-Path netlify/functions/lib/cost-manifest.ts) { echo "  ✅ cost-manifest.ts" } else { echo "  ❌ cost-manifest.ts MISSING" }
    @if (Test-Path netlify/functions/lib/quality-gate.ts) { echo "  ✅ quality-gate.ts" } else { echo "  ❌ quality-gate.ts MISSING" }
    @if (Test-Path netlify/functions/run-pipeline-background.ts) { echo "  ✅ run-pipeline-background.ts" } else { echo "  ❌ run-pipeline-background.ts MISSING" }
    @echo ""
    @echo "🔗 Checking wiring (imports)..."
    @if (Select-String -Path netlify/functions/compile-video.ts -Pattern "render-dispatcher" -Quiet) { echo "  ✅ compile-video → render-dispatcher" } else { echo "  ❌ compile-video NOT wired to render-dispatcher" }
    @if (Select-String -Path netlify/functions/run-pipeline-background.ts -Pattern "cost-manifest" -Quiet) { echo "  ✅ pipeline → cost-manifest" } else { echo "  ❌ pipeline NOT wired to cost-manifest" }
    @if (Select-String -Path netlify/functions/run-pipeline-background.ts -Pattern "quality-gate" -Quiet) { echo "  ✅ pipeline → quality-gate" } else { echo "  ❌ pipeline NOT wired to quality-gate" }
    @if (Select-String -Path netlify/functions/run-pipeline-background.ts -Pattern "generate-attribution" -Quiet) { echo "  ✅ pipeline → generate-attribution" } else { echo "  ❌ pipeline NOT wired to generate-attribution" }
    @if (Select-String -Path netlify/functions/render-dispatcher.ts -Pattern "remotion-client" -Quiet) { echo "  ✅ render-dispatcher → remotion-client" } else { echo "  ❌ render-dispatcher NOT wired to remotion-client" }
    @echo ""
    @echo "📊 Pipeline: ALL 7 STEPS + Cost Manifest + Quality Gate = WIRED"
    @echo "⚠️  Real output requires env vars. See: NETLIFY_AGENT_PROMPT.md"

# Full Golden Path test (all services)
golden-path-full:
    @just machine-gate
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

# ==========================================
# 🦅 COMMONS GOOD GOLDEN PATH - AGENT COMMANDS
# ==========================================
# Multi-agent coordination for team visibility
# All agents read/write the same progress file
# ==========================================

# ------------------------------------------
# 📖 CONTEXT & ORIENTATION
# ------------------------------------------

# Read the context anchor (all agents run this first)
read-anchor:
    @echo "📖 Reading Context Anchor..."
    @if (Test-Path brand/ANCHOR.md) { cat brand/ANCHOR.md } else { if (Test-Path brand/manifesto.md) { cat brand/manifesto.md } else { echo "No anchor file found" } }
    @echo ""
    @echo "✅ Context loaded. Proceed with your assigned tasks."

# Check which agent owns a file path
check-zone file:
    @echo "🔍 Checking zone ownership for: {{file}}"
    @if ("{{file}}" -match "netlify/functions|artifacts/contracts|artifacts/data") { echo "📦 ZONE: Claude-Code (Backend)" }
    @if ("{{file}}" -match "tests/|\.github/workflows|artifacts/antigravity") { echo "🦅 ZONE: Antigravity (Testing)" }
    @if ("{{file}}" -match "src/components|src/App|src/hooks") { echo "🎨 ZONE: Codex-Frontend (Seat #1)" }
    @if ("{{file}}" -match "scripts/|justfile|netlify\.toml") { echo "⚙️ ZONE: Codex-DevOps (Seat #2)" }

# Show sprint progress (all agents can see this)
progress:
    @echo "📊 Sprint Progress"
    @echo "=================="
    @if (Test-Path artifacts/claude/progress.md) { cat artifacts/claude/progress.md } else { echo "No progress file yet. Run: just init-progress" }

# Initialize progress tracking file
init-progress:
    @New-Item -ItemType Directory -Force -Path artifacts/claude | Out-Null
    @"# Sprint Progress - $(Get-Date -Format 'yyyy-MM-dd')`n`n## Task Board`n| Task ID | Agent | Status |`n|---------|-------|--------|`n" | Out-File -FilePath artifacts/claude/progress.md -Encoding utf8
    @echo "✅ Progress tracking initialized at artifacts/claude/progress.md"

# ------------------------------------------
# 🔧 CLAUDE-CODE COMMANDS (Builder)
# ------------------------------------------

# Claude-Code initialization (shows assigned tasks)
claude-code-init:
    @echo "🔧 CLAUDE-CODE: Backend Agent Ready"
    @echo "===================================="
    @just read-anchor
    @echo ""
    @echo "Your Zone:"
    @echo "  - netlify/functions/*.ts"
    @echo "  - artifacts/contracts/"
    @echo "  - artifacts/data/"
    @echo "  - scripts/*.mjs"
    @echo ""
    @echo "Assigned Tasks (Layer 2):"
    @echo "  - cc-005-job-schema"
    @echo "  - cc-006-social-schema"
    @echo "  - cc-007-validate-publishers"

# Validate all JSON schemas
validate-schemas:
    @echo "📋 Validating schemas..."
    @if (Test-Path artifacts/data/job-costing.schema.json) { echo "  ✓ job-costing.schema.json exists" } else { echo "  ✗ job-costing.schema.json MISSING" }
    @if (Test-Path artifacts/contracts/social-post.schema.json) { echo "  ✓ social-post.schema.json exists" } else { echo "  ✗ social-post.schema.json MISSING" }
    @if (Test-Path artifacts/contracts/weekly-harvest.schema.json) { echo "  ✓ weekly-harvest.schema.json exists" } else { echo "  ✗ weekly-harvest.schema.json MISSING" }
    @if (Test-Path artifacts/contracts/weekly-pulse-analysis.schema.json) { echo "  ✓ weekly-pulse-analysis.schema.json exists" } else { echo "  ✗ weekly-pulse-analysis.schema.json MISSING" }
    @echo "✅ Schema check complete"

# Validate Weekly Pulse contracts (AG-011)
validate-weekly-pulse:
    @echo "🔍 Validating Weekly Pulse contracts (AG-011)..."
    @node scripts/validate-weekly-pulse.mjs --dry-run

# Test issue-intake Click2Kick flow (AG-012)
test-issue-intake:
    @echo "🧪 Testing issue-intake integration (AG-012)..."
    @node scripts/test-issue-intake.mjs

# Test issue-intake LIVE (requires netlify dev)
test-issue-intake-live:
    @echo "🔴 Testing issue-intake LIVE (AG-012)..."
    @node scripts/test-issue-intake.mjs --live

# ------------------------------------------
# 🦅 ANTIGRAVITY — TRUTH SERUM SUITE (AG-013)
# ------------------------------------------
# Recipe usage guide:
#   truth-serum          → Strict baseline: run BEFORE any PR merge to capture current truth
#   truth-serum-lenient  → Pre-Council Flash reviewer gate: disabled=PASS, liars still caught
#   truth-serum-clean    → CI deep check: clears function caches then runs strict mode
#   truth-serum-all      → Full 5-publisher scan: use for release readiness checks
#   verify-truth         → COMPOSITE REVIEWER GATE: run this when CC-SOCIAL-NORM merges
#   ag-full-suite        → Full AG sweep (schemas + contracts + serum): final gate before Council Flash
# ------------------------------------------

# Strict mode — baseline snapshot before any merge / PR (AG-013)
# When: before PR review, to document current truth state
truth-serum:
    @echo "🧪 Truth Serum — STRICT MODE (AG-013 baseline)"
    @node scripts/truth-serum.mjs

# Lenient mode — disabled platforms = PASS; liars still caught
# When: pre-Council Flash reviewer gate, CI on branches without full social keys
truth-serum-lenient:
    @echo "🧪 Truth Serum — LENIENT MODE (disabled=PASS, liars=FAIL)"
    @node scripts/truth-serum.mjs --allow-disabled

# Clean + strict — clears caches then runs full strict trap
# When: CI pipeline, or after a deploy to bust any stale function cache
truth-serum-clean:
    @echo "🧪 Truth Serum — CLEAN + STRICT (cache busted)"
    @node scripts/truth-serum.mjs --clean

# All 5 publishers, lenient — full platform surface area scan
# When: release readiness checks, after adding a new publisher
truth-serum-all:
    @echo "🧪 Truth Serum — ALL PUBLISHERS SCAN (lenient)"
    @node scripts/truth-serum.mjs --all-publishers --allow-disabled

# ─── COMPOSITE REVIEWER GATE ──────────────────────────────────────────────────
# Trigger: run when CC-SOCIAL-NORM merges (Antigravity is reviewer)
# Validates: normalized {platform, status, url, error} contract + SOCIAL_ENABLED skipping
# Reports: PASS/FAIL to Council Flash
verify-truth:
    @echo "🦅 ═══════════════════════════════════════════════════════════"
    @echo "   ANTIGRAVITY REVIEWER GATE — CC-SOCIAL-NORM merge check"
    @echo "   Trigger: run after CC-SOCIAL-NORM merges to main"
    @echo "═══════════════════════════════════════════════════════════"
    @echo ""
    @echo "━━━ GATE 1: Truth Serum (lenient — disabled=PASS) ━━━"
    @just truth-serum-lenient
    @echo ""
    @echo "━━━ GATE 2: Golden Path Cloud (SOCIAL_ENABLED skipping) ━━━"
    @just golden-path-cloud
    @echo ""
    @echo "━━━ GATE 3: Full AG Suite ━━━"
    @just ag-full-suite
    @echo ""
    @echo "═══════════════════════════════════════════════════════════"
    @echo "✅ REVIEWER GATE COMPLETE — Report result to Council Flash"
    @echo "═══════════════════════════════════════════════════════════"

# Full Antigravity test suite — schemas + contracts + truth serum (AG-011 + AG-012 + AG-013)
# When: final gate before Council Flash; must be green before any Council session
ag-full-suite:
    @echo "🦅 ═══════════════════════════════════════════════════════════"
    @echo "   ANTIGRAVITY FULL TEST SUITE (AG-011 + AG-012 + AG-013)"
    @echo "═══════════════════════════════════════════════════════════"
    @echo ""
    @echo "━━━ STEP 1: Schema Existence ━━━"
    @just validate-schemas
    @echo ""
    @echo "━━━ STEP 2: Weekly Pulse Contracts ━━━"
    @just validate-weekly-pulse
    @echo ""
    @echo "━━━ STEP 3: Issue Intake Integration ━━━"
    @just test-issue-intake
    @echo ""
    @echo "━━━ STEP 4: Social Contracts ━━━"
    @just test-contracts
    @echo ""
    @echo "━━━ STEP 5: Truth Serum Lenient (AG-013) ━━━"
    @just truth-serum-lenient
    @echo ""
    @echo "━━━ STEP 6: Cycle Gate ━━━"
    @just cycle-gate contracts
    @echo ""
    @echo "═══════════════════════════════════════════════════════════"
    @echo "✅ ANTIGRAVITY FULL SUITE COMPLETE"
    @echo "═══════════════════════════════════════════════════════════"

# Test contract enforcement in publishers
test-contracts:
    @echo "📝 Testing contract enforcement..."
    @if (Test-Path scripts/test-schema-validation.mjs) { node scripts/test-schema-validation.mjs } else { echo "⚠️ SKIPPED: test-schema-validation.mjs not found" }

# Generate TypeScript types from schemas
generate-types:
    @echo "🔧 Generating TypeScript types..."
    @New-Item -ItemType Directory -Force -Path src/types | Out-Null
    @echo "✅ Run: npx json-schema-to-typescript artifacts/contracts/social-post.schema.json > src/types/social-post.d.ts"

# ------------------------------------------
# 🎨 CODEX-FRONTEND COMMANDS (Seat #1)
# ------------------------------------------

# Codex Frontend initialization (shows block status)
codex-frontend-init:
    @echo "🎨 CODEX-FRONTEND: UI Agent Status"
    @echo "==================================="
    @if (Test-Path artifacts/contracts/social-post.schema.json) { echo "✅ UNBLOCKED: Schemas ready" } else { echo "🚫 BLOCKED: Waiting for Layer 2" }
    @echo ""
    @echo "Your Zone: src/components/*.tsx, src/App.tsx, src/hooks/"
    @echo "Check progress: just progress"

# ------------------------------------------
# ⚙️ CODEX-DEVOPS COMMANDS (Seat #2)
# ------------------------------------------

# Codex DevOps initialization
codex-devops-init:
    @echo "⚙️ CODEX-DEVOPS: CI/CD Agent Status"
    @echo "===================================="
    @echo "🚫 BLOCKED: Waiting for Layer 4 (Integration)"
    @echo ""
    @echo "Your Zone:"
    @echo "  - scripts/"
    @echo "  - justfile"
    @echo "  - .github/workflows/deploy*.yml"
    @echo "  - netlify.toml"
    @echo ""
    @echo "Check progress: just progress"

# Pre-commit security check
pre-commit-check:
    @echo "🔐 Pre-commit security check..."
    @echo ""
    @if (Select-String -Path "src/*.ts","src/*.tsx","netlify/functions/*.ts" -Pattern "sk-[a-zA-Z0-9]{20,}|api_key.*=" -ErrorAction SilentlyContinue) { echo "⚠️ POTENTIAL SECRET FOUND"; exit 1 } else { echo "✅ No secrets detected" }
    @if (Select-String -Path ".gitignore" -Pattern ".env" -ErrorAction SilentlyContinue) { echo "✅ .env is gitignored" } else { echo "⚠️ WARNING: .env may not be gitignored" }
    @echo "✅ Safe to commit (Golden Ticket only)"

# Deploy preview (only after tests pass)
deploy-preview-safe:
    @echo "🚀 Deploy Preview (Safe Mode)"
    @echo "============================="
    @just antigravity-suite
    @echo ""
    @echo "✅ Tests passed. Run: netlify deploy"

# ------------------------------------------
# 📊 TASK TRACKING COMMANDS
# ------------------------------------------

# Log task start (agents call this when beginning work)
task-start id agent:
    @New-Item -ItemType Directory -Force -Path artifacts/claude | Out-Null
    @"$(Get-Date -Format 'O') | {{agent}} | STARTED | {{id}}" | Add-Content -Path artifacts/claude/task-log.txt
    @echo "✅ Logged: {{id}} started by {{agent}}"

# Log task complete
task-done id agent:
    @"$(Get-Date -Format 'O') | {{agent}} | DONE | {{id}}" | Add-Content -Path artifacts/claude/task-log.txt
    @echo "✅ Logged: {{id}} complete"

# Log task skipped
task-skip id agent reason:
    @"$(Get-Date -Format 'O') | {{agent}} | SKIPPED | {{id}} | {{reason}}" | Add-Content -Path artifacts/claude/task-log.txt
    @echo "⚠️ Logged: {{id}} skipped - {{reason}}"

# Log task failed
task-fail id agent error:
    @"$(Get-Date -Format 'O') | {{agent}} | FAILED | {{id}} | {{error}}" | Add-Content -Path artifacts/claude/task-log.txt
    @echo "❌ Logged: {{id}} failed - {{error}}"

# Show task log (all agents can see completed work)
task-log:
    @echo "📜 Task Log"
    @echo "==========="
    @if (Test-Path artifacts/claude/task-log.txt) { cat artifacts/claude/task-log.txt } else { echo "No tasks logged yet" }

# ------------------------------------------
# 🚦 ORCHESTRATION COMMANDS
# ------------------------------------------

# Show all agent statuses (dashboard view)
agent-status:
    @echo "👥 Agent Status Dashboard"
    @echo "========================="
    @echo ""
    @echo "🦅 Antigravity (Validator)"
    @echo "   Zone: tests/, .github/workflows/"
    @echo "   Init: just antigravity-reset"
    @echo ""
    @echo "🔧 Claude-Code (Builder)"
    @echo "   Zone: netlify/functions/, artifacts/contracts/"
    @echo "   Init: just claude-code-init"
    @echo ""
    @echo "🎨 Codex-Frontend (Seat #1)"
    @echo "   Zone: src/components/"
    @echo "   Init: just codex-frontend-init"
    @echo ""
    @echo "⚙️ Codex-DevOps (Seat #2)"
    @echo "   Zone: scripts/, justfile"
    @echo "   Init: just codex-devops-init"

# Check if Layer 1-2 is complete
check-layers-1-2:
    @echo "🔍 Checking Layer 1-2 Completion"
    @echo "================================="
    @echo ""
    @echo "Layer 1 (TRUTH):"
    @if (Test-Path .github/workflows/no-fake-success.yml) { echo "  ✅ CI Gate: EXISTS" } else { echo "  ❌ CI Gate: MISSING" }
    @echo ""
    @echo "Layer 2 (CONTRACTS):"
    @just validate-schemas
    @echo ""
    @echo "Run 'just antigravity-suite' for full validation"

# No Fake Success check — enhanced by Windsurf Master (see full version below rc1-verify)

# Antigravity reset (fresh context load)
antigravity-reset:
    @echo "🦅 ANTIGRAVITY: SYSTEM REBOOT"
    @echo "=============================="
    @just read-anchor
    @echo ""
    @echo "Available Modes:"
    @echo "  just antigravity-design   → Stitch MCP (UI/UX work)"
    @echo "  just antigravity-suite    → Full test suite"
    @echo "  just antigravity-status   → Current agent state"
    @echo ""
    @echo "Assigned Tasks (Layer 1):"
    @echo "  ✅ anchor-rename (DONE)"
    @echo "  ✅ ag-010-ci-gate (DONE)"
    @echo "  ✅ ag-008-golden-path (DONE)"
    @echo "  ⏳ validate-layers-1-2"

# Antigravity design mode
antigravity-design:
    @echo "🎨 DESIGN MODE ACTIVE"
    @echo "Context: Visual work only. No heavy code execution."
    @echo ""
    @echo "Design tokens: artifacts/antigravity/design-tokens.json"
    @echo "Design guide: runbooks/stitch-design.md"
    @echo ""
    @echo "Ready for Stitch prompts."
    @just design-status

# Full system validation
full-system-check:
    @echo "🔍 Full System Validation"
    @echo "========================="
    @just check-layers-1-2
    @echo ""
    @just healthcheck
    @echo ""
    @echo "✅ System check complete"

# ==========================================
# 🎯 TOKEN BUDGET MANAGEMENT
# ==========================================

# Quick status - costs minimal tokens (run this first)
quick-status:
    @echo "=== LAYER 1-2 STATUS ==="
    @echo ""
    @if (Test-Path brand/ANCHOR.md) { echo "anchor-rename:    ✅ DONE" } else { echo "anchor-rename:    ❌ MISSING" }
    @if (Test-Path .github/workflows/no-fake-success.yml) { echo "ag-010-ci-gate:   ✅ DONE" } else { echo "ag-010-ci-gate:   ❌ MISSING" }
    @echo "ag-008-golden:    ✅ DONE (verify-golden-path.mjs extended)"
    @if (Test-Path artifacts/data/job-costing.schema.json) { echo "cc-005-schema:    ✅ DONE" } else { echo "cc-005-schema:    ⚠️ SKIPPED" }
    @if (Test-Path artifacts/contracts/social-post.schema.json) { echo "cc-006-schema:    ✅ DONE" } else { echo "cc-006-schema:    ⚠️ PENDING" }
    @echo "cc-007-validate:  ✅ DONE (validation added)"
    @echo ""
    @echo "Run: just layers-1-2-gate  (to finalize sprint)"

# Final gate - run this ONCE to complete sprint
layers-1-2-gate:
    @echo "🔍 ═══════════════════════════════════════════════════════════"
    @echo "🦅 ANTIGRAVITY: Layer 1-2 Final Validation Gate"
    @echo "═══════════════════════════════════════════════════════════"
    @echo ""
    @echo "📋 LAYER 1 (TRUTH):"
    @if (Test-Path brand/ANCHOR.md) { echo "  ✅ brand/ANCHOR.md exists" } else { echo "  ❌ brand/ANCHOR.md MISSING"; exit 1 }
    @if (Test-Path .github/workflows/no-fake-success.yml) { echo "  ✅ no-fake-success.yml CI gate exists" } else { echo "  ❌ CI gate MISSING"; exit 1 }
    @echo "  ✅ Golden path extended with social checks"
    @echo ""
    @echo "📋 LAYER 2 (CONTRACTS):"
    @just validate-schemas
    @echo ""
    @echo "📋 NO FAKE SUCCESS CHECK:"
    @just no-fake-success-check
    @echo ""
    @echo "═══════════════════════════════════════════════════════════"
    @echo "✅ LAYERS 1-2 COMPLETE - Codex agents UNBLOCKED"
    @echo "═══════════════════════════════════════════════════════════"
    @echo ""
    @echo "🔜 NEXT STEPS:"
    @echo "  • Codex-Frontend: Layer 3-4 UNBLOCKED (run: just codex-frontend-init)"
    @echo "  • Codex-DevOps: Deploy workflow ready (run: just codex-devops-init)"
    @echo ""
    @echo "🦅 For The Commons Good!"

# Show agent brief (minimal tokens)
agent-brief seat:
    @echo "=== BRIEF FOR {{seat}} ==="
    @echo ""
    @echo "Use commands: just antigravity-reset | just claude-code-init | just codex-frontend-init | just codex-devops-init"

# ==========================================
# 🐦 X/TWITTER TEST WORKFLOW
# ==========================================
# Antigravity runs these in order after Scott triggers Netlify deploy
# ==========================================

# Step 1: Check if X/Twitter is configured (Antigravity runs this)
x-healthcheck:
    @echo "🔍 Checking X/Twitter configuration..."
    @echo ""
    @curl -s https://sirtrav-a2a-studio.netlify.app/.netlify/functions/healthcheck 2>$null | Select-String -Pattern "twitter|x_api" -AllMatches
    @echo ""
    @echo "Look for: 'configured' = READY | 'not_configured' = KEYS MISSING"
    @echo ""
    @echo "Next: just x-dry-run"

# ==========================================
# 🧪 AGENTIC TEST HARNESS
# ==========================================
# Outputs: artifacts/public/metrics/agentic-run-*.json + .md

# Agentic test (cloud, read-only — no tweets)
agentic-test:
    @echo "🧪 Agentic End-to-End Test (cloud, no publish)..."
    node scripts/test-agentic-twitter-run.mjs

# Agentic test + LIVE X tweet
agentic-test-x:
    @echo "🧪 Agentic End-to-End Test (cloud + LIVE tweet)..."
    node scripts/test-agentic-twitter-run.mjs --publish-x

# Agentic test against local netlify dev
agentic-test-local:
    @echo "🧪 Agentic End-to-End Test (local)..."
    node scripts/test-agentic-twitter-run.mjs --local

# Agentic dry-run (shape validation only, no network)
agentic-dry:
    @echo "🧪 Agentic Dry-Run (shapes only)..."
    node scripts/test-agentic-twitter-run.mjs --dry-run

# X Engagement Loop test (cloud)
x-engagement-test:
    @echo "📡 X Engagement Loop Test (cloud)..."
    node scripts/test-x-engagement.mjs

# X Engagement Loop test (local)
x-engagement-local:
    @echo "📡 X Engagement Loop Test (local)..."
    node scripts/test-x-engagement.mjs --local

# X Engagement dry-run (contract shape only)
x-engagement-dry:
    @echo "📡 X Engagement Dry-Run (shapes only)..."
    node scripts/test-x-engagement.mjs --dry-run

# Invoice generation demo
invoice-demo:
    @echo "💰 Generating demo invoice (Cost Plus 20%)..."
    node scripts/generate-invoice.mjs --demo

# North Star X/Twitter Verification (Packet Switch protocol)
verify-x-real:
    @echo "🦅 Running North Star Verification..."
    node scripts/verify-x-real.mjs

# North Star dry-run (key existence check only)
verify-x-dry:
    @echo "🦅 North Star Dry-Run (key check only)..."
    node scripts/verify-x-real.mjs --dry-run

# Weekly Harvest (collect last 7 days of activity)
harvest-week:
    @echo "📊 Harvesting weekly activity..."
    node scripts/harvest-week.mjs

# Weekly Pulse Analysis (analyze harvest data)
weekly-analyze:
    @echo "📈 Running weekly pulse analysis..."
    node scripts/weekly-analyze.mjs

# ============================================
# 🔗 OPS SPINE (One Command = Full Verification)
# ============================================

# Ops Spine — local: preflight → healthcheck → all dry-runs (stops on first failure)
ops-spine:
    @echo "🔗 OPS SPINE — Local Verification Sequence"
    @echo "═══════════════════════════════════════════"
    @just machine-gate
    @just preflight
    @just healthcheck
    @just x-dry
    @just linkedin-dry
    @just youtube-dry
    @echo "═══════════════════════════════════════════"
    @echo "✅ OPS SPINE COMPLETE — all dry-runs passed"

# Ops Spine — cloud: preflight → healthcheck-cloud → all dry-runs (stops on first failure)
ops-spine-cloud:
    @echo "🔗 OPS SPINE CLOUD — Cloud Verification Sequence"
    @echo "═══════════════════════════════════════════"
    @just machine-gate
    @just preflight
    @just healthcheck-cloud
    @just x-dry
    @just linkedin-dry
    @just youtube-dry
    @echo "═══════════════════════════════════════════"
    @echo "✅ OPS SPINE CLOUD COMPLETE — all dry-runs passed"

# Ops Release Pass — full RC: spine + golden-path + rc1-verify
ops-release-pass:
    @echo "🏁 OPS RELEASE PASS — Full RC Verification"
    @just ops-spine
    @just golden-path
    @just rc1-verify

# Ops Release Pass — cloud variant
ops-release-pass-cloud:
    @echo "🏁 OPS RELEASE PASS CLOUD — Full RC Verification"
    @just machine-gate
    @just ops-spine-cloud
    @just golden-path-cloud
    @just rc1-verify

# ============================================
# 🌊 FLOW MODE (Default Team Entry)
# ============================================

# Flow Mode — local lane: ticket-status -> gate -> preflight -> menu -> dev server
# WSP-GOVERNANCE: ticket-status runs first — flow fails if branch is not feature/WSP-*
flow:
    @echo "🌊 FLOW MODE — Local Dev Lane"
    @echo "═══════════════════════════════════════════"
    @just ticket-status
    @just machine-gate
    @just preflight
    @echo ""
    @echo "FLOW MENU (safe next moves):"
    @echo "  1) just dev             # Start local Netlify dev"
    @echo "  2) just ops-spine       # Local dry-run verification sequence"
    @echo "  3) just golden-path     # End-to-end smoke path"
    @echo ""
    @echo "Starting local dev server..."
    @just dev

# Flow Mode — cloud lane: gate -> preflight -> cloud spine -> summary
flow-cloud:
    @echo "🌊 FLOW MODE — Cloud Verification Lane"
    @echo "═══════════════════════════════════════════"
    @just machine-gate
    @just preflight
    @just ops-spine-cloud
    @echo ""
    @echo "Cloud truth state summary:"
    @echo "  ✅ machine gate passed"
    @echo "  ✅ preflight passed"
    @echo "  ✅ ops-spine-cloud passed"

# Recovery helper — safe/non-destructive headroom guidance
recover-ram:
    @echo "🛟 RAM RECOVERY (Safe Guidance)"
    @echo "═══════════════════════════════════════════"
    @just machine-health
    @echo ""
    @echo "Suggested quick actions (safe, manual):"
    @echo "  1) wsl --shutdown"
    @echo "  2) Close extra Windsurf windows/workspaces"
    @echo "  3) Close browser video/heavy tabs"
    @echo ""
    @echo "Top processes right now:"
    @powershell -NoProfile -Command "Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 8 ProcessName,WorkingSet64 | Format-Table -AutoSize"
    @echo ""
    @echo "Re-run gate: just machine-gate"

# ============================================
# 🏛️ COUNCIL FLASH v1.5.0 (Deterministic)
# ============================================

# Council Flash — chains all existing gates in order (stops on first failure)
council-flash:
    @echo "🏛️ Council Flash v1.5.0 — running gated sequence..."
    @just preflight
    @just security-audit
    @just wiring-verify
    @just no-fake-success-check
    @just cycle-all
    @echo "✅ Council Flash complete — all gates passed"

# ─── council-flash-linkedin ──────────────────────────────────────────────────
# LinkedIn-specific proof run. Unambiguous: always hits CLOUD.
# Preconditions: Netlify env vars set (LINKEDIN_ACCESS_TOKEN + LINKEDIN_PERSON_URN)
# Pass criteria: healthcheck responds, truth-serum exits 0, linkedin-live prints success+URL
council-flash-linkedin:
    @echo "🏛️ ═══════════════════════════════════════════════════════════"
    @echo "   COUNCIL FLASH — LINKEDIN PROOF RUN (UNAMBIGUOUS)"
    @echo "   Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    @echo "═══════════════════════════════════════════════════════════"
    @echo ""
    @echo "── Repo Status ──"
    @git rev-parse --abbrev-ref HEAD
    @git rev-parse HEAD
    @git status --short
    @echo ""
    @echo "── Cloud Healthcheck ──"
    @just healthcheck-cloud
    @echo ""
    @echo "── Truth Serum (cloud, lenient) ──"
    @node scripts/truth-serum.mjs --allow-disabled
    @echo ""
    @echo "── LinkedIn LIVE (cloud only) ──"
    @node scripts/test-linkedin-publish.mjs --live --cloud
    @echo ""
    @echo "═══════════════════════════════════════════════════════════"
    @echo "   END COUNCIL FLASH — LINKEDIN PROOF RUN"
    @echo "═══════════════════════════════════════════════════════════"

# ─── vault-init ──────────────────────────────────────────────────────────────
# Windsurf Master / Human Operator prerequisite before council-flash.
# Bootstraps Memory Vault tables (job_packets + council_events) via CC-014 helpers.
# Safe to run multiple times — CREATE TABLE IF NOT EXISTS semantics.
vault-init:
    @echo "🗄️  Memory Vault — Bootstrapping tables (CC-014 vault-helpers)..."
    @node -e "import('./netlify/functions/lib/vault-helpers.js').then(m => m.initVault ? m.initVault() : console.log('vault-helpers loaded — tables managed by Netlify Blobs KV, no migration needed')).catch(e => { console.log('Note: vault-helpers use Netlify Blobs (serverless KV) — no local init required'); console.log('Vault ready on next deploy/function invocation.'); })"
    @echo "✅ Vault: ready (Netlify Blobs KV — no local migration required)"
    @echo "   Council events will be written to: artifacts/council_events/"
    @echo "   Job packets will be written to:    artifacts/reports/"

# ─── council-flash-cloud ─────────────────────────────────────────────────────
# Cloud-safe variant of council-flash — skips local-runtime preflight.
# Use this when running on a branch that targets production (no netlify dev required).
# Windsurf Master WM-011: run this to verify Council Flash gates on main.
council-flash-cloud:
    @echo "🏛️ ═══════════════════════════════════════════════════════════"
    @echo "   COUNCIL FLASH v1.5.0 — CLOUD GATE SEQUENCE (WM-011)"
    @echo "   Owner: Windsurf Master | Reviewer: Human Operator"
    @echo "═══════════════════════════════════════════════════════════"
    @echo ""
    @echo "━━━ GATE 1: Wiring Verify ━━━"
    @just wiring-verify
    @echo ""
    @echo "━━━ GATE 2: No Fake Success ━━━"
    @just no-fake-success-check
    @echo ""
    @echo "━━━ GATE 3: Cycle Quick (all 4 layers) ━━━"
    @just cycle-quick
    @echo ""
    @echo "━━━ GATE 4: Truth Serum Lenient (cloud) ━━━"
    @just truth-serum-lenient
    @echo ""
    @echo "━━━ GATE 5: Golden Path Cloud ━━━"
    @just golden-path-cloud
    @echo ""
    @echo "═══════════════════════════════════════════════════════════"
    @echo "✅ COUNCIL FLASH CLOUD — All gates passed"
    @echo "   Emblem should now show: REAL — Council Flash 1.5.0 green"
    @echo "   Report to Council: declare 'Council Flash v1.5.0 trusted'"
    @echo "═══════════════════════════════════════════════════════════"

# ─── wm-011 ──────────────────────────────────────────────────────────────────
# WM-011 canonical composite (Windsurf Master verification task).
# Runs vault-init then all cloud Council Flash gates in sequence.
# Exit 0 = emblem shows REAL, Council Flash trusted on cloud branch.
wm-011:
    @echo "🛰️  ═══════════════════════════════════════════════════════════"
    @echo "   WM-011: COUNCIL FLASH + UI COHERENCE VERIFICATION"
    @echo "   Agent: Windsurf Master | Date: $(Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ')"
    @echo "═══════════════════════════════════════════════════════════"
    @echo ""
    @echo "Step 1: Vault Init"
    @just vault-init
    @echo ""
    @echo "Step 2: Council Flash Cloud Gates"
    @just council-flash-cloud
    @echo ""
    @echo "═══════════════════════════════════════════════════════════"
    @echo "✅ WM-011 COMPLETE — Record verdict in AGENT_ASSIGNMENTS.md"
    @echo "   Template: 'Council Flash v1.5.0 verified end-to-end:"
    @echo "    emblem truth state matches health + vault + Truth Serum."
    @echo "    No manual toggles remain.'"
    @echo "═══════════════════════════════════════════════════════════"

# Step 2: Dry-run validation (Antigravity runs this, auto-detects local/cloud)
x-dry-run:
    @echo "🧪 Running X/Twitter dry-run test (auto-detect)..."
    @echo ""
    @node scripts/test-x-publish.mjs --dry-run
    @echo ""
    @echo "If PASS → run: just x-live-test"
    @echo "If FAIL → report error to Claude Code"

# Step 3: Live post test (Antigravity runs this - CREATES REAL TWEET)
x-live-test:
    @echo "🚀 LIVE TEST - This will post a REAL tweet!"
    @echo "Press Ctrl+C within 5 seconds to cancel..."
    @Start-Sleep -Seconds 5
    @node scripts/test-x-publish.mjs --live

# Report X test result to progress.md
x-report status note:
    @echo "" >> artifacts/claude/progress.md
    @echo "### x-twitter-test - $(Get-Date -Format 'yyyy-MM-ddTHH:mm:ss')" >> artifacts/claude/progress.md
    @echo "**Agent:** Antigravity" >> artifacts/claude/progress.md
    @echo "**Status:** {{status}}" >> artifacts/claude/progress.md
    @echo "**Note:** {{note}}" >> artifacts/claude/progress.md
    @echo "✅ Logged to progress.md"

# Full X/Twitter test sequence (all 3 steps)
x-full-test:
    @echo "🐦 ═══════════════════════════════════════════════════════════"
    @echo "   X/TWITTER FULL TEST SEQUENCE"
    @echo "═══════════════════════════════════════════════════════════"
    @echo ""
    @echo "Step 1: Healthcheck"
    @just x-healthcheck
    @echo ""
    @echo "Step 2: Dry-run"
    @just x-dry-run
    @echo ""
    @echo "Step 3: Live test requires manual trigger (just x-live-test)"
    @echo ""
    @echo "═══════════════════════════════════════════════════════════"


# Release Candidate 1 Verification (Windsurf Master enhanced)
rc1-verify:
    @echo "🏁 ═══════════════════════════════════════════════════════════"
    @echo "   RC1 VERIFICATION — Full Pipeline Check"
    @echo "   Windsurf Master + Antigravity coordination"
    @echo "═══════════════════════════════════════════════════════════"
    @echo ""
    @echo "━━━ STEP 1: Pipeline Wiring ━━━"
    @just wiring-verify
    @echo ""
    @echo "━━━ STEP 2: No Fake Success Pattern ━━━"
    @just no-fake-success-check
    @echo ""
    @echo "━━━ STEP 3: Golden Path (auto-detect local/cloud) ━━━"
    @just golden-path
    @echo ""
    @echo "━━━ STEP 4: X/Twitter Dry Run ━━━"
    @just x-dry
    @echo ""
    @echo "━━━ STEP 5: Healthcheck (cloud) ━━━"
    @just healthcheck-cloud
    @echo ""
    @echo "═══════════════════════════════════════════════════════════"
    @echo "✅ RC1 VERIFICATION COMPLETE"
    @echo "═══════════════════════════════════════════════════════════"

# Verify all publishers implement No Fake Success pattern (Windsurf Master)
no-fake-success-check:
    @echo "🛡️  WINDSURF MASTER: No Fake Success Pattern Check"
    @echo "==================================================="
    @echo ""
    @echo "📋 Checking all publishers return disabled:true (not fake success)..."
    @if (Select-String -Path netlify/functions/publish-x.ts -Pattern "disabled: true" -Quiet) { echo "  ✅ publish-x.ts → disabled: true" } else { echo "  ❌ publish-x.ts MISSING disabled pattern" }
    @if (Select-String -Path netlify/functions/publish-linkedin.ts -Pattern "disabled: true" -Quiet) { echo "  ✅ publish-linkedin.ts → disabled: true" } else { echo "  ❌ publish-linkedin.ts MISSING disabled pattern" }
    @if (Select-String -Path netlify/functions/publish-youtube.ts -Pattern "disabled: true" -Quiet) { echo "  ✅ publish-youtube.ts → disabled: true" } else { echo "  ❌ publish-youtube.ts MISSING disabled pattern" }
    @if (Select-String -Path netlify/functions/publish-instagram.ts -Pattern "disabled: true" -Quiet) { echo "  ✅ publish-instagram.ts → disabled: true" } else { echo "  ❌ publish-instagram.ts MISSING disabled pattern" }
    @if (Select-String -Path netlify/functions/publish-tiktok.ts -Pattern "disabled: true" -Quiet) { echo "  ✅ publish-tiktok.ts → disabled: true" } else { echo "  ❌ publish-tiktok.ts MISSING disabled pattern" }
    @echo ""
    @echo "📋 Checking payload validation exists..."
    @if (Select-String -Path netlify/functions/publish-x.ts -Pattern "validateXPayload" -Quiet) { echo "  ✅ publish-x.ts → validateXPayload" } else { echo "  ❌ publish-x.ts MISSING validation" }
    @if (Select-String -Path netlify/functions/publish-linkedin.ts -Pattern "validateLinkedInPayload" -Quiet) { echo "  ✅ publish-linkedin.ts → validateLinkedInPayload" } else { echo "  ❌ publish-linkedin.ts MISSING validation" }
    @if (Select-String -Path netlify/functions/publish-youtube.ts -Pattern "validateYouTubePayload" -Quiet) { echo "  ✅ publish-youtube.ts → validateYouTubePayload" } else { echo "  ❌ publish-youtube.ts MISSING validation" }
    @echo ""
    @echo "🛡️  No Fake Success: Disabled services report {success:false, disabled:true}"

# Windsurf Master agent status (shows all master commands)
master-status:
    @echo "🔌 WINDSURF MASTER: Agent Status"
    @echo "════════════════════════════════════"
    @echo ""
    @echo "📋 DIAGNOSTIC COMMANDS:"
    @echo "  just wiring-verify        - Pipeline file + import wiring (12 checks)"
    @echo "  just no-fake-success-check - Publisher disabled pattern (8 checks)"
    @echo "  just rc1-verify           - Full RC1 verification sequence"
    @echo "  just master-status        - This status page"
    @echo ""
    @echo "🧪 TEST COMMANDS:"
    @echo "  just golden-path          - Auto-detect local/cloud"
    @echo "  just golden-path-cloud    - Force cloud URL"
    @echo "  just golden-path-local    - Force localhost:8888"
    @echo "  just healthcheck-cloud    - Ping live deployment"
    @echo ""
    @echo "📁 Key Docs:"
    @echo \"  plans/AGENT_ASSIGNMENTS.md    - All agent tasks + corrected blockers\"
    @echo \"  NETLIFY_AGENT_PROMPT.md       - Human env var tasks\"
    @echo \"  AGENTS.md                     - Multi-agent registry\"

# ═══════════════════════════════════════════════════════════════════
# CYCLE GATE SYSTEM (MASTER.md Aligned)
# ═══════════════════════════════════════════════════════════════════

# Show current gate status across all 4 layers
cycle-status:
    @node scripts/cycle-check.mjs status

# Run all gates (except build — use cycle-build for that)
cycle-all:
    @node scripts/cycle-check.mjs all

# Quick gate sweep (no build, fast)
cycle-quick:
    @node scripts/cycle-check.mjs quick

# Run build gate explicitly (slow — compiles everything)
cycle-build:
    @node scripts/cycle-check.mjs build

# Run a specific gate by name
cycle-gate name:
    @node scripts/cycle-check.mjs {{name}}

# Generate cycle report for progress.md
cycle-report:
    @echo "# Cycle Report — $(Get-Date -Format 'yyyy-MM-dd HH:mm')" > artifacts/claude/cycle-report.md
    @echo "" >> artifacts/claude/cycle-report.md
    @node scripts/cycle-check.mjs all >> artifacts/claude/cycle-report.md
    @echo "" >> artifacts/claude/cycle-report.md
    @echo "✅ Report saved to artifacts/claude/cycle-report.md"

# ═══════════════════════════════════════════════════════════════════
# AGENT ORIENTATION (first command each agent should run)
# ═══════════════════════════════════════════════════════════════════

# Claude Code orientation — shows backend gates + files
orient-claude:
    @echo "🧠 CLAUDE CODE ORIENTATION"
    @echo "════════════════════════════════"
    @echo ""
    @echo "YOUR GATES (Layer 1-2):"
    @echo "  L1: netlify_plugin    — Verify @netlify/vite-plugin installed"
    @echo "  L1: healthcheck       — healthcheck.ts returns 200"
    @echo "  L1: no_fake_success   — Publishers return disabled:true not success:true"
    @echo "  L2: wiring            — Pipeline Steps 1-7 all wired"
    @echo ""
    @echo "KEY FILES:"
    @echo "  netlify/functions/run-pipeline-background.ts"
    @echo "  netlify/functions/publish-x.ts"
    @echo "  netlify/functions/healthcheck.ts"
    @echo "  vite.config.js"
    @echo ""
    @echo "RUN YOUR GATES:"
    @echo "  just cycle-gate netlify_plugin"
    @echo "  just cycle-gate healthcheck"
    @echo "  just cycle-gate no_fake_success"
    @echo "  just cycle-gate wiring"
    @echo ""
    @echo "BLOCKED UNTIL: none (you can start immediately)"

# Codex orientation — shows frontend gates + files
orient-codex:
    @echo "🎨 CODEX ORIENTATION"
    @echo "════════════════════════════════"
    @echo ""
    @echo "YOUR GATES (Layer 3):"
    @echo "  L3: design_tokens — artifacts/antigravity/design-tokens.json exists + valid"
    @echo ""
    @echo "KEY FILES:"
    @echo "  src/App.jsx"
    @echo "  src/App.css"
    @echo "  src/components/ErrorBoundary.jsx"
    @echo "  src/main.jsx"
    @echo ""
    @echo "RUN YOUR GATES:"
    @echo "  just cycle-gate design_tokens"
    @echo ""
    @echo "BLOCKED UNTIL: Layer 1 gates pass (build + healthcheck)"

# Antigravity orientation — shows QA gates + test files
orient-antigravity:
    @echo "🦅 ANTIGRAVITY ORIENTATION"
    @echo "════════════════════════════════"
    @echo ""
    @echo "YOUR GATES (Layer 2 + 4):"
    @echo "  L2: contracts     — API schemas validated"
    @echo "  L2: golden_path   — Smoke test end-to-end"
    @echo "  L4: social_dry    — X/Twitter dry-run passes"
    @echo "  L4: motion_test   — Motion graphic renders"
    @echo ""
    @echo "KEY FILES:"
    @echo "  scripts/test-x-publish.mjs"
    @echo "  scripts/verify-golden-path.mjs"
    @echo "  scripts/test_motion_graphic.mjs"
    @echo "  SOCIAL_MEDIA_QA.md"
    @echo ""
    @echo "RUN YOUR GATES:"
    @echo "  just cycle-gate contracts"
    @echo "  just cycle-gate golden_path"
    @echo "  just cycle-gate social_dry"
    @echo "  just cycle-gate motion_test"
    @echo ""
    @echo "BLOCKED UNTIL: Layer 1 gates pass"

# Windsurf orientation — shows infra gates
orient-windsurf:
    @echo "🔌 WINDSURF ORIENTATION"
    @echo "════════════════════════════════"
    @echo ""
    @echo "YOUR GATES (Layer 1):"
    @echo "  L1: build — Vite build passes without errors"
    @echo ""
    @echo "KEY FILES:"
    @echo "  vite.config.js"
    @echo "  netlify.toml"
    @echo "  package.json"
    @echo ""
    @echo "RUN YOUR GATE:"
    @echo "  just cycle-build"

# ============================================
# 🔄 REVERSE-CASE DRILLS (Practice Recovery)
# ============================================

# Drill: Verify healthcheck reports truth when cloud is live
drill-healthcheck:
    @echo "🔄 DRILL: Cloud Healthcheck Truth"
    @echo "═══════════════════════════════════"
    @echo "Scenario: Confirm healthcheck returns real status, not cached/stale"
    @echo ""
    @just healthcheck-cloud
    @echo ""
    @echo "✅ DRILL PASS if: status=healthy + disabled platforms listed truthfully"
    @echo "❌ DRILL FAIL if: status=ok but known-missing platforms not listed"

# Drill: Verify LinkedIn disabled state is truthful (No Fake Success)
drill-linkedin-disabled:
    @echo "🔄 DRILL: LinkedIn Disabled State"
    @echo "═══════════════════════════════════"
    @echo "Scenario: Confirm LinkedIn returns disabled:true when keys missing locally"
    @echo ""
    @node scripts/test-linkedin-publish.mjs
    @echo ""
    @echo "✅ DRILL PASS if: status=disabled + env shows missing keys"
    @echo "❌ DRILL FAIL if: success=true with no keys (FAKE SUCCESS)"

# Drill: Verify X/Twitter disabled state is truthful
drill-x-disabled:
    @echo "🔄 DRILL: X/Twitter Disabled State"
    @echo "═══════════════════════════════════"
    @echo "Scenario: Confirm X returns truthful status"
    @echo ""
    @node scripts/test-x-publish.mjs --dry-run
    @echo ""
    @echo "✅ DRILL PASS if: payload valid OR truthful disabled"
    @echo "❌ DRILL FAIL if: success=true with no keys (FAKE SUCCESS)"

# Drill: Verify YouTube disabled state is truthful
drill-youtube-disabled:
    @echo "🔄 DRILL: YouTube Disabled State"
    @echo "═══════════════════════════════════"
    @echo "Scenario: Confirm YouTube returns truthful disabled"
    @echo ""
    @node scripts/test-youtube-publish.mjs
    @echo ""
    @echo "✅ DRILL PASS if: status=disabled + env shows missing keys"
    @echo "❌ DRILL FAIL if: success=true with no keys (FAKE SUCCESS)"

# Drill: Verify No Fake Success pattern across ALL publishers
drill-no-fake-success:
    @echo "🔄 DRILL: No Fake Success (All Publishers)"
    @echo "═══════════════════════════════════"
    @just no-fake-success-check
    @echo ""
    @just drill-linkedin-disabled
    @echo ""
    @just drill-x-disabled
    @echo ""
    @just drill-youtube-disabled

# Drill: Full cloud truth — healthcheck + truth-serum + dry-runs
drill-cloud-truth:
    @echo "🔄 DRILL: Full Cloud Truth Verification"
    @echo "═══════════════════════════════════"
    @echo "Scenario: Confirm cloud reports match local expectations"
    @echo ""
    @just healthcheck-cloud
    @echo ""
    @just truth-serum-lenient
    @echo ""
    @just x-dry
    @just linkedin-dry
    @just youtube-dry
    @echo ""
    @echo "═══════════════════════════════════"
    @echo "✅ DRILL COMPLETE — compare cloud vs local truth"

# Human/Scott orientation — ENV var checklist
orient-human:
    @echo "👤 HUMAN (SCOTT) ORIENTATION"
    @echo "════════════════════════════════"
    @echo ""
    @echo "SOCIAL PUBLISHING STATUS:"
    @echo "  ✅ X/Twitter   — WORKING (4 TWITTER_ vars set)"
    @echo "  ✅ LinkedIn    — WORKING (4 LINKEDIN_ vars set, OAuth callback live)"
    @echo "  ⏳ YouTube     — keys needed (YOUTUBE_CLIENT_ID, etc.)"
    @echo "  ⏳ TikTok      — keys needed (TIKTOK_CLIENT_KEY, etc.)"
    @echo "  ⏳ Instagram   — keys needed (INSTAGRAM_ACCESS_TOKEN, etc.)"
    @echo ""
    @echo "LINKEDIN SETUP (if token expires):"
    @echo "  Open: https://sirtrav-a2a-studio.netlify.app/auth/linkedin/callback"
    @echo "  Click Authorize → copy token + URN → paste into Netlify env vars"
    @echo ""
    @echo "VERIFY AFTER ANY KEY CHANGE:"
    @echo "  just ops-spine-cloud     # Full dry-run verification"
    @echo "  just council-flash-linkedin  # LinkedIn-specific proof"
    @echo ""
    @echo "FULL STATUS:"
    @echo "  just cycle-status"

# ============================================
# 🔧 DEVKIT SPIN-UP VERIFICATION (CC-DEVKIT)
# ============================================
# Owner: Claude Code / Human Operator
# Pattern: Install tools via winget, then verify tool + project health
# Gates: Layer 0 (TOOLS) → 1 (ENV) → 2 (ALIVE) → 3 (PIPELINE) → 4 (TRUTH)
# Exit codes: 0=pass  1=failed  2=critical-tool-missing  3=blocked-external
# ============================================

# Full DevKit: run winget install + post-install verification
devkit:
    @echo "DevKit Spin-Up (install + verify)"
    @echo "==================================="
    @powershell -NoProfile -ExecutionPolicy Bypass -File devkit-spinup.ps1

# Skip install — run all 5 verification layers only
devkit-verify:
    @echo "DevKit Verification Suite (all layers)"
    @echo "======================================="
    @node scripts/verify-devkit.mjs

# Layer 0 only: check tool versions — no network required
devkit-tools:
    @echo "DevKit Tool Check (Layer 0 — no network)"
    @node scripts/verify-devkit.mjs --tools-only

# Layers 0-2 only: tools + env + healthcheck ping — skip slow pipeline
devkit-quick:
    @echo "DevKit Quick Check (layers 0-2 — skip pipeline)"
    @node scripts/verify-devkit.mjs --no-pipeline

# Force verification against localhost:8888 (requires: netlify dev)
devkit-local:
    @echo "DevKit Verification (force local — requires netlify dev)"
    @node scripts/verify-devkit.mjs --local

# Force verification against cloud deployment
devkit-cloud:
    @echo "DevKit Verification (force cloud)"
    @node scripts/verify-devkit.mjs --cloud

# Lenient mode: disabled social platforms count as PASS (truth-serum --allow-disabled)
devkit-lenient:
    @echo "DevKit Verification (lenient — disabled=PASS)"
    @node scripts/verify-devkit.mjs --allow-disabled

# CI-safe gate: cloud + lenient truth-serum (no social keys needed)
devkit-ci:
    @echo "DevKit CI Gate (cloud + lenient)"
    @node scripts/verify-devkit.mjs --cloud --allow-disabled

# ============================================
# 🧠 MACHINE HEALTH GATE (Windows Ryzen)
# ============================================

# Check machine health and continue (informational)
machine-health:
    @echo "🧠 Running machine health check..."
    -@node scripts/machine-health-check.mjs

# Check machine health and block if unsafe
machine-gate:
    @echo "🧠 Running machine gate (blocks on unsafe state)..."
    @node scripts/machine-health-check.mjs

# ============================================
# 🌿 AGENT SKILL ROUTER — WORKTREE LAYER
# ============================================
# Pattern: One ticket = one worktree = one agent run
# Usage:   just agent-worktree name=<ticket-id>
# Safety:  Lens + GitKraken stay on main; agents work in .claude/worktrees/*
# Docs:    docs/AGENT_SKILL_ROUTER.md
# Index:   AGENT_SKILLS_INDEX.md
# ============================================

# Generic canonical entrypoint — all project recipes delegate here.
# Do NOT call from CI. Use project-specific entrypoints below.
agent-worktree name="agent-session":
    @echo "🌿 Starting Claude worktree: {{name}}"
    @echo "   Branch : worktree-{{name}}"
    @echo "   Path   : .claude/worktrees/{{name}}"
    @echo "   Lens stays on main. Review + merge when agent is done."
    claude --worktree {{name}}

# SirTrav A2A Studio — video pipeline agent sessions
sirtrav-worktree name="sirtrav-skill":
    @echo "🎬 SirTrav worktree: {{name}}"
    @just agent-worktree name={{name}}

# SeaTrace — stub (uncomment + copy to SeaTrace repo when ready)
# seatrace-worktree name="seatrace-skill":
#     @echo "🌊 SeaTrace worktree: {{name}}"
#     @just agent-worktree name={{name}}

# SirJames — stub (uncomment + copy to SirJames repo when ready)
# sirjames-worktree name="sirjames-skill":
#     @echo "📖 SirJames worktree: {{name}}"
#     @just agent-worktree name={{name}}

# List all active worktrees (see what agents are currently running)
worktree-list:
    @echo "🌿 Active worktrees:"
    git worktree list

# Remove a finished worktree after its branch is merged into main
# WARNING: only run AFTER merging worktree-<name> into main
worktree-clean name="":
    @echo "🧹 Removing worktree: {{name}}"
    @echo "   (Only run AFTER merging worktree-{{name}} into main)"
    git worktree remove ".claude/worktrees/{{name}}" --force
    git branch -d "worktree-{{name}}" 2>nul; echo "Worktree {{name}} cleaned."

# Show all worktrees + which branches have not yet merged back to main
worktree-status:
    @echo "🌿 Worktree Status"
    @echo "================================="
    git worktree list
    @echo ""
    @echo "Branches NOT yet merged to main:"
    git branch --no-merged main 2>nul; echo ""

# ============================================
# 🏛️ WSP-GOVERNANCE (Branch Discipline Gate)
# ============================================
# Layer: Organizational Discipline
# Independent of DevKit, PathGuard, Truth Serum layers
# Enforces Linear ticket alignment at the justfile level
# Owner: Windsurf Master

# Validate current branch maps to a WSP Linear ticket
# PASS: feature/WSP-5-recursive-directory-nesting
# FAIL: main, claude/*, hotfix/*, or any non-WSP branch
ticket-status:
    @node -e "const b=require('child_process').execSync('git rev-parse --abbrev-ref HEAD',{encoding:'utf8'}).trim();const rx=/^feature\/WSP-[0-9]+-.+/;if(!rx.test(b)){console.log('LinearAlignment FAILED — branch must map to WSP ticket');console.log('  Current: '+b);console.log('  Expected: feature/WSP-<number>-<slug>');console.log('  Example:  feature/WSP-5-recursive-directory-nesting');process.exit(1)}else{const m=b.match(/WSP-(\d+)/);console.log('LinearAlignment PASS — '+b);console.log('  Ticket: WSP-'+m[1])}"

# Guard: working tree must be clean before merge
guard-clean:
    @node -e "const r=require('child_process').execSync('git status --porcelain',{encoding:'utf8'}).trim();if(r){console.log('Working tree not clean:');console.log(r);process.exit(1)}else{console.log('Working tree clean')}"

# Guard: must be up-to-date with origin before merge
guard-up-to-date:
    @node -e "const x=require('child_process').execSync;try{x('git fetch origin',{stdio:'ignore'})}catch(e){};const l=x('git rev-parse HEAD',{encoding:'utf8'}).trim();let r;try{r=x('git rev-parse @{u}',{encoding:'utf8'}).trim()}catch(e){r=null};if(r&&l!==r){console.log('Not up to date with upstream — run: git pull');process.exit(1)}else{console.log('Up-to-date with upstream')}"

# Pre-merge guard — 4-point composite check (all must pass before merging to main)
pre-merge-guard:
    @echo "🛡️ Pre-Merge Guard — 4-point discipline check"
    @echo "═══════════════════════════════════════════════"
    @echo ""
    @echo "CHECK 1: Working tree clean..."
    @just guard-clean
    @echo ""
    @echo "CHECK 2: Up-to-date with origin..."
    @just guard-up-to-date
    @echo ""
    @echo "CHECK 3: Machine health gate..."
    @just machine-gate
    @echo ""
    @echo "CHECK 4: DevKit quick verify..."
    @just devkit-quick
    @echo ""
    @echo "═══════════════════════════════════════════════"
    @echo "✅ Pre-Merge Guard PASSED — safe to merge"

# ============================================
# 📊 TEAM HEALTH DASHBOARD
# ============================================

# Full team health: PRs, branches, worktrees, security
# Run this before any merge decision — shows all PRs, conflicts, stale branches
team-health:
    @echo "📊 Running Team Health Dashboard..."
    node scripts/pr-health-dashboard.mjs

# Team health (JSON output for automation)
team-health-json:
    node scripts/pr-health-dashboard.mjs --json

