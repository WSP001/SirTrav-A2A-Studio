# ENV-REMOTION.md — Remotion Lambda Environment Variables

**Owner:** Human-Ops (Scott / WSP001)  
**Last Updated:** 2026-03-04  
**Milestone:** M9 (E2E Video Production)  
**Status:** 🔴 BLOCKED — keys not yet set

---

## Required Variables

Set these in the **Netlify Dashboard** (Site settings → Environment variables).  
**NEVER** commit these to code, `.env`, or any tracked file.

| Variable | Example | Where to Get |
|----------|---------|--------------|
| `REMOTION_SERVE_URL` | `https://remotionlambda-useast1-abc.s3.amazonaws.com/sites/my-site/index.html` | After deploying Remotion bundle to S3 via `npx remotion lambda sites create` |
| `REMOTION_FUNCTION_NAME` | `remotion-render-4-0-429` | After deploying Lambda function via `npx remotion lambda functions deploy` |
| `REMOTION_REGION` | `us-east-1` | Your AWS region (default: `us-east-1`) |
| `AWS_ACCESS_KEY_ID` | `AKIA...` | AWS IAM user with Remotion Lambda permissions |
| `AWS_SECRET_ACCESS_KEY` | `wJal...` | Same IAM user |

## Setup Steps (HUMAN-ONLY)

### 1. AWS IAM Setup

Create an IAM user with the Remotion Lambda policy.  
See: https://www.remotion.dev/docs/lambda/permissions

Minimum permissions:
- `lambda:InvokeFunction`
- `s3:GetObject`, `s3:PutObject` on the Remotion bucket
- `logs:CreateLogGroup`, `logs:PutLogEvents`

### 2. Deploy Remotion Lambda

From your local machine (not CI):

```bash
# Install the CLI (if not already)
npm install -g @remotion/lambda

# Deploy the Lambda function
npx remotion lambda functions deploy --memory=2048 --timeout=120

# Deploy the site bundle
npx remotion lambda sites create src/remotion/index.ts --site-name=sirtrav
```

Copy the output values:
- **Function name** → `REMOTION_FUNCTION_NAME`
- **Serve URL** → `REMOTION_SERVE_URL`

### 3. Set in Netlify Dashboard

1. Go to: Netlify Dashboard → SirTrav A2A Studio → Site configuration → Environment variables
2. Add each variable from the table above
3. **Do NOT** set `NODE_ENV` or any build-time vars here — only runtime secrets

### 4. Verify

After setting keys, run:

```bash
node scripts/m9-readiness-check.mjs --cloud
just m9-e2e
```

The readiness checker will show ✅ for all env vars.  
The E2E test will attempt a real Remotion Lambda render.

---

## Rotation

- **When:** Rotate AWS keys every 90 days or after any exposure
- **How:** Create new IAM access key → update Netlify env → delete old key
- **Verify:** `just m9-e2e` still passes after rotation

---

## Also Needed for M9

| Variable | Purpose | Priority |
|----------|---------|----------|
| `ELEVENLABS_API_KEY` | Voice Agent (real narration) | 🔴 HIGH (HO-006) |
| `SUNO_API_KEY` | Composer Agent (real music) | 🟡 MEDIUM |

---

*This file is HUMAN-ONLY documentation. No agent should modify env vars directly.*

**For the Commons Good** 🎬
