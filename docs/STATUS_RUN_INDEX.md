# STATUS_RUN_INDEX.md
> Central Ledger for Pipeline Run State

## Overview

The **Run Index** is the single source of truth for all pipeline run state. It tracks:
- Pipeline status (`queued` → `running` → `completed` | `failed`)
- Artifact references (video URLs, audio keys, etc.)
- Agent metadata (voice settings, music config)
- Cost manifest (invoice with 20% markup)

---

## Storage Location

```
projects/{projectId}/runs/{runId}/index.json
```

Built by `makeIndexKey()`:
```typescript
export const makeIndexKey = (projectId: string, runId: string) =>
  `projects/${projectId}/runs/${runId}/index.json`;
```

---

## Status Lifecycle

```
┌─────────┐    ┌─────────┐    ┌───────────┐
│ queued  │ -> │ running │ -> │ completed │
└─────────┘    └─────────┘    └───────────┘
                    │
                    v
               ┌────────┐
               │ failed │
               └────────┘
```

| Status | Meaning | Trigger |
|--------|---------|---------|
| `queued` | Request received, awaiting processing | `start-pipeline.ts` creates run |
| `running` | Pipeline actively executing agents | First agent starts |
| `completed` | All agents finished successfully | Publisher agent completes |
| `failed` | Pipeline encountered error | Any unhandled exception |

**CRITICAL**: Status must be `completed` (not `complete`) - normalized across entire stack.

---

## Schema

```typescript
export type RunStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface RunArtifacts {
  // Identity
  projectId: string;
  runId: string;
  status: RunStatus;

  // Timestamps
  createdAt: string;      // ISO 8601
  updatedAt?: string;     // ISO 8601

  // Artifact Keys (Blob Store)
  payloadKey?: string;
  narrationKey?: string;
  musicKey?: string;
  beatGridKey?: string;
  finalVideoKey?: string;
  exportBundleKey?: string;

  // Golden Path Output
  videoUrl?: string;      // Signed URL to final video
  creditsUrl?: string;    // URL to credits overlay
  pipelineMode?: string;  // 'placeholder' | 'live'

  // Cost Plus Manifest
  invoice?: Manifest;     // Full breakdown with 20% markup

  // Progress Tracking
  step?: string;          // Current agent name
  message?: string;       // Human-readable progress
  dashboardUrl?: string;  // Link to view run status

  // Agent-Specific Metadata
  voice?: VoiceMetadata;
  music?: MusicMetadata;

  // Error Info
  error?: string;
}
```

### Voice Metadata
```typescript
interface VoiceMetadata {
  voiceId?: string;       // ElevenLabs voice ID
  modelId?: string;       // TTS model
  characters?: number;    // Script length
  costCents?: number;     // API cost
  placeholder?: boolean;  // Dev mode flag
  store?: string;         // Blob key
}
```

### Music Metadata
```typescript
interface MusicMetadata {
  mode?: string;          // 'suno' | 'manual' | 'stock'
  bpm?: number;           // Beats per minute
  duration?: number;      // Seconds
  promptHash?: string;    // For caching
  approvedBy?: string;    // User who approved
  licenseTier?: string;   // 'royalty-free' | 'licensed'
  sunoId?: string | null; // Suno generation ID
  manualFile?: string;    // Uploaded file key
  gridSource?: string;    // Beat grid source
  store?: string;         // Blob key
}
```

---

## API Functions

### `getRunIndex(projectId, runId)`
Retrieves the current run state.

```typescript
const run = await getRunIndex('proj_123', 'run_abc');
if (run?.status === 'completed') {
  console.log('Video ready:', run.videoUrl);
}
```

### `updateRunIndex(projectId, runId, patch)`
Updates run state with automatic merging of nested objects.

```typescript
await updateRunIndex('proj_123', 'run_abc', {
  status: 'running',
  step: 'voice',
  message: 'Generating narration...',
  voice: { voiceId: 'rachel', characters: 1500 }
});
```

**Features:**
- Auto-timestamps `updatedAt`
- Merges nested `voice` and `music` objects
- Stores metadata for blob indexing

---

## Integration Points

### 1. Pipeline Start (`start-pipeline.ts`)
```typescript
await updateRunIndex(projectId, runId, {
  status: 'queued',
  step: 'queued',
  message: 'Pipeline queued'
});
```

### 2. Agent Progress (`run-pipeline-background.ts`)
```typescript
// In updateRun helper
await updateRunIndex(projectId, runId, {
  status: 'running',
  step: 'voice',
  message: 'Voice synthesis in progress...'
});

// Also posts to SSE via appendProgress()
await appendProgress(projectId, runId, {
  agent: 'voice',
  status: 'running',
  message: 'Voice synthesis in progress...',
  progress: 45
});
```

### 3. Pipeline Complete
```typescript
await updateRunIndex(projectId, runId, {
  status: 'completed',
  videoUrl: signedVideoUrl,
  creditsUrl: creditsUrl,
  invoice: manifestGenerator.generate(runId),
  pipelineMode: 'placeholder'
});
```

### 4. Error Handling
```typescript
await updateRunIndex(projectId, runId, {
  status: 'failed',
  error: error.message,
  step: 'voice',
  message: 'Voice agent failed'
});
```

---

## SSE Progress Streaming

The run index is updated in parallel with SSE events:

```typescript
// runIndex -> persistent state (Blob Store)
await updateRunIndex(projectId, runId, patch);

// appendProgress -> real-time SSE stream
await appendProgress(projectId, runId, {
  projectId,
  runId,
  agent: patch.step || 'pipeline',
  status: statusMap[patch.status],
  message: patch.message,
  timestamp: new Date().toISOString(),
  progress: patch.progress || 0
});
```

---

## Querying Runs

### By Project
```typescript
// List all runs for a project
const runs = await runsStore().list({ prefix: `projects/${projectId}/runs/` });
```

### Latest Run
```typescript
// Get most recent run
const runs = await runsStore().list({
  prefix: `projects/${projectId}/runs/`,
  limit: 1,
  sort: 'desc'
});
```

---

## File Location
```
netlify/functions/lib/runIndex.ts
```

---

## Related Documentation
- [SKILL_TEMPLATE.md](skills/SKILL_TEMPLATE.md) - Agent contract template
- [MCP_CONFIG.md](MCP_CONFIG.md) - External service integration
- [RC1_CHECKLIST.md](RC1_CHECKLIST.md) - Release readiness checklist
