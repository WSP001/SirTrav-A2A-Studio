# MASTER.md - SirTrav A2A Studio Build Plan

**Version:** 2.0.1  
**Last Updated:** 2025-12-17  
**Status:** Deployment Ready - Phase 8 Complete ✅

This document is the central planning and coordination guide for building the SirTrav A2A Studio: a D2A (Doc‑to‑Agent) automated video production platform for the Commons Good.

## Mission Statement
Build a production‑ready, user‑friendly video automation platform where users click a single **Click2Kick button** to trigger automated cinematic video production through sequential AI agent orchestration.

**Core principle:** "Build the memory before the masterpiece."

---

## 🎉 v2.0.1 Status Summary (December 17, 2025)

| Category | Status | Notes |
|----------|--------|-------|
| **7-Agent Pipeline** | ✅ 100% | All agents implemented |
| **Storage** | ✅ Netlify Blobs | Durable, cross-instance |
| **Learning Loop** | ✅ Closed | 👍/👎 → memory_index.json |
| **Vision AI** | ✅ OpenAI | Director sees photos |
| **Progress Tracking** | ✅ SSE + Blobs | Real-time updates |
| **Voice Agent** | 🟡 Ready | Needs `ELEVENLABS_API_KEY` |
| **Composer Agent** | 🟡 Ready | Needs `SUNO_API_KEY` |

---

## v2.0.0 Completion Checklist

### Netlify Functions (All 7 Agents + Support)
- [x] `curate-media.ts` - Director Agent ✅ (Vision AI enabled)
- [x] `narrate-project.ts` - Writer Agent ✅
- [x] `text-to-speech.ts` - Voice Agent 🟡 (placeholder until API key)
- [x] `generate-music.ts` - Composer Agent 🟡 (placeholder until API key)
- [x] `compile-video.ts` - Editor Agent ✅ (FFmpeg + ducking)
- [x] `generate-attribution.ts` - Attribution Agent ✅
- [x] `publish.ts` - Publisher Agent ✅
- [x] `publish-youtube.ts` - YouTube API ✅
- [x] `publish-tiktok.ts` - TikTok API ✅
- [x] `publish-instagram.ts` - Instagram API ✅
- [x] `share-link.ts` - Shareable links + QR codes ✅
- [x] `progress.ts` - SSE streaming progress ✅ (Blobs-backed)
- [x] `correlate.ts` - Trace correlation ✅
- [x] `evals.ts` - Evaluation metrics ✅
- [x] `healthcheck.ts` - System health monitor ✅
- [x] `mcp.ts` - MCP gateway ✅
- [x] `intake-upload.ts` - File upload ✅
- [x] `submit-evaluation.ts` - User feedback ✅ (Blobs-backed)
- [x] `generate-video.ts` - Pipeline orchestrator ✅
- [x] `start-pipeline.ts` - Pipeline trigger ✅

### Storage (Netlify Blobs) ✅ UPGRADED
- [x] `lib/storage.ts` - NetlifyBlobsStorage class (456 lines)
- [x] `lib/progress-store.ts` - Progress persistence ✅ NEW
- [x] Video store (`sirtrav-videos`)
- [x] Audio store (`sirtrav-audio`)
- [x] Media store (`sirtrav-media`)
- [x] Runs store (`sirtrav-runs`)
- [x] Evals store (`sirtrav-evals`)
- [x] Progress store (`sirtrav-progress`) ✅ NEW

### Lib Modules
- [x] `lib/vision.ts` - OpenAI Vision API (458 lines) ✅
- [x] `lib/tracing.ts` - OpenTelemetry ✅
- [x] `lib/ducking.ts` - Audio sidechain/keyframe ✅
- [x] `lib/alignment.ts` - Beat alignment ✅
- [x] `lib/runIndex.ts` - Run management ✅

### Pipeline Scripts
- [x] `run-manifest.mjs` - Manifest executor with fallback logic ✅
- [x] `audio_mix.mjs` - Audio mixing with LUFS normalization ✅
- [x] `ffmpeg_compile.mjs` - Video compilation with Ken Burns ✅
- [x] `lufs_check.mjs` - Loudness verification ✅
- [x] `test-7-agents.mjs` - Agent smoke test ✅
- [x] `smoke-test.sh` - Endpoint smoke test ✅ NEW

