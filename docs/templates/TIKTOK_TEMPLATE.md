# TikTok Template

**Version:** 1.0.0
**Platform:** TikTok
**Format Type:** Vertical Video (Short-Form)
**Last Updated:** 2025-12-09

---

## Platform Specifications

### Video Format
- **Aspect Ratio:** 9:16 (vertical)
- **Resolution:** 1080x1920 (recommended)
- **Duration:** 15-60 seconds (up to 10 minutes available)
- **File Format:** MP4 or MOV
- **Frame Rate:** 30 fps (60 fps supported)
- **Max File Size:** 287.6 MB (iOS), 72 MB (Android)

### Audio Specifications
- **Audio Codec:** AAC
- **Sample Rate:** 48kHz
- **Bit Rate:** 128-192 kbps
- **LUFS Target:** -14 LUFS (TikTok optimal)
- **Music Required:** Highly recommended (trending sounds boost visibility)

---

## Content Guidelines

### Timing & Pacing
- **Hook Window:** First 1 second (critical - TikTok users swipe fast!)
- **Optimal Length:** 21-34 seconds (best completion rate)
- **Scene Duration:** 1.5-3 seconds per shot (very fast-paced)
- **Transition Style:** Jump cuts, trendy transitions

### Visual Style
- **Orientation:** Vertical only
- **Text Overlay:** Large, bold text (50-70px font size)
- **Safe Zones:**
  - Top 100px: TikTok username/timestamp
  - Bottom 300px: Caption, profile, engagement buttons
- **Color Grading:** High saturation, cinematic look
- **Effects:** Popular filters, green screen, duets
- **Logo Placement:** Subtle watermark (avoid center focus)

### Caption Requirements
- **Auto-Captions:** TikTok provides auto-captions (but verify accuracy)
- **Style:** Bold, animated text with shadow/outline
- **Font:** TikTok's built-in fonts or custom bold sans-serif
- **Position:** Top-center or middle (avoid bottom 300px)
- **Timing:** Word-level or phrase-level sync

---

## D2A Workflow Integration

### Input Parameters
```yaml
platform: tiktok
template_version: 1.0.0

inputs:
  - curated_media.json      # From Director Agent
  - narrative.json          # From Writer Agent
  - narration.wav          # From Voice Agent
  - soundtrack.wav         # From Composer Agent

outputs:
  - final_tiktok.mp4       # Compiled video
  - thumbnail.jpg          # Cover image (1080x1920)
  - metadata.json          # Publishing metadata
```

### Agent Configuration
```json
{
  "director": {
    "max_assets": 6,
    "scene_duration": 2.5,
    "privacy_filter": "public_commons",
    "story_role_emphasis": "climax"
  },
  "writer": {
    "word_count_target": 60,
    "style": "conversational",
    "hook_strategy": "bold_statement"
  },
  "voice": {
    "pace": "very_fast",
    "emphasis": "dramatic",
    "energy": "high"
  },
  "composer": {
    "mood": "trending",
    "tempo": 140,
    "music_volume": 0.4,
    "use_trending_sounds": true
  },
  "editor": {
    "transition_type": "jump_cut",
    "captions_enabled": true,
    "lufs_target": -14,
    "effects": ["zoom_in", "pan"]
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
  "privacy_level": "public",
  "allow_comments": true,
  "allow_duet": true,
  "allow_stitch": true,
  "disclosure": {
    "branded_content": false,
    "promotional": false,
    "ai_generated": true
  },
  "audio_attribution": {
    "source": "suno",
    "track_id": "abc123",
    "license": "commons_good"
  }
}
```

### Hashtag Strategy
- **Count:** 3-5 hashtags (TikTok prefers fewer, relevant tags)
- **Mix:** 1 trending + 2 niche + 1 community
- **Placement:** Caption body (hashtags are searchable)
- **Examples:**
  - Trending: #FYP, #ForYou, #Viral
  - Niche: #WeeklyRecap, #MemoryDump, #LifeUpdate
  - Community: #TikTokTravel, #PhotoDump, #Storytelling

