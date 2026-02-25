# SirTrav-A2A-Studio Architecture

Last updated: 2026-02-25

## One-line Summary
Serverless multi-agent video production pipeline: React/Vite frontend, Netlify Functions backend, Netlify Blobs + S3 persistence, Remotion Lambda rendering.

## Layer Model

1. Frontend (`src/`)
- React + Vite UI
- Click2Kick controls
- Pipeline progress (SSE)
- Results + publishing surface

2. Backend (`netlify/functions/`, `netlify/functions/lib/`)
- 7-agent orchestration flow
- Social publishers (X, LinkedIn, YouTube, Instagram, TikTok)
- Quality gates + no-fake-success contracts
- Cost/ledger and vault helpers

3. Storage/Execution
- Netlify Blobs (KV-style stores)
- S3 for media artifacts
- Remotion Lambda for heavy video render

## 7-Agent Pipeline

1. Director: curate media + theme selection
2. Writer: narrative/script generation
3. Voice: TTS narration synthesis
4. Composer: soundtrack generation
5. Editor: compile/render pipeline
6. Attribution: credits + commons tracking
7. Publisher: social publishing + artifact distribution

Core flow starts at `start-pipeline.ts` and runs long tasks in `run-pipeline-background.ts`.

## Reliability and Trust Rules

- No Fake Success: disabled platforms return explicit disabled contract, not fake pass.
- runId threading: every step ties to project/run correlation IDs.
- Quality gate: pipeline blocks on core step failure.
- Council Flash: human-verifiable gate sequence before trust declaration.

## Current Operational Truth (Branch-sensitive)

- Active large integration branch: `claude/trusting-hamilton` (open PR #10).
- WSP-7 lane exists and is open as PR #13.
- Security baseline should be validated per-branch and timestamped (`npm audit` can differ from GitHub default-branch alerts).

## Interface Contracts (Public-facing, high-impact)

- X publish: `POST /.netlify/functions/publish-x` with `{ text }`
- YouTube publish: `POST /.netlify/functions/publish-youtube` with `{ projectId, runId, videoUrl, title, description, privacy, tags }`
- TikTok publish: `POST /.netlify/functions/publish-tiktok` with `{ projectId, runId, videoUrl, caption, privacy }`
- Instagram publish: `POST /.netlify/functions/publish-instagram` with `{ projectId, runId, videoUrl, caption }`

## Team Operating Model

- Sequential Baton Pass across specialized agents.
- One-ticket rule per agent.
- Attribution requires branch-verified evidence: branch + SHA + PR URL + checks.
