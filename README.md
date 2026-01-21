# SirTrav A2A Studio (Public)
Weekly recap pipeline: Upload → Curate → Write → Narrate (ElevenLabs) → Music (Suno) → Mix → Compile → Evals → Publish.

## Quickstart
1. Set Netlify env: ELEVENLABS_API_KEY, ELEVENLABS_DEFAULT_VOICE_ID, SUNO_API_KEY, URL, GITHUB_*.
2. Deploy to Netlify.
3. Drag/drop media → pipeline runs → final MP4 published.

## Local setup (for Codex & Netlify engineers)

These steps let you install dependencies, run the manifest runner, and exercise core functions locally before deploying. If your npm registry is restricted, see `docs/LOCAL_DEV.md` for offline-friendly guidance.

1. Install tools
   ```bash
   npm ci                  # deterministic install (use npm install if the registry blocks packages)
   npm run preflight       # lightweight secrets scan + sanity checks
   npm run test:runner     # manifest smoke test (runs pipelines/run-manifest.mjs)
   ```
2. Run the dev stack
   ```bash
   npm run dev  # starts Vite + Netlify Functions via Netlify Dev
   ```
3. Probe key functions while dev server is running
   ```bash
   curl -X POST http://localhost:8888/.netlify/functions/curate-media -H "Content-Type: application/json" -d '{"projectId":"demo","media_root":"content/intake/demo"}'
   curl -N http://localhost:8888/.netlify/functions/progress   # live SSE stream
   ```

4. Quick security/QA checklist
   - Run `npm run preflight`, `npm run test:runner`, `npm run practice:test`, and `npm run verify:security` (Netlify Dev or deployed `URL`) before commits or deploys, or use `npm run verify:flywheel` to chain preflight/runner/practice with a Node guard.
   - See `docs/SECURITY_CHECKLIST.md` for secrets/PII guardrails, repo routing (public vs private), and files requiring security review.
   - Review `docs/REPO_ROUTING.md` to confirm any new files belong in this public repo (engine + sanitized samples) rather than the private vault.
   - Follow `docs/READY_TO_TEST.md` for a concise pre-demo checklist (repo routing, installs, safety checks, and function probes).
   - Use `DEPLOYMENT.md` for the deployment runbook, and `docs/DEPLOYMENT_READINESS.md` for manual steps that cannot be automated here (Netlify env vars, storage choice, OAuth setup, deploy smoke tests).

If npm registry access is restricted in your environment, pin the failing package version in `package.json` or configure `.npmrc` to point at your allowed registry, then rerun `npm ci`.