---

## Quality Gates

### Pre-Publish Checklist
- [ ] Duration: 15-60 seconds ✓
- [ ] Aspect Ratio: 9:16 ✓
- [ ] Resolution: 1080x1920 ✓
- [ ] LUFS: -14 LUFS ✓
- [ ] Hook: Engaging first 1 second ✓
- [ ] Captions: Enabled and synchronized ✓
- [ ] Audio: Clear, no clipping ✓
- [ ] Trending Sound: Consider using if relevant ✓
- [ ] Safe Zones: Text readable, not obscured ✓
- [ ] AI Disclosure: Marked as AI-generated ✓

### Engagement Optimization
- **Thumbnail:** Mid-action frame (not first frame)
- **Caption:** Question, cliffhanger, or relatable statement
- **CTA:** "Wait for it...", "Watch till the end!", "Part 2?"
- **Timing:** Post during peak hours (6am-10am, 7pm-11pm EST)
- **Series:** Create multi-part content for retention

---

## Example Output Structure

```
outputs/
├── tiktok/
│   ├── final_tiktok.mp4         # Main video file
│   ├── thumbnail.jpg            # Cover image
│   ├── metadata.json            # Publishing metadata
│   ├── captions.srt             # Subtitle file (backup)
│   ├── trending_sounds.json     # Available trending audio options
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
    "cta_overlay": true,
    "logo_watermark": false,
    "trending_effects": true,
    "green_screen": false,
    "duet_layout": false,
    "transition_effects": "jump_cut",
    "speed_ramping": false
  }
}
```

---

## Platform-Specific Notes

### TikTok Algorithm Preferences
- **Completion Rate:** Most important metric (finish rate)
- **Rewatch Rate:** Users watching multiple times
- **Engagement Speed:** Likes/comments in first hour
- **Shareability:** Shares to friends (high signal)
- **Watch Time:** Total time spent on video

### Best Practices
1. **Instant Hook:** No intro - start with action/statement
2. **Vertical Native:** Film or crop specifically for vertical
3. **Trending Participation:** Use trending sounds/effects when authentic
4. **Text Hooks:** Add curiosity-driving text in first frame
5. **Loop-able Content:** End that seamlessly connects to beginning
6. **AI Transparency:** Mark content as AI-generated per TikTok guidelines

### TikTok-Specific Features
- **Duet/Stitch:** Enable for community engagement
- **Green Screen:** Can be added in post-production
- **Effects:** Consider platform-native effects
- **Sounds:** Trending sounds can 10x reach
- **Series Playlist:** Group related videos

---

## Commons Good Attribution

All TikTok videos generated through SirTrav A2A Studio include:

```
🎵 Music by Suno AI
🎙️ Voice by ElevenLabs
🤖 AI-Generated by SirTrav A2A Studio
#CommonsGood #AIContent
```

**Credits Location:** End card (last 2 seconds) + caption hashtags

**AI Disclosure:** Required by TikTok Community Guidelines
- Caption must include: "AI-generated content"
- Or use TikTok's built-in AI label feature

---

## TikTok Content Categories

### Recommended Categories for Weekly Recaps
- **Lifestyle:** Day-in-the-life, weekly vlog
- **Travel:** Trip highlights, location tours
- **Educational:** Behind-the-scenes, process videos
- **Storytelling:** Personal narratives, reflections
- **Photo Dumps:** Curated photo collections with voiceover

---

## Trending Sound Integration

### How to Use Trending Sounds
```json
{
  "trending_sound_options": [
    {
      "sound_id": "tiktok_sound_123",
      "title": "Trending Sound Name",
      "duration": 30,
      "mood": "upbeat",
      "compatibility_score": 0.85
    }
  ],
  "fallback_strategy": "use_custom_suno_music"
}
```

**Note:** If trending sound doesn't match content mood, use original Suno music for authentic storytelling.

---

## Version History

- **1.0.0** (2025-12-09): Initial template with D2A integration and TikTok-specific features
