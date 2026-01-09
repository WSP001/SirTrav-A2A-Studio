# SirTrav-A2A-Studio: U2A + A2A Architecture

> **User-to-Agent (U2A)** and **Agent-to-Agent (A2A)** Protocol Documentation
> Version: 2.0.0 | Updated: January 3, 2026

---

## 1. Executive Summary

SirTrav-A2A-Studio is a **video creation platform** that transforms user-uploaded media (images, video clips) into polished short-form content through a **7-agent pipeline**. The architecture implements:

- **U2A Layer**: User interface → Agent orchestration
- **A2A Layer**: Agent collaboration (Director → Writer → Voice → Music → Editor → Publisher)
- **Memory Layer**: Persistent context via Netlify Blobs

```
┌─────────────────────────────────────────────────────────────┐
│                     U2A LAYER (Frontend)                     │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │  Upload  │→ │Creative Brief│→ │  Click2Kick Button   │  │
│  │Component │  │    (mood,    │  │  (triggers pipeline) │  │
│  └──────────┘  │  audience)   │  └───────────────────────┘  │
│                └──────────────┘                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    MIDDLEWARE (Functions)                    │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐ │
│  │intake-     │→ │generate-   │→ │run-pipeline-background │ │
│  │upload.ts   │  │video.ts    │  │(7-agent orchestration) │ │
│  └────────────┘  └────────────┘  └────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      A2A LAYER (Agents)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │
│  │ Director │→ │  Writer  │→ │  Voice   │→ │    Music     │ │
│  │  Agent   │  │  Agent   │  │  Agent   │  │    Agent     │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘ │
│       ↓                                          ↓          │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────────┐   │
│  │  Editor  │← │Publisher │← │       Compiler           │   │
│  │  Agent   │  │  Agent   │  │   (FFmpeg assembly)      │   │
│  └──────────┘  └──────────┘  └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    STORAGE LAYER (Blobs)                     │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐ │
│  │sirtrav-    │  │sirtrav-    │  │sirtrav-artifacts       │ │
│  │uploads     │  │progress    │  │(final videos)          │ │
│  └────────────┘  └────────────┘  └────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. U2A Protocol Overview

### 2.1 User Journey Flow

```
User Action          →  U2A Request        →  Agent Response
─────────────────────────────────────────────────────────────
1. Upload media      →  intake-upload      →  { uploadId, urls }
2. Set preferences   →  LocalStorage       →  Persisted client-side
3. Fill brief        →  In-memory state    →  Passed to pipeline
4. Click2Kick        →  generate-video     →  { runId, status }
5. Monitor progress  →  WebSocket/polling  →  Real-time updates
6. View results      →  results.ts         →  { videoUrl, credits }
```

### 2.2 U2A Request Schema

```typescript
interface U2ARequest {
  // User identity (future)
  userId?: string;
  sessionId: string;
  
  // Creative intent
  creativeBrief: {
    story?: string;           // User's story/vision
    mood: 'upbeat' | 'chill' | 'dramatic' | 'inspirational' | 'energetic';
    pace: 'slow' | 'medium' | 'fast';
    targetAudience: 'general' | 'business' | 'youth' | 'travel' | 'lifestyle';
    duration: '15s' | '30s' | '60s';
    voiceStyle: 'professional' | 'casual' | 'energetic' | 'calm' | 'storyteller';
  };
  
  // User preferences (onboarding survey)
  userPreferences: {
    creatorType: string;      // traveler, business, creator, etc.
    contentStyle: string;     // cinematic, casual, professional
    primaryPlatform: string;  // youtube, tiktok, instagram, linkedin
    voicePreference: string;  // male, female, neutral
  };
  
  // Assets
  uploadedAssets: string[];   // Blob keys
}
```

### 2.3 U2A Response Schema

```typescript
interface U2AResponse {
  runId: string;
  status: 'queued' | 'processing' | 'complete' | 'error';
  progress: {
    currentAgent: string;
    step: number;
    totalSteps: number;
    message: string;
  };
  result?: {
    videoUrl: string;
    thumbnailUrl: string;
    credits: Attribution[];
    publishLinks?: Record<string, string>;
  };
}
```

---

## 3. A2A Protocol Overview

### 3.1 Agent Communication Pattern

Agents communicate through a **pipeline manifest** defined in `pipelines/a2a_manifest.yml`:

```yaml
pipeline:
  name: sirtrav-video-pipeline
  version: 2.0.0
  
