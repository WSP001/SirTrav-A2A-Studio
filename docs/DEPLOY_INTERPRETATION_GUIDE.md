# Deploy Interpretation Guide
> How to read Netlify deploy logs correctly
> SirTrav A2A Studio
> Maintained by: Claude Code (backend agent)
> Version: 1.0.0 — 2026-03-10

---

## THE CORE DISTINCTION

> **Build success ≠ Runtime success.**
> **Deploy success ≠ App is working.**
> **0 files uploaded ≠ Deploy failed.**

Every team member must understand these three statements before interpreting deploy logs.

---

## DEPLOY LOG STATES

### State 1 — Full Code Deploy
```
Building...
✓ 1362 modules transformed
Deploying to production...
✓ 47 new file(s) to upload
✓ 8 new function(s) to upload
Deploy live in 12.3s
```
**What happened:** New code landed. Vite rebuilt the frontend. Functions were rebundled.
**Action:** Run post-deploy verification (healthcheck + sanity-test + control-plane-verify-cloud).

---

### State 2 — No-Op Deploy (most misunderstood)
```
Building...
✓ 1362 modules transformed
Deploying to production...
✓ 0 new file(s) to upload
✓ 0 new function(s) to upload
Deploy live in 2.1s
```
**What happened:** The build output is byte-for-byte identical to the previous deploy.
Netlify detected no file delta and uploaded nothing. This is **correct and expected**.

**When this happens:**
- Triggered a redeploy to pick up new environment variables (most common)
- Re-ran deploy on same commit with no code changes
- Build output is deterministic (same input → same output)

**What this does NOT mean:**
- ❌ Deploy failed
- ❌ Your changes didn't land
- ❌ Something is broken

**Action:** If you triggered this for env var pickup, verify with:
```bash
just control-plane-verify-cloud    # check new key appears in boolean checks
just healthcheck-cloud             # confirm app is responding
```

---

### State 3 — Env-Only Redeploy
```
Triggered by: Environment variable change
Building...
✓ Build complete
✓ 0 new file(s) to upload
✓ 0 new function(s) to upload
New deployment active: functions will use updated env
```
**What happened:** You changed an env var in the Netlify Dashboard and triggered a redeploy.
The build output didn't change (code didn't change), but functions now load the new env var.

**Key rule:** Netlify Functions read environment variables at **function invocation time**, not
at build time. So a new deployment IS required after env changes — even with 0 files uploaded.

**Verification:**
```bash
just validate-env                  # confirm local .env matches cloud
just control-plane-verify-cloud    # confirm new var is visible as boolean presence
```

---

### State 4 — Cache Hit (Fast Build)
```
Starting build...
Restoring cached node_modules (2185 packages)...
✓ Cache restored in 3.2s
Running npm install...
up to date, audited 2185 packages in 2.1s
Building...
✓ 1362 modules transformed in 3.1s
```
**What happened:** Netlify reused the cached `node_modules/` from the previous build.
No packages were re-downloaded. This is correct and efficient.

**vs. Cache Miss (First build or cache cleared):**
```
Starting build...
No cached node_modules found
Running npm install...
added 2185 packages in 45.2s
Building...
```
**When cache miss occurs:**
- First deploy on a new Netlify site
- `package-lock.json` changed (deps updated)
- Cache manually cleared
- Netlify cache expired

**Action on cache miss:** Normal — just slower. No intervention needed.

---

### State 5 — Build Failure
```
Building...
✗ Build failed
Error: Cannot find module './lib/ledger'
```
**What happened:** The build failed. The previous deployment is still live (Netlify does not
take down the live site on build failure — it keeps the last successful deploy).

**Action:**
1. Check the full build log for the specific error
2. Fix locally: `npm run build`
3. Push the fix
4. Verify the new deploy succeeds

**Do not:** Deploy a hotfix without running `npm run build` locally first.

---

### State 6 — Secret Scan Pass
```
Scanning repository for exposed secrets...
✓ No secrets found in build output
✓ No secrets found in repository files
```
**What happened:** Netlify's secret scanner checked tracked files and the build output.
No credential patterns were detected.

**This is NOT a guarantee** that secrets aren't exposed — it catches common patterns only.
Run `just security-audit` locally for a deeper check.

---

### State 7 — Secret Scan Fail (Rare)
```
Scanning repository for exposed secrets...
✗ Potential secret detected in: src/config.ts (line 14)
Build paused pending review
```
**What happened:** Netlify detected a string that matches a known secret pattern.

**Immediate actions:**
1. Stop. Do not push anything else.
2. Identify the file and line in the alert.
3. If it IS a secret: rotate the credential immediately. Remove from code. Use BFG Repo Cleaner.
4. If it is a false positive: add an inline comment or suppression annotation, then redeploy.

---

## BUILD SUCCESS vs RUNTIME SUCCESS

These are two separate things. A deploy can show "✓ Build success" while the app is broken.

| Build succeeds | Runtime succeeds | Meaning |
|---------------|-----------------|---------|
| ✅ | ✅ | Everything working |
| ✅ | ❌ | Code compiled but app fails at runtime (missing env, dependency issue, API down) |
| ❌ | N/A | Build broken — previous deploy still live, nothing changed for users |

**How to check runtime success:**
```bash
just healthcheck-cloud             # Is the app responding?
just control-plane-verify-cloud    # Is the control plane returning valid JSON?
just sanity-test                   # Full 33-check cloud suite
```

---

## ENV VAR GOTCHAS

### Gotcha 1 — Changed var, no redeploy
**Symptom:** Updated `GEMINI_API_KEY` in Netlify Dashboard but Director still uses OpenAI.
**Cause:** Functions read env at invocation. Old functions are still cached.
**Fix:** `just deploy` → triggers redeploy even if code didn't change.

### Gotcha 2 — Var set in wrong context
**Symptom:** Var shows in production but not in deploy-preview.
**Cause:** Netlify env vars can be scoped to specific deploy contexts (Production, Deploy Preview, Dev).
**Fix:** Check Netlify Dashboard → Site Configuration → Environment Variables → verify context scope.

### Gotcha 3 — Var name typo
**Symptom:** Feature disabled despite var being "set."
**Cause:** `GEMINI_API_KEY` vs `GEMINI_APIKEY` vs `GEMINI_KEY` — case-sensitive, exact match required.
**Fix:** `just validate-env` — shows all 28 expected keys with presence check.

---

## QUICK DIAGNOSIS FLOW

```
Deploy triggered
     │
     ├── Build failed?
     │   └── Check build log → fix locally → npm run build → push
     │
     ├── 0 files uploaded?
     │   ├── Expected for env-only redeploy → verify with control-plane-verify-cloud
     │   └── Unexpected → check if code actually changed
     │
     ├── Build succeeded?
     │   └── Run post-deploy gates:
     │       just healthcheck-cloud
     │       just control-plane-verify-cloud
     │       just sanity-test
     │
     └── Sanity test failed?
         ├── Was it passing before deploy? → Deploy caused regression → hotfix or rollback
         └── Was it already failing? → Pre-existing issue → not deploy-related
```

---

## REFERENCE: SirTrav Deploy Commands

```bash
# Trigger deploys
just deploy                    # production
just deploy-preview            # preview URL

# Post-deploy verification
just healthcheck-cloud
just control-plane-verify-cloud
just sanity-test               # cloud (33 assertions)

# Env audit
just validate-env              # 28-key audit, masked previews
just env-diff                  # local vs cloud parity

# Debug
just cockpit                   # full system state
just control-plane-gate        # verdict check (REAL / YELLOW / RED)
```
