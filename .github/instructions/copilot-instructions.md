# SirTrav A2A Studio - Copilot Instructions

## Project Overview
SirTrav A2A Studio is a D2A (Doc-to-Agent) automated video production platform for the Commons Good.
Users upload photos → Click2Kick → 7 AI agents produce cinematic videos with attribution.

## Architecture: 7-Agent Sequential Pipeline

```
Director → Writer → Voice → Composer → Editor → Attribution → Publisher
   ↓         ↓        ↓         ↓          ↓          ↓           ↓
curate    narrate   text-to  generate  compile   generate    publish
-media    -project  -speech   -music    -video   -attribution  .ts
```

Each agent:
1. Reads from previous agent's output
2. Calls external API (OpenAI, ElevenLabs, Suno, FFmpeg)
3. Writes to Netlify Blobs storage
4. Emits progress events via SSE

## Critical Patterns

### Storage: Netlify Blobs (NOT /tmp)
```typescript
// ✅ CORRECT - Durable across function invocations
import { getStore } from '@netlify/blobs';
const store = getStore('sirtrav-progress');
await store.setJSON(key, data);

// ❌ WRONG - Ephemeral, lost between invocations
fs.writeFileSync('/tmp/data.json', data);
```

### Progress Tracking: SSE + Blobs
```typescript
// Always use the progress-store helper
import { appendProgress, readProgress } from './lib/progress-store';

await appendProgress(projectId, runId, {
  agent: 'director',
  status: 'complete',
  timestamp: Date.now()
});
```

### Failover Pattern: Graceful Degradation
```typescript
// Every external API call needs fallback
try {
  const result = await externalAPI.call();
  return result;
} catch (error) {
  console.warn(`${agentName} failed, using fallback:`, error);
  return getFallbackResult(); // Mock/placeholder data
}
```

### Learning Loop: EGO-Prompt Architecture
```
User Feedback (👍/👎)
       ↓
submit-evaluation.ts
       ↓
memory_index.json (user_preferences, video_history)
       ↓
Director reads preferences on next run
```

## File Organization

| Path | Purpose |
|------|---------|
| `netlify/functions/*.ts` | Serverless agents |
| `netlify/functions/lib/` | Shared utilities |
| `src/components/` | React UI components |
| `pipelines/` | FFmpeg scripts & manifest |
| `scripts/` | Build & test scripts |
| `docs/` | Technical documentation |

## Environment Variables Required
```env
OPENAI_API_KEY=         # Required - Vision + GPT-4
ELEVENLABS_API_KEY=     # Optional - Voice synthesis
SUNO_API_KEY=           # Optional - Music generation
AWS_ACCESS_KEY_ID=      # Optional - S3 fallback
AWS_SECRET_ACCESS_KEY=  # Optional - S3 fallback
```

## Testing Commands
```bash
# Build verification
npm run build

# Smoke test endpoints
bash scripts/smoke-test.sh http://localhost:8888/.netlify/functions

# Run all tests
npm test
```

## Before Making Changes
1. Read `MASTER.md` for current status
2. Check `docs/MEMORY_SCHEMA.md` for data structures
3. Run `npm run build` to verify no breaks
4. Use Netlify Blobs, never /tmp for persistence
