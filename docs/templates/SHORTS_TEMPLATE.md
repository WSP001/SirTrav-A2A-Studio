# YouTube Shorts Template

**Version:** 1.0.0
**Platform:** YouTube Shorts
**Format Type:** Vertical Video (Short-Form)
**Last Updated:** 2025-12-09

---

## Platform Specifications

### Video Format
- **Aspect Ratio:** 9:16 (vertical)
- **Resolution:** 1080x1920 (recommended), 2160x3840 (4K supported)
- **Duration:** Up to 60 seconds (strictly enforced)
- **File Format:** MP4 (recommended), MOV, AVI, FLV, WMV
- **Frame Rate:** 24-60 fps
- **Max File Size:** 256 GB (or 12 hours, whichever is less)

### Audio Specifications
- **Audio Codec:** AAC-LC
- **Sample Rate:** 48kHz or 96kHz
- **Bit Rate:** 128-384 kbps
- **LUFS Target:** -14 LUFS (YouTube standard)
- **Music Required:** Optional (but recommended for engagement)

---

## Content Guidelines

### Timing & Pacing
- **Hook Window:** First 2-3 seconds (longer than TikTok)
- **Optimal Length:** 15-58 seconds (leave 2s buffer)
- **Scene Duration:** 2-4 seconds per shot (moderate pacing)
- **Transition Style:** Clean cuts, subtle transitions

### Visual Style
- **Orientation:** Vertical (9:16) required for Shorts feed
- **Text Overlay:** Readable text (40-60px font size)
- **Safe Zones:**
  - Top 120px: YouTube branding
  - Bottom 250px: Title, channel info, engagement buttons
- **Color Grading:** Natural to slightly enhanced
- **Logo Placement:** Top-right corner (small brand watermark)
- **Thumbnail:** First frame is auto-thumbnail (make it count!)

### Caption Requirements
- **Auto-Captions:** YouTube auto-generates captions (high accuracy)
- **Style:** Clear, professional text
- **Font:** Sans-serif, readable fonts
- **Position:** Bottom-third (above UI elements)
- **Timing:** Sentence-level or phrase-level sync
- **Languages:** Multi-language captions supported

---

## D2A Workflow Integration

### Input Parameters
```yaml
platform: youtube_shorts
template_version: 1.0.0

inputs:
  - curated_media.json      # From Director Agent
  - narrative.json          # From Writer Agent
  - narration.wav          # From Voice Agent
  - soundtrack.wav         # From Composer Agent

outputs:
  - final_short.mp4        # Compiled video
  - thumbnail.jpg          # Custom thumbnail (optional for Shorts)
  - metadata.json          # Publishing metadata
```

### Agent Configuration
```json
{
  "director": {
    "max_assets": 10,
    "scene_duration": 3.5,
    "privacy_filter": "public_commons",
    "quality_preference": "high"
  },
  "writer": {
    "word_count_target": 100,
    "style": "informative",
    "hook_strategy": "value_promise"
  },
  "voice": {
    "pace": "moderate",
    "emphasis": "clear",
    "energy": "medium"
  },
  "composer": {
    "mood": "uplifting",
    "tempo": 110,
    "music_volume": 0.25,
    "style": "background_ambient"
  },
  "editor": {
    "transition_type": "clean_cut",
    "captions_enabled": true,
    "lufs_target": -14,
    "quality": "high_bitrate"
  }
}
```

---

## Publishing Metadata

### Required Fields
```json
{
  "title": "Engaging title (max 100 characters) #Shorts",
  "description": "Full description with context (max 5000 characters)",
  "category": "22",
  "privacy_status": "public",
  "tags": ["shorts", "weekly recap", "storytelling"],
  "made_for_kids": false,
  "thumbnail": "thumbnail.jpg",
  "license": "creativeCommon",
  "embeddable": true,
  "public_stats_viewable": true,
  "audio_attribution": {
    "source": "suno",
    "track_id": "abc123",
    "license": "commons_good"
  },
  "shorts_metadata": {
    "is_short": true,
    "remix_enabled": true
  }
}
```

### Title Best Practices
- **#Shorts Tag:** Must include "#Shorts" in title or description
- **Hook:** Lead with benefit or curiosity
- **Length:** 60-80 characters ideal
- **Keywords:** Front-load important keywords
- **Examples:**
  - "My Week in 60 Seconds #Shorts"
  - "You Won't Believe What Happened! #Shorts"
  - "Weekly Recap: Adventures & Lessons #Shorts"

### Description Optimization
- **First Line:** Most important (shows in feed)
- **Timestamps:** Add for longer Shorts (30s+)
- **Links:** Channel links, social media
- **Credits:** Attribution for music, tools
- **Hashtags:** 2-3 relevant hashtags max

---

## Quality Gates