agents:
  - id: director
    function: correlate
    inputs: [uploads, creativeBrief]
    outputs: [shotList, theme, mood]
    
  - id: writer
    function: narrate-project
    inputs: [shotList, theme, mood]
    outputs: [script, voiceoverText]
    
  - id: voice
    function: text-to-speech
    inputs: [voiceoverText]
    outputs: [audioUrl]
    provider: elevenlabs
    
  - id: music
    function: generate-music
    inputs: [mood, duration]
    outputs: [musicUrl]
    provider: suno  # Manual workflow
    
  - id: editor
    function: curate-media
    inputs: [shotList, audioUrl, musicUrl]
    outputs: [timeline]
    
  - id: compiler
    function: compile-video
    inputs: [timeline]
    outputs: [videoUrl]
    provider: ffmpeg
    
  - id: publisher
    function: publish
    inputs: [videoUrl, platforms]
    outputs: [publishLinks]
```

### 3.2 Agent Handoff Protocol

```typescript
interface A2AHandoff {
  fromAgent: string;
  toAgent: string;
  runId: string;
  timestamp: string;
  payload: {
    artifacts: Record<string, string>;  // Blob keys
    metadata: Record<string, any>;
    instructions: string;               // Natural language for next agent
  };
}
```

### 3.3 Agent State Machine

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   IDLE      │ ──→ │  PROCESSING │ ──→ │  COMPLETE   │
└─────────────┘     └─────────────┘     └─────────────┘
      ↑                   │                    │
      │                   ↓                    │
      │             ┌─────────────┐            │
      └──────────── │   ERROR     │ ←──────────┘
                    └─────────────┘
```

---

## 4. The Seven Agents

### 4.1 Director Agent (`correlate.ts`)

**Purpose**: Analyzes uploaded media and creative brief to establish vision.

```typescript
// Input
{
  uploads: BlobKey[],
  creativeBrief: CreativeBriefData,
  userPreferences: UserPreferences
}

// Output
{
  shotList: Shot[],
  theme: string,
  mood: string,
  colorPalette: string[],
  pacing: 'slow' | 'medium' | 'fast'
}
```

**Tools Used**:
- OpenAI Vision API (image analysis)
- Memory Agent (recall user patterns)

### 4.2 Writer Agent (`narrate-project.ts`)

**Purpose**: Creates narrative script based on director's vision.

```typescript
// Input
{
  shotList: Shot[],
  theme: string,
  mood: string,
  targetDuration: number
}

// Output
{
  script: string,
  voiceoverText: string,
  captions: Caption[],
  hashtags: string[]
}
```

**Tools Used**:
- OpenAI GPT-4 (script generation)
- Tone matching algorithms

### 4.3 Voice Agent (`text-to-speech.ts`)

**Purpose**: Converts script to professional voiceover.

```typescript
// Input
{
  voiceoverText: string,
  voiceStyle: string,
  voiceId?: string  // ElevenLabs voice ID
}

// Output
{
  audioUrl: string,
  duration: number,
  timestamps: WordTimestamp[]
}
```

**Tools Used**:
- ElevenLabs API
- Audio normalization (-14 LUFS)

### 4.4 Music Agent (`generate-music.ts`)

**Purpose**: Creates or selects background music.

```typescript
// Input
{
  mood: string,
  duration: number,
  bpm?: number
}

// Output
{
  musicUrl: string,
  bpm: number,
  key: string,
  sunoPrompt?: string  // For manual Suno workflow
}
```

**Tools Used**:
- Suno Prompt Wizard (generates prompt for manual use)
- Pre-licensed music library (fallback)

### 4.5 Editor Agent (`curate-media.ts`)

**Purpose**: Assembles timeline from all components.

