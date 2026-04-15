# CC-PLATFORM-FIX — Platform Truth Pass
**Owner:** Claude Code
**Status:** IN PROGRESS
**Created:** 2026-04-13
**Render path:** Gemini/Veo 2 (GEMINI_API_KEY) — NOT Remotion/Lambda. Lambda does not work. Never set that as the primary.

---

## READ THIS BEFORE TOUCHING ANYTHING

This ticket was written AFTER reading the actual files.
Every claim below is grounded in line-level code, not assumption.
If a claim conflicts with what you see in the file — trust the file, update this ticket.

---

## CONFIRMED ALREADY DONE — DO NOT REDO

| What | Where | Confirmed |
|------|-------|-----------|
| `--build-gate` wired in netlify.toml | `netlify.toml:4` | `npm run build && node scripts/sanity-test.mjs --build-gate` |
| BUILD_GATE skips localhost fetches | `scripts/sanity-test.mjs:39` | `args.includes('--build-gate') \|\| process.env.NETLIFY === 'true'` |
| intake-upload is already thin | `netlify/functions/intake-upload.ts` | 57 lines, no spawn, stores to Blobs, returns 200 |
| Veo 2 is PATH A (Gemini key) | `netlify/functions/compile-video.ts` | Promoted in commit 94b598f2 |
| publish.ts quality gate blocks without lufs_ok | `netlify/functions/publish.ts:67-82` | Returns 422 if qualityPassed is false |
| NetlifyLMStorage fake-success fixed | `netlify/functions/lib/storage.ts:629-633` | Falls through to Blobs instead of fabricating URL |

---

## WHAT STILL NEEDS DOING (priority order)

### 1. Wire `run-pipeline-background.ts` Step 5 to use Veo 2 path

**Problem:** `run-pipeline-background.ts` calls `compile-video` as a normal fetch. That's correct.
But `compile-video` now returns **202 Accepted** (not 200) when Veo 2 dispatches — and the background runner
may not handle a 202 correctly (treats non-200 as failure).

**Read first:** `netlify/functions/run-pipeline-background.ts` — find the `compile-video` step fetch call.
Look at how the response status is checked. If it asserts `resp.ok && status === 200`, that will break on 202.

**Fix:** Accept 200 OR 202 as success from compile-video. When 202, extract `pollUrl` and `jobId` from response
body. Store them in the run record via `runsStore()`. Do not wait for render completion in the background runner.

**Acceptance:**
- `compile-video` 202 response does NOT cause the background runner to log a failure
- `jobId` and `pollUrl` are persisted in the run record
- Pipeline continues to Step 6 (attribution) after dispatching Veo job

---

### 2. Wire attribution + cost manifest into pipeline

**Problem:** `generate-attribution.ts` and `lib/cost-manifest.ts` exist but may not be called by
`run-pipeline-background.ts`. The pipeline was historically blocked at Step 5, so Steps 6-7 were never reached.

**Read first:**
- `netlify/functions/run-pipeline-background.ts` — confirm whether `generate-attribution` is called
- `netlify/functions/generate-attribution.ts` — confirm the expected request shape and `for_the_commons_good` field
- `netlify/functions/lib/cost-manifest.ts` — confirm the manifest API exists and is callable

**Fix:** Ensure the pipeline calls `generate-attribution` after Step 5 resolves (or after Veo job is dispatched).
Ensure cost manifest is invoked per agent step or at minimum before `publish` is called.
Ensure `publish.ts` receives attribution data in the `metadata` field.

**Acceptance:**
- Pipeline run record contains `attribution` field after Step 6
- `cost_manifest` is present in run results
- `for_the_commons_good: true` appears in attribution output

---

### 3. Activate CV live RAG (ops task — requires human)

**Code is ready. The gap is operational.**

The CV chatbot `chat.ts` already has the `VECTOR_ENGINE_URL` branch wired.
When that env var is absent, it falls back to embedded knowledge — which is honest.

**What's needed (human ops, not code):**
1. Run ingest: `python embed_engine.py` in `R.-Scott-Echols-CV/`
2. Deploy retrieval server to Cloud Run
3. Set `VECTOR_ENGINE_URL` in Netlify env for the CV site

**Code change (small, after ops are done):** In `chat.ts`, confirm the fallback state is labeled honestly
in the response (e.g., `retrieval_mode: 'fallback'` vs `retrieval_mode: 'live'`). Read the file first.

---

### 4. Wire progress state to Blobs (lower priority, dev smoke checks OK for now)

**Current behavior:** Progress is written to temp-dir JSON. Works fine for dev smoke checks.
This becomes a problem only if multi-instance production requires shared state.

**Do not rebuild.** The existing `lib/progress-store.ts` already has the lazy `getProgressStore()` fix.
If production needs shared progress, extend that store to write to `runsStore()` in addition to temp-dir.

**Acceptance:** Not required before deploy. Mark complete when `progress` endpoint survives a function
instance cold-start and still returns pipeline history.

---

## RENDER PATH TRUTH (read before touching compile-video again)

```
GEMINI_API_KEY present?
  YES → PATH A: compile-video calls compileWithVeo() → returns 202 + pollUrl
        ↓ Veo unavailable (not on tier) → storyboard fallback, returns 200
        ↓ Veo dispatch fails + no PATH B → returns disabled: true

  NO → PATH B: render-dispatcher.ts (Remotion Lambda) — only if REMOTION_SERVE_URL set
        ↓ No PATH B either → disabled: true

LAMBDA/REMOTION: currently not functional. Do NOT make it primary. Do NOT remove PATH B
entirely — leave as dormant fallback. When AWS is eventually unblocked (see memory: project_aws_blocked.md),
PATH B is available without another rewrite.
```

---

## STORAGE TRUTH (read before touching storage.ts again)

```
STORAGE_BACKEND env var → createStorage() in lib/storage.ts:615

netlify_blobs → NetlifyBlobsStorage ✅ real, production-safe
s3            → S3Storage ✅ real, requires AWS keys
netlify_lm    → FIXED: now falls through to NetlifyBlobsStorage with warning
(default)     → NetlifyBlobsStorage

The NetlifyLMStorage class still exists in the file. Do NOT delete it yet —
it may be referenced elsewhere. Just don't let createStorage() select it.
```

---

## COMMIT ORDER

```
fix(storage): redirect netlify_lm to Blobs — remove fake-success path  ← DONE (this session)
fix(pipeline): accept 202 from compile-video in run-pipeline-background  ← NEXT
fix(attribution): wire generate-attribution + cost manifest into pipeline
ops(cv): ingest + Cloud Run + VECTOR_ENGINE_URL (human-only steps)
```

---

## WHAT NOT TO TOUCH

- `src/` — Codex lane. Do not edit React components.
- `render-dispatcher.ts` — Do not change. It's the Remotion path. Leave dormant until AWS works.
- `netlify.toml` — Already correct. No changes needed.
- `sanity-test.mjs` — Already has `--build-gate`. No changes needed.
- `intake-upload.ts` — Already correct and thin. No changes needed.

---

*Written after reading: netlify.toml, sanity-test.mjs, intake-upload.ts, storage.ts,*
*compile-video.ts (diff), render-dispatcher.ts, publish.ts*
*— Claude Code, 2026-04-13, For the Commons Good*