### Pre-Publish Checklist
- [ ] Duration: ≤60 seconds ✓
- [ ] Aspect Ratio: 9:16 ✓
- [ ] Resolution: 1080x1920 minimum ✓
- [ ] LUFS: -14 LUFS ✓
- [ ] #Shorts Tag: In title or description ✓
- [ ] Captions: Auto-generated or uploaded ✓
- [ ] Audio: Clear, no clipping ✓
- [ ] First Frame: Eye-catching thumbnail ✓
- [ ] Safe Zones: Text readable ✓
- [ ] Copyright: Music cleared or original ✓

### YouTube-Specific Quality Checks
- [ ] Video vertical throughout (no black bars)
- [ ] No watermarks from other platforms (TikTok, etc.)
- [ ] Audio quality high (no background noise)
- [ ] Lighting consistent across shots
- [ ] No copyrighted content without permission

---

## Example Output Structure

```
outputs/
├── youtube_shorts/
│   ├── final_short.mp4          # Main video file
│   ├── thumbnail.jpg            # Custom thumbnail (optional)
│   ├── metadata.json            # Publishing metadata
│   ├── captions.srt             # Subtitle file
│   ├── description.txt          # Full description
│   ├── tags.json                # Video tags
│   └── credits.json             # Attribution data
```

---

## Feature Flags

### Optional Enhancements
```json
{
  "features": {
    "music_required": false,
    "captions": true,
    "cta_overlay": false,
    "logo_watermark": true,
    "end_screen": false,
    "chapter_markers": false,
    "color_grading": "natural",
    "transition_effects": "clean_cut",
    "remix_enabled": true
  }
}
```

---

## Platform-Specific Notes

### YouTube Shorts Algorithm
- **Watch Time:** Completion rate is key
- **Engagement:** Likes, comments, shares
- **Click-Through Rate:** Thumbnail + title performance
- **Audience Retention:** Watch time percentage
- **Subscription Conversion:** Shorts to long-form funnel

### Best Practices
1. **#Shorts Tag Required:** Must be in title or description
2. **First Frame Matters:** Acts as thumbnail in feed
3. **Vertical Only:** No horizontal content in Shorts feed
4. **No External Watermarks:** Avoid TikTok/Instagram logos
5. **High Quality:** YouTube favors high-resolution content
6. **Consistent Posting:** Regular upload schedule boosts reach

### YouTube Shorts Features
- **Remix:** Allow others to sample your content
- **Chapters:** Not typically used in Shorts
- **Playlists:** Can be added to playlists
- **Community Tab:** Promote Shorts via Community posts
- **Analytics:** Detailed retention graphs available

---

## Commons Good Attribution

All YouTube Shorts generated through SirTrav A2A Studio include:

### Description Template
```
This Short was created using SirTrav A2A Studio - an AI-powered video production platform.

🎵 Music: Suno AI (Creative Commons)
🎙️ Narration: ElevenLabs Voice Synthesis
🤖 Platform: SirTrav A2A Studio
📖 License: Creative Commons Attribution

For the Commons Good - Open Access Content Creation

#AIGenerated #CommonsGood #SirTravStudio
```

### End Card (Last 2 seconds)
```
Credits:
Music by Suno AI
Voice by ElevenLabs
Made with SirTrav A2A Studio
```

---

## YouTube Categories

### Recommended Categories for Weekly Recaps
- **22** - People & Blogs (most common for personal content)
- **20** - Gaming (if gaming-related)
- **19** - Travel & Events (if travel-focused)
- **24** - Entertainment (general entertainment)
- **28** - Science & Technology (tech/AI focus)

---

## SEO Optimization

### Title Keywords
- Front-load main keyword
- Include "Shorts" or "#Shorts"
- Use numbers (lists, tips)
- Create curiosity gap

### Description Strategy
```
[Hook - First 2 lines visible in feed]
My weekly adventures condensed into 60 seconds!

[Full Context]
This week included...
[Detailed description with keywords]

[Attribution & Links]
🎵 Music by Suno AI
🎙️ Voice by ElevenLabs
🤖 Created with SirTrav A2A Studio

[Hashtags]
#Shorts #WeeklyRecap #Storytelling

[Channel Links]
Subscribe: [link]
Website: [link]
```

### Tags Strategy
- **Primary Tags:** Brand, content type
- **Secondary Tags:** Niche keywords
- **Long-Tail Tags:** Specific phrases
- **Limit:** 10-15 tags (quality over quantity)

---

## Monetization Notes

### YouTube Partner Program
- Shorts Fund available in select countries
- Partner Program monetization (2024+)
- Requirements: 1000 subscribers + 10M Shorts views (90 days)
- Revenue sharing: 45% to creators

### Content Guidelines
- Original content preferred
- No reused content (compilations, slideshows)
- Family-friendly content performs better
- Attribution required for AI-generated content

---

## Version History

- **1.0.0** (2025-12-09): Initial template with D2A integration and YouTube Shorts optimization
