# Netlify Agent — Deployment & Environment Operations

**Owner:** Netlify Agent (via Netlify Dashboard or CLI)
**Scope:** Deploy, verify cloud health, audit environment variables
**Created:** 2026-03-04
**Status:** ACTIVE — can run after any commit to main

---

## Role

The Netlify Agent handles deployment and cloud verification. It does NOT write application code. Its job is to:

1. Deploy commits to production (or preview)
2. Verify cloud endpoints respond correctly after deploy
3. Audit environment variable presence (never expose values)
4. Report deploy status to the Master

---

## Quick Start

```bash
git pull origin main
just orient-netlify        # Shows full orientation
```

---

## Deploy Workflow

### Pre-Deploy Gates (must all pass)

```bash
npm run build              # 0 errors required
just sanity-test-local     # 33+ pass, 0 fail
just control-plane-gate    # verdict check
```

### Deploy

```bash
# Preview first (safe — generates a preview URL)
just deploy-preview

# Production (after preview looks good)
just deploy
```

### Post-Deploy Verification

```bash
just healthcheck-cloud               # Returns healthy/degraded/unhealthy
just control-plane-verify-cloud      # 33/33 assertions
just sanity-test                     # Cloud endpoint sanity (33+ checks)
```

---

## Environment Variable Audit

The Netlify Agent can check which keys are present without seeing their values:

```bash
just validate-env          # Shows all 28 keys, required vs optional
just env-diff              # LOCAL vs CLOUD comparison
```

### M9 Critical Keys (Human-Ops sets these)

| Key | Purpose | Status |
|-----|---------|--------|
| `REMOTION_SERVE_URL` | Lambda bundle URL | Check via `/control-plane` → `remotion.serveUrl` |
| `REMOTION_FUNCTION_NAME` | Lambda function name | Check via `/control-plane` → `remotion.functionName` |
| `AWS_ACCESS_KEY_ID` | AWS credentials | Check via `/control-plane` → `remotion.awsKeys` |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials | Check via `/control-plane` → `remotion.awsKeys` |
| `REMOTION_REGION` | AWS region (optional) | Check via `/control-plane` → `remotion.region` |

### After Human-Ops Sets M9 Keys

```bash
just deploy                          # Push new env to production
just healthcheck-cloud               # Should still be healthy
just control-plane-verify-cloud      # remotion.mode should be "real"
just m9-e2e                          # Should show REAL mode, not FALLBACK
```

---

## What the Netlify Agent Should Report

After each deploy, report to Master:

```
Deploy Report:
  Commit: <sha>
  Preview URL: <url> (if preview) OR Production: sirtrav-a2a-studio.netlify.app
  Healthcheck: healthy | degraded | unhealthy
  Control Plane: <verdict> (<reasons>)
  Remotion: <mode> (real | fallback | disabled)
  Build: <module count> modules, <error count> errors
```

---

## What NOT to Do

- ⛔ Do NOT modify application code (*.ts, *.tsx, *.jsx, *.mjs)
- ⛔ Do NOT set environment variables directly — that's Human-Ops
- ⛔ Do NOT deploy without running pre-deploy gates
- ⛔ Do NOT expose environment variable values in reports

---

## Netlify-Specific Commands

```bash
# Site info
netlify status

# List recent deploys
netlify deploys --json | head -20

# Open Netlify Dashboard
netlify open

# Check build settings
netlify env:list          # Shows keys (not values) from Dashboard
```

---

## Useful justfile Recipes

| Recipe | Purpose |
|--------|---------|
| `just orient-netlify` | Full orientation (run first) |
| `just deploy-preview` | Deploy preview |
| `just deploy` | Deploy production |
| `just healthcheck-cloud` | Cloud healthcheck |
| `just control-plane-verify-cloud` | Control plane assertions |
| `just sanity-test` | Cloud sanity test |
| `just validate-env` | Env key audit |
| `just env-diff` | Local vs cloud env comparison |
| `just ops-spine-cloud` | Full cloud verification sequence |

---

*Deploy honestly. Report honestly. For the Commons Good.* 🎬
