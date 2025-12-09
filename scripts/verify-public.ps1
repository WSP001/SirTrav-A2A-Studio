<#  SirTrav-A2A-Studio :: Public Verifier
    Purpose: Verify structure, config, deps, LFS, and git status for deploy readiness.
    Usage:   pwsh -NoProfile -File scripts/verify-public.ps1
#>

$ErrorActionPreference = 'Stop'

function OK($m){ Write-Host "✔ $m" -ForegroundColor Green }
function NO($m){ Write-Host "✖ $m" -ForegroundColor Red }
function FYI($m){ Write-Host "• $m" -ForegroundColor Cyan }
function WARN($m){ Write-Host "⚠ $m" -ForegroundColor Yellow }

Write-Host "`n== SirTrav A2A Studio :: PUBLIC VERIFIER ==" -ForegroundColor Cyan

# 0) Sanity: are we in the public repo?
if (-not (Test-Path "package.json")) { NO "Run from repo root (package.json missing)."; exit 1 }

# 1) Node / npm
try {
  $node = node -v
  $npm  = npm -v
  OK "Node: $node  npm: $npm"
} catch {
  NO "Node/npm not found in PATH"
  exit 1
}

# 2) Critical paths that must exist (based on your current file list)
$mustExist = @(
  # repo meta
  ".eslintrc.json",
  ".gitattributes",
  ".gitignore",
  ".pre-commit-config.yaml",
  ".secrets.baseline",
  "README.md",
  "netlify.toml",
  "package.json",
  "tsconfig.json",

  # workflows
  ".github/workflows/build_weekly.yml",
  ".github/workflows/privacy-scan.yml",
  ".github/workflows/validate_manifest.yml",

  # data + content seeds
  "content/voices.json",
  "data/memory-index.json",
  "data/progress.json",
  "data/pronunciation-dictionary.json",
  "data/server-credits.json",
  "data/tts-cache.json",

  # docs
  "docs/ENV_SETUP.md",
  "docs/PHASE7_QUICKSTART.md",
  "docs/PRONUNCIATION_DICTIONARY.md",
  "docs/WEEKLY_RECAP_SOP.md",

  # functions (public API surface)
  "netlify/functions/correlate.ts",
  "netlify/functions/evals.ts",
  "netlify/functions/generate-music.ts",
  "netlify/functions/healthcheck.ts",
  "netlify/functions/intake-upload.ts",
  "netlify/functions/mcp.ts",
  "netlify/functions/narrate-project.ts",
  "netlify/functions/progress.ts",
  "netlify/functions/publish.ts",
  "netlify/functions/text-to-speech.ts",

  # pipelines (orchestrator)
  "pipelines/a2a_manifest.yml",
  "pipelines/run-manifest.mjs",
  "pipelines/scripts/audio_mix.mjs",
  "pipelines/scripts/ffmpeg_compile.mjs",

  # prompts
  "prompts/projects/week44_example/narrative_and_music.json",
  "prompts/projects/week44_example/storyline_markdown.json",
  "prompts/schemas/beat_grid.schema.json",

  # src (UI)
  "src/App.tsx",
  "src/components/PronunciationPreview.tsx",
  "src/components/Upload.tsx",

  # scripts
  "scripts/health.ps1",
  "scripts/preflight.sh"
)

$missing = @()
foreach ($p in $mustExist) {
  if (-not (Test-Path $p)) { $missing += $p }
}
if ($missing.Count -gt 0) {
  NO "Missing critical files:"
  $missing | ForEach-Object { Write-Host "   - $_" -ForegroundColor Red }
} else {
  OK "All critical files present"
}

# 3) package.json validation (scripts & deps)
try {
  $pkg = Get-Content package.json -Raw | ConvertFrom-Json
} catch {
  NO "package.json parse error: $($_.Exception.Message)"
  exit 1
}

$needScripts = @("dev","build","run:manifest","preflight","doctor","test:runner")
$missingScripts = @()
foreach ($s in $needScripts) {
  if (-not $pkg.scripts.$s) { $missingScripts += $s }
}
if ($missingScripts.Count) {
  NO "package.json missing scripts: $($missingScripts -join ', ')"
} else {
  OK "package.json scripts OK"
}

# js-yaml required by run-manifest
$hasJsYaml = ($pkg.dependencies.'js-yaml' -ne $null) -or ($pkg.devDependencies.'js-yaml' -ne $null)
if ($hasJsYaml) { OK "js-yaml dependency present" } else { NO "Missing js-yaml (required by pipelines/run-manifest.mjs)" }

# Node engines hint
if ($pkg.engines -and $pkg.engines.node) {
  FYI "Engines.node set to $($pkg.engines.node)"
} else {
  WARN "Consider setting engines.node to '>=18.17' in package.json"
}