### UI Components
- [x] `App.jsx` - Enterprise landing page ✅
- [x] `CreativeHub.tsx` - File upload + pipeline trigger + feedback ✅
- [x] `VideoGenerator.jsx` - Video generation UI ✅
- [x] `PipelineProgress.tsx` - SSE progress dashboard ✅
- [x] `ResultsPreview.tsx` - Video preview + feedback ✅
- [x] `Click2KickButton.tsx` - Pipeline trigger button ✅
- [x] `Upload.tsx` - Drag & drop file upload ✅
- [x] `Dashboard.tsx` - Metrics visualization ✅
- [x] Theme attachment toggle (v1.9.0-THEME) ✅

---

## v1.4.0 Changelog (Since v1.3.0)
The goal of v1.4.0 was to turn the plan into a working Studio: real Click2Kick UI, a closed learning loop, and basic tracing/evaluation.

- **New Click2Kick Studio UI:** Refactored `App.jsx` into a two-panel Studio (CreativeHub + VideoGenerator) with header navigation and Project ID flow.
- **CreativeHub → VideoGenerator wiring:** `App` now owns `projectId` state; `CreativeHub` emits it, `VideoGenerator` auto-seeds prompts from it.
- **API key manager:** `VideoGenerator` now manages multiple API keys in localStorage with labels, masking, and a simple selector.
- **Closed learning loop:** Director reads `memory_index.json` preferences; `submit-evaluation.ts` updates `video_history` and `user_preferences` on 👍/👎.
- **Tracing added:** Introduced `tracing.ts`, instrumented `narrate-project` with OpenTelemetry + Traceloop, and wired in OpenAI SDK.
- **Evaluation harness:** Added `evaluate.py`, `evaluation_dataset.jsonl`, and `npm run evaluate` for relevance/coherence checks.
- **UI refactor and cleanup:** `VideoGenerator` fully rewritten with Tailwind + Lucide icons; legacy `VideoGenerator.css` removed.

---

## 🚦 Current Sprint Focus (v1.4.0)
**Goal:** First test video from Netlify preview + basic traces + one evaluation run.

**Deliverables:**
1. **Netlify preview build matches local Click2Kick behavior.**
   - Studio layout works.
   - Project ID and prompt entry works.
2. **One end-to-end run (from UI) generates a real video.**
   - Even if using placeholder assets.
3. **Traces visible in collector for at least `narrate-project`.**
4. **`npm run evaluate` runs successfully and produces a simple report artifact.**

---

## ��️ Public vs Private Responsibilities

| Repository | Purpose | Contents | Privacy |
|-----------|---------|----------|---------|
| **SirTrav-A2A-Studio** | Engine + UI + Architecture | `App.jsx`, `CreativeHub.tsx`, `VideoGenerator.jsx`<br>Netlify functions (`curate-media`, `narrate-project`, etc.)<br>Tracing setup (`tracing.ts`)<br>Evaluation harness (`evaluate.py`) | **PUBLIC** |
| **Sir-TRAV-scott** | Memory + Raw Media + Secrets | `memory_index.json`, `user_preferences.json`<br>Raw media files<br>Vault scripts<br>`.env` with API keys | **PRIVATE** |

---

## 🧠 Learning Loop Interface

### Memory Read Path
- **Director Agent** (`curate-media.ts`) reads `memory_index.json`.
- **Logic:** Uses `favorite_moods` and `video_history` (items with rating "good") to prioritize content.
- **Guarantee:** Director must never crash if memory is missing or empty (fallback defaults).

### Feedback Write Path
- **Feedback Agent** (`submit-evaluation.ts`).
- **Input:** `{ project_id, rating }`.
- **Behavior:** Updates `video_history` entry and `user_preferences.favorite_moods` / `disliked_music_styles`.
- **Guarantee:** Feedback writes must be append‑only and resilient (no data loss on partial write).

---

## 🖥️ UI Contracts

### CreativeHub
- **Must always:**
  - Generate a default `projectId` (timestamp-based).
  - Allow manual override.
  - Call `onProjectIdChange(projectId)` whenever it changes.

### App
- **Must:**
  - Hold `projectId` as the single source of truth.
  - Pass `projectId` into `VideoGenerator` and display it as “Active: {projectId}”.

### VideoGenerator
- **Must:**
  - Auto-seed prompt from `projectId` if prompt is empty.
  - Never send a request without both a selected API key and non-empty prompt.
  - Manage API keys purely in `localStorage` (never send/store them server-side).
  - Expose a single Click2Kick control: “Generate Video”.

