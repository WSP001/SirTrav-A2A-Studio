# Music Assets Directory

This directory contains audio files for the SirTrav video pipeline.

## Supported Formats
- MP3 (recommended)
- WAV (larger, lossless)

## File Naming Convention

For Suno-generated tracks:
```
suno_<projectId>_<templateId>_<bpm>bpm_<duration>s.mp3
```

Examples:
- `suno_week44_weekly_reflective_88bpm_90s.mp3`
- `suno_trip01_adventure_theme_96bpm_120s.mp3`

For custom theme songs:
```
<descriptive-name>.mp3
```

Example:
- `SirJamesThemeSong007.mp3`

## Adding New Music

### Method 1: Suno Prompt Wizard (Recommended)
1. Open Studio UI → Suno Prompt Wizard
2. Select template and adjust settings
3. Copy prompt to Suno.ai
4. Generate and download MP3
5. Drop into wizard for auto-registration

### Method 2: CLI Tools
```bash
# 1. Generate prompt
node tools/suno_prompt_builder.mjs weekly_reflective week44 90

# 2. Create in Suno, download MP3

# 3. Register (normalizes and creates beat grid)
node tools/track_register.mjs public/music/your-file.mp3 --project week44 --template weekly_reflective --bpm 88
```

## Using in Pipeline

### Manifest YAML
```yaml
- name: compose_music
  endpoint: "${env.URL}/.netlify/functions/generate-music"
  input:
    manualFile: "suno_week44_weekly_reflective_88bpm_90s.mp3"
    bpm: 88
  output: "tmp/${project.id}/music.json"
```

### Direct API Call
```json
POST /.netlify/functions/generate-music
{
  "projectId": "week44",
  "manualFile": "suno_week44_weekly_reflective_88bpm_90s.mp3",
  "bpm": 88
}
```

## Audio Requirements

For best results with video narration:
- **Loudness**: -16 LUFS (broadcast standard)
- **True Peak**: -1.5 dB
- **Format**: 44.1kHz or 48kHz, stereo
- **Style**: Instrumental only, no vocals
- **Mix**: Gentle highs, soft bass, narration-safe

The `track_register.mjs` tool auto-normalizes audio if FFmpeg is installed.

## Beat Grids

Each audio file should have a corresponding beat grid in `data/beat-grids/`:
```
data/beat-grids/<filename>.json
```

Beat grids enable the Editor agent to sync video cuts to musical beats.
