# SirTrav A2A Studio

[![Netlify Status](https://api.netlify.com/api/v1/badges/53ebb517-cfb7-468c-b253-4e7a30f3a85a/deploy-status)](https://app.netlify.com/projects/sirtrav-a2a-studio/deploys)

> **Transforming Memories into Cinematic Stories**

A D2A (Doc-to-Agent) automated video production platform built for the Commons Good. One click triggers a sequential 7-agent pipeline that curates, writes, narrates, scores, edits, attributes, and publishes cinematic videos.

---

## 🤖 The 7-Agent Pipeline

| # | Agent | Function | Status | File |
|---|-------|----------|--------|------|
| 1 | **Director** | Curates key shots, sets theme & mood (Vision AI + EGO-Prompt) | ✅ Complete | `curate-media.ts` |
| 2 | **Writer** | Drafts reflective first-person script (GPT-4 + Gemini fallback) | ✅ Complete | `narrate-project.ts` |
| 3 | **Voice** | Synthesizes narration via ElevenLabs TTS (Adam voice) | ✅ Complete | `text-to-speech.ts` |
| 4 | **Composer** | Generates soundtrack and beat grid via Suno AI | ✅ Complete | `generate-music.ts` |
| 5 | **Editor** | Assembles final video via Remotion Lambda (render-dispatcher) | ⚠️ In Progress | `compile-video.ts` → `render-dispatcher.ts` |
| 6 | **Attribution** | Compiles Commons Good credits for all AI services | ✅ Complete | `generate-attribution.ts` |
| 7 | **Publisher** | Posts to X/Twitter, YouTube, LinkedIn, Instagram, TikTok | ⚠️ Partial | `publish.ts` → `publish-x.ts`, etc. |

✅ = Production Ready | ⚠️ = Wired but blocked on external keys/config

---

## 📱 Social Media Integration Matrix

| Platform | Status | Evidence / Notes |
|----------|--------|------------------|
| **X/Twitter** | ✅ VERIFIED LIVE | Past tweet IDs on record |
| **YouTube** | 🟡 Keys Present | Configured in Netlify, awaiting live test |
| **LinkedIn** | ✅ VERIFIED LIVE | `urn:li:ugcPost:7431201708828946432` |
| **Instagram** | ❌ Missing Keys | Manual setup required in Netlify |
| **TikTok** | ❌ Missing Keys | Manual setup required in Netlify |

---

## 🧱 Architecture

| Layer | Description | Components |
|-------|-------------|------------|
| **UI** | React + Vite + Tailwind | `/src/components/`, `CreativeHub.tsx` |
| **Pipeline** | Netlify Functions + background orchestration | `/netlify/functions/`, `run-pipeline-background.ts` |
| **Storage** | Netlify Blobs (durable, cross-instance) | `lib/storage.ts`, `lib/progress-store.ts` |
| **Memory** | EGO-Prompt learning from feedback | `memory_index.json`, `lib/memory.ts` |
| **Quality** | LUFS audio gates, cost manifest, quality gate | `lib/quality-gate.ts`, `lib/cost-manifest.ts` |
| **Observability** | OpenTelemetry tracing + SSE progress | `lib/tracing.ts`, `progress.ts` |
| **Rendering** | Remotion Lambda (replaces local FFmpeg) | `render-dispatcher.ts`, `lib/remotion-client.ts` |

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template
cp .env.example .env

# 3. Add local keys (choose OpenAI + Gemini if available)
printf "\nOPENAI_API_KEY=%s\n" "PASTE_YOUR_OPENAI_KEY_HERE" >> .env
printf "\nGEMINI_API_KEY=%s\n" "PASTE_YOUR_GEMINI_KEY_HERE" >> .env

# 4. Run preflight checks
npm run preflight

# 5. Start local Netlify dev server (functions + UI on port 8888)
netlify dev

# 6. Build production bundle
npm run build
```

---

## 🔑 Local Key Setup (Git Bash, Exact Commands)

Use these exact commands from `C:\WSP001\SirTrav-A2A-Studio` in Git Bash.

```bash
# Session-only keys (quick test; lasts until terminal closes)
export OPENAI_API_KEY="PASTE_YOUR_OPENAI_KEY_HERE"
export GEMINI_API_KEY="PASTE_YOUR_GEMINI_KEY_HERE"

# Prove cloud sanity checks work
just sanity-test
```

If OpenAI is not available locally, keep `GEMINI_API_KEY` set and run fallback-safe checks:

```bash
# Keep Gemini set for local narration fallback paths
export GEMINI_API_KEY="PASTE_YOUR_GEMINI_KEY_HERE"
just validate-env
```

Persist keys for tomorrow:

```bash
printf "\nOPENAI_API_KEY=%s\n" "PASTE_YOUR_OPENAI_KEY_HERE" >> .env
printf "\nGEMINI_API_KEY=%s\n" "PASTE_YOUR_GEMINI_KEY_HERE" >> .env
```

Local Gemini function test (requires Netlify Dev running):

```bash
# Terminal A
netlify dev

# Terminal B
just gemini-test
```

To verify local and cloud parity:

```bash
just env-diff
just cockpit
```

---

## 🔍 Sanity Test — "What Actually Works Right Now"

Run the comprehensive sanity test to exercise every pipe and wire:

```bash
# Full sanity test (cloud endpoints)
node scripts/sanity-test.mjs

# Test against localhost:8888 (requires netlify dev running)
node scripts/sanity-test.mjs --local

# Generate a dated report in artifacts/reports/
node scripts/sanity-test.mjs --report

# Machine-readable JSON
node scripts/sanity-test.mjs --json

# Via justfile
just sanity-test
just sanity-test-local
just sanity-test-report
```

The sanity test checks:
1. **Agent files** — all 7 agent .ts files + infrastructure exist
2. **Function endpoints** — healthcheck, progress, evals, mcp, narrate-project, generate-attribution
3. **Cycle gates** — 10/10 must pass
4. **Vite build** — `dist/` generates successfully
5. **Contract schemas** — JSON schemas valid with examples
6. **Local env keys** — required vs optional audit
7. **Social publishers** — dry-run tests (no real posts)

---

## ✅ SirTrav Sanity Script — Team Ready

Use this as the minimum team gate:

```bash
# 1) Start local Netlify functions
netlify dev

# 2) Run full local sanity
just sanity-test-local

# 3) Prove DRY publisher contracts
just x-dry-local
just linkedin-dry-local
```

Generate a masked snapshot (names only, no values):

```bash
just env-snapshot out/sirtrav_env_snapshot.json
```

---

## 🔑 Environment Key Audit

```bash
# Full env key table with masked previews
node scripts/validate-env.mjs

# JSON output
node scripts/validate-env.mjs --json

# Via justfile
just validate-env
```

| Variable | Required | Group | Description |
|----------|----------|-------|-------------|
| `OPENAI_API_KEY` | **Yes** | core-ai | GPT-4 + Vision for Director & Writer |
| `ELEVENLABS_API_KEY` | Optional | core-ai | Voice synthesis (has fallback mode) |
| `SUNO_API_KEY` | Optional | core-ai | Music generation (has fallback mode) |
| `GEMINI_API_KEY` | Optional | core-ai | Alternative LLM for narration |
| `TWITTER_API_KEY` | Optional | social | X/Twitter publishing |
| `LINKEDIN_CLIENT_ID` | Optional | social | LinkedIn OAuth |
| `YOUTUBE_CLIENT_ID` | Optional | social | YouTube uploads |
| `REMOTION_SERVE_URL` | Optional | remotion | Remotion Lambda bundle URL |
| `AWS_ACCESS_KEY_ID` | Optional | remotion | AWS credentials for Lambda/S3 |
| `LINEAR_API_KEY` | Optional | infra | Linear project management |

See `scripts/validate-env.mjs` for the full 28-key audit.

---

## 📊 Testing & Verification

### Sanity Test (Recommended First Step)
```bash
just sanity-test          # Cloud endpoints
just sanity-test-local    # Local (requires netlify dev)
just sanity-test-report   # Write artifacts/reports/sanity-YYYY-MM-DD.md
```

### Cycle Gates (10-point quality check)
```bash
just cycle-all            # Run all 10 gates
just cycle-status         # Show gate summary
just cockpit              # Full system dashboard
```

### Individual Test Suites
```bash
npm run preflight               # Environment sanity check
npm run practice:test            # Golden Path integration test
npm run verify:security          # Handshake verification (401/202)
npm run verify:idempotency       # Duplicate run protection
npm run stress:sse               # SSE load testing
npm run test:all                 # preflight + golden-path + security
npm run test:full                # test:all + idempotency + SSE stress
npm run verify:wiring:libs       # Library import wiring proof
```

### Social Publisher Tests
```bash
just x-dry                # X/Twitter dry-run
just linkedin-dry         # LinkedIn dry-run
just youtube-dry          # YouTube dry-run
```

### Library Wiring Proof

| Library | Status | Verification |
|---------|--------|--------------|
| `lib/quality-gate.ts` | ✅ Wired | Imported + invoked in `run-pipeline-background.ts` |
| `lib/cost-manifest.ts` | ✅ Wired | Imported + invoked in `run-pipeline-background.ts` |
| `lib/publish.ts` | ✅ Wired | `publishVideo()` + `flushCredentials()` in `run-pipeline-background.ts` |
| `lib/vision.ts` | ✅ Wired | Imported + used from `curate-media.ts` |

---

## 🛡️ Core Principles

1. **No Fake Success** — `success: true` ONLY with real confirmation (IDs, timestamps). Disabled services return `{ disabled: true }`.
2. **Cost Plus Transparency** — All API costs tracked via `lib/cost-manifest.ts`, 20% markup applied (Commons Good).
3. **Dry-Run First** — Test free before spending API credits. Every publisher has `--dry-run`.
4. **Click2Kick** — Read before execute. Prereq check → verification → output.
5. **runId Threading** — Every agent call traced with `{ projectId, runId }`.

---

## 🎛️ CLI Master Commands (justfile)

```bash
# System Dashboard
just cockpit              # Full system health + human-ops checklist
just cockpit-json         # Machine-readable JSON
just cockpit-checklist    # Generate MASTER_CHECKLIST.md

# Testing
just sanity-test          # Comprehensive pipeline test
just validate-env         # Environment key audit
just cycle-all            # 10-point quality gates
just golden-path          # Integration smoke test

# Team Health
just team-health          # PRs, branches, worktrees
just linear-status        # Linear board alignment

# Path Safety
just path-fix-scan        # Scan for recursive nesting
just path-fix-archive     # Archive-first safe copy
just path-fix-quarantine  # Non-destructive rename

# Deployment
just dev                  # Start Netlify dev server
just build                # Build for production
```

---

## 📁 Project Structure

```
├── netlify/functions/          # 7 Agent serverless functions + infrastructure
│   ├── curate-media.ts         # Agent 1: Director (Vision AI)
│   ├── narrate-project.ts      # Agent 2: Writer (GPT-4)
│   ├── text-to-speech.ts       # Agent 3: Voice (ElevenLabs)
│   ├── generate-music.ts       # Agent 4: Composer (Suno)
│   ├── compile-video.ts        # Agent 5: Editor → render-dispatcher.ts
│   ├── generate-attribution.ts # Agent 6: Attribution
│   ├── publish.ts              # Agent 7: Publisher
│   ├── publish-x.ts            # X/Twitter publisher
│   ├── publish-linkedin.ts     # LinkedIn publisher
│   ├── publish-youtube.ts      # YouTube publisher
│   ├── start-pipeline.ts       # Secure handshake entry
│   ├── run-pipeline-background.ts # Pipeline orchestrator
│   ├── render-dispatcher.ts    # Remotion Lambda dispatch
│   ├── healthcheck.ts          # System health endpoint
│   ├── progress.ts             # SSE progress streaming
│   ├── evals.ts                # Quality metrics
│   ├── mcp.ts                  # MCP gateway
│   └── lib/                    # Shared libraries
├── scripts/                    # CLI tools + test scripts
│   ├── sanity-test.mjs         # Comprehensive pipeline test
│   ├── validate-env.mjs        # Env key audit
│   ├── master-cockpit.mjs      # System dashboard
│   ├── cycle-check.mjs         # 10-point quality gates
│   ├── fix-recursive-nest.mjs  # Path loop destroyer
│   └── test-*.mjs              # Publisher test scripts
├── artifacts/                  # Pipeline outputs + contracts
│   └── contracts/              # JSON schemas (job-packet, social-post, etc.)
├── src/components/             # React UI (Vite + Tailwind)
├── docs/                       # Team documentation
├── plans/                      # Agent task plans
├── justfile                    # 60+ CLI recipes
└── MASTER.md                   # Original build plan
```

---

## ⚠️ Known Issues

| Issue | Status | Path Forward |
|-------|--------|--------------|
| Editor requires Remotion Lambda | In Progress | `render-dispatcher.ts` wired, needs AWS env vars in Netlify |
| Instagram/TikTok | Missing Keys | Human operator must complete OAuth + add keys |
| LinkedIn secrets exposed | 🔴 CRITICAL | Must rotate `LINKEDIN_CLIENT_SECRET` + `LINKEDIN_ACCESS_TOKEN` |
| 9 npm audit vulnerabilities | Medium | Tracked in `tasks/SEC-001-npm-audit-fix.md` |

---

## 📚 Documentation

- [MASTER.md](MASTER.md) — Original build plan
- [AGENTS.md](AGENTS.md) — AI agent registry & best practices
- [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) — Setup & architecture guide
- [docs/TESTING.md](docs/TESTING.md) — Testing guide
- [docs/LINKEDIN_SETUP.md](docs/LINKEDIN_SETUP.md) — LinkedIn OAuth setup
- [docs/POSTMAN-POSTBOT.md](docs/POSTMAN-POSTBOT.md) — Postman + Postbot SOP
- [docs/postman/SirTrav-Functions.collection.json](docs/postman/SirTrav-Functions.collection.json) — Team collection
- [NETLIFY_BUILD_RULES.md](NETLIFY_BUILD_RULES.md) — Build configuration guardrails

---

## 🤝 Contributing

This project follows the "Commons Good" philosophy. Contributions welcome!

1. Read `AGENTS.md` for team patterns and agent directory
2. Use Netlify Blobs (never `/tmp`) for persistence
3. All agents must have graceful failover — no fake success
4. Run `just sanity-test` before PRs
5. Follow branch naming: `feature/WSP-<number>-<slug>`

---

## 📜 License

MIT License — See LICENSE file for details.

---

**For the Commons Good** 🎬
