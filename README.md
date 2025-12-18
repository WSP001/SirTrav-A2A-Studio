# SirTrav A2A Studio

[![Netlify Status](https://api.netlify.com/api/v1/badges/53ebb517-cfb7-468c-b253-4e7a30f3a85a/deploy-status)](https://app.netlify.com/projects/sirtrav-a2a-studio/deploys)

> **Version 2.0.1** | Production Ready – All 7 Agents Complete ✅

Public "Commons-Good" Engine for the SirTrav A2A Studio.

This repository contains the open-source automation layer that transforms creative media and narrative input into cinematic short-form videos. It demonstrates how D2A (Doc-to-Agent) manifests drive fully automated production pipelines for the Memory-as-Media concept.

---

## 🎉 What's New in v2.0.1 (December 2025)

| Feature | Status | Description |
|---------|--------|-------------|
| **7-Agent Pipeline** | ✅ Complete | Director → Writer → Voice → Composer → Editor → Attribution → Publisher |
| **Netlify Blobs** | ✅ Migrated | Durable storage replacing ephemeral /tmp |
| **Vision AI** | ✅ Integrated | OpenAI Vision in Director Agent sees photos |
| **Learning Loop** | ✅ Closed | 👍/👎 feedback persists to memory_index.json |
| **Progress SSE** | ✅ Real-time | Live progress tracking via Server-Sent Events |
| **Security** | ✅ Patched | Vite v7.3.0 (0 vulnerabilities) |
| **Voice Agent** | 🟡 Ready | Placeholder until `ELEVENLABS_API_KEY` set |
| **Composer Agent** | 🟡 Ready | Placeholder until `SUNO_API_KEY` set |

---

## 🌍 Purpose

The SirTrav-A2A-Studio provides the reusable engine that connects data, design, and delivery across multiple creative agents.

**Goals:**
- Automate cinematic storytelling from curated memories or uploaded raw media
- Provide an A2A (Agent-to-Agent) orchestration model showing how Directors, Writers, and Editors cooperate autonomously
- Empower developers, educators, and creators to repurpose this architecture for ethical, transparent, human-centered AI media work
- Serve as the public mirror of the private Sir-TRAV-scott Memory Vault, excluding any confidential assets

---

## 🤖 The 7 Agents

| # | Agent | Function | Status | File |
|---|-------|----------|--------|------|
| 1 | **Director** | Curates key shots, sets theme & mood (Vision AI + EGO-Prompt) | ✅ | `curate-media.ts` |
| 2 | **Writer** | Drafts reflective first-person script (GPT-4) | ✅ | `narrate-project.ts` |
| 3 | **Voice** | Synthesizes narration via ElevenLabs | 🟡 | `text-to-speech.ts` |
| 4 | **Composer** | Generates soundtrack and beat grid via Suno | 🟡 | `generate-music.ts` |
| 5 | **Editor** | Assembles final video with LUFS quality gates (-18 to -12 dB) | ✅ | `compile-video.ts` |
| 6 | **Attribution** | Compiles "Commons Good" credits for all AI services | ✅ | `generate-attribution.ts` |
| 7 | **Publisher** | Posts to private link, YouTube, TikTok, Instagram | ✅ | `publish.ts` |

✅ = Production Ready | 🟡 = Placeholder (needs API key)

---

## 🧱 Architecture Overview

| Layer | Description | Components |
|-------|-------------|------------|
| **UI "Skin"** | React + Vite + Tailwind frontend | `/src/components/`, `CreativeHub.tsx` |
| **Pipeline "Skeleton"** | Netlify Functions + manifest orchestration | `/netlify/functions/`, `/pipelines/` |
| **Storage** | Netlify Blobs (durable, cross-instance) | `lib/storage.ts`, `lib/progress-store.ts` |
| **Memory Bridge** | EGO-Prompt learning from feedback | `memory_index.json`, `submit-evaluation.ts` |
| **Quality Gates** | LUFS audio levels, Vision AI scoring | `compile-video.ts`, `lib/vision.ts` |
| **Observability** | OpenTelemetry tracing + SSE progress | `lib/tracing.ts`, `progress.ts` |

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Copy environment template and add your keys
cp .env.example .env

# Run local Netlify dev server (functions + UI)
netlify dev

# Build production bundle
npm run build

# Run smoke tests (local)
bash scripts/smoke-test.sh http://localhost:8888/.netlify/functions

# Run smoke tests (production)
bash scripts/smoke-test.sh https://sirtrav-a2a-studio.netlify.app/.netlify/functions
```

---

## 📊 Testing & Verification

```bash
# Smoke test all endpoints
bash scripts/smoke-test.sh $BASE_URL

# Expected output:
# ✅ healthcheck: PASS
# ✅ progress (POST): PASS
# ✅ progress (GET): PASS
# ✅ submit-evaluation: PASS
# ✅ generate-attribution: PASS
# ✅ intake-upload (CORS): PASS
```

See `.github/instructions/testing-failover.md` for detailed testing guide.

---

## 📁 Project Structure

```
├── .github/instructions/      # Copilot instructions for AI agents
│   ├── copilot-instructions.md
│   ├── agent-development.md
│   ├── testing-failover.md
│   └── storage-memory.md
├── netlify/functions/         # 7 Agent serverless functions
│   ├── curate-media.ts        # Director (Vision AI)
│   ├── narrate-project.ts     # Writer (GPT-4)
│   ├── text-to-speech.ts      # Voice (ElevenLabs)
│   ├── generate-music.ts      # Composer (Suno)
│   ├── compile-video.ts       # Editor (FFmpeg)
│   ├── generate-attribution.ts # Attribution
│   ├── publish.ts             # Publisher
│   ├── progress.ts            # SSE progress streaming
│   ├── submit-evaluation.ts   # Learning loop feedback
│   └── lib/
│       ├── storage.ts         # Netlify Blobs storage
│       ├── progress-store.ts  # Progress persistence
│       ├── vision.ts          # OpenAI Vision API
│       └── tracing.ts         # OpenTelemetry
├── pipelines/
│   ├── a2a_manifest.yml       # D2A orchestration manifest
│   ├── run-manifest.mjs       # Manifest executor
│   └── scripts/
│       └── ffmpeg_compile.mjs # FFmpeg video assembly
├── src/components/            # React UI
│   ├── CreativeHub.tsx        # Main upload + pipeline trigger
│   ├── PipelineProgress.tsx   # SSE progress display
│   └── ResultsPreview.tsx     # Video preview + feedback
├── scripts/
│   └── smoke-test.sh          # Endpoint smoke tests
├── docs/                      # Documentation
│   ├── MEMORY_SCHEMA.md
│   └── LOCAL_DEV.md
└── MASTER.md                  # Build plan (v2.0.1)
```

---

## 🔧 Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | GPT-4 + Vision for Director & Writer |
| `ELEVENLABS_API_KEY` | Optional | Voice synthesis (has placeholder mode) |
| `SUNO_API_KEY` | Optional | Music generation (has placeholder mode) |
| `GEMINI_API_KEY` | Optional | Alternative LLM |
| `AWS_ACCESS_KEY_ID` | Optional | S3 fallback storage |
| `AWS_SECRET_ACCESS_KEY` | Optional | S3 fallback storage |

---

## 📚 Documentation

- [MASTER.md](MASTER.md) - Central build plan (v2.0.1)
- [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) - Setup & architecture guide
- [docs/MEMORY_SCHEMA.md](docs/MEMORY_SCHEMA.md) - Memory index structure
- [docs/LOCAL_DEV.md](docs/LOCAL_DEV.md) - Local development setup
- [.github/instructions/](.github/instructions/) - AI agent instructions

---

## 🤝 Contributing

This project follows the "Commons Good" philosophy. Contributions welcome!

1. Read `.github/instructions/copilot-instructions.md` first
2. Use Netlify Blobs (never /tmp) for persistence
3. All agents must have graceful failover
4. Run `bash scripts/smoke-test.sh` before PRs

---

## 📜 License

MIT License - See LICENSE file for details.

---

**For the Commons Good** 🎬
