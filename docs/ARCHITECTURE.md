# SirTrav-A2A-Studio — System Architecture

> **How We Built the Commons Good Framework**
> Last Updated: 2026-02-25 | Version: v2.1.0
> Status: Production (Netlify) | Build: Vite 7.3.0 | 1,351 modules

---

## The One-Line Summary

A serverless, multi-agent content pipeline where AI agents orchestrate video production from memory to social media — built on **Vite + React** for the frontend, **Netlify Functions** for the backend, **Netlify Blobs** for persistence, and **Remotion Lambda** for video rendering.

---

## Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│  LAYER 1: FRONTEND (React + Vite)                       │
│  15 components │ 24K gold palette │ Click2Kick UI       │
│  PersonaVault │ CreativeHub │ PipelineProgress (SSE)    │
├─────────────────────────────────────────────────────────┤
│  LAYER 2: BACKEND (35 Netlify Functions + 16 lib files) │
│  7-Agent Pipeline │ 5 Social Publishers │ Memory Vault  │
│  Cost Manifest │ Quality Gate │ OAuth │ SSE Streaming   │
├─────────────────────────────────────────────────────────┤
│  LAYER 3: STORAGE (Netlify Blobs + S3 + localStorage)   │
│  7 KV stores │ S3 for media │ Browser for preferences   │
└─────────────────────────────────────────────────────────┘
```

### Layer 1 — Frontend

- **Build:** Vite 7.3.0 targeting ES2022, manual chunks splitting React and Remotion
- **UI:** React 18 + vanilla CSS with CSS custom properties (no Tailwind build, utility classes only)
- **Theme:** 24K Gold Palette — `--brand-primary: #d4af37`, glassmorphism, animated gradients
- **Entry point:** `src/App.jsx` (975 lines) — state management, SSE handling, pipeline orchestration
- **Key components:** `PipelineProgress.tsx` (SSE dashboard), `ResultsPreview.tsx` (video + feedback), `PersonaVault`, `CreativeHub`
- **Click-to-Kick Launchpad:** Platform grid (TikTok, Reels, Shorts, LinkedIn, X), creative direction (voice style, video length), audio engine toggle, big gold LAUNCH button

### Layer 2 — Backend

- **Runtime:** Netlify Functions v2 (TypeScript), esbuild bundled
- **Pipeline orchestrator:** `start-pipeline.ts` → `run-pipeline-background.ts` (Netlify Background Function, 900s timeout)
- **Progress streaming:** Server-Sent Events via `progress.ts`
- **Social publishers:** `publish-x.ts`, `publish-linkedin.ts`, `publish-youtube.ts`, `publish-instagram.ts`, `publish-tiktok.ts`
- **Shared libraries:** 16 files in `netlify/functions/lib/` — cost-manifest, quality-gate, vault helpers, OAuth, tracing

### Layer 3 — Storage

- **Netlify Blobs:** 7 named KV stores (pipeline state, memory vault, agent logs, cost ledger, social tokens, user prefs, run history)
- **AWS S3:** Large media files (video, audio) with signed URLs
- **Browser localStorage:** User preferences fallback for dev mode

---

## The 7-Agent Pipeline

This is the core innovation. Instead of one monolithic video creation function, we built a **sequential agent pipeline** where each AI agent has a single responsibility:

| Step | Agent | What It Does | Powered By |
|------|-------|-------------|-----------|
| 1 | 🎬 **Director** | Reads memory, curates shots, sets theme/mood | OpenAI Vision (`curate-media.ts`) |
| 2 | ✍️ **Writer** | Drafts reflective first-person narrative | GPT-4 (`narrate-project.ts`) |
| 3 | 🎙️ **Voice** | Synthesizes narration audio | ElevenLabs (`text-to-speech.ts`) |
| 4 | 🎵 **Composer** | Generates soundtrack + beat grid | Suno (`generate-music.ts`) |
| 5 | 🎞️ **Editor** | Assembles video, applies LUFS audio gates | Remotion Lambda (`compile-video.ts` → `render-dispatcher.ts` → `remotion-client.ts`) |
| 6 | 📜 **Attribution** | Compiles credits for Commons Good | `generate-attribution.ts` |
| 7 | 🚀 **Publisher** | Uploads to 5 social platforms | `publish-x.ts`, `publish-linkedin.ts`, `publish-youtube.ts`, `publish-instagram.ts`, `publish-tiktok.ts` |

