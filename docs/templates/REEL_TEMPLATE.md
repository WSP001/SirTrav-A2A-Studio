# Instagram Reels Template

**Version:** 1.0.0
**Platform:** Instagram
**Format Type:** Vertical Video (Reels)
**Last Updated:** 2025-12-09

---

## Platform Specifications

### Video Format
- **Aspect Ratio:** 9:16 (vertical)
- **Resolution:** 1080x1920 (recommended)
- **Duration:** 15-60 seconds
- **File Format:** MP4 (H.264 codec)
- **Frame Rate:** 30 fps (recommended)
- **Max File Size:** 4 GB

### Audio Specifications
- **Audio Codec:** AAC
- **Sample Rate:** 48kHz
- **Bit Rate:** 128-320 kbps
- **LUFS Target:** -14 to -16 LUFS (Instagram optimal)
- **Music Required:** Yes (highly recommended for engagement)

---

## Content Guidelines

### Timing & Pacing
- **Hook Window:** First 1-3 seconds (critical for retention)
- **Optimal Length:** 15-30 seconds (best engagement)
- **Scene Duration:** 2-4 seconds per shot (fast-paced)
- **Transition Style:** Quick cuts, swipe transitions

### Visual Style
- **Orientation:** Vertical only
- **Text Overlay:** Large, readable text (40-60px font size)
- **Safe Zones:**
  - Top 250px: Avoid critical content (Instagram UI overlay)
  - Bottom 150px: Avoid critical content (captions/CTA area)
- **Color Grading:** High contrast, vibrant colors
- **Logo Placement:** Top-right or bottom-left (small, unobtrusive)

### Caption Requirements
- **Auto-Captions:** Required for accessibility
- **Style:** Bold, white text with dark background/stroke
- **Font:** Sans-serif, highly legible
- **Position:** Bottom-center (above CTA zone)
- **Timing:** Word-level synchronization with audio

---

## D2A Workflow Integration

### Input Parameters
```yaml
platform: instagram_reel
template_version: 1.0.0

inputs:
  - curated_media.json      # From Director Agent
  - narrative.json          # From Writer Agent
  - narration.wav          # From Voice Agent
  - soundtrack.wav         # From Composer Agent

outputs:
  - final_reel.mp4         # Compiled video
  - thumbnail.jpg          # Cover image (1080x1920)
  - metadata.json          # Publishing metadata
```

### Agent Configuration
```json
{
  "director": {
    "max_assets": 8,
    "scene_duration": 3.5,
    "privacy_filter": "public_commons"
  },
  "writer": {
    "word_count_target": 80,
    "style": "energetic",
    "hook_strategy": "question_first"
  },
  "voice": {
    "pace": "fast",
    "emphasis": "high_energy"
  },
  "composer": {
    "mood": "upbeat",
    "tempo": 120,
    "music_volume": 0.3
  },
  "editor": {
    "transition_type": "quick_cut",
    "captions_enabled": true,
    "lufs_target": -15
  }
}
```

---

## Publishing Metadata

### Required Fields
```json
{
  "caption": "Your engaging caption with #hashtags (max 2200 chars)",
  "cover_image": "thumbnail.jpg",
  "share_to_feed": true,
  "location": {
    "name": "Optional Location Name",
    "latitude": 0.0,
    "longitude": 0.0
  },
  "collaborators": [],
  "audio_attribution": {
    "source": "suno",
    "track_id": "abc123",
    "license": "commons_good"
  }
}
```

### Hashtag Strategy
- **Count:** 5-10 hashtags (optimal)
- **Mix:** 3 high-volume + 4 niche + 1 branded
- **Placement:** End of caption or first comment
- **Examples:**
  - High-volume: #Reels, #InstaGood, #Viral
  - Niche: #WeeklyRecap, #MemoryLane, #TravelDiaries
  - Branded: #SirTravStudio

---

## Quality Gates

### Pre-Publish Checklist
- [ ] Duration: 15-60 seconds ✓
- [ ] Aspect Ratio: 9:16 ✓
- [ ] Resolution: 1080x1920 ✓
- [ ] LUFS: -14 to -16 LUFS ✓
- [ ] Captions: Enabled and synchronized ✓
- [ ] Audio: No clipping, clear voice ✓
- [ ] Hook: Engaging first 3 seconds ✓
- [ ] CTA: Clear call-to-action ✓
- [ ] Safe Zones: Text readable in all zones ✓

### Engagement Optimization
- **Thumbnail:** Eye-catching first frame
- **Caption:** Question or bold statement in first line
- **CTA:** "Double-tap if you agree!" or "Save for later!"
- **Timing:** Post during peak hours (11am-2pm, 7pm-9pm EST)

---

## Example Output Structure

```
outputs/
├── instagram_reel/
│   ├── final_reel.mp4           # Main video file
│   ├── thumbnail.jpg            # Cover image
│   ├── metadata.json            # Publishing metadata
│   ├── captions.srt             # Subtitle file (backup)
│   └── credits.json             # Attribution data
```

---

## Feature Flags

### Optional Enhancements
```json
{
  "features": {
    "music_required": true,
    "captions": true,
    "cta_overlay": false,
    "logo_watermark": false,
    "ken_burns_effect": false,
    "color_grading": "vibrant",
    "transition_effects": "quick_cut"
  }
}
```

---

## Platform-Specific Notes

### Instagram Algorithm Preferences
- **Watch Time:** Prioritize retention over length
- **Audio:** Original audio or trending sounds boost reach
- **Engagement:** Saves + Shares > Likes
- **Consistency:** Post 3-5 Reels per week for growth

### Best Practices
1. **Hook Fast:** Grab attention in first second
2. **Vertical Framing:** Optimize for mobile viewing
3. **Text Overlays:** Essential for sound-off viewing
4. **Trending Audio:** Use popular sounds when relevant
5. **Clear CTA:** Tell viewers what to do next

---

## Commons Good Attribution

All Instagram Reels generated through SirTrav A2A Studio include:

```
🎵 Music by Suno AI
🎙️ Voice by ElevenLabs
🤖 Generated with SirTrav A2A Studio
For the Commons Good
```

**Credits Location:** End card (last 2 seconds) or caption

---

## Version History

- **1.0.0** (2025-12-09): Initial template with D2A integration
