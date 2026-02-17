---
description: Fix X/Twitter API 401 authentication error by aligning keys from same developer app
---

# Fix X/Twitter API Authentication

## Prerequisites
- Access to X Developer Portal: https://developer.twitter.com/en/portal/dashboard
- Netlify CLI installed and authenticated
- `netlify dev` server NOT running during env changes

## Steps

### 1. Verify Current State
// turbo
```bash
netlify env:list | grep -E "(TWITTER|X_)"
```
**Expected:** See `TWITTER_API_KEY`, `TWITTER_API_SECRET`, `TWITTER_ACCESS_TOKEN`, `TWITTER_ACCESS_SECRET`

### 2. Go to X Developer Portal
1. Navigate to: https://developer.twitter.com/en/portal/dashboard
2. Click on your App (or create one)
3. Go to **"Keys and Tokens"** tab

### 3. Regenerate and Copy ALL 4 Keys (SAME SCREEN!)
From the **Consumer Keys** section:
- Copy **API Key** → This becomes `TWITTER_API_KEY`
- Copy **API Secret** → This becomes `TWITTER_API_SECRET`

From the **Authentication Tokens** section:
- Click "Generate" if needed
- Copy **Access Token** → This becomes `TWITTER_ACCESS_TOKEN`
- Copy **Access Token Secret** → This becomes `TWITTER_ACCESS_SECRET`

**CRITICAL:** All 4 keys MUST come from the same app on the same screen!

### 4. Update Netlify Environment Variables
```bash
netlify env:set TWITTER_API_KEY "paste_your_api_key_here"
netlify env:set TWITTER_API_SECRET "paste_your_api_secret_here"
netlify env:set TWITTER_ACCESS_TOKEN "paste_your_access_token_here"
netlify env:set TWITTER_ACCESS_SECRET "paste_your_access_secret_here"
```

### 5. Clean Up Old Variables (if any duplicates exist)
```bash
netlify env:unset X_CONSUMER_KEY
netlify env:unset X_CONSUMER_SECRET
netlify env:unset X_ACCESS_TOKEN
netlify env:unset X_ACCESS_TOKEN_SECRET
```

### 6. Restart Dev Server
// turbo
```bash
netlify dev
```

### 7. Test X Publishing (in new terminal)
// turbo
```bash
node scripts/test-x-publish.mjs --verify-only
```

### 8. Live Post Test (once verify passes)
```bash
node scripts/test-x-publish.mjs --live
```

## Expected Success Output
```
✅ PASS: Successfully posted via OAuth 1.0a!
- Job Cost: $0.0012
```

## Troubleshooting

### Still getting 401?
- **Check App Permissions:** Your X App must have "Read and Write" enabled
- **Check App Type:** Must be OAuth 1.0a (not OAuth 2.0 only)
- **Regenerate Tokens:** Sometimes tokens expire or become invalid

### Keys look correct but still failing?
- Try regenerating the Access Token (not just viewing)
- Check if your X account has any restrictions

## Related Files
- `netlify/functions/publish-x.ts` - Backend implementation
- `scripts/test-x-publish.mjs` - Test script
- `docs/reports/2026-01-25_PRIORITY_TASKS.md` - Full priority list