Every agent call is tracked by the **Cost Manifest** (`cost-manifest.ts`) — adding a 20% markup for the Cost Plus invoice model — and gated by the **Quality Gate** (`quality-gate.ts`) — which blocks the pipeline if any step fails.

### Pipeline Data Flow

```
USER                           FRONTEND                          BACKEND
─────                          ────────                          ───────
Upload files ──────────────▶ Drop Zone (base64) ──────────▶ intake-upload
Select platform ───────────▶ Launchpad grid ──────────────▶ (stored in state)
Set voice/length ──────────▶ Creative Direction ─────────▶ (stored in state)
Choose music mode ─────────▶ Audio Engine toggle ────────▶ (stored in state)
                               │
Click LAUNCH ──────────────▶ runPipeline() ───────────────▶ start-pipeline
                               │                              │
                               │◀──── SSE events ◀────────────┘
                               │                          run-pipeline-background
                               │                              │
Watch agents work ─────────▶ PipelineProgress ◀───────────── progress?stream=true
                               │                              │
                               │                          Director → Writer → Voice
                               │                          → Composer → Editor
                               │                          → Attribution → Publisher
                               │
Pipeline done ◀────────────── handlePipelineComplete ◀──── artifacts + invoice
                               │
Watch video ───────────────▶ <video> player
Rate output ───────────────▶ 👍/👎 + comments ──────────▶ submit-evaluation
Download ──────────────────▶ <a download> ────────────────▶ direct URL
Publish to social ─────────▶ publishToPlatform() ────────▶ publish-{platform}
```

---

## Technology Stack

| Layer | Technology | Why We Chose It |
|-------|-----------|----------------|
| **Build Tool** | Vite 7.3.0 | Fast HMR, ES2022 target, manual chunks for React/Remotion splitting |
| **Frontend** | React 18 + vanilla CSS | Simple, no framework overhead. Gold palette via CSS variables |
| **UI Icons** | Lucide React | Lightweight, tree-shakeable SVG icons |
| **Backend** | Netlify Functions v2 (TypeScript) | Zero-config serverless — no Docker, no infrastructure management |
| **Bundler** | esbuild (via Netlify) | Fast function bundling, TypeScript native |
| **Video Engine** | Remotion v4 + Lambda | React-powered video composition, renders in AWS Lambda (not on Netlify) |
| **Audio** | fluent-ffmpeg | Audio mixing, LUFS gating (runs in Lambda, not Netlify Functions) |
| **AI** | OpenAI (GPT-4, Vision) + Google Generative AI | Narration, media curation, content analysis |
| **Social Auth** | OAuth 1.0a (X/Twitter) + OAuth 2.0 (LinkedIn) | Platform-native auth, no third-party wrappers |
| **KV Storage** | Netlify Blobs (`@netlify/blobs`) | Serverless KV — 7 named stores, local filesystem fallback for dev |
| **File Storage** | AWS S3 | Large media files (video, audio) with signed URLs |
| **Observability** | OpenTelemetry | Distributed tracing across all 7 agents via `tracing.ts` |
| **Dev Tooling** | justfile (1,497 lines) | Command spine — every agent operation maps to a `just` recipe |
| **Deployment** | Netlify (production) | Git-push deploys, deploy previews per PR, Functions + Blobs included |
| **Node Version** | 22 LTS | Latest LTS, native ES modules |

---

## The Command Spine (justfile)

The `justfile` is the operational nerve center — **1,497 lines**, organizing every agent action, gate, and verification into composable recipes:

