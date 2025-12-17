# MASTER.md - SirTrav A2A Studio Build Plan

**Version:** 1.4.0  
**Last Updated:** 2025-11-10  
**Status:** Production Hardening - Observability & Evaluation

> **v1.4 Focus:** Production Hardening. Adding "eyes and ears" to the system with OpenTelemetry tracing and Azure AI Evaluation to ensure quality before scale.

> **This document serves as the central planning and coordination guide for building the SirTrav A2A Studio - a D2A (Doc-to-Agent) automated video production platform for the Commons Good.**

---

## 🎯 Mission Statement

Build a production-ready, user-friendly video automation platform where users click a **Click2Kick button** to trigger automated cinematic video production through sequential AI agent orchestration.

### Core Principle
**"Build the memory before the masterpiece."**

---

## 🚦 CURRENT SPRINT FOCUS (Week of Nov 10, 2025)

### Goal: Production Hardening & Observability

**This Week's Deliverables:**

- [x] **Tracing Instrumentation** - OpenTelemetry + Traceloop integrated
- [x] **Evaluation Harness** - Azure AI Evaluation SDK setup
- [ ] **Run First Evaluation** - Validate Relevance/Coherence metrics
- [ ] **Fix File System Issues** - Ensure reliable execution in Netlify

**Definition of Done:**
- Traces visible in console/dashboard
- `evaluate.py` runs successfully against test dataset
- `MASTER.md` reflects current architecture

**Blocked Until Complete:**
- Scaling to multiple users
- Real-money API usage (need cost tracking first)

**Next Sprint:**
- Real ElevenLabs integration
- Real Suno integration
- Editor agent (FFmpeg) with LUFS gates
- Publisher agent (S3 upload)

---

## 🏗️ Two-Repo Architecture

| Repository | Purpose | Path | Privacy |
|-----------|---------|------|---------|
| **SirTrav-A2A-Studio** | Public engine, UI, pipelines | `C:\Users\Roberto002\Documents\GitHub\SirTrav-A2A-Studio` | PUBLIC |
| **Sir-TRAV-scott** | Memory vault, raw media | `C:\Users\Roberto002\Documents\GitHub\Sir-TRAV-scott` | PRIVATE |

### Bridge Workflow (Secure D2A Injection Model)

```
Public UI (React Upload)
    ↓
User Click2Kick ("Upload & Build")
    ↓
Public Netlify Function (intake-upload.ts)
    | 
    | Uses GITHUB_PAT secret (secure bridge)
    ↓
Private Vault (Sir-TRAV-scott/intake/)
    |
    | Git push triggers...
    ↓
Public GitHub Action (build_weekly.yml)
    ↓
A2A Agent Pipeline (manifest executor)
    ↓
Published Video (storage) + Memory Update
```

**Security Model:** Only `intake-upload.ts` has the GITHUB_PAT key to write to the private vault. The private vault never "exports" - the public engine "injects" through this secure bridge.

---

## 🤖 Seven-Agent Pipeline (Updated)

### Sequential D2A Workflow with Commons Good Attribution

```
User Click2Kick Button
         ↓
┌────────────────────────────────────────────┐
│  1. DIRECTOR AGENT                         │
│  - Reads: memory_index.json (learns)      │
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
│  6. ATTRIBUTION AGENT ✨ NEW               │
│  - Reads all .json outputs (Steps 1-5)    │
│  - Compiles credits.json (Suno, ElevenLabs)│
│  - (Optional) Renders credits slate       │
│  - FOR THE COMMONS GOOD attribution       │
│  - Output: credits.json + final_package.zip│
└────────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────────┐
│  7. PUBLISHER AGENT (S3/Storage)           │
│  - Uploads video + credits to storage     │
│  - Generates shareable link               │
│  - Logs social metrics                    │
│  - Writes: memory_index.json (learns)     │
│  - Output: publish_result.json            │
└────────────────────────────────────────────┘
         ↓
    User Preview (with 👍/👎 Feedback Loop)
```

