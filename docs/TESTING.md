# Testing Guide

This project ships with several quick checks you can run locally to validate the scaffold and pipeline stubs without hitting external providers.

## Prerequisites
- Node.js 18+
- npm registry access for dependencies (or a local cache). See `docs/LOCAL_DEV.md` for offline hints.

## Fast checks

### 1) Security preflight
```
npm run preflight
```
- Greps for obvious secret patterns (falls back to `grep` if `rg` is missing).

### 2) Manifest smoke test
```
npm run test:runner
```
- Verifies the manifest exists and executes `pipelines/run-manifest.mjs` with placeholder endpoints.

### 3) Practice pipeline exercise
```
npm run practice:test
```
- Chains preflight → runner smoke → progress POST/GET → `submit-evaluation` dry run using temporary storage.

### 4) Security handshake (Netlify Dev or deployed URL)
```
npm run verify:security
```
- Exercises `/.netlify/functions/start-pipeline` with no token, a bad token, and `PUBLISH_TOKEN_SECRET` (or `demo`).
- Requires Netlify Dev running (`npm run dev`) or `URL` set to a deployed site.

### 5) Full flywheel (all of the above)
```
npm run verify:flywheel
```
- Node version guard plus preflight, manifest smoke, and practice pipeline in one command.

### 6) Health script (Windows/PowerShell)
```
pwsh scripts/health.ps1
```
- Confirms expected files and required environment variables are present.

## Function probes (via Netlify Dev)
With Netlify Dev running (`npm run dev`):
```
curl -s http://localhost:8888/.netlify/functions/healthcheck
curl -s -X POST http://localhost:8888/.netlify/functions/curate-media -H "Content-Type: application/json" -d '{"project_id":"demo"}'
curl -s -X POST http://localhost:8888/.netlify/functions/submit-evaluation -H "Content-Type: application/json" -d '{"projectId":"demo","rating":"good"}'
```

## Notes
- The pipeline uses placeholder integrations; no external credits are consumed during these tests.
- If npm registry access is blocked, install from a mirror or reuse a cached `node_modules` as described in `docs/LOCAL_DEV.md`.
