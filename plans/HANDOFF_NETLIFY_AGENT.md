# Netlify Agent Deploy & Verify — Gemini Pivot Edition

**Lane:** Master / Netlify Agent lane only

Deploy current main to production via Netlify CLI, verify all working endpoints including the X/LinkedIn "Twisted Pair," skip Remotion (per Gemini Pivot Rule), and produce a structured deploy report.

## Objective
Create a step-by-step Netlify CLI runbook that Scott runs from c:\WSP001\SirTrav-A2A-Studio to:

- Build and deploy current main to production
- Verify all currently-working cloud endpoints
- Test both social publishers (X + LinkedIn "Twisted Pair") via dry-run
- Skip Remotion/AWS verification (deprecated per Gemini Pivot)
- Produce a structured deploy report for the team

## Acceptance Criteria
- Fresh production deploy succeeds from current main
- Healthcheck endpoint returns status: ok or degraded (not offline)
- X/Twitter dry-run returns `{ success: false, dryRun: true, validated: true }` (No Fake Success)
- LinkedIn dry-run returns `{ success: false, dryRun: true, validated: true }` (Twisted Pair)
- Control-plane endpoint responds with valid JSON
- remotion.mode showing "disabled" or "fallback" is EXPECTED — not an error
- Frontend loads at sirtrav-a2a-studio.netlify.app (HTTP 200)
- Deploy report saved to `plans/NETLIFY_DEPLOY_REPORT_<DATE>.md`
- No Remotion-related steps attempted (Gemini Pivot active)

## Scope
**In scope:**
- netlify.toml build settings verification
- netlify deploy --prod from CLI
- Cloud endpoint testing (healthcheck, control-plane, publish-x dry-run, publish-linkedin dry-run, progress)
- Deploy report generation

**Out of scope:**
- Setting new env vars (no Remotion keys)
- Modifying any code files
- Running local dev server or tests
- Anything related to Remotion Lambda

## Constraints
- Must run from canonical path c:\WSP001\SirTrav-A2A-Studio
- Must be on main branch, clean working tree
- Netlify CLI must be installed (npm i -g netlify-cli if not)
- Site must be linked (netlify link or .netlify/state.json present)
- All commands are read-only or deploy-only — no code edits
- Dry-run expected output is success: false — that IS correct (No Fake Success pattern)

## Implementation
The plan creates two files:

| File | Action | Description |
|------|--------|-------------|
| `plans/NETLIFY_DEPLOY_REPORT_<DATE>.md` | CREATE | Deploy report template to fill in after running steps |
| (plan file — this document) | EXISTS | Reference runbook |

## Step-by-step Runbook

### Step 0 — Prerequisites

```powershell
# Run from canonical path
git -C c:\WSP001\SirTrav-A2A-Studio pull origin main
git -C c:\WSP001\SirTrav-A2A-Studio status    # Must show "working tree clean" or only untracked
netlify status                                  # Must show linked to sirtrav-a2a-studio
```

### Step 1 — Pre-deploy build gate

```powershell
npm run build
# Expected: "built in ~2s", 0 errors, dist/ populated
```

### Step 2 — Deploy to production

> **Note:** API deploys (`netlify deploy --prod`) are disabled for this site (returns 403).
> Use git-based deploy trigger instead:

```powershell
# Option A: Push to main triggers auto-deploy (if CI is wired)
git push origin main

# Option B: Trigger build via Netlify API (works from any terminal)
node -e "const{execSync}=require('child_process');execSync('netlify api createSiteBuild --data '+JSON.stringify(JSON.stringify({site_id:'53ebb517-cfb7-468c-b253-4e7a30f3a85a'})),{stdio:'inherit'})"
# Expected: JSON with deploy_id and deploy_state: "new"
```

### Step 3 — Verify frontend loads

```powershell
curl -s -o NUL -w "%{http_code}" https://sirtrav-a2a-studio.netlify.app/
# Expected: 200
```

### Step 4 — Verify healthcheck

```powershell
curl -s https://sirtrav-a2a-studio.netlify.app/.netlify/functions/healthcheck
# Expected: { "status": "ok" or "degraded", "services": [...] }
```

### Step 5 — Verify control-plane

```powershell
curl -s https://sirtrav-a2a-studio.netlify.app/.netlify/functions/control-plane
# Expected: JSON with verdict, pipeline, services, remotion objects
# remotion.mode = "disabled" or "fallback" is EXPECTED (Gemini Pivot — not an error)
```

### Step 6a — X/Twitter dry-run (Twisted Pair — publisher 1)

```powershell
curl -s -X POST https://sirtrav-a2a-studio.netlify.app/.netlify/functions/publish-x -H "Content-Type: application/json" -d "{\"text\":\"Netlify Agent deploy verify <DATE>\",\"dryRun\":true}"
# Expected (No Fake Success): { success: false, dryRun: true, validated: true, configured: true }
# If configured: false — X keys are missing or expired
```

### Step 6b — LinkedIn dry-run (Twisted Pair — publisher 2)

```powershell
curl -s -X POST https://sirtrav-a2a-studio.netlify.app/.netlify/functions/publish-linkedin -H "Content-Type: application/json" -d "{\"projectId\":\"deploy-verify\",\"videoUrl\":\"https://example.com/test.mp4\",\"title\":\"Deploy Verify\",\"description\":\"Netlify Agent deploy verify <DATE>\",\"visibility\":\"PUBLIC\",\"dryRun\":true}"
# Expected (No Fake Success): { success: false, dryRun: true, validated: true }
# configured: true means keys are live; configured: false means keys missing (expected if not set)
```

### Step 7 — Verify SSE/progress endpoint

```powershell
curl -s "https://sirtrav-a2a-studio.netlify.app/.netlify/functions/progress?projectId=deploy-verify"
# Expected: 200 with JSON.
# An empty events array is OK here as long as the endpoint responds 200 and returns valid JSON.
```

### Step 8 — Check env var presence (keys only, not values)

```powershell
netlify env:list
# Report which of these are SET vs MISSING:
# OPENAI_API_KEY, ELEVENLABS_API_KEY, GEMINI_API_KEY,
# TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET,
# LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, LINKEDIN_ACCESS_TOKEN, LINKEDIN_PERSON_URN
# (Skip REMOTION_* and AWS_* — Gemini Pivot active)
```

### Step 9 — Fill in deploy report 
Create `plans/NETLIFY_DEPLOY_REPORT_<DATE>.md` with results from Steps 3-8.

### Key: Reading Dry-Run Results
Per the No Fake Success pattern verified in both publish-x.ts and publish-linkedin.ts:

| Response Field | Meaning |
|----------------|---------|
| `success: false, dryRun: true, validated: true, configured: true` | Keys present, payload valid, live post withheld — GOOD |
| `success: false, dryRun: true, validated: true, configured: false` | Keys missing, payload valid — publisher disabled as expected |
| `success: false, disabled: true` | Not a dry-run; keys missing, publisher honestly refused — No Fake Success working |
| `success: true, tweetId: "..."` | Live post executed (should NOT happen in dry-run mode) |
