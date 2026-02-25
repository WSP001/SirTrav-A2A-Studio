# Copilot Instructions — SirTrav-A2A-Studio

## Project Context

This is a **multi-agent creative automation platform** built with React + Vite (frontend) and Netlify Functions v2 (backend). Five AI agents collaborate under strict governance rules.

## Repository Layout

- `src/` — React frontend (Codex owns)
- `netlify/functions/` — Serverless backend (Claude Code owns)
- `justfile` — 180+ recipes for gates, verification, publishing
- `scripts/` — Node.js automation (Windsurf owns)
- `plans/AGENT_ASSIGNMENTS.md` — Ticket source of truth
- `agent-state.json` — 10-gate status tracker

## Rules for All Agents (Including Copilot)

1. **Never push to main** — use `feature/WSP-*` branches, human merges
2. **Never delete files** — archive to `.archive/inbox/<timestamp>/`
3. **Never edit `.env` or secrets** — Human Operator only
4. **Never return fake success** — `success: true` requires real proof
5. **One ticket per agent** — no parallel work on same branch
6. **Always use `git -C $REPO`** — Copilot CLI may lose `cd` context

## Build & Verify

```powershell
npx vite build              # Frontend build (must exit 0)
just healthcheck-cloud      # Cloud deployment health
just devkit-ci              # CI gate (20/22 expected)
just preflight              # Environment sanity check
```

## Key Tech Stack

- **Frontend:** React 19, Vite 7, Lucide icons, Tailwind CSS
- **Backend:** Netlify Functions v2, TypeScript
- **Video:** Remotion (Lambda render, not local)
- **Social:** X/Twitter (LIVE), LinkedIn (LIVE), YouTube/TikTok/Instagram (pending)
- **Storage:** Netlify Blobs KV
- **AI Services:** OpenAI, ElevenLabs

## CSS Theme

24K Gold Palette with glassmorphism. Brand vars in `src/App.css`:
- `--brand-primary: #d4af37` (gold)
- `--surface-dark: #0a0a1a` (deep navy)
- `--glass-bg: rgba(255, 255, 255, 0.05)`

## Deployment

- **URL:** https://sirtrav-a2a-studio.netlify.app
- **Branch deploys:** Netlify auto-deploys from `main`
- **Preview deploys:** Feature branches get preview URLs
