<#
.SYNOPSIS
    SirTrav-A2A-Studio DevKit Spinup — Idempotent installer + PATH fixer
.DESCRIPTION
    Installs 9 dev tools via winget + netlify-cli via npm.
    Refreshes PATH from registry (no terminal restart needed).
    Runs verify-devkit.mjs as the final gate.
    Includes recursive-path fixer for MAX_PATH / OneDrive safety.
.NOTES
    OS: Windows 11 Pro (AMD Ryzen AI 9 HX aware)
    Exit 0 = all green | Exit 1 = tool install failed | Exit 3 = blocked on external
#>
param(
    [switch]$SkipVerify,
    [switch]$FixPaths,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# ── CONSTANTS ──────────────────────────────────────────────
$TOOLS = @(
    @{ Name = "Node.js";       WingetId = "OpenJS.NodeJS.LTS";       Cmd = "node" },
    @{ Name = "Git";           WingetId = "Git.Git";                  Cmd = "git" },
    @{ Name = "Docker Desktop";WingetId = "Docker.DockerDesktop";     Cmd = "docker" },
    @{ Name = "Just";          WingetId = "Casey.Just";               Cmd = "just" },
    @{ Name = "GitHub CLI";    WingetId = "GitHub.cli";               Cmd = "gh" },
    @{ Name = "VS Code";       WingetId = "Microsoft.VisualStudioCode"; Cmd = "code" },
    @{ Name = "Python";        WingetId = "Python.Python.3.12";       Cmd = "python" },
    @{ Name = "Bun";           WingetId = "Oven-sh.Bun";             Cmd = "bun" },
    @{ Name = "Curl";          WingetId = "cURL.cURL";               Cmd = "curl" }
)

$NPM_GLOBALS = @("netlify-cli")

$MAX_PATH_DEPTH = 4
$MAX_PATH_CHARS = 250

# ── PATH REFRESH (from registry, no restart needed) ────────
function Refresh-Path {
    Write-Host "🔄 Refreshing PATH from registry..." -ForegroundColor Cyan
    $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath    = [Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = "$machinePath;$userPath"

    # Also refresh PATHEXT
    $machinePathExt = [Environment]::GetEnvironmentVariable("PATHEXT", "Machine")
    $userPathExt    = [Environment]::GetEnvironmentVariable("PATHEXT", "User")
    if ($machinePathExt) {
        $env:PATHEXT = if ($userPathExt) { "$machinePathExt;$userPathExt" } else { $machinePathExt }
    }
    Write-Host "  PATH + PATHEXT refreshed" -ForegroundColor Green
}

# ── TOOL INSTALLER (idempotent) ────────────────────────────
function Install-Tool {
    param([hashtable]$Tool)
    $cmd = $Tool.Cmd
    $found = Get-Command $cmd -ErrorAction SilentlyContinue
    if ($found) {
        $ver = ""
        try { $ver = & $cmd --version 2>&1 | Select-Object -First 1 } catch {}
        Write-Host "  ✅ $($Tool.Name) — $ver" -ForegroundColor Green
        return $true
    }

    Write-Host "  📦 Installing $($Tool.Name) via winget..." -ForegroundColor Yellow
    try {
        winget install --id $Tool.WingetId --accept-source-agreements --accept-package-agreements --silent 2>&1 | Out-Null
        Refresh-Path
        $check = Get-Command $cmd -ErrorAction SilentlyContinue
        if ($check) {
            Write-Host "  ✅ $($Tool.Name) installed" -ForegroundColor Green
            return $true
        } else {
            Write-Host "  ⚠️  $($Tool.Name) installed but not in PATH yet (may need terminal restart)" -ForegroundColor DarkYellow
            return $true
        }
    } catch {
        Write-Host "  ❌ $($Tool.Name) install failed: $_" -ForegroundColor Red
        return $false
    }
}

# ── NPM GLOBAL INSTALLER ──────────────────────────────────
function Install-NpmGlobal {
    param([string]$Package)
    $cmd = $Package -replace "-cli$", ""
    $found = Get-Command $cmd -ErrorAction SilentlyContinue
    if (-not $found) {
        # Try the full name too
        $found = Get-Command $Package -ErrorAction SilentlyContinue
    }
    if ($found) {
        Write-Host "  ✅ $Package — already installed" -ForegroundColor Green
        return $true
    }

    Write-Host "  📦 Installing $Package via npm..." -ForegroundColor Yellow
    try {
        npm install -g $Package 2>&1 | Out-Null
        Refresh-Path
        Write-Host "  ✅ $Package installed" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "  ❌ $Package install failed: $_" -ForegroundColor Red
        return $false
    }
}

# ── PATH DEPTH SCANNER ─────────────────────────────────────
function Test-PathDepth {
    param([string]$ScanRoot)
    Write-Host "`n🔍 Scanning for dangerous path depths in $ScanRoot..." -ForegroundColor Cyan
    $violations = @()
    $maxFound = 0

    Get-ChildItem -Path $ScanRoot -Recurse -Directory -ErrorAction SilentlyContinue | ForEach-Object {
        $depth = ($_.FullName -split "[\\/]").Count
        $pathLen = $_.FullName.Length

        if ($depth -gt $maxFound) { $maxFound = $depth }

        # Detect recursive naming (same folder name in parent chain)
        $parts = $_.FullName -split "[\\/]"
        $dupes = $parts | Group-Object | Where-Object { $_.Count -gt 2 }

        if ($pathLen -gt $MAX_PATH_CHARS -or $dupes) {
            $violations += @{
                Path     = $_.FullName
                Length   = $pathLen
                Depth    = $depth
                Reason   = if ($dupes) { "RECURSIVE: $($dupes.Name -join ', ')" } else { "PATH_TOO_LONG" }
            }
        }
    }

    if ($violations.Count -eq 0) {
        Write-Host "  ✅ No path violations found (max depth: $maxFound)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  $($violations.Count) path violation(s) found:" -ForegroundColor Red
        $violations | ForEach-Object {
            Write-Host "    ❌ [$($_.Reason)] $($_.Path) ($($_.Length) chars)" -ForegroundColor Red
        }
        Write-Host "`n  Run: just fix-recursive-nest   to flatten these" -ForegroundColor Yellow
    }

    return $violations
}

# ══════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  SirTrav-A2A-Studio — DevKit Spinup                     ║" -ForegroundColor Cyan
Write-Host "║  OS: Windows 11 Pro | CPU: AMD Ryzen AI 9 HX            ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ── CHECK WINGET ───────────────────────────────────────────
$wingetCheck = Get-Command winget -ErrorAction SilentlyContinue
if (-not $wingetCheck) {
    Write-Host "❌ winget not found. Install App Installer from Microsoft Store." -ForegroundColor Red
    exit 3
}

# ── LAYER 0a: SYSTEM TOOLS ────────────────────────────────
Write-Host "━━━ Layer 0a: System Tools ━━━" -ForegroundColor White
$failed = 0
foreach ($tool in $TOOLS) {
    $ok = Install-Tool $tool
    if (-not $ok) { $failed++ }
}

# ── LAYER 0b: PROJECT TOOLS (npm globals) ─────────────────
Write-Host "`n━━━ Layer 0b: Project Tools ━━━" -ForegroundColor White
foreach ($pkg in $NPM_GLOBALS) {
    $ok = Install-NpmGlobal $pkg
    if (-not $ok) { $failed++ }
}

# ── DOCKER DAEMON CHECK ───────────────────────────────────
Write-Host "`n━━━ Docker Daemon ━━━" -ForegroundColor White
$dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
if ($dockerCmd) {
    try {
        $dockerInfo = docker info 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ Docker daemon is running" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  Docker installed but daemon not running (start Docker Desktop)" -ForegroundColor DarkYellow
        }
    } catch {
        Write-Host "  ⚠️  Docker installed but daemon not responding" -ForegroundColor DarkYellow
    }
} else {
    Write-Host "  ⏭️  Docker not installed (optional)" -ForegroundColor DarkYellow
}

# ── PATH DEPTH SCAN ───────────────────────────────────────
Write-Host "`n━━━ Path Depth Guard ━━━" -ForegroundColor White
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$violations = Test-PathDepth $repoRoot

if ($FixPaths -and $violations.Count -gt 0) {
    Write-Host "`n🔧 Running recursive nest fixer..." -ForegroundColor Yellow
    $fixScript = Join-Path $repoRoot "scripts\fix-recursive-nest.mjs"
    if (Test-Path $fixScript) {
        node $fixScript --auto
    } else {
        Write-Host "  ❌ scripts/fix-recursive-nest.mjs not found" -ForegroundColor Red
    }
}

# ── RESULTS ────────────────────────────────────────────────
Write-Host ""
if ($failed -gt 0) {
    Write-Host "⚠️  $failed tool(s) failed to install. Fix manually, then re-run." -ForegroundColor Red
    exit 1
}

Write-Host "✅ All tools installed. PATH refreshed." -ForegroundColor Green

# ── DELEGATE TO VERIFIER ──────────────────────────────────
if (-not $SkipVerify) {
    Write-Host "`n━━━ Running DevKit Verifier ━━━" -ForegroundColor White
    $verifier = Join-Path $repoRoot "scripts\verify-devkit.mjs"
    if (Test-Path $verifier) {
        node $verifier
        exit $LASTEXITCODE
    } else {
        Write-Host "  ⚠️  scripts/verify-devkit.mjs not found — skipping verification" -ForegroundColor DarkYellow
        exit 0
    }
}

exit 0
