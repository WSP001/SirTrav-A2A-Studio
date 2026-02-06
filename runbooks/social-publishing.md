# runbooks/social-publishing.md

## Overview
How to configure, test, and deploy social media publishing for all 5 platforms.

## Prerequisites
- Netlify CLI authenticated (`netlify login`)
- `netlify dev` running on port 8888
- Developer accounts on target platforms

## Platform Setup

### X/Twitter
```bash
# 1. Get keys from: https://developer.x.com/en/portal/dashboard
# 2. App must have "Read and Write" permissions
# 3. All 4 keys from SAME app

netlify env:set TWITTER_API_KEY "..."
netlify env:set TWITTER_API_SECRET "..."
netlify env:set TWITTER_ACCESS_TOKEN "..."
netlify env:set TWITTER_ACCESS_SECRET "..."

# Verify
node scripts/test-x-publish.mjs --dry-run
```

### LinkedIn
```bash
# 1. Create app: https://www.linkedin.com/developers/apps
# 2. Request "Share on LinkedIn" product
# 3. Generate token with scope: openid profile w_member_social

netlify env:set LINKEDIN_CLIENT_ID "..."
netlify env:set LINKEDIN_CLIENT_SECRET "..."
netlify env:set LINKEDIN_ACCESS_TOKEN "..."
netlify env:set LINKEDIN_PERSON_URN "urn:li:person:YOUR_ID"

# Verify
node scripts/test-linkedin-publish.mjs --dry-run
```

### YouTube
```bash
# 1. Google Cloud Console > YouTube Data API v3
# 2. Create OAuth2 credentials
netlify env:set YOUTUBE_CLIENT_ID "..."
netlify env:set YOUTUBE_CLIENT_SECRET "..."
netlify env:set YOUTUBE_REFRESH_TOKEN "..."
```

### Instagram
```bash
# 1. Meta Business Suite > Instagram Graph API
netlify env:set INSTAGRAM_ACCESS_TOKEN "..."
netlify env:set INSTAGRAM_BUSINESS_ID "..."
```

### TikTok
```bash
# 1. TikTok for Developers > Content Posting API
netlify env:set TIKTOK_CLIENT_KEY "..."
netlify env:set TIKTOK_CLIENT_SECRET "..."
netlify env:set TIKTOK_ACCESS_TOKEN "..."
```

## Testing Commands
```bash
just healthcheck              # Check all platform status
just x-dry                    # X/Twitter dry-run
just linkedin-dry             # LinkedIn dry-run
just validate-contracts       # Validate all social contracts
just golden-path-full         # Full integration test
```

## Troubleshooting

### 401 Authentication Error (X/Twitter)
Keys are from different X Developer Apps. Regenerate all 4 from the same app.

### LinkedIn "disabled" status
Missing `LINKEDIN_ACCESS_TOKEN`. Create app and generate token.

### Healthcheck shows "degraded"
Some platforms configured, others not. Check `just healthcheck` output for which are missing.

## No Fake Success Rule
All publishers return `{ success: false, disabled: true }` when keys are missing.
Never `{ success: true }` without actual API confirmation.

## Related
- `netlify/functions/publish-x.ts`
- `netlify/functions/publish-linkedin.ts`
- `netlify/functions/healthcheck.ts`
- `.env.example` (key templates)
