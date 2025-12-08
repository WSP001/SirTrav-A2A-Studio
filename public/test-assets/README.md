# Test Assets

This folder contains test files for the SirTrav A2A Studio pipeline.

## Files

| File | Purpose | Size |
|------|---------|------|
| `test-video.mp4` | Placeholder video for testing pipeline | ~29KB |
| `credits.json` | Sample credits/attribution data | ~0.5KB |

## Usage

When no external video APIs are configured, the app returns these test files so users can:
1. Verify the UI works
2. Test the download functionality
3. See the complete flow before paying for APIs

## To Generate Real Videos

Set these environment variables in Netlify:

```
# Required for AI-powered video
OPENAI_API_KEY=sk-...

# Optional: Voice narration
ELEVENLABS_API_KEY=...

# Required for video compilation (choose one):
CREATOMATE_API_KEY=...      # Easiest setup
# OR
CLOUDINARY_URL=...          # Alternative
```

See `/docs/LOCAL_DEV.md` for full setup instructions.
