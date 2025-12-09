param(
  [string] $VaultPath = "..\Sir-TRAV-scott",
  [switch] $Open,
  [switch] $StartDev,
  [switch] $Quiet
)

$ErrorActionPreference = 'Stop'
$PSStyle.OutputRendering = 'Ansi'

function Write-Status([string]$msg, [string]$level='info') {
  if ($Quiet) { return }
  switch ($level) {
    'ok'     { Write-Host "  ✔ $msg" -ForegroundColor Green }
    'warn'   { Write-Host "  ⚠ $msg" -ForegroundColor Yellow }
    'err'    { Write-Host "  ✖ $msg" -ForegroundColor Red }
    default  { Write-Host "  • $msg" -ForegroundColor Cyan }
  }
}

Write-Host "`n== SirTrav A2A Studio :: DOCTOR ==" -ForegroundColor Cyan

# 1) Node / npm
try {
  $nodeV = node -v; $npmV = npm -v
  Write-Status "Node: $nodeV  npm: $npmV"
} catch { Write-Status "Node/npm not found." 'err'; exit 1 }

# 2) Public Verifier
if (Test-Path "scripts\verify-public.ps1") {
  Write-Status "Running public verifier..."
  & pwsh -NoProfile -File "scripts\verify-public.ps1"
} else { Write-Status "scripts/verify-public.ps1 missing" 'warn' }

# 3) Vault Verifier
if (Test-Path "$VaultPath\scripts\verify-vault.ps1") {
  Write-Status "Running vault verifier..."
  & pwsh -NoProfile -File "$VaultPath\scripts\verify-vault.ps1"
} else { Write-Status "Vault verifier missing at $VaultPath" 'warn' }

# 4) Env Check
$req = @("ELEVENLABS_API_KEY", "URL")
$miss = $req | Where-Object { -not $env:$_ }
if ($miss) { Write-Status "Missing Env: $($miss -join ', ')" 'warn' }
else { Write-Status "Environment variables detected." 'ok' }

# 5) Actions
if ($StartDev) {
  Write-Status "Starting Netlify Dev..."
  Start-Process -FilePath "pwsh.exe" -ArgumentList "-NoProfile","-NoExit","-Command","npm run dev"
}
if ($Open) { Start-Process "http://localhost:8888" }

Write-Host "`nDoctor complete." -ForegroundColor Green
