# Social Media Integration QA Checklist

> **Last Updated:** 2026-01-27  
> **Author:** Antigravity Agent  
> **Purpose:** Comprehensive QA verification for social media publishing features

---

## 📋 Pre-Merge Verification

### Environment Variables (Netlify Dashboard)

#### X/Twitter
- [ ] `TWITTER_API_KEY` exists
- [ ] `TWITTER_API_SECRET` exists  
- [ ] `TWITTER_ACCESS_TOKEN` exists (or `X_ACCESS_TOKEN`)
- [ ] `TWITTER_ACCESS_TOKEN_SECRET` exists (or `X_ACCESS_TOKEN_SECRET`)
- [ ] Keys are from the SAME developer app (common 401 cause)

#### YouTube
- [ ] `YOUTUBE_CLIENT_ID` exists
- [ ] `YOUTUBE_CLIENT_SECRET` exists
- [ ] `YOUTUBE_REFRESH_TOKEN` exists

#### LinkedIn
- [ ] `LINKEDIN_CLIENT_ID` exists
- [ ] `LINKEDIN_CLIENT_SECRET` exists
- [ ] `LINKEDIN_ACCESS_TOKEN` exists
- [ ] `LINKEDIN_PERSON_URN` exists (format: `urn:li:person:xxxxx`)

#### Instagram
- [ ] `INSTAGRAM_APP_ID` exists
- [ ] `INSTAGRAM_APP_SECRET` exists
- [ ] `INSTAGRAM_ACCESS_TOKEN` exists
- [ ] `INSTAGRAM_BUSINESS_ACCOUNT_ID` exists

#### TikTok
- [ ] `TIKTOK_CLIENT_KEY` exists
- [ ] `TIKTOK_CLIENT_SECRET` exists
- [ ] `TIKTOK_ACCESS_TOKEN` exists

---

### Dry-Run Tests (Zero API Cost)

Run these locally with `netlify dev`:

```bash
# X/Twitter
node scripts/test-x-publish.mjs --dry-run

# LinkedIn
node scripts/test-linkedin-publish.mjs --dry-run

# Contract validation (all platforms)
node scripts/validate-social-contracts.mjs
```

**Expected Results:**
- [ ] All dry-run tests pass
- [ ] Contract validation shows "ALL CONTRACTS VALID"
- [ ] No TypeScript compilation errors

---

### UI Verification

- [ ] Social media toggles render without console errors
- [ ] Configured platforms show **toggle switch** (enabled)
- [ ] Unconfigured platforms show **"NOT SETUP"** badge
- [ ] Disabled platforms cannot be toggled
- [ ] Cost estimate updates dynamically when toggling
- [ ] "Publish" button disabled when no platforms selected

---

### No Fake Success Pattern

This is **critical** for production reliability.

| Scenario | Expected Response |
|----------|-------------------|
| Keys missing | `{ success: false, disabled: true, error: "..." }` |
| Auth failure (401) | `{ success: false, error: "401 Unauthorized" }` |
| Rate limit (429) | `{ success: false, error: "429 Rate Limited" }` |
| Actual success | `{ success: true, postId: "...", postUrl: "..." }` |

**Audit command:**
```bash
# Check for violations
grep -rn "success: true" netlify/functions/publish-*.ts
# Each match should be AFTER an actual API call result
```

---

### Cost Tracking

Each successful publish response MUST include:

```json
{
  "cost": {
    "apiCalls": 1,
    "estimatedCost": 0.001,
    "markup": 0.20,
    "total": 0.0012
  }
}
```

- [ ] Cost object present in all success responses
- [ ] 20% markup calculated correctly (`estimatedCost * 1.2 = total`)
- [ ] UI displays total cost (not base cost)

---

## 🚀 Post-Merge Smoke Test

Run these after deploying to production (uses real API credits):

```bash
# Only run after confirming keys are configured
node scripts/test-x-publish.mjs --live
node scripts/test-linkedin-publish.mjs --live
```

**Verification:**
- [ ] Live X post succeeds
- [ ] Live LinkedIn post succeeds
- [ ] Post URLs are valid and accessible
- [ ] Posts appear on actual social media accounts
- [ ] Invoice/cost logged correctly

---

## 🔧 Troubleshooting

### 401 Unauthorized (X/Twitter)
1. Verify Consumer Key matches Access Token's app
2. Check app permissions: must be "Read and Write"
3. Regenerate access token if keys were rotated

### 403 Forbidden
1. Check OAuth permissions/scopes
2. Verify user has posting rights on the account
3. Check for suspended/restricted accounts

### Connection Refused
1. Ensure `netlify dev` is running
2. Check port 8888 is available
3. Verify function compiles without errors

### Missing postUrl in Response
1. Check API response parsing logic
2. Verify platform-specific URL format
3. Check for null/undefined postId

---

## 📊 CI/CD Integration

The GitHub Actions workflow (`.github/workflows/social-media-tests.yml`) runs:

1. **Contract Validation** - Schema shape verification
2. **Dry-Run Tests** - Payload validation without API calls
3. **No Fake Success Audit** - Pattern violation detection

**Required Secrets (GitHub):**
- `TWITTER_API_KEY`
- `TWITTER_API_SECRET`
- `LINKEDIN_CLIENT_ID`
- `LINKEDIN_CLIENT_SECRET`

---

## ✅ Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| QA (Antigravity) | | | ☐ |
| Dev (Claude Code) | | | ☐ |
| UI (Codex) | | | ☐ |
| Owner (Scott) | | | ☐ |

---

*For the Commons Good 🧪*
