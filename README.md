# SirTrav A2A Studio

[![Netlify Status](https://api.netlify.com/api/v1/badges/53ebb517-cfb7-468c-b253-4e7a30f3a85a/deploy-status)](https://app.netlify.com/projects/sirtrav-a2a-studio/deploys)

> **Version 1.4.0** | Production Hardening - Observability & Evaluation

Public "Commons-Good" Engine for the SirTrav A2A Studio.

This repository contains the open-source automation layer that transforms creative media and narrative input into cinematic short-form videos. It demonstrates how D2A (Doc-to-Agent) manifests drive fully automated production pipelines for the Memory-as-Media concept.

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

| # | Agent | Function | File |
|---|-------|----------|------|
| 1 | **Director** | Curates key shots, sets theme & mood (EGO-Prompt learning) | `curate-media.ts` |
| 2 | **Writer** | Drafts reflective first-person script | `narrate-project.ts` |
| 3 | **Voice** | Synthesizes narration via ElevenLabs | `text-to-speech.ts` |
| 4 | **Composer** | Generates soundtrack and beat grid via Suno | `generate-music.ts` |
| 5 | **Editor** | Assembles final video with LUFS quality gates (-18 to -12 dB) | `ffmpeg_compile.mjs` |
| 6 | **Attribution** | Compiles "Commons Good" credits for all AI services | `generate-attribution.ts` |
| 7 | **Publisher** | Posts to private link or YouTube draft | `publish.ts` |

---

## 🧱 Architecture Overview

| Layer | Description | Components |
|-------|-------------|------------|
| **UI "Skin"** | React + Vite + Tailwind frontend | `/src/components/`, `Click2KickButton.tsx` |
| **Pipeline "Skeleton"** | Netlify Functions + manifest orchestration | `/netlify/functions/`, `/pipelines/` |
| **Memory Bridge** | Sanitized export from private vault | `memory_index.json` |
| **Quality Gates** | LUFS audio levels, evaluation metrics | `ffmpeg_compile.mjs`, `/evaluation/` |
| **Observability** | OpenTelemetry tracing | `/netlify/functions/lib/tracing.ts` |

---

## 🚀 Quick Start

`ash
# Install dependencies
npm install

# Copy environment template and add your keys
cp .env.example .env

# Run local Netlify dev server (functions + UI)
npm run dev

# Build production bundle
npm run build

# Test all 7 agents
node scripts/test-7-agents.mjs

# Run evaluation harness
npm run evaluate
`

---

## 📊 Evaluation

The project includes an Azure AI Evaluation harness for quality assessment:

`ash
# Setup Python environment
python -m venv .venv
.venv\Scripts\Activate.ps1  # Windows
pip install -r evaluation/requirements.txt

# Run evaluations
npm run evaluate
`

See `docs/EVALUATION.md` for details.

---

## 📁 Project Structure

`
├── netlify/functions/     # 7 Agent serverless functions
│   ├── curate-media.ts    # Director
│   ├── narrate-project.ts # Writer
│   ├── text-to-speech.ts  # Voice
│   ├── generate-music.ts  # Composer
│   ├── generate-attribution.ts # Attribution
│   └── publish.ts         # Publisher
├── pipelines/
│   ├── a2a_manifest.yml   # D2A orchestration manifest
│   ├── run-manifest.mjs   # Manifest executor
│   └── scripts/
│       └── ffmpeg_compile.mjs # Editor Agent
├── src/components/        # React UI
├── evaluation/            # Azure AI Evaluation
├── docs/                  # Documentation
│   └── MASTER.md          # Build plan (v1.4.0)
└── scripts/               # Utility scripts
`

---

## 🔧 Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | GPT-4 for Writer Agent |
| `ELEVENLABS_API_KEY` | Optional | Voice synthesis (has placeholder mode) |
| `SUNO_API_KEY` | Optional | Music generation (has placeholder mode) |
| `VAULT_PATH` | Optional | Path to memory vault |

---

## 📚 Documentation

- [MASTER.md](MASTER.md) - Central build plan (v1.4.0)
- [docs/EVALUATION.md](docs/EVALUATION.md) - Evaluation harness guide
- [docs/TRACING.md](docs/TRACING.md) - OpenTelemetry setup
- [docs/LOCAL_DEV.md](docs/LOCAL_DEV.md) - Local development guide
- [walkthrough.md](walkthrough.md) - End-to-end usage guide

---

## �� Contributing

This project follows the "Commons Good" philosophy. Contributions welcome!

---

## 📜 License

MIT License - See LICENSE file for details.