### 🔁 Complete EGO-Prompt Learning Loop

```
┌──────────────────────────────────────────┐
│ AI LEARNS (Director reads memory)        │
│ ↓                                        │
│ AI CREATES (6-agent pipeline)            │
│ ↓                                        │
│ AI LOGS (Publisher writes metrics)       │
│ ↓                                        │
│ 👤 USER EVALUATES (👍/👎 buttons)        │ ← CLOSES THE LOOP!
│ ↓                                        │
│ MEMORY UPDATED (submit-evaluation.ts)    │
│ ↓                                        │
│ [Loop continues with richer data]        │
└──────────────────────────────────────────┘
```

---

## 👁️ Observability & Evaluation (New in v1.4)

### 1. Tracing (OpenTelemetry)
We use OpenTelemetry with Traceloop to trace agent execution. This provides visibility into:
- **Latency:** How long each agent takes.
- **Costs:** Token usage and estimated cost per step.
- **Errors:** Full stack traces for failed steps.
- **Prompts:** The exact prompt sent to the LLM and its response.

**Implementation:**
- `netlify/functions/lib/tracing.ts`: Centralized tracing initialization.
- Agents wrap their logic in `withWorkflow` or `withTask`.

### 2. Evaluation Harness (Azure AI Evaluation)
We use a data-driven approach to ensure quality before deployment.
- **Framework:** Azure AI Evaluation SDK (Python).
- **Metrics:**
  - **Relevance:** Does the output answer the prompt?
  - **Coherence:** Is the narrative logical and smooth?
  - **Groundedness:** Is the content based on the source material?
- **Dataset:** `data/evaluation_dataset.jsonl` contains "Golden Datasets" (input/expected output pairs).
- **Runner:** `evaluation/evaluate.py` executes the test suite.

---

## 📂 Agent-Specific Specifications

### Purpose: Prevent Context Window Overload

Each agent has a dedicated specification document with complete implementation details. This enables:
- **Focused AI assistance** - Pass one spec to AI without overwhelming context
- **Clear contracts** - Input/output schemas prevent integration issues
- **Parallel development** - Team members can work on agents independently
- **Easy debugging** - Single source of truth for each agent's behavior

| Agent | Spec File | Status | Implementation | Slash Command |
|-------|-----------|--------|----------------|---------------|
| **Director** | `docs/agents/DIRECTOR_SPEC.md` | ✅ Complete | `curate-media.ts` | `/slash-director` |
| **Writer** | `docs/agents/WRITER_SPEC.md` | ✅ Complete | `narrate-project.ts` | `/slash-writer` |
| **Voice** | `docs/agents/VOICE_SPEC.md` | 🟡 Placeholder | `text-to-speech.ts` | `/slash-voice` |
| **Composer** | `docs/agents/COMPOSER_SPEC.md` | 🟡 Placeholder | `generate-music.ts` | `/slash-composer` |
| **Editor** | `docs/agents/EDITOR_SPEC.md` | ❌ Not Started | `ffmpeg_compile.mjs` | `/slash-editor` |
| **Attribution** | `docs/agents/ATTRIBUTION_SPEC.md` | ❌ Not Started | `generate-attribution.ts` | `/slash-attribution` |
| **Publisher** | `docs/agents/PUBLISHER_SPEC.md` | 🟡 Partial | `publish.ts` | `/slash-publisher` |

### Spec File Template

Each spec includes:
1. **Purpose** - What this agent does and why it exists
2. **Input Schema** - JSON schema with validation rules
3. **Output Schema** - Expected response format
4. **Memory Integration** - How it reads/writes `memory_index.json`
5. **API Requirements** - External services needed (if any)
6. **Error Handling** - Fallback strategies for failures
7. **Testing** - curl commands and expected responses
8. **Example Payloads** - Real request/response samples

**TODO:** Create all 7 spec files before building remaining agents.

---

## 🏛️ Core Architectural Principles

