# Beat Grids Directory

This directory contains beat grid JSON files for registered audio tracks.

## File Naming Convention

```
<audio-filename>.json
```

For example:
- `suno_week44_weekly_reflective_88bpm_90s.mp3.json`
- `SirJamesThemeSong007.mp3.json`

## Beat Grid Schema

```json
{
  "version": 1,
  "project": "project_id",
  "template": "template_name",
  "bpm": 92,
  "duration": 90,
  "beatsPerMeasure": 4,
  "totalBeats": 138,
  "totalMeasures": 35,
  "file": "/music/filename.mp3",
  "createdAt": "2025-12-09T00:00:00.000Z",
  "source": "track_register.mjs",
  "beats": [
    { "t": 0.000, "beat": 1, "downbeat": true, "measure": 1 },
    { "t": 0.652, "beat": 2, "downbeat": false, "measure": 1 },
    ...
  ]
}
```

## How to Create Beat Grids

### Option 1: CLI Tool
```bash
node tools/track_register.mjs public/music/your-file.mp3 --project week44 --template weekly_reflective --bpm 92
```

### Option 2: SunoPromptWizard UI
1. Drop audio file into the wizard
2. Click "Download Grid JSON"
3. Save to this directory

### Option 3: Netlify Function
POST to `/.netlify/functions/register-music` with audio + grid data.

## Usage in Pipeline

The `generate-music` endpoint uses these grids:
```json
{
  "projectId": "week44",
  "manualFile": "suno_week44_weekly_reflective_88bpm_90s.mp3",
  "bpm": 88
}
```

The Editor agent reads beat grids to sync video cuts to downbeats.
