# Project Completion Gap Analysis

_Last updated: 2025-11-10_

This note captures what remains to ship a reliable end-to-end SirTrav A2A Studio demo and production pipeline. It focuses on blockers, missing pieces, and the exact checks to verify them. Use it as the single source of truth when deciding what belongs in the **public engine repo** (`SirTrav-A2A-Studio`) versus the **private vault** (`Sir-TRAV-scott`).

## Repository split at a glance
- **Public (engine + UI)** – code, manifests, docs, and sanitized/synthetic fixtures only.
- **Private (vault + memory)** – raw intake media, canonical `memory_index.json`, embeddings, eval artifacts, and any sanitized-export staging area.
- **Bridge** – `intake-upload.ts` (public) writes to the private repo using `GITHUB_PAT`; no direct public → raw media copies outside that function.

**Decision rule:** if a file contains raw media, eval outputs tied to humans, or the canonical memory, it belongs in the private repo. Everything else (code, schemas, synthetic samples) stays public.

## 1) Frontend ↔ Backend Bridging
- **Real pipeline trigger**: UI still uses simulated progress; wire the Creative Hub / Build button to a real trigger (e.g., `/.netlify/functions/start-pipeline`) that launches `run-manifest.mjs`.
- **Live progress feed**: Confirm `/progress` is streaming from the writable tmp store and that the UI consumes incremental events (no polling/duplicate history).
- **Final asset handoff**: Surface the published MP4 URL from the publish step into the UI player.

**Public tests**
- `npm run dev` → launch build from Creative Hub and observe SSE updates.
- `curl -N $URL/.netlify/functions/progress` → stream events after a POST.

**Private tests**
- Verify that intake commits land in `sir-trav-scott/intake/<project>` after the upload flow.

## 2) Function Storage Constraints
- **Writable paths**: Functions that persist state (progress, memory, evaluation) must use a writable path (`/tmp` or an external store). Verify `progress.ts`, `submit-evaluation.ts`, and any memory helpers load/write from the same location.
- **External storage**: Decide on artifact hosting (Netlify Large Media, S3, or similar) and update `publish.ts` to upload instead of committing artifacts.

**Action items**
- Pick a durable store for published assets (S3/Netlify LM) and codify credentials in Netlify secrets; ensure `publish.ts` writes there and returns the public URL.
- Keep `/tmp/memory_index.json` the only writable location in functions unless a managed store (KV/Supabase) is introduced.

## 3) Pipeline Manifest & Agents
- **Manifest entry point**: Ensure `pipelines/a2a_manifest.yml` starts with `curate_media` and that each step has either `endpoint` or `script`, not both.
- **Attribution + feedback loop**: Add the Attribution agent and the Submit Evaluation hook into the manifest so credits and user ratings update memory.
- **Memory schema parity**: Keep `memory_index.json` (private vault) aligned with `docs/MEMORY_SCHEMA.md`; add validation or a schema check to CI.

**Public tasks**
- Add `start-pipeline` (trigger) and `generate-attribution` functions; wire manifest to call Attribution and Submit Evaluation.
- Add a schema validation step (Node or Python) that asserts `docs/MEMORY_SCHEMA.md` matches the sample `data/memory-index.json`.

**Private tasks**
- Ensure vault `memory_index.json` follows the schema; add a pre-commit check or CI in `Sir-TRAV-scott` to validate it.

## 4) CI / Quality Gates
- **Deterministic installs**: Prefer `npm ci` in Netlify and GitHub Actions; if the registry blocks packages, add a fallback mirror or pin versions with a working lockfile.
- **Secrets/PII scan**: Keep only the kebab-case `privacy-scan.yml`; ensure `.secrets.baseline` stays current when adding keys.
- **Smoke tests**: Run `./scripts/test_runner.sh` and `./scripts/practice_test.sh` in CI once npm install is stable; gate PRs on these passes.

**Repo-specific gates**
- **Public**: `privacy-scan`, `validate-manifest`, deterministic install + runner/practice scripts; fail on private filename patterns.
- **Private**: stricter privacy scan (block `intake/**` leakage), memory schema check, and sanitized-export workflow (export-only via PR to public repo).

## 5) Private Vault Expectations (sir-trav-scott)
- **Intake isolation**: Raw media and memory live only in the private repo. Add an export/sanitization workflow to move safe artifacts into the public repo.
- **Mirrored LFS rules**: Apply the same LFS patterns and ignores in the private repo to prevent accidental commits of large media.
- **Memory source of truth**: The vault’s `memory_index.json` is canonical; public functions should only read/write via authenticated pathways.

**Verification**
- `git lfs track` shows the same patterns as public.
- Sanitized-export CI proves only scrubbed assets move across repos.

## 6) Environment & Keys
- **Netlify envs**: Populate required keys (URL, MCP_SECRET_TOKEN, ELEVENLABS_*, SUNO_API_KEY, GEMINI_API_KEY, GITHUB_PAT/ACTION_DISPATCH_PAT). Use placeholders for dev but test the `healthcheck` function.
- **Local dev in restricted environments**: If npm registry access fails, point to an allowlisted mirror or install dependencies manually; then rerun `npm run preflight` and `npm run dev`.

## 7) Verification Matrix (what to test)
- **Local**: `npm ci` (or `npm install` if mirrored) → `./scripts/preflight.sh` → `./scripts/test_runner.sh` → `./scripts/practice_test.sh`.
- **Functions**: `curl -X POST /.netlify/functions/curate-media` (stub ok), `/progress` POST+SSE, `/submit-evaluation` write/read from `/tmp/memory_index.json`.
- **Pipeline**: Run `node pipelines/run-manifest.mjs` with the sample project and confirm outputs land under `tmp/week44` (or configured temp dir).
- **UI**: Start `npm run dev`, hit Creative Hub, launch a build, and watch status/events update live.

**Repo-routing checks**
- If a test touches raw media or canonical memory, run it in the **private** repo; otherwise run it in the **public** repo.
- Before merging, confirm privacy scan blocks any private-path patterns in public CI; the mirrored scan in private CI should block public-only assets from landing there.

## 8) Ready-to-implement next steps
1. Add a real pipeline trigger function and wire the UI button to it.
2. Streamline `/progress` with a persistent writable store (tmp or external) and validate SSE from the browser.
3. Add Attribution + Submit Evaluation into the manifest and publish outputs to external storage.
4. Stabilize installs (registry mirror/pinned lockfile), then enable CI to run practice + runner tests.
5. Mirror ignore/LFS and memory schema checks in the private vault repo.

## 9) Top 3 priorities for a working demo (team assignment)
1. **Pipeline trigger + SSE wiring (UI ↔ functions)**  
   **Owner:** Frontend + Netlify Engineer  
   **Definition of done:** Creative Hub launches a real pipeline trigger (`/.netlify/functions/start-pipeline` or similar), and Pipeline Progress shows live SSE events without manual refresh.
2. **Durable publishing storage (S3 or Netlify Large Media)**  
   **Owner:** Backend + DevOps  
   **Definition of done:** `publish.ts` uploads artifacts to the selected backend, returns a public URL, and no artifacts are committed to Git.
3. **Attribution + feedback loop in the manifest**  
   **Owner:** Backend + Pipeline  
   **Definition of done:** `generate-attribution` and `submit-evaluation` steps are added to `a2a_manifest.yml`, and feedback updates the memory index schema.

Keeping this list short and actionable should help close the remaining gaps quickly.
