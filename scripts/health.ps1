$ErrorActionPreference='Stop'
$required=@('ELEVENLABS_API_KEY','ELEVENLABS_DEFAULT_VOICE_ID','SUNO_API_KEY','URL')
$missing=$required | Where-Object { -not $env:$_ }
if($missing){ Write-Error "Missing env: $($missing -join ', ')"; exit 1 }
Write-Host "Env OK"

$paths=@(
 'pipelines/a2a_manifest.yml',
 'netlify/functions/narrate-project.ts',
 'netlify/functions/generate-music.ts',
 'pipelines/scripts/ffmpeg_compile.mjs'
)
$paths | ForEach-Object { if(-not (Test-Path $_)) { Write-Error "Missing $_" } }
Write-Host "Files OK"
