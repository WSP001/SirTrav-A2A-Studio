# Ready-to-Test Checklist

Use this short checklist before you run any end-to-end demo. It keeps the public engine clean, verifies dependencies, and exercises the pipeline with the built-in stubs.

## 1) Stay in the right repo
- Public engine only: `SirTrav-A2A-Studio` (this repo). Do **not** copy vault media or private data here.
- Private vault work stays in `Sir-TRAV-scott`.

## 2) Dependencies and runtime
- Node.js **18+**.
- Install with `npm ci` for deterministic deps. If your registry is restricted, point `.npmrc` to the approved mirror and retry.

## 3) Fast safety checks
Run these from the repo root:
```bash
npm run preflight       # secret/PII grep + sanity checks
npm run test:runner     # manifest smoke test
npm run practice:test   # progress + feedback loop dry-run
```
If Netlify Dev is running (or `URL` points at a deployed site), add:
```bash
npm run verify:security # start-pipeline auth handshake
```
If you want all of them plus a Node guard in one shot:
```bash
npm run verify:flywheel
```

## 4) Optional function probes (Netlify Dev)
With `npm run dev` running:
```bash
curl -s http://localhost:8888/.netlify/functions/healthcheck
curl -s -X POST http://localhost:8888/.netlify/functions/curate-media -H "Content-Type: application/json" -d '{"projectId":"demo"}'
curl -s -X POST http://localhost:8888/.netlify/functions/submit-evaluation -H "Content-Type: application/json" -d '{"projectId":"demo","rating":"good"}'
```

## 5) Security guardrails
- Review `docs/SECURITY_CHECKLIST.md` before committing or deploying.
- Confirm new files belong in this public repo (`docs/REPO_ROUTING.md`).
- Never commit secrets or raw vault media; keep them in the private repo.

## 6) If something fails
- Rerun `npm ci` with a reachable registry or cached `node_modules` (see `docs/LOCAL_DEV.md`).
- Capture failing command output and re-run with `npm run preflight` to spot obvious issues quickly.
