# Vision-Enabled Director Agent v2 Specification

**Version:** 2.0  
**Created:** December 3, 2025  
**Status:** Implementation Ready  
**Pattern:** Global Rules, Local Roles (MASTER.md)

> This specification upgrades the Director Agent from "text-only imaginary director" to a **vision-powered curator** that actually sees and understands uploaded photos.

---

## 🎯 Purpose

Transform the Director Agent to:
1. **Accept real images** (20-30 photos from phone)
2. **Understand each image** via OpenAI Vision API
3. **Classify public vs private** use-cases
4. **Cluster into scenes** for storytelling
5. **Output rich `curated_media.json`** for downstream agents

---

## 🏗️ Architecture

```
User drops 30 photos in UI
      │
      ▼
┌────────────────────────────────────────┐
│  Netlify intake-upload.ts             │
│  - Save originals to private vault    │
│  - Generate signed URLs or /tmp paths │
└────────────────────────────────────────┘
      │
      ▼
┌────────────────────────────────────────┐
│  DIRECTOR AGENT (curate-media.ts) v2  │
│  1. Load list of image paths/URLs     │
│  2. Extract EXIF (time, orientation)  │
│  3. Call Vision API for each image    │
│  4. Get: caption, tags, mood, safety  │
│  5. Classify: public/family/biz/etc   │
│  6. Cluster into scenes & order       │
│  7. Write curated_media.json          │
└────────────────────────────────────────┘
      │
      ▼
Writer / Voice / Composer / Editor / etc
(unchanged, but now using real visual data)
```

---

## 📥 Input Schema

```typescript
interface DirectorRequest {
  project_id: string;
  project_mode: ProjectMode;
  images: ImageInput[];
  max_scenes?: number;      // default: 8
  max_assets_per_scene?: number; // default: 4
}

interface ImageInput {
  id: string;
  vault_path: string;       // e.g., "intake/2025-12-03/batch_001/IMG_001.jpg"
  preview_url?: string;     // optional signed URL
}

type ProjectMode = 
  | 'commons_public'   // SirTrav weekly recap for public sharing
  | 'social_reel'      // Short upbeat reel (IG, TikTok style)
  | 'family_collage'   // Private family context
  | 'biz_pitch'        // Investor/partner-facing recap
  | 'personal_journal' // Private, vault-only
```

---

## 📤 Output Schema: `curated_media.json`

```typescript
interface CuratedMediaOutput {
  project_id: string;
  project_mode: ProjectMode;
  source: {
    upload_batch_id: string;
    total_images: number;
    analyzed_images: number;
    failed_images: number;
  };
  scenes: Scene[];
  metadata: {
    agent: 'director';
    version: '2.0';
    vision_enabled: boolean;
    processing_time_ms: number;
    timestamp: string;
  };
}

interface Scene {
  scene_id: string;
  title: string;
  story_role: StoryRole;
  dominant_mood: Mood;
  tempo: Tempo;
  intended_audience: PrivacyBucket;
  summary_for_writer: string;
  assets: Asset[];
}

interface Asset {
  asset_id: string;
  vault_path: string;
  preview_url?: string;
  media_type: 'image' | 'video';
  shot_type: 'wide' | 'medium' | 'closeup';
  orientation: 'landscape' | 'portrait' | 'square';
  captured_at?: string;        // ISO timestamp from EXIF
  
  // Vision Analysis Results
  raw_caption: string;
  tags: string[];
  content_type: ContentType;
  safety_profile: SafetyProfile;
  privacy_bucket: PrivacyBucket;
  mood: Mood;
  quality_score: number;       // 0-1
  story_role: StoryRole;
  
  // Hints for Other Agents
  agent_notes: {
    writer_hint?: string;
    composer_hint?: string;
  };
  
  // Analysis Metadata
  analysis_status: 'success' | 'failed' | 'skipped';
}
```

---

## 🏷️ Taxonomy Enums

