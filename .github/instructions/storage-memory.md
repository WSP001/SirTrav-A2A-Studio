# Storage & Memory Instructions

## Storage Architecture

```
┌────────────────────────────────────────────────────────┐
│                   Netlify Blobs                        │
├─────────────────┬─────────────────┬───────────────────┤
│ sirtrav-videos  │ sirtrav-audio   │ sirtrav-media     │
│ Final outputs   │ Voice/music     │ Uploaded photos   │
├─────────────────┼─────────────────┼───────────────────┤
│ sirtrav-runs    │ sirtrav-evals   │ sirtrav-progress  │
│ Pipeline state  │ User feedback   │ SSE events        │
└─────────────────┴─────────────────┴───────────────────┘
```

## Key Patterns

### ✅ DO: Use Netlify Blobs
```typescript
import { getStore } from '@netlify/blobs';

// Get typed store
const store = getStore('sirtrav-progress');

// Write JSON
await store.setJSON(`projects/${projectId}/runs/${runId}/state.json`, {
  status: 'complete',
  timestamp: Date.now()
});

// Read JSON
const state = await store.get(`projects/${projectId}/runs/${runId}/state.json`, {
  type: 'json'
});

// List keys
const { blobs } = await store.list({ prefix: `projects/${projectId}/` });
```

### ❌ DON'T: Use /tmp or in-memory
```typescript
// WRONG - Lost on cold start
const cache = new Map();
fs.writeFileSync('/tmp/state.json', data);

// WRONG - Not shared between instances
global.progressEvents = [];
```

## Progress Store Helper

Always use `lib/progress-store.ts` for progress tracking:

```typescript
import { appendProgress, readProgress } from './lib/progress-store';

// Append event (auto-caps at 200 events)
await appendProgress(projectId, runId, {
  agent: 'director',
  status: 'complete',
  data: { mediaCount: 5 }
});

// Read all events
const events = await readProgress(projectId, runId);
```

## Memory Index Schema

The learning loop persists to `memory_index.json`:

```typescript
interface MemoryIndex {
  user_preferences: {
    favorite_moods: string[];      // ['uplifting', 'cinematic']
    preferred_duration: number;     // 45 (seconds)
    disliked_music_styles: string[];// ['heavy-metal']
  };
  video_history: Array<{
    runId: string;
    timestamp: number;
    rating: 'good' | 'bad' | null;
    theme: string;
    musicStyle: string;
  }>;
  learned_patterns: {
    successfulCombinations: Array<{
      mood: string;
      musicStyle: string;
      successRate: number;
    }>;
  };
}
```

## Storage Limits & Caps

| Store | Key Pattern | Max Size | Retention |
|-------|-------------|----------|-----------|
| progress | `projects/{id}/runs/{id}/progress.json` | 200 events | 30 days |
| runs | `projects/{id}/runs/{id}/*` | 10MB | 90 days |
| videos | `{runId}/final.mp4` | 500MB | Permanent |
| evals | `{runId}/evaluation.json` | 1KB | Permanent |

## Data Cleanup

Implement automatic cleanup for old runs:

```typescript
async function cleanupOldRuns(projectId: string, maxAge: number = 30 * 24 * 60 * 60 * 1000) {
  const store = getStore('sirtrav-runs');
  const { blobs } = await store.list({ prefix: `projects/${projectId}/runs/` });
  
  const cutoff = Date.now() - maxAge;
  for (const blob of blobs) {
    const metadata = await store.getMetadata(blob.key);
    if (metadata?.uploadedAt < cutoff) {
      await store.delete(blob.key);
    }
  }
}
```

## Migrating from /tmp

If you find code using `/tmp`, migrate it:

```typescript
// BEFORE (ephemeral)
const tempPath = `/tmp/${runId}/state.json`;
fs.writeFileSync(tempPath, JSON.stringify(state));
const data = JSON.parse(fs.readFileSync(tempPath, 'utf8'));

// AFTER (durable)
const store = getStore('sirtrav-runs');
await store.setJSON(`${runId}/state.json`, state);
const data = await store.get(`${runId}/state.json`, { type: 'json' });
```