### 1. **"Global Rules, Local Roles"** Philosophy

The entire system follows this principle:

- **Global Rules** = `a2a_manifest.yml` blueprint + API contracts (schemas)
  - Single source of truth for workflow
  - Non-negotiable interfaces between agents
- **Local Roles** = Specialist agents (Director, Writer, Voice, etc.)
  - Each agent is a "perfect" pluggable expert
  - Only knows how to do ONE job well

**Practice:** When iterating, ask: *"Should this change the blueprint (global rule) or improve a specialist (local role)?"*

### 2. **The Manifest is the Master Agent**

Key insight: Move orchestration logic OUT of code and INTO a plain-text file.

- **The Engine** (`run-manifest.mjs`) = "Dumb" but reliable executor
  - Reads blueprint
  - Executes steps sequentially
  - Handles retries and caching
  - **Treat as "feature complete"**

- **The Brain** (`a2a_manifest.yml`) = The actual "Master Agent"
  - All workflow changes happen here
  - User-editable "Beautiful API"
  - Human-readable design document

### 3. **Caching for Tight Iteration Loops**

Performance enabler for rapid development:

```javascript
// run-manifest.mjs caching logic
const inputHash = sha256(JSON.stringify(stepInputs));
const cacheKey = `${step.name}_${inputHash}`;

if (cacheExists(cacheKey)) {
  console.log(`✅ Using cached result for ${step.name}`);
  return loadCache(cacheKey);
}
```

**Benefit:** Re-run 10-step pipeline in 5 seconds to test Step 10 changes (Steps 1-9 use cache).

### 4. **Graceful Degradation over Hard Failures**

Non-critical agent failures should NOT crash the entire pipeline:

```javascript
// Fallback strategy example
try {
  result = await executeAgent('composer', inputs);
} catch (error) {
  if (isNonCritical('composer')) {
    logWarning('Composer failed, using fallback music');
    result = await loadFallbackAsset('default_music.wav');
  } else {
    throw error; // Critical agents must succeed
  }
}
```

**Critical Agents:** Director, Writer, Editor, Publisher  
**Non-Critical Agents:** Composer, Voice (can use text overlays)

### 5. **Human-in-the-Loop (HITL) Learning**

The AI shouldn't learn in isolation - the user (Travis) is the "EGO" in "EGO-Prompt":

- AI creates → User evaluates (👍/👎) → AI learns from feedback
- This closes the learning loop and teaches the system what "good" means
- Each iteration gets smarter based on USER preferences, not just metrics

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
- `lib/tracing.ts` ✅ NEW
- ...and 9 more

**Evaluation & Observability:**
- `evaluation/evaluate.py` ✅ NEW
- `evaluation/requirements.txt` ✅ NEW
- `data/evaluation_dataset.jsonl` ✅ NEW

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

## 📋 TODO Checklist - What's Missing

### ❌ Critical Functions (Need to Create)

- [x] **`netlify/functions/progress.ts`** ✅ COMPLETE (filesystem + SSE fixed)
- [x] **`netlify/functions/curate-media.ts`** ✅ COMPLETE (Director Agent with memory learning)
- [x] **`netlify/functions/narrate-project.ts`** ✅ COMPLETE (Writer Agent)
- [x] **`netlify/functions/text-to-speech.ts`** ✅ COMPLETE (Voice Agent - placeholder mode)
- [x] **`netlify/functions/generate-music.ts`** ✅ COMPLETE (Composer Agent - placeholder mode)
- [ ] **`netlify/functions/generate-attribution.ts`** ✨ NEW - 7th Agent for Commons Good credits
- [ ] **`netlify/functions/submit-evaluation.ts`** ✨ NEW - User feedback loop (👍/👎)
- [ ] **`netlify/functions/correlate.ts`** (Timing correlation)
- [ ] **`netlify/functions/evals.ts`** (Quality evaluation)
- [ ] **`netlify/functions/healthcheck.ts`** (System health)
- [ ] **`netlify/functions/mcp.ts`** (MCP server integration)

