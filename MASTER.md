# MASTER.md - SirTrav A2A Studio Build Plan

**Version:** 1.4.0
**Last Updated:** 2025-12-01
**Status:** Active Development – Pipeline + Observability Phase

This document is the central planning and coordination guide for building the SirTrav A2A Studio: a D2A (Doc‑to‑Agent) automated video production platform for the Commons Good.

## 🎯 Mission Statement
Build a production‑ready, user‑friendly video automation platform where users click a single **Click2Kick button** to trigger automated cinematic video production through sequential AI agent orchestration.

**Core principle:** “Build the memory before the masterpiece.”

---

## 🆕 v1.4.0 Changelog (Since v1.3.0)
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