# 4) Netlify CLI presence (for dev)
$hasNetlify = $false
try {
  $ver = (netlify -v) 2>$null
  if ($LASTEXITCODE -eq 0) { $hasNetlify = $true }
} catch { }
if ($hasNetlify) { OK "Netlify CLI found" } else { WARN "Netlify CLI not found; dev fallback: npx netlify-cli@latest dev" }

# 5) .gitattributes LFS checks for media
if (Test-Path ".gitattributes") {
  $ga = Get-Content ".gitattributes" -Raw
  $lfsPatterns = @("*.mp4","*.mov","*.avi","*.mkv","*.wav","*.flac","*.tiff","*.psd")
  $notTracked = @()
  foreach ($pat in $lfsPatterns) {
    if ($ga -notmatch [regex]::Escape($pat)) { $notTracked += $pat }
  }
  if ($notTracked.Count) {
    WARN "These patterns are not LFS-tracked in .gitattributes: $($notTracked -join ', ')"
  } else {
    OK "Git LFS patterns present"
  }
} else {
  WARN ".gitattributes not found (recommend Git LFS for large media)"
}

# 6) Quick secret-pattern scan (no values printed)
# harmless heuristics—CI does deeper detect-secrets scan
$secretHits = @()
$globs = @("**\*.ts","**\*.js","**\*.tsx","**\*.json","**\*.yml","**\*.yaml","**\*.md")
$regexes = @(
  'sk-[a-zA-Z0-9_\-]{20,}',           # generic "sk_" style keys
  'AKIA[0-9A-Z]{16}',                 # AWS Access Key ID
  'AIza[0-9A-Za-z\-_]{35}',           # Google API
  'ghp_[0-9A-Za-z]{36,}'              # GitHub PAT
)
foreach ($g in $globs) {
  $files = Get-ChildItem -Path . -Recurse -Include $g -File -ErrorAction SilentlyContinue |
           Where-Object { $_.FullName -notmatch '\\node_modules\\' }
  foreach ($f in $files) {
    $txt = Get-Content $f.FullName -Raw
    foreach ($re in $regexes) {
      if ($txt -match $re) {
        $secretHits += $f.FullName
        break
      }
    }
  }
}
if ($secretHits.Count) {
  NO "Potential hardcoded secrets detected in:"
  $secretHits | Select-Object -Unique | ForEach-Object { Write-Host "   - $_" -ForegroundColor Red }
  WARN "Remove/rotate these; use Netlify env vars only."
} else {
  OK "No obvious hardcoded secrets found (quick scan)"
}

# 7) Git status – show anything not committed
$gitOk = $true
try {
  $status = git status --porcelain
  if ($status) {
    WARN "Uncommitted changes detected (review/commit before deploy):"
    $status | ForEach-Object { Write-Host "   $_" -ForegroundColor Yellow }
    $gitOk = $false
  } else {
    OK "Working tree clean"
  }
} catch {
  WARN "git not available; skip working tree check"
}

# 8) Large files (>10MB) not covered by LFS (advisory)
try {
  $large = Get-ChildItem -Recurse -File | Where-Object { $_.Length -gt 10MB -and $_.FullName -notmatch '\\node_modules\\' }
  if ($large.Count) {
    $nonLfs = @()
    foreach ($lf in $large) {
      # simple heuristic: if extension is in LFS patterns and not tracked, warn
      $ext = $lf.Extension.ToLower()
      if ($ext -in @(".mp4",".mov",".avi",".mkv",".wav",".flac",".tiff",".psd")) {
        $nonLfs += $lf.FullName
      }
    }
    if ($nonLfs.Count) {
      WARN "Large media not obviously LFS-tracked:"
      $nonLfs | ForEach-Object { Write-Host "   $_" -ForegroundColor Yellow }
    } else {
      OK "No large media issues detected"
    }
  } else {
    FYI "No files >10MB found (good for repo size)"
  }
} catch { WARN "Large-file scan skipped: $($_.Exception.Message)" }

# 9) Manifest & runner smoke hints
if (-not (Test-Path "pipelines\a2a_manifest.yml")) { NO "Missing pipelines/a2a_manifest.yml" }
if (-not (Test-Path "pipelines\run-manifest.mjs")) { NO "Missing pipelines/run-manifest.mjs" } else { FYI "Run: npm run test:runner  (uses js-yaml)" }

# Summary & exit code
$critFails = ($missing.Count -gt 0) -or (-not $hasJsYaml)
if ($critFails) {
  NO "Verifier finished with critical issues. Fix before deploy."
  exit 1
} else {
  if ($gitOk) { OK "Verifier finished clean. Ready to test/deploy." }
  else { WARN "Verifier finished with uncommitted changes." }
  exit 0
}