```typescript
// Input
{
  shotList: Shot[],
  audioUrl: string,
  musicUrl: string,
  voiceTimestamps: WordTimestamp[]
}

// Output
{
  timeline: TimelineData,
  transitions: Transition[],
  effects: Effect[]
}
```

**Tools Used**:
- Beat detection (audio sync)
- Shot duration optimization

### 4.6 Compiler Agent (`compile-video.ts`)

**Purpose**: Renders final video from timeline.

```typescript
// Input
{
  timeline: TimelineData,
  outputFormat: '1080p' | '720p',
  aspectRatio: '16:9' | '9:16' | '1:1'
}

// Output
{
  videoUrl: string,
  thumbnailUrl: string,
  fileSize: number
}
```

**Tools Used**:
- FFmpeg (via Netlify Function or external service)
- Audio ducking algorithms

### 4.7 Publisher Agent (`publish.ts`, `publish-*.ts`)

**Purpose**: Distributes video to social platforms.

```typescript
// Input
{
  videoUrl: string,
  title: string,
  description: string,
  hashtags: string[],
  platforms: ('youtube' | 'tiktok' | 'instagram' | 'linkedin')[]
}

// Output
{
  publishLinks: Record<string, string>,
  scheduledTime?: string
}
```

**Tools Used**:
- YouTube Data API v3
- TikTok Content Posting API
- Instagram Graph API
- LinkedIn Marketing API

---

## 5. Memory & Context Management

### 5.1 Blob Stores

| Store Name | Purpose | Retention |
|------------|---------|-----------|
| `sirtrav-uploads` | Raw user uploads | 24 hours |
| `sirtrav-progress` | Pipeline state | Session |
| `sirtrav-runs` | Run metadata | 7 days |
| `sirtrav-artifacts` | Generated videos | 30 days |
| `sirtrav-evals` | Evaluation data | Permanent |

### 5.2 Progress Tracking

```typescript
// progress-store.ts
const getProgressStore = () => getConfiguredBlobsStore('sirtrav-progress');

interface ProgressEvent {
  runId: string;
  agent: string;
  status: 'started' | 'processing' | 'complete' | 'error';
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}
```

### 5.3 Memory Agent (`memory-agent.ts`)

Stores and recalls:
- User preferences patterns
- Successful creative combinations
- Error recovery strategies

---

## 6. API Endpoints

### 6.1 U2A Endpoints (User-facing)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/.netlify/functions/intake-upload` | Upload media |
| POST | `/.netlify/functions/generate-video` | Start pipeline |
| GET | `/.netlify/functions/progress?runId=X` | Get progress |
| GET | `/.netlify/functions/results?runId=X` | Get final video |
| GET | `/.netlify/functions/healthcheck` | System status |

### 6.2 A2A Endpoints (Agent-facing)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/.netlify/functions/correlate` | Director analysis |
| POST | `/.netlify/functions/narrate-project` | Script generation |
| POST | `/.netlify/functions/text-to-speech` | Voice synthesis |
| POST | `/.netlify/functions/curate-media` | Timeline assembly |
| POST | `/.netlify/functions/compile-video` | Video rendering |
| POST | `/.netlify/functions/publish` | Social distribution |

---

## 7. Environment Variables

### 7.1 Required (AI Services)

```env
OPENAI_API_KEY=sk-...           # Vision + GPT-4
ELEVENLABS_API_KEY=...          # Voice synthesis
ELEVENLABS_DEFAULT_VOICE_ID=... # Default narrator voice
```

### 7.2 Required (Blobs - Local Dev Only)

```env
NETLIFY_SITE_ID=53ebb517-cfb7-468c-b253-4e7a30f3a85a
NETLIFY_API_TOKEN=nfp_...       # PAT with Blobs scope
```

### 7.3 Optional (Social Publishing)

```env
# YouTube
YOUTUBE_CLIENT_ID=...
YOUTUBE_CLIENT_SECRET=...
YOUTUBE_REFRESH_TOKEN=...

# TikTok
TIKTOK_CLIENT_KEY=...
TIKTOK_CLIENT_SECRET=...
TIKTOK_ACCESS_TOKEN=...

# Instagram
INSTAGRAM_ACCESS_TOKEN=...
INSTAGRAM_BUSINESS_ACCOUNT_ID=...

# LinkedIn
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
LINKEDIN_ACCESS_TOKEN=...
```

