# MASTER.md - SirTrav A2A Studio Build Plan

**Version:** 1.0.0  
**Last Updated:** 2025-11-09  
**Status:** Active Development

> **This document serves as the central planning and coordination guide for building the SirTrav A2A Studio - a D2A (Doc-to-Agent) automated video production platform for the Commons Good.**

---

## 🎯 Mission Statement

Build a production-ready, user-friendly video automation platform where users click a **Click2Kick button** to trigger automated cinematic video production through sequential AI agent orchestration.

### Core Principle
**"Build the memory before the masterpiece."**

---

## 🏗️ Two-Repo Architecture

| Repository | Purpose | Path | Privacy |
|-----------|---------|------|---------|
| **SirTrav-A2A-Studio** | Public engine, UI, pipelines | `C:\Users\Roberto002\Documents\GitHub\SirTrav-A2A-Studio` | PUBLIC |
| **Sir-TRAV-scott** | Memory vault, raw media | `C:\Users\Roberto002\Documents\GitHub\Sir-TRAV-scott` | PRIVATE |

### Bridge Workflow
```
Private Vault (intake/)
    ↓
Sanitized Export Action
    ↓
Public Studio (processes)
    ↓
Published Video (storage)
```

---

## 🤖 Six-Agent Pipeline

### Sequential D2A Workflow

```
User Click2Kick Button
         ↓
┌────────────────────────────────────────────┐
│  1. DIRECTOR AGENT                         │
│  - Curates key shots from vault           │
│  - Sets theme, mood, pacing               │
│  - Output: curated_media.json             │
└────────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────────┐
│  2. WRITER AGENT                           │
│  - Drafts reflective first-person script  │
│  - Output: narrative.json                 │
└────────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────────┐
│  3. VOICE AGENT (ElevenLabs)               │
│  - Synthesizes narration                  │
│  - Output: narration.wav                  │
└────────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────────┐
│  4. COMPOSER AGENT (Suno)                  │
│  - Generates soundtrack                   │
│  - Output: soundtrack.wav + beat_grid.json│
└────────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────────┐
│  5. EDITOR AGENT (FFmpeg)                  │
│  - Assembles final video                  │
│  - Applies LUFS gates (-18 to -12)        │
│  - Output: FINAL_RECAP.mp4                │
└────────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────────┐
│  6. PUBLISHER AGENT (S3/Storage)           │
│  - Uploads to storage                     │
│  - Generates shareable link               │
│  - Logs social metrics                    │
│  - Output: publish_result.json            │
└────────────────────────────────────────────┘
         ↓
    User Preview
```

---

## 🚀 Current Infrastructure Status

### ✅ Completed (62 Files Deployed)

**Security & CI/CD:**
- `.secrets.baseline` + `.pre-commit-config.yaml`
- GitHub Actions: `privacy-scan.yml`, `validate-manifest.yml`
- Git LFS: `.gitattributes` (21 patterns)

**Frontend (React + TypeScript + Vite):**
- `src/App.tsx` - Main app shell
- `src/components/VideoGenerator.tsx` ✅
- `src/components/PipelineProgress.tsx` ⚠️ (needs SSE fix)
- `src/components/CreativeHub.tsx`
- `src/components/Upload.tsx`

**Backend (17 Netlify Functions):**
- `intake-upload.ts`
- `curate-media.ts`
- `narrate-project.ts`
- `text-to-speech.ts`
- `generate-music.ts`
- `publish.ts`
- `progress.ts` ⚠️ (filesystem issue)
- `healthcheck.ts`
- ...and 9 more

**Pipeline Orchestration:**
- `pipelines/a2a_manifest.yml` ✅
- `pipelines/run-manifest.mjs` (TODO: implement executor)
- `pipelines/scripts/audio_mix.mjs`
- `pipelines/scripts/ffmpeg_compile.mjs`

**Documentation:**
- `docs/ENV_SETUP.md`
- `docs/PHASE7_QUICKSTART.md`
- `docs/PRONUNCIATION_DICTIONARY.md`
- `docs/WEEKLY_RECAP_SOP.md`
- `docs/DEPLOYMENT_CHECKLIST.md`

---

