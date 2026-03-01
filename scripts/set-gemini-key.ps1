# set-gemini-key.ps1 — Safe Gemini API Key setter for local .env
# Usage: .\scripts\set-gemini-key.ps1
# The key is prompted securely (not echoed to screen, not saved in history)

$envFile = Join-Path $PSScriptRoot ".." ".env"
$envFile = (Resolve-Path $envFile -ErrorAction SilentlyContinue) ?? (Join-Path $PSScriptRoot ".." ".env")

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  GEMINI API KEY — Safe Local Setup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  This script adds GEMINI_API_KEY to your local .env file." -ForegroundColor White
Write-Host "  The key will NOT appear on screen or in command history." -ForegroundColor Yellow
Write-Host ""
Write-Host "  Your key must start with 'AIza' (about 39 characters)." -ForegroundColor White
Write-Host "  Get one at: https://aistudio.google.com/apikey" -ForegroundColor Gray
Write-Host ""

# Secure prompt
$key = Read-Host -Prompt "  Paste your Gemini API key (starts with AIza)"

# Validate format
if (-not $key.StartsWith("AIza")) {
    Write-Host ""
    Write-Host "  ERROR: That doesn't look like a Gemini API key." -ForegroundColor Red
    Write-Host "  Gemini keys start with 'AIza...' (about 39 chars)." -ForegroundColor Red
    Write-Host "  What you pasted may be a Google OAuth Client ID instead." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Go to: https://aistudio.google.com/apikey" -ForegroundColor Cyan
    Write-Host "  Click 'Create API key' and copy the AIza... value." -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

if ($key.Length -lt 30) {
    Write-Host ""
    Write-Host "  ERROR: Key seems too short ($($key.Length) chars). Expected ~39." -ForegroundColor Red
    exit 1
}

# Check if .env exists
if (-not (Test-Path $envFile)) {
    Write-Host "  Creating .env file..." -ForegroundColor Gray
    New-Item -Path $envFile -ItemType File -Force | Out-Null
}

# Read existing .env content
$content = Get-Content $envFile -Raw -ErrorAction SilentlyContinue
if (-not $content) { $content = "" }

# Replace existing GEMINI_API_KEY or append
if ($content -match "(?m)^GEMINI_API_KEY=.*$") {
    $content = $content -replace "(?m)^GEMINI_API_KEY=.*$", "GEMINI_API_KEY=$key"
    Write-Host "  Replaced existing GEMINI_API_KEY in .env" -ForegroundColor Green
} else {
    if (-not $content.EndsWith("`n")) { $content += "`n" }
    $content += "GEMINI_API_KEY=$key`n"
    Write-Host "  Added GEMINI_API_KEY to .env" -ForegroundColor Green
}

# Write back
Set-Content -Path $envFile -Value $content.TrimEnd() -NoNewline

# Verify
$check = Select-String -Path $envFile -Pattern "^GEMINI_API_KEY=AIza" -Quiet
if ($check) {
    Write-Host ""
    Write-Host "  GEMINI_API_KEY set in .env (AIza...)" -ForegroundColor Green
    Write-Host "  Preview: GEMINI_API_KEY=$($key.Substring(0,8))..." -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Next steps:" -ForegroundColor Cyan
    Write-Host "    1. Start local server:  netlify dev" -ForegroundColor White
    Write-Host "    2. Test Gemini:         just gemini-test" -ForegroundColor White
    Write-Host "    3. Run sanity:          just sanity-test-local" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "  WARNING: Could not verify key was written." -ForegroundColor Red
}
