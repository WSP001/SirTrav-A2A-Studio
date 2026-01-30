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