## 🐛 Critical Issues to Fix FIRST

### Issue #1: Progress Tracking Fails (Read-Only Filesystem)

**Problem:** `netlify/functions/progress.ts` tries to write to `data/progress.json` in the repo directory, which is **read-only on Netlify**. All writes fail silently.

**Solution:**
```typescript
// ❌ OLD (fails on Netlify)
const progressFile = path.join(process.cwd(), 'data', 'progress.json');

// ✅ NEW (use writable location)
const progressFile = path.join(
  process.env.TMPDIR || '/tmp',
  'sirtrav-progress.json'
);
```

**Action Items:**
1. Update `progress.ts` to use `/tmp` or external datastore (KV, Supabase)
2. Add directory creation before writes
3. Make errors loud (don't swallow exceptions)
4. Test write operations in Netlify production

---

### Issue #2: SSE Not Streaming (Connection Closes Immediately)

**Problem:** The progress endpoint returns a single payload and closes, causing EventSource to reconnect endlessly.

**Solution:** Implement true SSE streaming:
```typescript
// ✅ Proper SSE implementation
return new Response(
  new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      // Send heartbeat every 30s
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(': heartbeat\n\n'));
      }, 30000);
      
      // Stream events as they arrive
      const sendEvent = (data: any) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };
      
      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        controller.close();
      });
    }
  }),
  {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  }
);
```

---

## 🎨 Click2Kick Button Implementation

### Button States

```typescript
const BUTTON_STATES = {
  idle: {
    label: 'Kick Off Video Production',
    icon: '🚀',
    color: 'blue',
    action: 'start',
    disabled: false
  },
  validating: {
    label: 'Validating...',
    icon: '🔍',
    color: 'yellow',
    action: 'disabled',
    disabled: true
  },
  running: {
    label: 'Agents Working...',
    icon: '⚙️',
    color: 'orange',
    action: 'disabled',
    disabled: true,
    showProgress: true
  },
  completed: {
    label: 'View Your Video',
    icon: '✅',
    color: 'green',
    action: 'preview',
    disabled: false
  },
  error: {
    label: 'Retry Production',
    icon: '❌',
    color: 'red',
    action: 'retry',
    disabled: false
  }
};
```

### User Journey Flow

1. User uploads media OR selects weekly recap
2. User clicks **"Kick Off Video Production"**
3. Dashboard shows real-time agent progress:
   ```
   ✅ Director: Curated 12 shots (2.3s)
   ✅ Writer: Script drafted (4.1s)
   ⏳ Voice: Synthesizing narration... (45% complete)
   ⏸️ Composer: Waiting...
   ⏸️ Editor: Waiting...
   ⏸️ Publisher: Waiting...
   ```
4. On completion: **"View Your Video"** button appears
5. User previews, downloads, or publishes to social

---

## 📊 Dashboard Analytics & Metrics

### Real-Time Metrics to Display

```json
{
  "project_id": "week44_recap_2025-11-09",
  "status": "running",
  "current_agent": "voice",
  "progress": 0.45,
  "stages": {
    "director": {
      "status": "completed",
      "duration_ms": 2300,
      "assets_curated": 12,
      "cost_usd": 0.00
    },
    "writer": {
      "status": "completed",
      "duration_ms": 4100,
      "word_count": 287,
      "cost_usd": 0.03
    },
    "voice": {
      "status": "running",
      "progress": 0.45,
      "duration_ms": 3200,
      "cost_usd": 0.15
    },
    "composer": { "status": "pending" },
    "editor": { "status": "pending" },
    "publisher": { "status": "pending" }
  },
  "estimated_total_cost_usd": 0.87,
  "estimated_completion_sec": 45
}
```

### Social Engagement Tracking

```json
{
  "video_url": "https://sirtrav-artifacts.s3.amazonaws.com/week44.mp4",
  "qr_code_url": "https://api.qrserver.com/v1/create-qr-code/?data=...",
  "social_posts": [
    {
      "platform": "twitter",
      "post_id": "abc123",
      "likes": 42,
      "shares": 7,
      "views": 1203,
      "timestamp": "2025-11-09T18:45:00Z"
    }
  ],
  "total_engagement_score": 89
}
```

---

## 🔧 Immediate Next Actions

### Priority 1: Fix Infrastructure Issues

- [ ] **Fix `progress.ts` filesystem write** (use `/tmp` or KV)
- [ ] **Implement proper SSE streaming** for real-time updates
- [ ] **Test progress tracking** end-to-end in Netlify

### Priority 2: Complete Manifest Executor

- [ ] **Implement `run-manifest.mjs`** YAML parser
- [ ] **Add agent orchestration logic**
- [ ] **Handle errors and retries**
- [ ] **Log progress events** to new storage

### Priority 3: UI Enhancements

- [ ] **Wire Click2Kick button** to manifest executor
- [ ] **Connect SSE stream** to PipelineProgress component
- [ ] **Add cost estimation** display
- [ ] **Build results preview** modal

### Priority 4: Agent Functions

- [ ] **Complete all 6 agent implementations**
- [ ] **Add LUFS quality gates**
- [ ] **Integrate ElevenLabs** (secure key storage!)
- [ ] **Integrate Suno API**
- [ ] **Add FFmpeg compilation**

### Priority 5: Testing & Deployment

- [ ] **Write E2E tests** (Playwright)
- [ ] **Add load tests** (k6)
- [ ] **User acceptance testing**
- [ ] **Production deployment** to Netlify

---

## 🔐 Security Checklist

### Environment Variables (Netlify Dashboard)

```bash
# API Keys (NEVER commit!)
ELEVENLABS_API_KEY=sk_new_key_here  # REVOKE OLD KEY FIRST!
SUNO_API_KEY=your_suno_key
GEMINI_API_KEY=your_gemini_key
MCP_SECRET_TOKEN=your_mcp_token

# Storage
AWS_ACCESS_KEY_ID=AKIAXXXXX
AWS_SECRET_ACCESS_KEY=secret_xxxxx
S3_BUCKET=sirtrav-artifacts

# App Config
URL=https://sirtrav-a2a-studio.netlify.app
VAULT_REPO_PATH=/path/to/Sir-TRAV-scott
NODE_ENV=production
```

### Pre-Commit Hooks

```bash
# Run before EVERY commit
npm run precommit:secrets    # detect-secrets scan
npm run validate:manifest    # YAML validation
npm run lint                 # ESLint
```

---

## 📅 Build Phases

### Phase 1: Foundation ✅ CURRENT
- [x] Basic React app structure
- [x] 17 Netlify functions skeleton
- [x] D2A manifest schema
- [x] Git repos setup
- [x] Security baseline
- [ ] **MASTER.md plan** (this file)

### Phase 2: Core Pipeline (NEXT)
- [ ] Fix progress tracking
- [ ] Implement SSE streaming
- [ ] Complete manifest executor
- [ ] Build all 6 agent functions
- [ ] Add quality gates

### Phase 3: UI & UX
- [ ] Click2Kick button
- [ ] Real-time progress dashboard
- [ ] Video preview modal
- [ ] Social sharing
- [ ] Analytics display

### Phase 4: Integration & Testing
- [ ] E2E tests
- [ ] Load testing
- [ ] Security audit
- [ ] Performance optimization

### Phase 5: Launch
- [ ] User acceptance testing
- [ ] Documentation finalization
- [ ] Production deployment
- [ ] Monitoring setup

---

## 🎯 Success Criteria

- [ ] User clicks ONE button to start video production
- [ ] Pipeline completes end-to-end without manual intervention
- [ ] Real-time progress updates work in production
- [ ] Video quality meets LUFS standards (-18 to -12 LUFS)
- [ ] Total cost per video < $1.00
- [ ] Videos generate in < 2 minutes
- [ ] No secrets in git history
- [ ] All tests pass
- [ ] Social metrics tracked

---

## 📞 Resources

- **Owner:** Scott Echols (scott@worldseafoodproducers.com)
- **Public Repo:** https://github.com/WSP001/SirTrav-A2A-Studio
- **Private Vault:** https://github.com/WSP001/Sir-TRAV-scott
- **Netlify:** (TBD after deployment)

---

**This is a living document. Update it after each sprint.**

*Last updated: 2025-11-09 by Cascade AI*