| Category | Key Recipes | Purpose |
|----------|------------|---------|
| **Preflight** | `just preflight`, `just flow` | Environment sanity check, dev mode |
| **Health** | `just healthcheck-cloud`, `just machine-health`, `just machine-gate` | System and deployment health |
| **DevKit** | `just devkit-tools`, `just devkit-verify`, `just devkit-ci` | Tool presence, wiring, CI gates |
| **Truth** | `just truth-serum`, `just verify-x-real`, `just golden-path` | Post-deploy verification, tweet verification |
| **Social** | `just x-dry`, `just linkedin-dry`, `just youtube-dry` | Dry-run social publishing |
| **Governance** | `just ticket-status`, `just pre-merge-guard`, `just council-flash-cloud` | Branch discipline, merge gates, release ceremony |
| **Recovery** | `just recover-ram`, `just ops-spine-cloud` | Memory pressure relief, full ops verification |

The spine enforces the rule: **if it's not a `just` recipe, it's not an official operation.**

---

## The Trust Architecture

### "No Fake Success" Principle

Built into the foundation at every layer:

- **Social publishers:** Return `{ success: false, disabled: true }` when API keys are missing — never pretend to succeed
- **Truth Serum** (`scripts/truth-serum.mjs`): Verifies posted tweets are real (19-digit IDs, not mocked)
- **Quality Gate:** Blocks the pipeline if any agent step fails
- **Council Flash:** 5-gate verification ceremony before declaring a version "trusted"
- **Cost Plus 20%:** Calculated from real `job_packets` — no fake invoices
- **Placeholder detection:** Frontend rejects `placeholder://` and `error://` video URLs; honestly labels demo mode

### Verification Layers

```
Layer 1: PREFLIGHT     — env vars present, Node version, disk space
Layer 2: DEVKIT        — 12-tool presence check (9/12 expected local)
Layer 3: HEALTHCHECK   — cloud function responds, services reachable
Layer 4: TRUTH SERUM   — real tweets verified, real API responses
Layer 5: COUNCIL FLASH — all gates green before release declaration
```

### Governance Rules

1. **Never push to main** — use `feature/WSP-*` branches, human merges only
2. **Never delete files** — archive to `.archive/inbox/<timestamp>/`
3. **Never edit `.env` or secrets** — Human Operator only
4. **Never return fake success** — `success: true` requires real proof
5. **One ticket per agent** — no parallel work on same branch
6. **Branch-verified claims only** — every status claim requires branch + SHA + PR URL
7. **No mega-merges** — split large branches into reviewable PR slices
8. **Sequential baton pass** — build → review → test → merge
9. **Cost transparency** — every API call tracked, invoiced at cost + 20%
10. **Memory continuity** — every run feeds back into the next Director cycle

---

## The Multi-Agent Development Team

The development team itself operates as specialized agents with strict boundaries:

