# Memory Schema - SirTrav A2A Learning System

**Version:** 1.0.0  
**File Location:** \Sir-TRAV-scott/memory_index.json\ (private vault)  
**Purpose:** Enable AI to learn user preferences through 👍/👎 feedback

---

## 📊 JSON Schema Structure

\\\json
{
  "schema_version": "1.0.0",
  "user_preferences": {
    "favorite_moods": ["reflective", "uplifting"],
    "disliked_music_styles": ["heavy_drums", "aggressive"],
    "preferred_length_sec": 60,
    "voice_style": "calm_narrative",
    "last_updated": "2025-11-10T18:00:00Z"
  },
  "video_history": [
    {
      "project_id": "week44_recap_2025-11-09",
      "user_rating": "good",
      "theme": "reflective",
      "music_style": "calm_piano",
      "duration_sec": 62,
      "created_at": "2025-11-09T18:45:00Z",
      "social_engagement": {
        "views": 1203,
        "likes": 42,
        "shares": 7,
        "engagement_score": 89
      },
      "agent_metadata": {
        "director_curated_count": 12,
        "writer_word_count": 287,
        "voice_duration_sec": 45,
        "composer_style": "ambient_piano"
      }
    }
  ],
  "agent_performance": {
    "director": {
      "avg_duration_ms": 2300,
      "success_rate": 0.98,
      "total_runs": 15
    },
    "writer": {
      "avg_duration_ms": 4100,
      "success_rate": 1.0,
      "avg_word_count": 285
    },
    "voice": {
      "avg_duration_ms": 8200,
      "success_rate": 0.95,
      "fallback_used_count": 1
    }
  }
}
\\\

---

## 🔄 Read/Write Patterns

### Director Agent READS Memory

\\\	ypescript
// netlify/functions/curate-media.ts
import { readMemory } from './lib/memory';

const memory = await readMemory();
const favoriteThemes = memory.user_preferences.favorite_moods;

// Use preferences to curate media
if (favoriteThemes.includes('reflective')) {
  // Prioritize slow-paced, meaningful clips
  curatedMedia = filterByPace(allMedia, 'slow');
}
\\\

### Publisher Agent WRITES Memory

\\\	ypescript
// netlify/functions/publish.ts
import { updateMemory } from './lib/memory';

await updateMemory({
  video_history: [{
    project_id: projectId,
    user_rating: 'pending', // Updated by submit-evaluation later
    theme: manifest.ego.theme,
    music_style: musicMetadata.style,
    created_at: new Date().toISOString()
  }]
});
\\\

### User Feedback Loop UPDATES Memory

\\\	ypescript
// netlify/functions/submit-evaluation.ts
import { updateMemory } from './lib/memory';

export async function handler(event) {
  const { project_id, rating } = JSON.parse(event.body);
  
  // Find the video in history and update rating
  const memory = await readMemory();
  const video = memory.video_history.find(v => v.project_id === project_id);
  
  if (video) {
    video.user_rating = rating; // 'good' or 'bad'
    
    // Learn from feedback
    if (rating === 'good') {
      memory.user_preferences.favorite_moods.push(video.theme);
    } else {
      memory.user_preferences.disliked_music_styles.push(video.music_style);
    }
    
    await writeMemory(memory);
  }
}
\\\

---

## 📁 File Locations

| File | Location | Purpose |
|------|----------|---------|
| **Memory Data** | \Sir-TRAV-scott/memory_index.json\ | Private vault, actual data |
| **Memory Schema** | \docs/MEMORY_SCHEMA.md\ | Public docs, schema definition |
| **Memory Library** | \
etlify/functions/lib/memory.ts\ | Read/write utilities |

---

## ✅ Implementation Checklist

- [ ] Create \memory_index.json\ in private vault with initial structure
- [ ] Create \lib/memory.ts\ helper functions (readMemory, writeMemory, updateMemory)
- [ ] Update Director Agent to read user preferences
- [ ] Update Publisher Agent to log video history
- [ ] Create \submit-evaluation.ts\ function for user feedback
- [ ] Wire 👍/👎 buttons in ResultsPreview.tsx to call submit-evaluation

---

**Status:** ✅ Schema Defined - Ready for implementation  
**Next:** Build \lib/memory.ts\ helper functions
