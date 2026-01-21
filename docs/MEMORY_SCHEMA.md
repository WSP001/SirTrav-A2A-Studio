# Memory Schema - SirTrav A2A Learning System

**Version:** 1.0.0  
**File Location:** `Sir-TRAV-scott/memory_index.json` (private vault)  
**Purpose:** Enable AI agents to learn user preferences and outcomes through feedback collected in the pipeline.

---

## 📊 JSON Schema Structure

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "SirTravMemoryIndex",
  "type": "object",
  "required": ["schema_version", "user_preferences", "video_history"],
  "properties": {
    "schema_version": { "type": "string", "pattern": "^1\\.0\\.0$" },
    "user_preferences": {
      "type": "object",
      "required": ["favorite_moods", "disliked_music_styles", "preferred_length_sec", "voice_style"],
      "properties": {
        "favorite_moods": { "type": "array", "items": { "type": "string" }, "maxItems": 50 },
        "disliked_music_styles": { "type": "array", "items": { "type": "string" }, "maxItems": 50 },
        "preferred_length_sec": { "type": "number", "minimum": 10, "maximum": 600 },
        "voice_style": { "type": "string" },
        "last_updated": { "type": "string", "format": "date-time" }
      }
    },
    "video_history": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["project_id", "theme", "music_style", "duration_sec", "created_at"],
        "properties": {
          "project_id": { "type": "string" },
          "user_rating": { "type": "string", "enum": ["good", "bad", "pending"] },
          "theme": { "type": "string" },
          "music_style": { "type": "string" },
          "duration_sec": { "type": "number" },
          "created_at": { "type": "string", "format": "date-time" },
          "social_engagement": {
            "type": "object",
            "properties": {
              "views": { "type": "integer" },
              "likes": { "type": "integer" },
              "shares": { "type": "integer" },
              "engagement_score": { "type": "number" }
            }
          },
          "agent_metadata": {
            "type": "object",
            "properties": {
              "director_curated_count": { "type": "integer" },
              "writer_word_count": { "type": "integer" },
              "voice_duration_sec": { "type": "number" },
              "composer_style": { "type": "string" }
            }
          }
        }
      }
    },
    "agent_performance": {
      "type": "object",
      "properties": {
        "director": {
          "type": "object",
          "properties": {
            "avg_duration_ms": { "type": "number" },
            "success_rate": { "type": "number", "minimum": 0, "maximum": 1 },
            "total_runs": { "type": "integer" }
          }
        },
        "writer": {
          "type": "object",
          "properties": {
            "avg_duration_ms": { "type": "number" },
            "success_rate": { "type": "number", "minimum": 0, "maximum": 1 },
            "avg_word_count": { "type": "number" }
          }
        },
        "voice": {
          "type": "object",
          "properties": {
            "avg_duration_ms": { "type": "number" },
            "success_rate": { "type": "number", "minimum": 0, "maximum": 1 },
            "fallback_used_count": { "type": "integer" }
          }
        }
      }
    }
  }
}
```

---

## 🔄 Read/Write Patterns

### Director Agent READS Memory

```typescript
// netlify/functions/curate-media.ts
import { readMemory } from './lib/memory';

const memory = await readMemory();
const favoriteThemes = memory.user_preferences.favorite_moods;

// Curate toward the user’s favored moods
const curated = prioritizeByMood(inventory, favoriteThemes);
```

### Publisher Agent WRITES Memory

```typescript
// netlify/functions/publish.ts
import { updateMemory } from './lib/memory';

await updateMemory({
  video_history: [{
    project_id: projectId,
    user_rating: 'pending',
    theme: manifest.ego?.theme ?? 'unknown',
    music_style: musicMeta.style,
    duration_sec: videoDuration,
    created_at: new Date().toISOString()
  }]
});
```

### User Feedback Loop UPDATES Memory

```typescript
// netlify/functions/submit-evaluation.ts
import { updateMemory } from './lib/memory';

export const handler = async (event) => {
  const { projectId, rating, tags } = JSON.parse(event.body || '{}');
  const memory = await readMemory();
  const target = memory.video_history.find((v) => v.project_id === projectId);

  if (target) {
    target.user_rating = rating;
    if (rating === 'good') {
      memory.user_preferences.favorite_moods = dedupe([
        ...memory.user_preferences.favorite_moods,
        ...(tags || [])
      ]);
    } else {
      memory.user_preferences.disliked_music_styles = dedupe([
        ...memory.user_preferences.disliked_music_styles,
        ...(tags || [])
      ]);
    }
  }

  memory.user_preferences.last_updated = new Date().toISOString();
  await writeMemory(memory);
};
```

---

## 📁 File Locations

| File | Location | Purpose |
|------|----------|---------|
| **Memory Data** | `Sir-TRAV-scott/memory_index.json` | Private vault, live preferences + history |
| **Memory Schema** | `docs/MEMORY_SCHEMA.md` | Public docs, schema definition |
| **Memory Library** | `netlify/functions/lib/memory.ts` | Helper utilities for agents |

---

## ✅ Implementation Checklist

- [ ] Create `memory_index.json` in the private vault using this schema
- [ ] Add `netlify/functions/lib/memory.ts` (readMemory, writeMemory, updateMemory)
- [ ] Wire Director to read user preferences
- [ ] Wire Publisher to log video history
- [ ] Wire submit-evaluation to update preferences
- [ ] Surface 👍/👎 buttons in ResultsPreview to call submit-evaluation

---

**Status:** Ready for implementation