---

## 🔍 Observability & Evaluation

### Tracing
- **Setup:** `tracing.ts` initializes OpenTelemetry + Traceloop for OpenAI operations.
- **Reference:** `narrate-project.ts` (Writer agent) is the reference implementation.
- **Goal:** Eventually all Netlify functions that talk to AI (Director, Voice, Composer) call through a traced client.

### Evaluation
- **Baseline:** `evaluate.py` + `evaluation_dataset.jsonl` define baseline metrics: **Relevance**, **Coherence**.
- **Usage:** `npm run evaluate` should be part of:
  - CI (optional) OR
  - A pre-release checklist (“run before cutting a new version”).

---

## 🚀 Deployment Environments

### Local Dev
- `npm run dev` → `http://localhost:5173`

### Netlify Preview
- Used for PR validation (e.g., `https://deploy-preview-X--sirtrav-a2a-studio.netlify.app/`).
- **MUST:**
  - Show the Studio layout (CreativeHub + VideoGenerator).
  - Allow entering a `projectId` and prompt.
  - Show mocked or real result cards.

### Netlify Production
- **Only after:**
  - One successful preview test.
  - Evaluation suite run.

---

## 🛡️ Safe Git Commands
For agents and developers:
```bash
git status
git diff
git add -p
git commit -m "feat: description of change"
git push origin <branch>
```
*Avoid reset/force push unless absolutely necessary.*

---

## v2.0.1 Changelog (December 17, 2025)

### ✅ Completed This Session
1. **Netlify Blobs Migration** - All ephemeral `/tmp` storage replaced with durable Blobs
   - `progress.ts` → `lib/progress-store.ts` → `sirtrav-progress` store
   - `submit-evaluation.ts` → Blobs-backed with memory mirror
   - 200 event cap with automatic truncation

2. **Smoke Test Script** - `scripts/smoke-test.sh`
   - 7 automated endpoint tests (healthcheck, progress, evaluation, attribution, CORS)
   - Exit code 0 = all pass, non-zero = failures

3. **Vision AI Integration** - Director Agent now sees uploaded photos
   - Privacy taxonomy (FACE/CROWD/STRUCTURE/NATURE)
   - Quality scoring (blur, lighting, composition)
   - Content classification (MOOD/ACTION/SETTING)

4. **Learning Loop Closed** - EGO-Prompt architecture complete
   - 👍/👎 feedback persists to `memory_index.json`
   - Director reads preferences for future runs

5. **All 7 Agents Implemented**
   - Director → Writer → Voice → Composer → Editor → Attribution → Publisher
   - Async calls, fallback logic, progress tracking

### 🟡 Known Placeholders (API Keys Required)
- `text-to-speech.ts` - Returns mock audio URL until `ELEVENLABS_API_KEY` set
- `generate-music.ts` - Returns mock music URL until `SUNO_API_KEY` set

### 🔧 Production Checklist Before Merge
```bash
# 1. Install dependencies
npm install

# 2. Run build
npm run build

# 3. Run smoke tests (local)
bash scripts/smoke-test.sh http://localhost:8888/.netlify/functions

# 4. Run smoke tests (production)
bash scripts/smoke-test.sh https://sirtrav-a2a-studio.netlify.app/.netlify/functions
```

### 📋 Next Steps (Post-Merge)
1. [ ] Enable Dependabot for security updates
2. [ ] Add `ELEVENLABS_API_KEY` to Netlify env vars
3. [ ] Add `SUNO_API_KEY` to Netlify env vars  
4. [ ] Configure Netlify Blobs persistence (already default)
5. [ ] Test full pipeline with real user photos
6. [ ] Monitor OpenTelemetry traces in production

---

## 📚 Reference Files

| File | Purpose |
|------|---------|
| `DEVELOPER_GUIDE.md` | Setup, architecture, troubleshooting |
| `docs/MEMORY_SCHEMA.md` | Memory index structure |
| `docs/LOCAL_DEV.md` | Local development setup |
| `docs/DEPLOYMENT_CHECKLIST.md` | Pre-deploy verification |
| `docs/agents/DIRECTOR_SPEC.md` | Director Agent spec |
| `ATTRIBUTION_SPEC.md` | Attribution format spec |

---

*This file is the source of truth. Agents must read it before making changes.*
