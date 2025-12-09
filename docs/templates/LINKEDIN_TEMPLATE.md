# LinkedIn Video Template

**Version:** 1.0.0
**Platform:** LinkedIn
**Format Type:** Professional Video Content
**Last Updated:** 2025-12-09

---

## Platform Specifications

### Video Format
- **Aspect Ratio:** 16:9 (horizontal - preferred), 1:1 (square), 9:16 (vertical)
- **Resolution:** 1920x1080 (16:9), 1080x1080 (1:1), 1080x1920 (9:16)
- **Duration:** 30 seconds - 10 minutes (30-120 seconds optimal)
- **File Format:** MP4 (recommended), MOV, AVI
- **Frame Rate:** 24-30 fps (professional standard)
- **Max File Size:** 5 GB

### Audio Specifications
- **Audio Codec:** AAC
- **Sample Rate:** 48kHz
- **Bit Rate:** 128-256 kbps
- **LUFS Target:** -16 to -18 LUFS (professional broadcast standard)
- **Music Required:** Optional (subtle background music preferred)

---

## Content Guidelines

### Timing & Pacing
- **Hook Window:** First 3-5 seconds (professional context)
- **Optimal Length:** 45-90 seconds (best engagement)
- **Scene Duration:** 3-6 seconds per shot (slower, professional pacing)
- **Transition Style:** Clean cuts, dissolves, professional transitions

### Visual Style
- **Orientation:** Horizontal (16:9) preferred for desktop viewing
- **Text Overlay:** Professional, readable text (36-48px font size)
- **Safe Zones:**
  - Top 80px: LinkedIn UI overlay
  - Bottom 120px: Caption preview, engagement buttons
- **Color Grading:** Professional, natural lighting
- **Logo Placement:** Lower-third or corner (professional branding)
- **B-Roll:** Use professional imagery, charts, data visualization

### Caption Requirements
- **Auto-Captions:** LinkedIn auto-generates captions (recommended for accessibility)
- **Style:** Professional, sans-serif fonts
- **Font:** Arial, Helvetica, Open Sans
- **Position:** Bottom-third (lower-third graphics style)
- **Timing:** Full sentence synchronization
- **Contrast:** High contrast for readability

---

## D2A Workflow Integration

### Input Parameters
```yaml
platform: linkedin
template_version: 1.0.0

inputs:
  - curated_media.json      # From Director Agent
  - narrative.json          # From Writer Agent
  - narration.wav          # From Voice Agent
  - soundtrack.wav         # From Composer Agent (subtle)

outputs:
  - final_linkedin_video.mp4   # Compiled video
  - thumbnail.jpg              # Custom thumbnail (1920x1080)
  - metadata.json              # Publishing metadata
```

### Agent Configuration
```json
{
  "director": {
    "max_assets": 12,
    "scene_duration": 4.5,
    "privacy_filter": "biz_internal",
    "quality_preference": "professional"
  },
  "writer": {
    "word_count_target": 150,
    "style": "professional",
    "hook_strategy": "insight_first",
    "tone": "authoritative_yet_approachable"
  },
  "voice": {
    "pace": "moderate",
    "emphasis": "clear_articulation",
    "energy": "professional",
    "formality": "business_casual"
  },
  "composer": {
    "mood": "professional",
    "tempo": 100,
    "music_volume": 0.15,
    "style": "ambient_corporate"
  },
  "editor": {
    "transition_type": "dissolve",
    "captions_enabled": true,
    "lufs_target": -16,
    "quality": "broadcast",
    "lower_third_graphics": true
  }
}
```

---

## Publishing Metadata

### Required Fields
```json
{
  "post_text": "Engaging professional post text (max 3000 characters)\n\nKey insights:\n• Point 1\n• Point 2\n• Point 3\n\n#Hashtags",
  "video_title": "Professional Video Title",
  "thumbnail": "thumbnail.jpg",
  "visibility": "PUBLIC",
  "share_commentary": true,
  "content_type": "THOUGHT_LEADERSHIP",
  "audio_attribution": {
    "source": "suno",
    "track_id": "abc123",
    "license": "commons_good"
  },
  "reshare_settings": {
    "allow_reshare": true,
    "allow_comments": true
  }
}
```