### Content Type
```typescript
type ContentType = 
  | 'people'           // Portraits, group shots
  | 'place'            // Landscapes, cityscapes
  | 'people_and_place' // People in a location
  | 'screenshot'       // Phone/computer screenshots
  | 'document'         // Documents, text-heavy
  | 'object'           // Products, food, items
  | 'mixed'            // Multiple categories
```

### Privacy Bucket
```typescript
type PrivacyBucket = 
  | 'public_commons'   // Safe for public web, social media
  | 'family_private'   // Kids, home, personal life
  | 'biz_internal'     // Whiteboards, financials, work docs
  | 'sensitive'        // NEVER publish (IDs, medical, etc.)
```

### Safety Profile
```typescript
type SafetyProfile = 
  | 'ok_public'        // Safe to publish as-is
  | 'blur_faces'       // Needs face blurring for public
  | 'do_not_publish'   // Keep in vault only
```

### Mood
```typescript
type Mood = 
  | 'calm'
  | 'energetic'
  | 'serious'
  | 'playful'
  | 'reflective'
```

### Tempo (for Composer)
```typescript
type Tempo = 'slow' | 'medium' | 'fast';

// Mapping Table
const MOOD_TO_TEMPO: Record<Mood, Tempo> = {
  calm: 'slow',
  reflective: 'medium',
  serious: 'medium',
  energetic: 'fast',
  playful: 'fast',
};
```

### Story Role
```typescript
type StoryRole = 
  | 'opening'          // Hook, first impression
  | 'middle'           // Journey, development
  | 'climax'           // Peak moment
  | 'outro'            // Closing, resolution
  | 'transition'       // Bridge between scenes
```

---

## 🔮 Vision API Integration

### OpenAI Responses API Call

```typescript
const DIRECTOR_VISION_PROMPT = `
You are a video director analyzing images for a ${project_mode} video.
Return ONLY valid JSON matching this schema:

{
  "raw_caption": "2-3 sentence description of what's happening",
  "tags": ["tag1", "tag2", "tag3"],
  "content_type": "one of: people, place, people_and_place, screenshot, document, object, mixed",
  "mood": "one of: calm, energetic, serious, playful, reflective",
  "safety_profile": "one of: ok_public, blur_faces, do_not_publish",
  "privacy_bucket": "one of: public_commons, family_private, biz_internal, sensitive",
  "story_role": "one of: opening, middle, climax, outro, transition",
  "quality_score": 0.85,
  "shot_type": "one of: wide, medium, closeup",
  "writer_hint": "Optional hint for narrative writer",
  "composer_hint": "Optional hint for music composer"
}

Classification Guidelines for ${project_mode}:
- public_commons: Generic scenes, landscapes, public events
- family_private: Children, home interiors, private moments
- biz_internal: Work documents, whiteboards, client info
- sensitive: IDs, medical info, financial documents

Focus on storytelling potential and emotional impact.
`;
```

### Cost Control Strategy

1. **Resize images** to max 1024px before sending
2. **Use `detail: "low"`** unless OCR needed
3. **Batch requests** with rate limiting
4. **Cache results** for re-runs

Estimated cost: ~$0.01-0.03 per image with gpt-4.1-mini

---

## 🎬 Scene Clustering Algorithm