### ❌ UI Components (Need to Create)

- [ ] **`src/components/PipelineProgress.tsx`** - Real-time agent progress with SSE
- [x] **`src/components/CreativeHub.tsx`** ✅ COMPLETE - Multi-step workflow wizard
- [ ] **`src/components/Upload.tsx`** - File upload interface
- [ ] **`src/components/ResultsPreview.tsx`** - Video player with download/share + **👍/👎 feedback buttons** ✨
- [ ] **`src/components/AnalyticsDashboard.tsx`** - Cost tracking and metrics

### ❌ Pipeline Scripts (Need to Complete)

- [x] **`pipelines/run-manifest.mjs`** ✅ COMPLETE (YAML parser + executor + progress logging)
- [ ] **ENHANCE `run-manifest.mjs`** ✨ Add fallback logic for graceful degradation (non-critical failures use defaults)
- [ ] **`pipelines/scripts/audio_mix.mjs`** - Audio mixing with FFmpeg
- [ ] **`pipelines/scripts/ffmpeg_compile.mjs`** - Video compilation
- [ ] **`pipelines/scripts/lufs_check.mjs`** - LUFS quality gate

### 📄 Documentation (High Priority)

- [ ] **`docs/A2A_MANIFEST_SCHEMA.md`** ✨ NEW - Document the `a2a_manifest.yml` as the "Beautiful API" design document for users

### ✅ Already Complete

- [x] `pipelines/run-manifest.mjs` ✅ (YAML parser, variable interpolation, step execution, progress logging)
- [x] `netlify/functions/progress.ts` ✅ (SSE streaming + /tmp storage)
- [x] `netlify/functions/curate-media.ts` ✅ NEW (Director Agent with memory learning)
- [x] `netlify/functions/narrate-project.ts` ✅ NEW (Writer Agent)
- [x] `netlify/functions/text-to-speech.ts` ✅ NEW (Voice Agent - placeholder mode)
- [x] `netlify/functions/generate-music.ts` ✅ NEW (Composer Agent - placeholder mode)
- [x] `netlify/functions/intake-upload.ts` (stub - basic structure)
- [x] `netlify/functions/publish.ts` (quality gates, multi-artifact upload)
- [x] `netlify/functions/lib/storage.ts` (storage abstraction)
- [x] `src/components/CreativeHub.tsx` ✅ NEW (Multi-step AI workflow wizard)
- [x] `src/components/CreativeHub.css` ✅ NEW (Creative Hub styling)
- [x] `src/components/VideoGenerator.jsx` (API key mgmt, Click2Kick concept)
- [x] `src/App.jsx` (main app shell)
- [x] `src/main.jsx` ✅ (React entry point)
- [x] `index.html` ✅ (Vite entry point)
- [x] `vite.config.js` ✅ (Vite + React config)
- [x] `package.json` ✅ (dev dependencies and scripts)
- [x] `pipelines/a2a_manifest.yml` (manifest schema)
- [x] `MASTER.md` ✅ UPDATED (refined with EGO-Prompt learning loop and secure bridge workflow)

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

### User Journey Flow (Enhanced with Feedback Loop)

1. User uploads media OR selects weekly recap
2. User clicks **"Kick Off Video Production"**
3. Dashboard shows real-time agent progress:
   ```
   ✅ Director: Curated 12 shots (2.3s)
   ✅ Writer: Script drafted (4.1s)
   ⏳ Voice: Synthesizing narration... (45% complete)
   ⏸️ Composer: Waiting...
   ⏸️ Editor: Waiting...
   ⏸️ Attribution: Waiting...
   ⏸️ Publisher: Waiting...
   ```
4. On completion: **"View Your Video"** button appears
5. **ResultsPreview Modal Opens:**
   - Video player with timeline
   - **Download** button
   - **Share to Social** button
   - **👍 Keep (Good)** button ✨ NEW
   - **👎 Discard (Bad)** button ✨ NEW
