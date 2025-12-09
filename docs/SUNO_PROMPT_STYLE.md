# Suno Prompt Style Guide (SirTrav)

> **Important:** Suno does not have a public API. This guide standardizes the manual workflow for generating consistent, high-quality music beds for SirTrav videos.

## 🎯 Core Principles

### 1. Always Instrumental
- **No vocals, choirs, or sung lyrics**
- Avoid "ooh" and "aah" background vocals
- No chanting or humming

### 2. Narration-Safe Mix
- **Target loudness: -16 LUFS** (broadcast standard)
- Gentle highs, no harsh cymbals or piercing frequencies
- Soft low-end, no pumping bass that competes with speech
- Leave headroom for voiceover to sit on top

### 3. BPM Guidelines
| Use Case | BPM Range | Recommended |
|----------|-----------|-------------|
| Tender/Emotional | 70-80 | 76 |
| Calm/Peaceful | 80-88 | 84 |
| Reflective | 85-92 | 88 |
| Standard Adventure | 90-100 | 96 |
| Upbeat/Energetic | 100-110 | 104 |
| Playful/Fun | 108-116 | 110 |

### 4. Structure (4/4 time)
- **Intro:** 4 bars (eases in, no sudden starts)
- **A Section:** 8 bars (main theme)
- **A' Section:** 8 bars (variation)
- **Bridge:** 8 bars (contrast/build)
- **Outro:** 4 bars (soft fade, no abrupt end)

### 5. Ducking Discipline
- Avoid sharp transients at :00, :15, :30, :45 marks
- Leave 400ms breathing room before typical phrase starts
- No risers that drown out spoken voice
- Maintain consistent energy (no sudden spikes)

---

## 📋 Template Quick Reference

| Template ID | Mood | BPM | Best For |
|-------------|------|-----|----------|
| `weekly_reflective` | Reflective, grateful | 88 | Weekly recaps |
| `upbeat_rider` | Confident, swagger | 104 | Action sequences |
| `tender_moment` | Gentle, intimate | 76 | Emotional highlights |
| `adventure_theme` | Hopeful, adventurous | 96 | Main travel content |
| `morning_calm` | Peaceful, awakening | 72 | Dawn/morning scenes |
| `sunset_glow` | Warm, nostalgic | 84 | End-of-day closers |
| `playful_discovery` | Playful, curious | 110 | Kid activities |

---

## 🔧 Workflow

### Step 1: Generate Prompt
```bash
# Using CLI tool
node tools/suno_prompt_builder.mjs weekly_reflective week44 90

# Or use the SunoPromptWizard component in the Studio UI
```

### Step 2: Create in Suno
1. Go to [suno.ai](https://suno.ai)
2. Click "Create"
3. Paste the generated prompt
4. Set duration to match (e.g., 90 seconds)
5. Generate and download the MP3

### Step 3: Register the Track
```bash
# Save to standardized location
node tools/track_register.mjs public/music/suno_week44_weekly_reflective_88bpm_90s.mp3 \
  --project week44 \
  --template weekly_reflective \
  --bpm 88
```

### Step 4: Use in Pipeline
The `generate-music` endpoint can now use your track:
```json
{
  "manualFile": "suno_week44_weekly_reflective_88bpm_90s.mp3",
  "bpm": 88
}
```

---

## 📁 File Naming Convention

```
suno_<projectId>_<templateId>_<bpm>bpm_<duration>s.mp3
```

Examples:
- `suno_week44_weekly_reflective_88bpm_90s.mp3`
- `suno_trip01_adventure_theme_96bpm_120s.mp3`
- `suno_family_tender_moment_76bpm_60s.mp3`

---

## 📂 Directory Structure

```
public/
  music/
    suno_*.mp3              # Generated music files
    SirJamesThemeSong.mp3   # Custom theme songs

data/
  beat-grids/
    *.mp3.json              # Beat grid files for each track

prompts/
  suno/
    prompt_pack.json        # Master template configuration
    examples/               # Example prompts (optional)
```

---

## 🎵 Instruments by Mood

### Warm & Adventurous (Default SirTrav Sound)
- Acoustic guitar (fingerpicked or strummed)
- Hand drums, bodhrán
- Upright bass
- Light strings
- Glockenspiel/bells accents
- Optional: pennywhistle hints

### Reflective & Calm
- Fingerstyle guitar
- Brushed drum kit
- Soft synth pads
- Gentle piano

### Tender & Emotional
- Piano (main)
- Soft strings
- Subtle bells
- Minimal percussion

### Upbeat & Energetic
- Strummed acoustic
- Claps, tambourine
- Walking bass
- Light brass stabs

---

## ⚠️ Things to Avoid

1. **No vocals** - Even "wordless" vocalizations compete with narration
2. **No harsh cymbals** - Especially crash cymbals and hi-hat sizzle
3. **No pumping bass** - Sidechained or heavily compressed bass fights voiceover
4. **No sudden dynamics** - Jarring changes distract from content
5. **No risers/buildups** - These demand attention away from narration
6. **No complex melodies** - Simple, supportive beds work best

---

## 🔊 Post-Processing

After downloading from Suno:

1. **Normalize loudness** (automatic with `track_register.mjs`):
   ```
   ffmpeg -i input.mp3 -af "loudnorm=I=-16:TP=-1.5:LRA=11" output.mp3
   ```

2. **Verify duration** matches your intended length

3. **Listen test** - Play over sample narration to check for conflicts

---

## 💡 Pro Tips

1. **Generate 2-3 variations** in Suno and pick the best one
2. **Listen at low volume** - If it sounds good quiet, it'll work as a bed
3. **Check the ending** - Ensure it fades smoothly, not abruptly
4. **Test with speech** - Read a paragraph over it before committing
5. **Keep originals** - Store Suno downloads in a backup folder before processing

---

## 🎬 Scene-to-Template Mapping

For automated template selection, use the `sceneHarmony` mappings:

```json
{
  "scene": "opening",    "template": "morning_calm"
  "scene": "adventure",  "template": "adventure_theme"
  "scene": "middle",     "template": "upbeat_rider"
  "scene": "emotional",  "template": "tender_moment"
  "scene": "playful",    "template": "playful_discovery"
  "scene": "climax",     "template": "upbeat_rider"
  "scene": "outro",      "template": "sunset_glow"
  "scene": "reflection", "template": "weekly_reflective"
}
```

The Director agent can output a `scene_harmony` array that the pipeline uses to select appropriate music for each segment.