---

## 8. Frontend Components

### 8.1 U2A Interface Components

| Component | File | Purpose |
|-----------|------|---------|
| `Upload` | `src/components/Upload.tsx` | Media upload UI |
| `CreativeBrief` | `src/components/CreativeBrief.tsx` | Mood/pace/audience input |
| `UserPreferences` | `src/components/UserPreferences.tsx` | Onboarding survey |
| `Click2KickButton` | `src/components/Click2KickButton.tsx` | Pipeline trigger |
| `PipelineProgress` | `src/components/PipelineProgress.tsx` | Real-time status |
| `ResultsPreview` | `src/components/ResultsPreview.tsx` | Video playback |
| `SunoPromptWizard` | `src/components/SunoPromptWizard.tsx` | Music prompt builder |

### 8.2 CreativeHub Integration

```typescript
// src/components/CreativeHub.tsx
<CreativeHub>
  <Upload onUpload={handleUpload} />
  <UserPreferencesModal show={showPrefs} />
  <CreativeBrief onChange={setBrief} />
  <PipelineProgress runId={runId} />
  <ResultsPreview results={results} />
</CreativeHub>
```

---

## 9. Testing & Validation

### 9.1 Healthcheck Response

```bash
curl https://sirtrav-a2a-studio.netlify.app/.netlify/functions/healthcheck
```

```json
{
  "status": "healthy",
  "version": "2.0.0",
  "services": {
    "openai": { "status": "configured", "model": "gpt-4-vision-preview" },
    "elevenlabs": { "status": "configured" },
    "storage": { "status": "connected", "store": "sirtrav-uploads" }
  },
  "publishing": {
    "youtube": "not_configured",
    "tiktok": "not_configured",
    "instagram": "not_configured",
    "linkedin": "not_configured"
  }
}
```

### 9.2 Pipeline Test

```bash
node scripts/test-7-agents.mjs
```

---

## 10. Error Handling & Recovery

### 10.1 U2A Error Response

```typescript
interface U2AError {
  error: true;
  code: string;
  message: string;
  recoveryHint?: string;
  retryAfter?: number;
}
```

### 10.2 A2A Error Propagation

When an agent fails:
1. Error stored in progress-store
2. Downstream agents notified
3. User sees friendly message
4. Recovery options presented

---

## 11. Roadmap

### Phase 1: Foundation (✅ Complete)
- 7-agent pipeline
- Netlify Blobs storage
- Basic U2A interface

### Phase 2: Enhancement (🟡 Current)
- Creative Brief UI
- User Preferences onboarding
- LinkedIn publishing

### Phase 3: Intelligence (🔴 Planned)
- Memory-based personalization
- A/B testing for prompts
- Analytics dashboard

### Phase 4: Scale (🔴 Future)
- Multi-user support
- Queue management
- CDN optimization

---

## 12. Quick Reference

```
SirTrav-A2A-Studio Architecture:

User → Upload → CreativeBrief → Click2Kick
                      ↓
              ┌─────────────┐
              │  Director   │ ← OpenAI Vision
              └──────┬──────┘
                     ↓
              ┌─────────────┐
              │   Writer    │ ← GPT-4
              └──────┬──────┘
                     ↓
              ┌─────────────┐
              │   Voice     │ ← ElevenLabs
              └──────┬──────┘
                     ↓
              ┌─────────────┐
              │   Music     │ ← Suno (manual)
              └──────┬──────┘
                     ↓
              ┌─────────────┐
              │   Editor    │ ← Timeline assembly
              └──────┬──────┘
                     ↓
              ┌─────────────┐
              │  Compiler   │ ← FFmpeg
              └──────┬──────┘
                     ↓
              ┌─────────────┐
              │  Publisher  │ ← YouTube/TikTok/IG/LinkedIn
              └─────────────┘
                     ↓
              Final Video + Credits
```

---

*This document is specific to **SirTrav-A2A-Studio** and does not apply to other projects like Sir James Adventures or SeaTrace.*
