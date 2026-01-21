# Deployment Readiness & Manual Actions

Use this checklist to bridge the gap between the local scaffold and a production-ready Netlify deployment. It highlights the steps that cannot be automated in this repo and must be completed in the Netlify dashboard or your cloud provider.

## 1) Prerequisites
- Node 18+ and npm registry access (or an approved `.npmrc`).
- Correct Git remotes: this repo is **public** (engine only). Keep vault data in `Sir-TRAV-scott`.
- Netlify site created and linked to this repository.

## 2) Environment variables (Netlify UI)
Set these in **Site Settings → Environment variables** before deploying:
- `ELEVENLABS_API_KEY`, `ELEVENLABS_DEFAULT_VOICE_ID`
- `SUNO_API_KEY`
- `OPENAI_API_KEY` (writer agent tracing)
- `GEMINI_API_KEY` (director, optional)
- `GITHUB_PAT`, `GITHUB_ACTION_DISPATCH_PAT`, `GITHUB_OWNER`, `GITHUB_REPO`, `PUBLIC_REPO`
- Storage backend: either `S3_BUCKET` + AWS keys **or** `STORAGE_BACKEND=netlify_blobs`
- Optional social publishing: `YOUTUBE_API_KEY`, `TIKTOK_CLIENT_ID/SECRET`, `INSTAGRAM_APP_ID/SECRET`
- `URL`, `MCP_SECRET_TOKEN`, `NODE_ENV=production`

## 3) Local verification before deploy
Run these from the repo root:
```bash
npm ci                       # deterministic install
npm run preflight            # secrets + basic checks
npm run test:runner          # manifest smoke test
npm run practice:test        # progress + feedback loop exercise
```
If the registry is blocked, configure `.npmrc` to an approved mirror and rerun `npm ci`.

## 4) Netlify build settings
- `netlify.toml` already pins Node 18 and uses `npm ci && npm run build`.
- Enable the Functions adapter (via Netlify UI/CLI) so TypeScript handlers are built.
- If using Netlify Blobs: ensure the Blobs add-on is enabled for the site.

## 5) Storage choice (manual)
- **S3**: create a bucket, set `S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, and optional `S3_PUBLIC_BASE_URL`.
- **Netlify Blobs**: set `STORAGE_BACKEND=netlify_blobs`; no additional keys required, but the feature must be enabled in the site settings.

## 6) Functions to smoke-test after deploy
With Netlify deploy preview or production URL, run:
```bash
curl -s $URL/.netlify/functions/healthcheck | jq .
curl -s -X POST $URL/.netlify/functions/curate-media -H "Content-Type: application/json" -d '{"projectId":"demo","vaultPrefix":"content/intake/demo"}' | jq .
curl -s -N "$URL/.netlify/functions/progress?projectId=demo" | head -n 5
curl -s -X POST $URL/.netlify/functions/submit-evaluation -H "Content-Type: application/json" -d '{"projectId":"demo","rating":"good","tags":["uplifting"]}' | jq .
```

## 7) Manual steps that cannot be automated here
- OAuth approvals for YouTube/TikTok/Instagram (console setup + redirect URIs).
- Adding/rotating API keys in Netlify.
- Provisioning S3 buckets or enabling Netlify Blobs.
- Running `npm ci` in environments with restricted registries (requires `.npmrc`).
- Protecting branches and enabling required status checks in GitHub.

## 8) Go/No-Go checklist for demo
- ✅ `npm run preflight`, `npm run test:runner`, `npm run practice:test` all pass locally.
- ✅ Netlify deploy is green; key functions respond (see smoke tests above).
- ✅ Storage backend verified (S3 object or Blobs upload succeeds).
- ✅ Secrets and vault data are **not** present in this repo (per `docs/REPO_ROUTING.md`).

Keep this doc updated as new backends or social publishers are added.