6. User clicks 👍 or 👎:
   - Triggers `submit-evaluation.ts`
   - Writes `{"rating": "good", "theme": "reflective"}` to `memory_index.json`
   - **Closes the EGO-Prompt learning loop!** 🔁

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

### Priority 2: Enhance Manifest Executor with Resilience

- [x] **Implement `run-manifest.mjs`** YAML parser ✅
- [x] **Add agent orchestration logic** ✅
- [x] **Handle errors and retries** ✅
- [ ] **Add fallback logic** ✨ NEW - Graceful degradation:
  ```javascript
  // Example: Composer fails? Use default music track
  if (agent.agent === 'composer') {
    logWarning('Using fallback music...');
    await useFallbackMusic();
  }
  ```
- [x] **Log progress events** to new storage ✅

### Priority 3: UI Enhancements

- [ ] **Wire Click2Kick button** to manifest executor
- [ ] **Connect SSE stream** to PipelineProgress component
- [ ] **Add cost estimation** display
- [ ] **Build results preview** modal

### Priority 4: Agent Functions & Learning Loop

- [x] **Complete 4/7 core agent implementations** ✅ (Director, Writer, Voice, Composer)
- [ ] **Build Editor Agent** (FFmpeg compilation)
- [ ] **Build Attribution Agent** ✨ NEW (7th agent for Commons Good)
- [ ] **Build submit-evaluation.ts** ✨ NEW (User feedback loop)
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
- [x] **Tracing & Evaluation** (v1.4)
- [ ] Fix progress tracking
- [ ] Implement SSE streaming
- [ ] Complete manifest executor
- [ ] Build all 6 agent functions
- [ ] Add quality gates

### Phase 3: Enterprise Studio (Design-to-Code & Project Management)
> **Goal:** Transform SirTrav into a comprehensive platform for managing the entire lifecycle from design to code.

#### 1. Project Management Agent
- **Purpose:** Organize design-to-code conversions by project with conversation history.
- **Implementation:** New agent in `a2a_manifest.yml` that reads `project_brief.md` and generates `task.md`.
- **Integration:** Exports tasks to GitHub Issues or Azure DevOps.

#### 2. Task Generation (Figma-to-Code)
- **Purpose:** Transform design inputs into structured development tasks.
- **Strategy:**
    -   **Input:** Image exports or text descriptions of designs.
    -   **Process:** "Architect Agent" breaks down UI into component tasks.
    -   **Output:** Detailed tickets with acceptance criteria.

#### 3. Automated Documentation
- **Purpose:** Automatically create detailed tickets and documentation.
- **Implementation:** "Scribe Agent" runs after every build to update `README.md` and `docs/`.

#### 4. Platform Integration
- **Purpose:** Export work items to external tools.
- **Implementation:** `publish_content` agent enhanced to push to GitHub/Azure APIs.

### Phase 4: UI & UX
- [ ] Click2Kick button
- [ ] Real-time progress dashboard
- [ ] Cost Tracking Dashboard
- [ ] Video preview modal
- [ ] Social sharing

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
- [ ] Total cost per video < $1.00 FOR TESTING> AND USER OPTION TO CHANGE BUDGET
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

## 🔮 Future Roadmap (Post-MVP)

### Phase 4: Observability & Optimization (After 50+ Successful Runs)

**Prerequisites:** Pipeline must generate 50+ videos successfully with real APIs.

#### Telemetry Layer
- **Purpose:** Aggregate system-level metrics (agent runtimes, costs, error patterns)
- **Implementation:** `netlify/functions/telemetry.ts` + dashboard
- **Why Deferred:** Nothing to measure until pipeline runs consistently
- **Target:** v1.4.0

#### Cost Tracking Dashboard
- **Purpose:** Real-time per-agent cost display, budget alerts
- **Implementation:** `src/components/CostMeter.tsx` + cost aggregation
- **Why Deferred:** Agents in placeholder mode = $0 costs
- **Target:** v1.4.0

