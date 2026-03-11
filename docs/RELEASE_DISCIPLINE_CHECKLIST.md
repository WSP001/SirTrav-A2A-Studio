# Release Discipline Checklist
> SirTrav A2A Studio — Proof-First Deploy Protocol
> Maintained by: Claude Code (backend agent)
> Version: 1.0.0 — 2026-03-10

---

## CORE RULE: Proof Before Live

> **Never deploy what you can't verify. Never post what you didn't dry-run.**

This applies to code deploys AND social publish commands.

---

## PRE-DEPLOY GATES (Run in order — all must pass)

### Gate 1 — Build
```bash
npm run build
```
**Pass condition:** Exit 0. `dist/` output created. Module count stable.
**Fail action:** Fix build errors. Do not proceed until green.

---

### Gate 2 — Repo Hygiene
```bash
just repo-hygiene
```
**Checks:** Blocks staging of `dist/`, `.env`, `agent-state.json`.
**Pass condition:** No blocked files in staging area.
**Fail action:** Unstage the blocked files. Never commit secrets or build output.

---

### Gate 3 — Sanity Test (local)
```bash
just sanity-test-local
```
**Requires:** `netlify dev` running on localhost:8888.
**Pass condition:** 33/0 checks pass.
**Fail action:** Identify failing check. Fix the underlying issue. Do not skip.

> **If netlify dev is not running:** Use `just healthcheck-cloud` instead and
> accept that sanity-test-local is deferred to post-deploy verification.

---

### Gate 4 — Control Plane Gate
```bash
just control-plane-gate
```
**Checks:** `truth.verdict=REAL` from `/control-plane` endpoint.
**Pass condition:** REAL (strict on `main`, `release/*`, `hotfix/*` branches).
**Fail action:** Investigate degraded services. Check `just validate-env` for missing keys.

> **On feature branches:** Gate warns but does not hard-fail. Still fix before merging to main.

---

### Gate 5 — Secret Scan
```bash
just security-audit
```
**Checks:** Git history for secret patterns. Verifies `.env` is not staged.
**Pass condition:** No secrets found in tracked files.
**Fail action:** Run `git filter-branch` or BFG to remove secrets from history.
Rotate any exposed keys immediately.

---

## DEPLOY

### Production Deploy
```bash
just deploy
```
Runs: `netlify deploy --prod`

> **Only run this after all 5 gates pass.**

### Preview Deploy (for testing before prod)
```bash
just deploy-preview
```
Runs: `netlify deploy` (no `--prod` flag)
Use this to get a preview URL for human review before promoting to production.

---

## POST-DEPLOY VERIFICATION (Run after every deploy)

### Step 1 — Health Check
```bash
just healthcheck-cloud
```
**Checks:** Cloud deployment is reachable and responding.
**Pass condition:** HTTP 200 from healthcheck endpoint.

---

### Step 2 — Control Plane Cloud Verify
```bash
just control-plane-verify-cloud
```
**Checks:** Cloud control-plane returns valid JSON with `verdict.combined`.
**Pass condition:** Response is parseable JSON with no 500 errors.

---

### Step 3 — Sanity Test (cloud)
```bash
just sanity-test
```
**Checks:** Full 33-assertion suite against the cloud deployment.
**Pass condition:** 33/0 pass.
**Fail action:** If post-deploy sanity fails and pre-deploy sanity passed,
the deploy introduced a regression. Roll back or hotfix immediately.

---

## SOCIAL PUBLISH RULES

### Dry-Run First (always)
```bash
just linkedin-dry          # LinkedIn dry-run (auto-detects local/cloud)
just x-dry                 # X/Twitter dry-run
just youtube-dry           # YouTube dry-run
```
**Pass condition:** `success=false, disabled=false, validated=true, dryRun=true`
(NoFakeSuccess: `success=false` in dry-run IS correct)

### Live Post (Human-Ops approval required)
```bash
just linkedin-live         # LinkedIn live post
just x-live                # X/Twitter live post
```
**Requires:** Explicit Scott approval. Never run without confirmed payload + target account.
**Authorization phrase for LinkedIn:** `APPROVED FOR LIVE LINKEDIN POST`

---

## ENV-CHANGE REQUIRES REDEPLOY RULE

> Changing an environment variable in the Netlify Dashboard does NOT automatically
> take effect in running functions.

**Rule:** After any env var change in Netlify Dashboard:
1. Trigger a new deploy: `just deploy`
2. Run post-deploy verification: `just healthcheck-cloud` + `just control-plane-verify-cloud`
3. Confirm the new key is visible in control-plane response (boolean presence check only)

**Applies to:** All 28 keys tracked in `just validate-env`

---

## NO-OP DEPLOY AWARENESS

Sometimes `just deploy` uploads 0 new files. This is NOT a failure.

| Reason | What Happened | Action |
|--------|--------------|--------|
| Code unchanged, env changed | Netlify pickled new env; CDN cache unchanged | ✅ Expected — verify env active |
| Same build output | No file delta detected | ✅ Normal — no action needed |
| Cache hit on functions | Functions already up to date | ✅ Normal |

> **Do not re-deploy just because the log says "0 new files."**
> Re-deploy is only needed if: code changed, env changed, or runtime behavior changed.

---

## CACHE DISCIPLINE

- `package-lock.json` is committed and tracked — always.
- Never run `npm install <package>` without updating `package-lock.json`.
- Never use `npm install --no-package-lock` or equivalent.
- Keep devDependencies lean. Every new package is a new attack surface.
- Netlify's build cache uses `node_modules/` — clean cache only when debugging, not routinely.

---

## QUICK REFERENCE

```bash
# Pre-deploy (all 5 required)
npm run build
just repo-hygiene
just sanity-test-local
just control-plane-gate
just security-audit

# Deploy
just deploy                    # production
just deploy-preview            # preview URL for review

# Post-deploy verify (all 3 required)
just healthcheck-cloud
just control-plane-verify-cloud
just sanity-test               # cloud suite

# Social (dry-run → human approval → live)
just linkedin-dry
just x-dry
just linkedin-live             # Human-Ops approval required
just x-live                    # Human-Ops approval required
```

---

## RELEASE AUTHORITY

| Action | Who Can Approve |
|--------|----------------|
| `npm run build` + gates | Any agent (Claude Code, Antigravity) |
| `just deploy` (production) | Claude Code (after all gates pass) |
| `just linkedin-live` | Scott (Human Conductor) only |
| `just x-live` | Scott (Human Conductor) only |
| Rotating credentials | Scott (Human Conductor) only |
| Adding new Netlify env vars | Scott (Human Conductor) only |