```typescript
function clusterIntoScenes(assets: Asset[]): Scene[] {
  // 1. Sort by timestamp (EXIF or file order)
  const sorted = assets.sort((a, b) => 
    new Date(a.captured_at || 0).getTime() - new Date(b.captured_at || 0).getTime()
  );
  
  // 2. Group by time gaps + content changes
  const scenes: Scene[] = [];
  let currentScene: Asset[] = [];
  
  for (let i = 0; i < sorted.length; i++) {
    const asset = sorted[i];
    const prevAsset = sorted[i - 1];
    
    const shouldSplit = 
      !prevAsset ||
      timeGapMinutes(prevAsset.captured_at, asset.captured_at) > 60 ||
      asset.content_type !== prevAsset.content_type;
    
    if (shouldSplit && currentScene.length > 0) {
      scenes.push(buildScene(currentScene, scenes.length));
      currentScene = [];
    }
    
    currentScene.push(asset);
  }
  
  if (currentScene.length > 0) {
    scenes.push(buildScene(currentScene, scenes.length));
  }
  
  // 3. Assign story roles
  return assignStoryRoles(scenes);
}

function assignStoryRoles(scenes: Scene[]): Scene[] {
  if (scenes.length === 0) return scenes;
  
  scenes[0].story_role = 'opening';
  scenes[scenes.length - 1].story_role = 'outro';
  
  // Middle scenes
  for (let i = 1; i < scenes.length - 1; i++) {
    const position = i / (scenes.length - 1);
    if (position >= 0.5 && position <= 0.7) {
      scenes[i].story_role = 'climax';
    } else {
      scenes[i].story_role = 'middle';
    }
  }
  
  return scenes;
}
```

---

## 🔒 Privacy Filtering by Project Mode

```typescript
function filterByProjectMode(
  assets: Asset[], 
  projectMode: ProjectMode
): Asset[] {
  const allowedBuckets: Record<ProjectMode, PrivacyBucket[]> = {
    commons_public: ['public_commons'],
    social_reel: ['public_commons'],
    family_collage: ['public_commons', 'family_private'],
    biz_pitch: ['public_commons', 'biz_internal'],
    personal_journal: ['public_commons', 'family_private', 'biz_internal', 'sensitive'],
  };
  
  return assets.filter(asset => 
    allowedBuckets[projectMode].includes(asset.privacy_bucket) &&
    asset.safety_profile !== 'do_not_publish'
  );
}
```

---

## 🖱️ Feedback Integration

### Simple Mode (MVP)
```json
{
  "project_id": "week44",
  "rating": "good",
  "project_mode": "commons_public",
  "notes": "Music felt too fast; images were on point."
}
```

### Inspector Mode (Phase 2)
```json
{
  "project_id": "week44",
  "asset_id": "img_001",
  "corrections": {
    "privacy_bucket": "family_private",
    "mood": "reflective"
  }
}
```

Corrections feed into `memory_index.json` for future few-shot prompting.

---

## 🧪 Testing

### Test Request
```bash
curl -X POST http://localhost:8888/.netlify/functions/curate-media \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "test-week-001",
    "project_mode": "commons_public",
    "images": [
      {"id": "img_001", "vault_path": "intake/test/photo1.jpg"},
      {"id": "img_002", "vault_path": "intake/test/photo2.jpg"}
    ]
  }'
```

### Expected Response
```json
{
  "ok": true,
  "project_id": "test-week-001",
  "curated_media_path": "/tmp/test-week-001/curated_media.json",
  "summary": {
    "total_images": 2,
    "analyzed": 2,
    "scenes": 1,
    "dominant_mood": "reflective"
  }
}
```

---

## 📋 Implementation Checklist

- [ ] Create `netlify/functions/lib/vision.ts`
- [ ] Update `netlify/functions/curate-media.ts` to v2
- [ ] Add EXIF extraction (using `exif-parser` package)
- [ ] Implement scene clustering algorithm
- [ ] Add privacy filtering by project mode
- [ ] Write unit tests with 30-photo test batch
- [ ] Add `OPENAI_API_KEY` to Netlify environment
- [ ] Update `submit-evaluation.ts` for per-image corrections
- [ ] Update MASTER.md with progress

---

## 🔗 Related Documents

- [MASTER.md](../MASTER.md) - Central build plan
- [COMMONS_GOOD.md](../COMMONS_GOOD.md) - Attribution philosophy
- [WIKI.md](../WIKI.md) - Technical reference

---

*Specification follows "Global Rules, Local Roles" - upgrading Director's local capability without changing the manifest or other agents.*