### Post Text Best Practices
- **Hook:** Start with a question or bold insight
- **Structure:** Short paragraphs (2-3 lines each)
- **Bullets:** Use • for key takeaways
- **CTA:** Clear call-to-action at end
- **Hashtags:** 3-5 relevant hashtags (less is more on LinkedIn)
- **Length:** 150-300 words in post (key points visible without "see more")

### Hashtag Strategy
- **Count:** 3-5 hashtags (LinkedIn algorithm preference)
- **Mix:** 2 industry-specific + 1 skill + 1 broad
- **Placement:** End of post
- **Examples:**
  - Industry: #DigitalTransformation, #ContentCreation
  - Skill: #Storytelling, #VideoMarketing
  - Broad: #Innovation, #Leadership

---

## Quality Gates

### Pre-Publish Checklist
- [ ] Duration: 30-120 seconds ✓
- [ ] Aspect Ratio: 16:9 (preferred) ✓
- [ ] Resolution: 1920x1080 ✓
- [ ] LUFS: -16 to -18 LUFS ✓
- [ ] Captions: Enabled and professional ✓
- [ ] Audio: Clear, professional quality ✓
- [ ] Hook: Value proposition in first 5 seconds ✓
- [ ] Branding: Subtle, professional ✓
- [ ] Safe Zones: Text readable on all devices ✓
- [ ] Thumbnail: Professional, high-quality ✓

### LinkedIn-Specific Quality Checks
- [ ] Professional tone maintained throughout
- [ ] No overly casual language
- [ ] Brand-safe content (suitable for workplace)
- [ ] Value-driven (educational, insightful, or inspiring)
- [ ] Accessible (captions, clear audio)

---

## Example Output Structure

```
outputs/
├── linkedin/
│   ├── final_linkedin_video.mp4    # Main video file
│   ├── thumbnail.jpg               # Custom thumbnail
│   ├── metadata.json               # Publishing metadata
│   ├── captions.srt                # Professional subtitles
│   ├── post_text.txt               # Formatted post text
│   ├── lower_third_graphics/       # Optional graphics
│   │   ├── name_title.png
│   │   └── company_logo.png
│   └── credits.json                # Attribution data
```

---

## Feature Flags

### Optional Enhancements
```json
{
  "features": {
    "music_required": false,
    "captions": true,
    "cta_overlay": true,
    "logo_watermark": true,
    "lower_third_graphics": true,
    "chapter_markers": false,
    "color_grading": "professional",
    "transition_effects": "dissolve",
    "data_visualization": false,
    "speaker_overlay": false
  }
}
```

---

## Platform-Specific Notes

### LinkedIn Algorithm Preferences
- **Watch Time:** Prioritizes completion rate
- **Engagement:** Meaningful comments > likes
- **Native Upload:** Native videos perform 5x better than links
- **Accessibility:** Captioned videos get more engagement
- **Professional Value:** Educational/thought leadership content wins

### Best Practices
1. **Native Upload:** Always upload directly to LinkedIn (not YouTube links)
2. **Square/Horizontal:** 1:1 or 16:9 performs better than vertical
3. **Captions Required:** 80% watch without sound on desktop
4. **Professional Quality:** High production value expected
5. **Value First:** Lead with insight, not self-promotion
6. **Consistent Branding:** Logo, colors, lower-thirds
7. **Optimal Length:** 45-90 seconds for max completion rate

### LinkedIn Video Features
- **Live Video:** Available for some accounts (different use case)
- **Video Ads:** Can boost organic content
- **Cover Image:** Custom thumbnail required
- **Metrics:** Detailed analytics (views, watch time, engagement)
- **Document Carousel:** Can combine with PDF slides

---

## Commons Good Attribution

All LinkedIn videos generated through SirTrav A2A Studio include:

