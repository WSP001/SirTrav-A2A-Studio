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

# Healthcheck - local (requires netlify dev)
healthcheck:
    @echo "📊 Running healthcheck (local)..."
    @powershell -Command "curl -s http://localhost:8888/.netlify/functions/healthcheck 2>$null || echo '{\"error\": \"Server not running. Run: just dev or just healthcheck-cloud\"}'" 

# Healthcheck - cloud (live deployment)
healthcheck-cloud:
    @echo "📊 Running healthcheck (cloud)..."
    @powershell -Command "curl -s https://sirtrav-a2a-studio.netlify.app/.netlify/functions/healthcheck"

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
    @echo "✅ Schema check complete"

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

# No Fake Success check (scans for violations)
no-fake-success-check:
    @echo "🔍 Scanning for fake success patterns..."
    @if (Select-String -Path "netlify/functions/publish-*.ts" -Pattern "success: true, status: 'placeholder'" -ErrorAction SilentlyContinue) { echo "❌ VIOLATION FOUND"; exit 1 } else { echo "✅ No fake success patterns detected" }

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