#### LUFS Quality Gates
- **Purpose:** Enforce audio standards (-18 to -12 LUFS) before publish
- **Implementation:** `pipelines/scripts/lufs_check.mjs` + FFmpeg integration
- **Why Deferred:** Need working Editor agent first
- **Target:** v1.4.0

#### Service Level Objectives (SLOs)
- Pipeline success ≥ 99.0% weekly
- P50 wall time ≤ 120s; P95 ≤ 180s
- Cost per video ≤ $1.00 at P95
- Error budget: 1% of runs per week
- **Why Deferred:** Need baseline data from production runs
- **Target:** v1.4.0

---

### Phase 5: Advanced Features (After User Feedback & Scale Validation)

**Prerequisites:** 500+ videos generated, active user feedback, proven cost model.

#### Content-Addressable Storage (CAS)
- **Purpose:** Perfect reproducibility via input hashing
- **Implementation:** `pipelines/lib/cas.mjs` + `a2a_manifest.lock.json`
- **Why Deferred:** Sophisticated optimization before validating basics
- **Target:** v1.5.0

#### Vector Database for Memory
- **Purpose:** Semantic search in `memory_index.json` (Pinecone/pgvector)
- **Why Deferred:** JSON sufficient until >10MB or semantic queries needed
- **Target:** v1.5.0

#### Dynamic Manifest Generation
- **Purpose:** Director generates custom workflow per project
- **Why Deferred:** Adds debugging complexity; validate static workflow first
- **Target:** v1.5.0

#### Partial Re-runs ("Director's Cut")
- **Purpose:** UI buttons to re-run single agents (e.g., "Change music")
- **Implementation:** `--resume-from=<step>` in run-manifest.mjs
- **Why Deferred:** Requires sophisticated state management and proven caching
- **Target:** v1.5.0

---

### Phase 6: Scale & Governance (After Production Launch)

**Prerequisites:** Multi-user production deployment, regulatory requirements.

#### Multi-Tenant Security
- **Purpose:** Secure control plane with `repository_dispatch` triggers
- **Why Deferred:** Current single-tenant model is sufficient
- **Target:** v1.6.0

#### Automated Retention Policies
- **Purpose:** 90-day cleanup script for private vault
- **Implementation:** `cron_clean_vault.sh` + Git automation
- **Why Deferred:** No 90 days of data yet
- **Target:** v1.6.0

#### Provenance Packs
- **Purpose:** SHA-256 hashes + lineage tracking for reproducibility
- **Implementation:** `netlify/functions/provenance.ts` + metadata
- **Why Deferred:** Commons Good feature, but not blocking MVP
- **Target:** v1.6.0

#### Budget Guardrails
- **Purpose:** Pre-flight cost estimation + abort if over limit
- **Implementation:** `BUDGET_MAX_TTS_CHARS_PER_RUN` env vars + guard function
- **Why Deferred:** No real costs in placeholder mode
- **Target:** v1.6.0

---

## 📜 History & Decisions

### v1.2/v1.3 Retrospective

#### What Made It Into v1.2
✅ **Attribution Agent** - Aligns with "Commons Good" mission  
✅ **User Feedback Loop** - Closes the critical EGO-Prompt gap  
✅ **Fallback Logic** - Production resilience best practice  
✅ **Manifest as Design Doc** - User-facing "Beautiful API"  
✅ **Architectural Principles** - Captures "Global Rules, Local Roles" philosophy  

#### Ideas Considered but Deferred
- **Dynamic Manifest Generation:** Deferred to Phase 5.
- **Vector Database for Memory:** Deferred to Phase 5.
- **Secure Control Plane v1.2:** Current bridge is sufficient.
- **Director's Cut UI:** Deferred to Phase 4.

---

**This is a living document. Update it after each sprint.**
*Last updated: 2025-11-10 (v1.4.0) by MY AI COMBINED GitHub and Copilot*