| Agent | Role | Primary Zone | Key Deliverables |
|-------|------|-------------|-----------------|
| 🧠 **Claude Code** | Backend Builder | `netlify/functions/`, `scripts/` | 35 serverless functions, 16 shared libs, pipeline orchestration, vault helpers, social publisher contracts, Cost Manifest, Quality Gate, SSE streaming, Ledger Gate (PR #12) |
| 🎨 **Codex** | Frontend Builder | `src/components/`, `src/App.jsx` | 15 React components, 24K Gold theme, Click-to-Kick Launchpad, PipelineProgress SSE dashboard, PersonaVault, social publish UI wiring, invoice display |
| 🦅 **Antigravity** | QA / Truth Sentinel | `scripts/verify-*.mjs`, `scripts/test-*.mjs` | 36 verification scripts, Truth Serum system, Golden Path verification, contract shape validation, "No Fake Success" enforcement, Completion Plan architecture |
| 🛰️ **Windsurf Master** | Command Spine + Governance | `justfile`, `docs/`, `plans/` | 1,497-line justfile (100+ recipes), 5-layer verification architecture, AG-014 rebase recovery, governance layer (ticket-status, pre-merge-guard), DevKit audit, Architecture Scorecard (8.91/10), team docs (Knowledge Base, Hard Lines, GSD/PAUL Playbook), branch-verified attribution system |
| 🐦 **Copilot CLI** | Assisted Ops | `docs/`, `.archive/` | Archive protocol execution, git status verification, safe push operations |
| 👤 **Human Operator** | ENV + Merge Authority | Netlify Dashboard, GitHub | API keys, OAuth secrets, merge approvals, Council Flash final authority, cost-plus pricing model, "For the Commons Good" philosophy |

### Agent Skill Files

Each agent has a documented skill profile in `.agent/skills/`:
- `WINDSURF_MASTER_AGENT.md` — command spine, verification, governance
- `CLAUDE_CODE_AGENT.md` — backend functions, pipeline, contracts
- `CODEX_AGENT.md` — frontend components, design tokens, UI
- `ANTIGRAVITY_AGENT.md` — QA, truth verification, contract testing
- `HUMAN_OPERATOR.md` — env authority, merge authority, release ceremony

---

## Windsurf Master — Specific Contributions

### Command Spine Architecture (justfile)

Built the operational nerve center that every other agent depends on:

- **100+ recipes** organized by category (preflight, health, devkit, truth, social, governance, recovery)
- **5-layer verification sequence:** preflight → devkit → healthcheck → truth serum → council flash
- **Governance recipes:** `ticket-status` (validates branch naming), `pre-merge-guard` (blocks bad merges), `council-flash-cloud` (release ceremony)
- **Machine health:** `check-machine-health.mjs` — RAM, disk, CPU, Node version, port availability
- **DevKit audit:** `verify-devkit.mjs` — 12-tool presence and wiring verification

### Recovery Operations

- **AG-014 CommonsSafe Rebase Recovery:** 6-phase protocol executed with 0 data loss
  - Phase 0: Rescue branch from HEAD
  - Phase 1: Archive junk to `.archive/inbox/<timestamp>/`
  - Phase 2: Gitignore hardening
  - Phase 3: Conflict resolution (working file wins)
  - Phase 4: Sync main with origin (fast-forward)
  - Phase 5: Pivot to feature branch
  - Phase 6: Council Flash proof run
- **Branch hygiene:** Reset local main from 2-ahead to synced, restored build artifacts, clean working tree

### Documentation System

- `docs/ARCHITECTURE.md` — This file (system architecture + attribution)
- `docs/AGENT2USER_ARCHITECTURE_SCORECARD.md` — 9-section Click2Kick audit (8.91/10)
- `docs/WALL_OF_ATTRIBUTION.md` — Full agent credits + milestone timeline
- `docs/CONCURRENT_COMPLETION_SCORECARD.md` — Branch-verified attribution across both delivery lanes
- `docs/AGENT_COPILOT_CLI.md` — Safe ops protocol for Copilot CLI sessions
- `copilot-instructions.md` — Repo context for GitHub Copilot
- `docs/TEAM_KNOWLEDGE_BASE.md` — Structured onboarding (repo map, agents, commands)
- `docs/AGENT_HARD_LINES.md` — 10 never-do rules with enforcement
- `docs/GSD_PAUL_PLAYBOOK.md` — Two workflow modes mapped to `just` recipes
- `docs/SYSTEM_STATE_SNAPSHOT.md` — Point-in-time system state capture

### Verification Architecture

Designed and documented the multi-layer verification system that enforces "No Fake Success":

```
Agent2User Architecture Score: 8.91 / 10 (weighted across 9 sections)

Click-to-Kick Launchpad:     10.0 / 10  ← production-grade pipeline trigger
Agent Orchestration (SSE):    9.5 / 10  ← real-time progress monitoring
Input Source:                 9.6 / 10  ← file upload → base64 → backend
Hero Section:                 9.2 / 10  ← live health data, agent orbit
Results Panel:                7.5 / 10  ← video + invoice, social buttons gap
```

---

## The "Commons Good" Philosophy

The framework has a governance model baked in:

- **Open attribution** — every AI-generated asset gets credited
- **Cost transparency** — every API call tracked and invoiced at cost + 20%
- **Memory Vault** — the system remembers what it learned from each run
- **Regenerative Loop** — user feedback (👍/👎) + social engagement → feeds back into the next Director agent
- **Branch-verified truth** — no narrative claims, only branch + SHA + PR URL evidence

This means the content pipeline learns and improves with each cycle, and the human operator always knows exactly what it cost and who contributed.

---

## By the Numbers (2026-02-25)

| Metric | Count |
|--------|-------|
| **Vite modules** | 1,351 |
| **Netlify Functions** | 35 |
| **Shared libraries (lib/)** | 16 |
| **React components** | 15 |
| **Verification scripts** | 36 |
| **Justfile lines** | 1,497 |
| **Justfile recipes** | 100+ |
| **Netlify Blobs stores** | 7 |
| **Social publishers** | 5 (X LIVE, LinkedIn LIVE, YouTube pending, Instagram pending, TikTok pending) |
| **Agent tickets completed** | 50+ |
| **Documentation files** | 45+ |
| **Build time** | ~3.5 seconds |
| **CSS bundle** | 67KB (24K Gold theme) |
| **JS bundle** | ~432KB (React + Remotion + App) |
| **Total agents** | 5 + 1 guest (Copilot CLI) |
| **Gates (all PASS)** | 10/10 |
| **Agentic E2E runs** | 24 |
| **Council Flash events** | 5 |

---

## File Map (Key Paths)

```
SirTrav-A2A-Studio/
├── src/
│   ├── App.jsx                    # Main app (975 lines, state + pipeline)
│   ├── App.css                    # 24K Gold theme (1,496 lines)
│   ├── components/                # 15 React components
│   │   ├── PipelineProgress.tsx   # SSE real-time dashboard (441 lines)
│   │   ├── ResultsPreview.tsx     # Video playback + feedback (371 lines)
│   │   ├── PersonaVault.tsx       # User identity + X flow
│   │   └── ...
│   └── utils/
│       └── date.js                # getISOWeekNumber (no prototype mutation)
├── netlify/
│   └── functions/                 # 35 serverless functions
│       ├── start-pipeline.ts      # Pipeline entry point
│       ├── run-pipeline-background.ts  # 900s background orchestrator
│       ├── progress.ts            # SSE streaming
│       ├── publish-x.ts           # X/Twitter publisher (LIVE)
│       ├── publish-linkedin.ts    # LinkedIn publisher (LIVE)
│       ├── publish-youtube.ts     # YouTube publisher (pending)
│       ├── publish-instagram.ts   # Instagram publisher (pending)
│       ├── publish-tiktok.ts      # TikTok publisher (pending)
│       ├── healthcheck.ts         # System health endpoint
│       ├── intake-upload.ts       # File upload handler
│       ├── submit-evaluation.ts   # Feedback endpoint
│       └── lib/                   # 16 shared libraries
│           ├── cost-manifest.ts   # Cost Plus 20% tracking
│           ├── quality-gate.ts    # Pipeline failure blocker
│           ├── vault.ts           # Netlify Blobs KV interface
│           ├── tracing.ts         # OpenTelemetry distributed tracing
│           └── ...
├── scripts/                       # 36 verification + automation scripts
│   ├── truth-serum.mjs            # Tweet verification (real IDs only)
│   ├── check-machine-health.mjs   # RAM/disk/CPU/port checks
│   ├── verify-devkit.mjs          # 12-tool presence audit
│   ├── cycle-check.mjs            # Gate status checker
│   └── ...
├── justfile                       # 1,497 lines — the command spine
├── plans/
│   └── AGENT_ASSIGNMENTS.md       # Single source of truth for tickets
├── docs/                          # Architecture, scorecards, attribution
├── .agent/skills/                 # Per-agent skill profiles
├── agent-state.json               # 10-gate status tracker
├── vite.config.js                 # Build config (manual chunks)
├── netlify.toml                   # Deploy config (functions, redirects)
└── package.json                   # Dependencies (React, Remotion, OpenAI, etc.)
```

---

*Built by agents. Governed by humans. Verified by truth.*
*For the Commons Good.*
