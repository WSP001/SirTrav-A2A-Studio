#Requires -Version 5.1
<#
.SYNOPSIS
  DevKit Spin-Up — SirTrav A2A Studio
  Idempotent installer for all required development tools via winget.

.DESCRIPTION
  Installs: Git, GitHub CLI, VS Code, Docker Desktop, Node.js LTS, Python 3.12,
  just, jq, ripgrep (MSVC), netlify-cli (via npm global).

  After install: refreshes PATH from Windows registry and delegates to
  'node scripts/verify-devkit.mjs' for full tool + project health verification.

  Follows project principles:
  - No Fake Success: SKIP is honest, FAIL is explicit
  - Idempotent: re-running is safe; already-installed tools are skipped
  - Click2Kick: reads current state before acting

.EXAMPLE
  # Full install + verify (normal use)
  .\devkit-spinup.ps1

  # Skip install, run verification only
  .\devkit-spinup.ps1 -VerifyOnly

  # Install only, skip post-verification
  .\devkit-spinup.ps1 -NoVerify

.NOTES
  Run in Windows PowerShell or pwsh. Some installs may prompt for elevation.
  Open a NEW terminal window after running so PATH changes take effect.
#>
param(
    [switch]$VerifyOnly,
    [switch]$NoVerify
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ─── Color helpers ────────────────────────────────────────────────────────────
function Write-Pass  { param([string]$msg) Write-Host "  [PASS] $msg" -ForegroundColor Green }
function Write-Fail  { param([string]$msg) Write-Host "  [FAIL] $msg" -ForegroundColor Red }
function Write-Skip  { param([string]$msg) Write-Host "  [SKIP] $msg" -ForegroundColor DarkGray }
function Write-Info  { param([string]$msg) Write-Host "  [INFO] $msg" -ForegroundColor Cyan }
function Write-Warn  { param([string]$msg) Write-Host "  [WARN] $msg" -ForegroundColor Yellow }

function Write-Banner {
    param([string]$msg)
    $line = '=' * 60
    Write-Host "`n$line" -ForegroundColor Magenta
    Write-Host "  $msg" -ForegroundColor Magenta
    Write-Host "$line" -ForegroundColor Magenta
}

# ─── PATH refresh helper ──────────────────────────────────────────────────────
# winget installs update the registry but NOT the running session's PATH.
# This reads the merged Machine + User PATH into the current process so
# newly-installed tools are visible without reopening the terminal.
function Invoke-PathRefresh {
    $machinePath = [System.Environment]::GetEnvironmentVariable('PATH', 'Machine')
    $userPath    = [System.Environment]::GetEnvironmentVariable('PATH', 'User')
    $env:PATH    = "$machinePath;$userPath"
    Write-Pass "PATH refreshed from registry (Machine + User merged)"
}

# ─── winget install helper ────────────────────────────────────────────────────
# Checks if the tool is already on PATH before installing.
# Non-fatal: winget returning non-zero for an already-installed tool is expected.
function Install-WingetTool {
    param(
        [string]$WingetId,
        [string]$DisplayName,
        [string]$TestCommand
    )

    $alreadyInstalled = $null -ne (Get-Command $TestCommand -ErrorAction SilentlyContinue)
    if ($alreadyInstalled) {
        try {
            $ver = (& $TestCommand --version 2>&1) | Select-Object -First 1
            $ver = "$ver".Trim()
        } catch {
            $ver = '(version check failed)'
        }
        Write-Skip "$DisplayName already installed: $ver"
        return
    }

    Write-Info "Installing $DisplayName (winget id: $WingetId)..."
    try {
        winget install `
            --id $WingetId `
            --silent `
            --accept-package-agreements `
            --accept-source-agreements `
            --source winget

        if ($LASTEXITCODE -ne 0) {
            Write-Warn "$DisplayName winget exited $LASTEXITCODE (may already be installed by another source)"
        } else {
            Write-Pass "$DisplayName installed"
        }
    } catch {
        Write-Warn "$DisplayName install error: $_  (continue — may be installed)"
    }
}

# ─── netlify-cli via npm ──────────────────────────────────────────────────────
function Install-NetlifyCLI {
    $already = $null -ne (Get-Command 'netlify' -ErrorAction SilentlyContinue)
    if ($already) {
        try {
            $ver = (netlify --version 2>&1) | Select-Object -First 1
            Write-Skip "netlify-cli already installed: $ver"
        } catch {
            Write-Skip "netlify-cli already installed (version check skipped)"
        }
        return
    }

    if (-not (Get-Command 'npm' -ErrorAction SilentlyContinue)) {
        Write-Fail "npm not found — cannot install netlify-cli. Open a NEW terminal after Node.js installs, then run: npm install -g netlify-cli"
        return
    }

    Write-Info "Installing netlify-cli globally via npm..."
    npm install -g netlify-cli
    if ($LASTEXITCODE -eq 0) {
        Write-Pass "netlify-cli installed"
    } else {
        Write-Fail "netlify-cli install failed — run manually: npm install -g netlify-cli"
    }
}

# ─── Tool manifest ────────────────────────────────────────────────────────────
# Order matters: Node.js must come before netlify-cli (npm dependency).
$TOOLS = @(
    [pscustomobject]@{ WingetId = 'Git.Git';                    DisplayName = 'Git';            TestCommand = 'git'    }
    [pscustomobject]@{ WingetId = 'GitHub.cli';                 DisplayName = 'GitHub CLI';     TestCommand = 'gh'     }
    [pscustomobject]@{ WingetId = 'Microsoft.VisualStudioCode'; DisplayName = 'VS Code';        TestCommand = 'code'   }
    [pscustomobject]@{ WingetId = 'Docker.DockerDesktop';       DisplayName = 'Docker Desktop'; TestCommand = 'docker' }
    [pscustomobject]@{ WingetId = 'OpenJS.NodeJS.LTS';          DisplayName = 'Node.js LTS';    TestCommand = 'node'   }
    [pscustomobject]@{ WingetId = 'Python.Python.3.12';         DisplayName = 'Python 3.12';    TestCommand = 'python' }
    [pscustomobject]@{ WingetId = 'Casey.Just';                 DisplayName = 'just';           TestCommand = 'just'   }
    [pscustomobject]@{ WingetId = 'jqlang.jq';                  DisplayName = 'jq';             TestCommand = 'jq'     }
    [pscustomobject]@{ WingetId = 'BurntSushi.ripgrep.MSVC';    DisplayName = 'ripgrep (rg)';   TestCommand = 'rg'     }
)

# ─── Preflight: winget check ──────────────────────────────────────────────────
function Assert-Winget {
    if (-not (Get-Command 'winget' -ErrorAction SilentlyContinue)) {
        Write-Fail "winget not found."
        Write-Host ""
        Write-Host "  winget ships with Windows 11 as 'App Installer'." -ForegroundColor Yellow
        Write-Host "  If missing, install it from the Microsoft Store:" -ForegroundColor Yellow
        Write-Host "  https://apps.microsoft.com/detail/9NBLGGH4NNS1" -ForegroundColor Yellow
        Write-Host ""
        exit 1
    }
    Write-Pass "winget found: $((winget --version 2>&1) | Select-Object -First 1)"
}

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

$modeLabel = if ($VerifyOnly) { 'VERIFY ONLY' } elseif ($NoVerify) { 'INSTALL ONLY' } else { 'FULL (install + verify)' }
Write-Banner "SirTrav A2A Studio — DevKit Spin-Up"
Write-Host "  Date:  $(Get-Date -Format 'yyyy-MM-ddTHH:mm:ss')" -ForegroundColor Gray
Write-Host "  Mode:  $modeLabel" -ForegroundColor Gray
Write-Host "  Shell: $($PSVersionTable.PSVersion)" -ForegroundColor Gray

if (-not $VerifyOnly) {
    Write-Banner "PHASE 1: Preflight"
    Assert-Winget

    Write-Banner "PHASE 2: Tool Installation"
    foreach ($tool in $TOOLS) {
        Install-WingetTool `
            -WingetId $tool.WingetId `
            -DisplayName $tool.DisplayName `
            -TestCommand $tool.TestCommand
    }

    # Refresh PATH so newly-installed binaries (node, npm, just, rg, jq) are visible
    Write-Banner "PHASE 3: PATH Refresh"
    Invoke-PathRefresh

    # netlify-cli depends on npm being on PATH (set by Node.js install above)
    Write-Banner "PHASE 4: netlify-cli (via npm)"
    Install-NetlifyCLI

    Write-Host ""
    Write-Info "TIP: Open a NEW terminal window to ensure all PATH changes are fully active."
}

if (-not $NoVerify) {
    Write-Banner "PHASE 5: Project Health Verification"

    if (-not (Get-Command 'node' -ErrorAction SilentlyContinue)) {
        Write-Fail "node not found after install — PATH may need a terminal restart."
        Write-Host "  After restarting, run:" -ForegroundColor Yellow
        Write-Host "    node scripts/verify-devkit.mjs" -ForegroundColor Yellow
        exit 1
    }

    $verifyScript = Join-Path $PSScriptRoot 'scripts\verify-devkit.mjs'
    if (-not (Test-Path $verifyScript)) {
        Write-Fail "scripts/verify-devkit.mjs not found. Run from the repo root."
        exit 1
    }

    Write-Info "Delegating to scripts/verify-devkit.mjs..."
    Write-Host ""
    node scripts/verify-devkit.mjs
    exit $LASTEXITCODE
}

Write-Banner "DONE"
Write-Pass "DevKit spin-up complete ($modeLabel)."
Write-Host ""
Write-Host "  Next steps:" -ForegroundColor Cyan
Write-Host "    1. Open a NEW terminal (PATH refresh)" -ForegroundColor Cyan
Write-Host "    2. Run: node scripts/verify-devkit.mjs --tools-only" -ForegroundColor Cyan
Write-Host "    3. Run: netlify dev  (to start local functions)" -ForegroundColor Cyan
Write-Host "    4. Run: just devkit-verify  (full health check)" -ForegroundColor Cyan
