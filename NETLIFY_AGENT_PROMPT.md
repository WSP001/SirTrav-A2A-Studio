# NETLIFY AGENT PROMPT — Handoff from Windsurf Master

**Site:** `sirtrav-a2a-studio.netlify.app`
**Repo:** `github.com/WSP001/SirTrav-A2A-Studio` (branch: `main`)
**Date:** 2026-02-10
**From:** Windsurf Master (code-side agent — can edit files, run justfile, commit/push)
**To:** Netlify Agent (platform-side agent — can check dashboard, set env vars, read function logs, trigger deploys)

---

## SITUATION REPORT — What Windsurf Master Already Verified

The codebase is **fully wired**. Every pipeline step exists, imports are correct, and the build deploys successfully. But the pipeline runs in **PLACEHOLDER/FALLBACK mode** because critical environment variables are not set in the Netlify Dashboard.

**Windsurf Master ran these checks (all PASS):**

| Check | Result | What It Proves |
|-------|--------|----------------|
| `just wiring-verify` | **12/12 ✅** | All 7 pipeline files exist + imports wired correctly |
| `just no-fake-success-check` | **8/8 ✅** | All 5 publishers return `{success:false, disabled:true}` when keys missing |
| Build commit `9d1eae2` | **Deployed ✅** | 1854 bytes, fresh asset hashes, loading fallback works |

**What Windsurf Master CANNOT do (your job):**
- Read or set Netlify Dashboard environment variables
- Read Netlify function logs
- Trigger deploys or clear cache
- Complete OAuth browser flows
- Verify that `NETLIFY_BLOBS_CONTEXT` is injected at runtime

---

## TASK 1 — DIAGNOSE: Check Current Environment Variables

**Go to:** Netlify Dashboard → Site Settings → Environment Variables

**Report back which of these exist (YES/NO for each):**

### Tier 1: BLOCKERS (pipeline stuck in placeholder without these)

```
REMOTION_FUNCTION_NAME    = ???
REMOTION_SERVE_URL        = ???
AWS_ACCESS_KEY_ID         = ???
AWS_SECRET_ACCESS_KEY     = ???
```

> **Why:** `netlify/functions/lib/remotion-client.ts` line 65 checks `isRemotionConfigured()`.
> If ANY of these 4 are missing → `compile-video` returns a placeholder video, not a real render.

### Tier 2: BLOCKERS (X/Twitter 401 auth error)

```
TWITTER_API_KEY           = ???
TWITTER_API_SECRET        = ???
TWITTER_ACCESS_TOKEN      = ???
TWITTER_ACCESS_SECRET     = ???
```

> **Why:** All 4 must come from the **SAME** Twitter Developer App.
> Mixed keys from different apps cause 401 Unauthorized.

### Tier 3: REQUIRED (AI agents need these for real content)

```
OPENAI_API_KEY            = ???
ELEVENLABS_API_KEY        = ???
SUNO_API_KEY              = ???
SUNO_API_URL              = ???
```

### Tier 4: OPTIONAL (social publishing — skip if not ready)

```
LINKEDIN_CLIENT_ID        = ???
LINKEDIN_CLIENT_SECRET    = ???
LINKEDIN_ACCESS_TOKEN     = ???
LINKEDIN_PERSON_URN       = ???
YOUTUBE_CLIENT_ID         = ???
YOUTUBE_CLIENT_SECRET     = ???
YOUTUBE_REFRESH_TOKEN     = ???
TIKTOK_CLIENT_KEY         = ???
TIKTOK_CLIENT_SECRET      = ???
TIKTOK_ACCESS_TOKEN       = ???
TIKTOK_REFRESH_TOKEN      = ???
INSTAGRAM_ACCESS_TOKEN    = ???
INSTAGRAM_BUSINESS_ID     = ???
```

### Tier 5: UTILITIES (optional)

```
BITLY_ACCESS_TOKEN        = ???
SHARE_SECRET              = ???
MCP_SECRET_TOKEN          = ???
```

---

## TASK 2 — DIAGNOSE: Verify Build Settings

**Go to:** Netlify Dashboard → Site Settings → Build & Deploy → Build settings

**Confirm these EXACTLY match (report any mismatch):**