### Post Text Template
```
[Engaging professional post text with key insights]

---

This video was created using AI-powered tools for the Commons Good:

🎵 Music: Suno AI (Creative Commons)
🎙️ Narration: ElevenLabs Voice Synthesis
🤖 Platform: SirTrav A2A Studio

Open-source content creation for accessible storytelling.

#AIGenerated #CommonsGood #ContentCreation #Innovation
```

### End Card (Last 3 seconds)
```
Credits:
Music by Suno AI
Voice by ElevenLabs
SirTrav A2A Studio
For the Commons Good
```

---

## LinkedIn Content Categories

### Recommended Types for Weekly Recaps
- **Thought Leadership:** Industry insights, lessons learned
- **Behind-the-Scenes:** Process, workflow, journey
- **Case Study:** Project outcomes, results
- **Personal Branding:** Professional development, skills
- **Company Culture:** Team highlights, values

### Video Styles for LinkedIn
1. **Talking Head:** Direct-to-camera (builds trust)
2. **Screen Recording:** Demos, tutorials (educational)
3. **B-Roll Montage:** Visual storytelling (our use case)
4. **Interview Style:** Q&A, expert insights
5. **Presentation:** Slide deck with voiceover

---

## SEO Optimization

### Video Title Keywords
- Professional, clear, descriptive
- Front-load main keyword
- 60-80 characters
- Examples:
  - "Weekly Innovation Recap: 3 Key Lessons"
  - "Behind the Scenes: My Creative Process"
  - "Project Highlights: From Concept to Launch"

### Post Text Strategy
```
[Hook - Question or bold statement]
Have you ever wondered how to...?

[Context - Brief setup]
Last week, I...

[Value - Key insights with bullets]
Here are 3 key takeaways:
• Insight 1
• Insight 2
• Insight 3

[CTA - Engagement prompt]
What's been your biggest learning this week? Share in the comments.

[Attribution]
🎵 Music: Suno AI
🎙️ Voice: ElevenLabs
🤖 SirTrav A2A Studio

#Hashtag1 #Hashtag2 #Hashtag3
```

### Engagement Tactics
- **Ask Questions:** End with open-ended question
- **Tag Connections:** Mention relevant people/companies (tastefully)
- **Respond Quickly:** Reply to early comments within 1 hour
- **Encourage Discussion:** "What do you think?" "Share your experience"
- **Share in Groups:** Post to relevant LinkedIn Groups (if allowed)

---

## Professional Branding

### Lower-Third Graphics
```json
{
  "lower_third": {
    "name": "Your Name",
    "title": "Your Title",
    "company": "Company Name",
    "duration": 5,
    "position": "bottom_left",
    "style": "minimal_professional"
  }
}
```

### Brand Consistency
- **Color Palette:** Match company/personal brand
- **Logo Placement:** Consistent position across videos
- **Font:** Professional, readable sans-serif
- **Music Style:** Consistent mood/genre
- **Intro/Outro:** Standardized (optional)

---

## Accessibility Standards

### LinkedIn Accessibility Features
- **Captions:** Auto-generated + manual review
- **Transcript:** Provide in post comments
- **Alt Text:** For thumbnail image
- **Audio Description:** For complex visuals (advanced)
- **Color Contrast:** Ensure text readability

---

## Analytics & Metrics

### Key Metrics to Track
- **View Count:** Total views
- **Watch Time:** Average percentage watched
- **Completion Rate:** % who watched to end
- **Engagement Rate:** Likes, comments, shares
- **Click-Through Rate:** Profile/website clicks
- **Follower Growth:** New followers from video

### Optimization Insights
- **First 3 Seconds:** Hook retention rate
- **Drop-Off Points:** Where viewers leave
- **Engagement Peaks:** When comments/likes spike
- **Audience Demographics:** Who's watching
- **Device Breakdown:** Desktop vs mobile

---

## Version History

- **1.0.0** (2025-12-09): Initial template with D2A integration and LinkedIn professional optimization
