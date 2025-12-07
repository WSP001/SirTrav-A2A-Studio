# NETLIFY AGENT PROMPT - Manual Deployment Tasks

**For:** Netlify Agent / Human Operator
**Purpose:** Complete the RED → GREEN tasks that require Netlify dashboard access

---

## 🔴 MANUAL TASKS CHECKLIST

These tasks cannot be automated and require human action in the Netlify dashboard or browser OAuth flows.

---

### 1. ⚙️ SET ENVIRONMENT VARIABLES IN NETLIFY

Go to: **Netlify Dashboard → Site Settings → Environment Variables**

Add these variables:

#### Core AI Services (REQUIRED for real video production)

```
OPENAI_API_KEY=sk-...your-openai-key...
ELEVENLABS_API_KEY=...your-elevenlabs-key...
SUNO_API_KEY=...your-suno-key...
SUNO_API_URL=https://api.suno.ai/v1
```

#### Video Processing (OPTIONAL - uses placeholder without)

```
FFMPEG_SERVICE_URL=...your-ffmpeg-service-url...
FFMPEG_API_KEY=...your-ffmpeg-api-key...
```

#### YouTube Publishing (OPTIONAL)

```
YOUTUBE_CLIENT_ID=...from-google-cloud-console...
YOUTUBE_CLIENT_SECRET=...from-google-cloud-console...
YOUTUBE_REFRESH_TOKEN=...from-oauth-flow...
```

#### TikTok Publishing (OPTIONAL)

```
TIKTOK_CLIENT_KEY=...from-tiktok-developer-portal...
TIKTOK_CLIENT_SECRET=...from-tiktok-developer-portal...
TIKTOK_ACCESS_TOKEN=...from-oauth-flow...
TIKTOK_REFRESH_TOKEN=...from-oauth-flow...
```

#### Instagram Publishing (OPTIONAL)

```
INSTAGRAM_ACCESS_TOKEN=...from-facebook-developer-portal...
INSTAGRAM_BUSINESS_ID=...your-instagram-business-account-id...
```

#### Utilities (OPTIONAL)

```
BITLY_ACCESS_TOKEN=...for-short-urls...
SHARE_SECRET=...random-string-for-private-links...
MCP_SECRET_TOKEN=...random-string-for-mcp-gateway...
```

---

### 2. 🔐 COMPLETE OAUTH FLOWS

These require browser-based authentication:

#### YouTube OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials for "Desktop App"
3. Enable YouTube Data API v3
4. Run OAuth flow to get refresh token:
   ```bash
   # Use Google's OAuth Playground or a local script
   # Scopes needed: https://www.googleapis.com/auth/youtube.upload
   ```
5. Save the `refresh_token` to Netlify env vars

#### TikTok OAuth

1. Go to [TikTok Developer Portal](https://developers.tiktok.com/)
2. Create an app with "Content Posting API" permission
3. Complete OAuth flow to get access token
4. Save tokens to Netlify env vars

#### Instagram OAuth

1. Go to [Facebook Developer Portal](https://developers.facebook.com/)
2. Create an app with Instagram Graph API permissions
3. Connect your Instagram Business Account
4. Generate long-lived access token
5. Save token and business ID to Netlify env vars

---

### 3. 🚀 TRIGGER DEPLOYMENT

After setting environment variables:

1. Go to **Netlify Dashboard → Deploys**
2. Click **"Trigger deploy"** → **"Deploy site"**
3. Wait for build to complete

---

### 4. ✅ VERIFY DEPLOYMENT

Run these curl commands to verify functions are working:

```bash
# Set your Netlify URL
URL="https://sirtrav-a2a-studio.netlify.app"

# 1. Healthcheck
curl "$URL/.netlify/functions/healthcheck"

# 2. Test progress endpoint
curl -X POST "$URL/.netlify/functions/progress" \
  -H "Content-Type: application/json" \
  -d '{"projectId":"test","agent":"director","status":"started","message":"Test"}'

# 3. Get progress (JSON)
curl "$URL/.netlify/functions/progress?projectId=test"

# 4. Get progress (SSE)
curl -N -H "Accept: text/event-stream" "$URL/.netlify/functions/progress?projectId=test"

# 5. Test evals endpoint
curl "$URL/.netlify/functions/evals"

# 6. Test MCP gateway
curl "$URL/.netlify/functions/mcp"
```

---

### 5. 📊 MARK TASKS COMPLETE

After verification, update MASTER.md:

```markdown
## Manual Deployment Checklist
- [x] Environment variables set in Netlify
- [x] YouTube OAuth completed (or skipped)
- [x] TikTok OAuth completed (or skipped)
- [x] Instagram OAuth completed (or skipped)
- [x] Deployment triggered
- [x] Healthcheck passing
- [x] Progress SSE working
- [x] Evals endpoint working
```

---

## 🎯 PRIORITY ORDER

1. **MUST DO:** Set `OPENAI_API_KEY` (required for Director/Writer)
2. **SHOULD DO:** Set `ELEVENLABS_API_KEY` (for real voice synthesis)
3. **SHOULD DO:** Set `SUNO_API_KEY` (for real music generation)
4. **NICE TO HAVE:** Social publishing OAuth (YouTube, TikTok, Instagram)

Without API keys, the pipeline runs in **placeholder mode** - it works but uses mock data.

---

## 🆘 TROUBLESHOOTING

### Build fails
- Check Netlify build logs for errors
- Ensure all dependencies are in `package.json`
- Run `npm ci && npm run build` locally first

### Functions return 500
- Check function logs in Netlify dashboard
- Verify environment variables are set correctly
- Check for typos in API keys

### OAuth tokens expired
- Re-run OAuth flow to get new tokens
- Update tokens in Netlify env vars
- Trigger new deployment

---

**Created:** 2025-12-07
**For:** SirTrav A2A Studio v2.0.0