| Setting | Must Be | Why |
|---------|---------|-----|
| **Build command** | `npm install --include=dev && npm run build` | `netlify.toml` line 2 |
| **Publish directory** | `dist` | `netlify.toml` line 3 |
| **Functions directory** | `netlify/functions` | `netlify.toml` line 4 |
| **Node version** | `22` | `netlify.toml` line 7 |

> **CRITICAL:** If the Dashboard overrides ANY of these, the Dashboard wins.
> A past bug had the Dashboard set to `echo 'Static site - no build needed'` which served stale files.

---

## TASK 3 — DIAGNOSE: Check Function Logs for Blobs Issue

**Go to:** Netlify Dashboard → Functions → `healthcheck` → Logs

**Look for this pattern:**

```
[Storage] NETLIFY_BLOBS_CONTEXT set but getStore failed
```

OR:

```
[Storage] Using local fallback for sirtrav-runs
```

> **Why:** `storage.ts` line 56 checks `process.env.NETLIFY_BLOBS_CONTEXT`.
> In production Netlify Functions, this should be **auto-injected** by the platform.
> If it's missing, Blobs storage falls back to `/var/task/.local-blobs/` (read-only → errors).

**Also check function logs for:**
- `run-pipeline-background` — any 500 errors or timeout issues
- `compile-video` — whether it says "placeholder mode" or "Remotion Lambda"
- `publish-x` — whether it says "disabled" or "401"

---

## TASK 4 — FIX: Set Missing Environment Variables

For any variable from TASK 1 that is missing, set it:

**Go to:** Netlify Dashboard → Site Settings → Environment Variables → Add a variable

**Priority order:**

1. **REMOTION_FUNCTION_NAME** — the Lambda function name (e.g. `remotion-render-4-0-0`)
2. **REMOTION_SERVE_URL** — the S3 bundle URL for Remotion
3. **AWS_ACCESS_KEY_ID** — IAM user with Remotion Lambda permissions
4. **AWS_SECRET_ACCESS_KEY** — matching secret
5. **TWITTER_API_KEY** + **TWITTER_API_SECRET** + **TWITTER_ACCESS_TOKEN** + **TWITTER_ACCESS_SECRET** — all from ONE app
6. **OPENAI_API_KEY** — for Director/Writer agents
7. **ELEVENLABS_API_KEY** — for Voice agent
8. **SUNO_API_KEY** + **SUNO_API_URL** — for Composer agent

---

## TASK 5 — FIX: Trigger Clean Deploy

After setting env vars:

1. **Go to:** Netlify Dashboard → Deploys
2. Click **"Trigger deploy"** → **"Clear cache and deploy site"**
3. Wait for build to complete (should take ~60-90 seconds)
4. Verify build log shows `npm install --include=dev && npm run build` (not a Dashboard override)

---

## TASK 6 — VERIFY: Hit These Endpoints

After deploy completes, test these URLs and **report the response**:

```
GET  https://sirtrav-a2a-studio.netlify.app/.netlify/functions/healthcheck
```

**Expected response shape:**
```json
{
  "status": "ok",
  "services": {
    "storage": { "status": "ok" },
    "remotion": { "status": "ok" },
    "social_publishing": { "status": "ok" or "degraded" }
  }
}
```

If `remotion.status` is still `"disabled"` after setting env vars → the vars aren't reaching the function.

```
POST https://sirtrav-a2a-studio.netlify.app/.netlify/functions/publish-x
Content-Type: application/json

{"text": "Netlify Agent dry-run test", "dryRun": true}
```

**Expected:** If X keys are set correctly → `{ success: true, tweetId: "..." }`
**If still broken:** `{ success: false, disabled: true }` or 401

```
GET  https://sirtrav-a2a-studio.netlify.app/.netlify/functions/progress?projectId=test
```

```
POST https://sirtrav-a2a-studio.netlify.app/.netlify/functions/start-pipeline
Content-Type: application/json

{"projectId": "netlify-agent-test", "platform": "test", "brief": "Test run from Netlify Agent"}
```

---

## TASK 7 — REPORT BACK

Copy this checklist, fill it in, and report back to the team:

