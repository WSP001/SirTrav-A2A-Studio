# Director Agent Specification

**Version:** 1.0.0  
**Status:** ✅ Complete (Placeholder Mode)  
**Function:** `netlify/functions/curate-media.ts`  
**Slash Command:** `/slash-director`

---

## 1. Purpose & Design Intent

### What It Does
The Director Agent curates key shots from the private media vault, sets creative direction (theme, mood, pacing), and determines narrative structure.

### Why It Exists
- **Human-like curation** - Learns what Travis finds meaningful, not just what's algorithmically optimal
- **EGO-Prompt learning** - Reads `memory_index.json` to understand past successes
- **Creative benchmark** - Establishes the "taste" that other agents follow

### Design Philosophy
This agent is NOT a simple "pick random files" script. It's the **creative director** of the pipeline - its choices shape the entire video's feel.

---

## 2. Input Schema

```json
{
  "projectId": "week44",
  "maxScenes": 12,
  "sourceRoot": "content/intake/2025-11-01-week44",
  "theme": "reflective",
  "mood": "contemplative"
}
```

### Required Fields
- `projectId` (string) - Unique identifier for this project
- `maxScenes` (number) - Maximum shots to select (8-15 recommended)

### Optional Fields
- `sourceRoot` (string) - Path to media files (defaults to project config)
- `theme` (string) - Override theme suggestion (defaults to memory-based)
- `mood` (string) - Override mood suggestion (defaults to memory-based)

---

## 3. Output Schema

```json
{
  "ok": true,
  "projectId": "week44",
  "theme": "reflective",
  "mood": "contemplative",
  "pacing": "medium-slow",
  "scenes": [
    {
      "file": "IMG_0123.jpg",
      "duration": 4.2,
      "transition": "fade",
      "notes": "Golden hour landscape - establishes mood"
    },
    {
      "file": "VID_0456.mp4",
      "duration": 3.5,
      "transition": "cut",
      "notes": "Action moment - builds energy"
    }
  ],
  "totalDuration": 45.8,
  "learnings": {
    "pastSuccessfulThemes": ["reflective", "uplifting"],
    "avoidsThemes": ["moody", "dark"]
  }
}
```

### Output Fields
- `ok` (boolean) - Success indicator
- `projectId` (string) - Echo of input
- `theme` (string) - Chosen creative theme
- `mood` (string) - Emotional tone
- `pacing` (string) - Speed/rhythm (slow/medium-slow/medium/medium-fast/fast)
- `scenes` (array) - Ordered shot list with metadata
- `totalDuration` (number) - Sum of all scene durations in seconds
- `learnings` (object) - Insights from memory for debugging

---

## 4. Memory Integration

### Reads From
**File:** `Sir-TRAV-scott/memory_index.json`

```json
{
  "projects": [
    {
      "project_id": "week43",
      "theme": "reflective",
      "rating": "good",
      "social_engagement": 89,
      "user_feedback": "👍"
    }
  ]
}
```

### Learning Logic
```javascript
// Example: Prioritize themes with high ratings
const successfulThemes = memory.projects
  .filter(p => p.rating === 'good')
  .map(p => p.theme);

if (successfulThemes.includes('reflective')) {
  // Bias toward reflective shots
}
```

### Writes To
Does NOT write to memory (that's Publisher's job). Only reads for curation decisions.

---

## 5. API Requirements

### External Dependencies
- **None for MVP** - Uses local filesystem only
- **Future:** Gemini Vision API for intelligent shot selection

### Environment Variables
```bash
# Current (placeholder mode)
# No API keys required

# Future (real AI curation)
GEMINI_API_KEY=your_api_key_here
GEMINI_VISION_MODEL=gemini-pro-vision
```

---

## 6. Error Handling & Fallbacks

### Critical Failures (Must Abort)
- `sourceRoot` directory not found
- No media files in source directory
- Invalid `projectId` format

### Non-Critical Failures (Use Defaults)
- `memory_index.json` not found → Use default theme "reflective"
- Fewer than `maxScenes` available → Use all available files

### Fallback Strategy
```javascript
// If memory read fails
const defaultTheme = 'reflective';
const defaultMood = 'contemplative';
const defaultPacing = 'medium-slow';

// If scene count is low
if (availableScenes < maxScenes) {
  console.warn(`Only ${availableScenes} scenes available, using all`);
  maxScenes = availableScenes;
}
```

---

## 7. Testing

### Local Test (curl)
```bash
curl -X POST http://localhost:8888/.netlify/functions/curate-media \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "test-week1",
    "maxScenes": 5
  }'
```

### Expected Response
```json
{
  "ok": true,
  "projectId": "test-week1",
  "theme": "reflective",
  "mood": "contemplative",
  "pacing": "medium-slow",
  "scenes": [
    { "file": "IMG_0123.jpg", "duration": 4.2, "transition": "fade" },
    { "file": "VID_0456.mp4", "duration": 3.5, "transition": "cut" }
  ],
  "totalDuration": 23.5
}
```

### Unit Tests
```javascript
describe('Director Agent', () => {
  test('selects correct number of scenes', () => {
    const result = await curateMedia({ maxScenes: 5 });
    expect(result.scenes.length).toBe(5);
  });
  
  test('respects memory learnings', () => {
    const result = await curateMedia({ projectId: 'week44' });
    expect(['reflective', 'uplifting']).toContain(result.theme);
  });
});
```

---

## 8. Example Payloads

### Minimal Request
```json
{
  "projectId": "week44",
  "maxScenes": 10
}
```

### Full Request (with overrides)
```json
{
  "projectId": "week44",
  "maxScenes": 12,
  "sourceRoot": "content/intake/2025-11-01-week44",
  "theme": "uplifting",
  "mood": "joyful"
}
```

### Success Response
```json
{
  "ok": true,
  "projectId": "week44",
  "theme": "reflective",
  "mood": "contemplative",
  "pacing": "medium-slow",
  "scenes": [
    {
      "file": "IMG_0123.jpg",
      "duration": 4.2,
      "transition": "fade",
      "notes": "Golden hour landscape"
    }
  ],
  "totalDuration": 45.8
}
```

### Error Response
```json
{
  "ok": false,
  "error": "Source directory not found",
  "projectId": "week44",
  "sourceRoot": "content/intake/invalid-path"
}
```

---

## 9. Implementation Notes

### Current Status (v1.0)
- ✅ Placeholder mode working
- ✅ Returns mock curated scenes
- ✅ Reads memory_index.json structure
- ⏳ Needs real shot selection algorithm
- ⏳ Needs Gemini Vision integration

### Next Steps
1. Implement real file scanning of `sourceRoot`
2. Add image/video duration detection (FFprobe)
3. Integrate Gemini Vision for intelligent selection
4. Add transition logic based on content analysis
5. Optimize for performance (cache file metadata)

---

## 10. Manifest Integration

### In `pipelines/a2a_manifest.yml`
```yaml
steps:
  - name: curate_media
    endpoint: "${env.URL}/.netlify/functions/curate-media"
    input:
      projectId: "${project.id}"
      maxScenes: 12
      sourceRoot: "${project.source_root}"
    output: "tmp/${project.id}/curated_media.json"
```

---

**Last Updated:** 2025-11-10  
**Maintainer:** Cascade AI / Scott Echols