```markdown
## Netlify Agent Diagnostic Report — [DATE]

### Environment Variables
- [ ] REMOTION_FUNCTION_NAME: SET / MISSING
- [ ] REMOTION_SERVE_URL: SET / MISSING
- [ ] AWS_ACCESS_KEY_ID: SET / MISSING
- [ ] AWS_SECRET_ACCESS_KEY: SET / MISSING
- [ ] TWITTER_API_KEY: SET / MISSING
- [ ] TWITTER_API_SECRET: SET / MISSING
- [ ] TWITTER_ACCESS_TOKEN: SET / MISSING
- [ ] TWITTER_ACCESS_SECRET: SET / MISSING
- [ ] OPENAI_API_KEY: SET / MISSING
- [ ] ELEVENLABS_API_KEY: SET / MISSING
- [ ] SUNO_API_KEY: SET / MISSING

### Build Settings
- [ ] Build command matches netlify.toml: YES / NO (actual: ___)
- [ ] Publish directory = dist: YES / NO (actual: ___)
- [ ] Node version = 22: YES / NO (actual: ___)

### Function Logs
- [ ] NETLIFY_BLOBS_CONTEXT present in runtime: YES / NO
- [ ] healthcheck returns storage.status=ok: YES / NO
- [ ] healthcheck returns remotion.status=ok: YES / NO (or disabled?)
- [ ] Any 500 errors in function logs: YES / NO (details: ___)

### Endpoint Tests
- [ ] /healthcheck response: ___
- [ ] /publish-x dry-run response: ___
- [ ] /progress response: ___
- [ ] /start-pipeline response: ___

### Actions Taken
- [ ] Set missing env vars: (list which ones)
- [ ] Triggered clean deploy: YES / NO
- [ ] Build succeeded after redeploy: YES / NO
```

---

## REFERENCE: Code ↔ Env Var Mapping

| Env Var | Used In | Line | What Happens If Missing |
|---------|---------|------|------------------------|
| `REMOTION_FUNCTION_NAME` | `remotion-client.ts` | 65 | Placeholder video returned |
| `REMOTION_SERVE_URL` | `remotion-client.ts` | 65 | Placeholder video returned |
| `AWS_ACCESS_KEY_ID` | `remotion-client.ts` | 65 | Placeholder video returned |
| `AWS_SECRET_ACCESS_KEY` | `remotion-client.ts` | 65 | Placeholder video returned |
| `TWITTER_API_KEY` | `publish-x.ts` | 24 | Returns `{disabled: true}` |
| `TWITTER_API_SECRET` | `publish-x.ts` | 25 | Returns `{disabled: true}` |
| `TWITTER_ACCESS_TOKEN` | `publish-x.ts` | 26 | Returns `{disabled: true}` |
| `TWITTER_ACCESS_SECRET` | `publish-x.ts` | 27 | Returns `{disabled: true}` |
| `OPENAI_API_KEY` | `run-pipeline-background.ts` | various | Director/Writer agents fail |
| `ELEVENLABS_API_KEY` | `run-pipeline-background.ts` | various | Voice agent fails |
| `SUNO_API_KEY` | `run-pipeline-background.ts` | various | Composer agent fails |
| `NETLIFY_BLOBS_CONTEXT` | `storage.ts` | 56 | **Auto-injected by Netlify** — if missing, storage falls back to local FS |

---

## WHAT WINDSURF MASTER ALREADY FIXED (no action needed)

- ✅ `compile-video.ts` → calls `render-dispatcher.ts` → calls `remotion-client.ts` (wired)
- ✅ `run-pipeline-background.ts` → imports cost-manifest + quality-gate + attribution (wired)
- ✅ All 5 publishers have No Fake Success pattern (`disabled: true` when keys missing)
- ✅ All publishers have payload validation
- ✅ `netlify.toml` has correct build command, publish dir, functions dir
- ✅ `storage.ts` has `NETLIFY_BLOBS_CONTEXT` detection + `/tmp` fallback for Lambda
- ✅ `start-pipeline.ts` lock mechanism fixed (check-then-set, not onlyIfNew)
- ✅ Build succeeds and deploys (commit `9d1eae2` → `a04a9e6` live)
- ✅ `justfile` has `wiring-verify`, `no-fake-success-check`, `rc1-verify`, `master-status`

**The code is done. The platform config is the blocker.**

---

**Updated:** 2026-02-10 (Windsurf Master → Netlify Agent handoff)
**For:** SirTrav A2A Studio
