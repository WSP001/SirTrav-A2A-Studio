# 0002 -- Setup LinkedIn Developer Portal Keys

## Priority: P0 (BLOCKING)
## Status: READY
## Assigned To: Scott (Manual) + Claude Code (Verify)

## Goal
Create LinkedIn Developer App and configure all 4 required environment variables.

## Steps (Scott)
1. Go to https://www.linkedin.com/developers/apps
2. Create app: "SirTrav-A2A-Studio"
3. Request "Share on LinkedIn" product (for `w_member_social` scope)
4. Request "Sign In with LinkedIn using OpenID Connect"
5. Under Auth tab, copy:
   - Client ID -> `LINKEDIN_CLIENT_ID`
   - Client Secret -> `LINKEDIN_CLIENT_SECRET`
6. Generate access token with scopes: `openid profile w_member_social`
   - Copy -> `LINKEDIN_ACCESS_TOKEN`
7. Call `GET https://api.linkedin.com/v2/userinfo` with token to get member ID
   - Format as `urn:li:person:YOUR_MEMBER_ID` -> `LINKEDIN_PERSON_URN`
8. Set in Netlify:
   ```bash
   netlify env:set LINKEDIN_CLIENT_ID "your_id"
   netlify env:set LINKEDIN_CLIENT_SECRET "your_secret"
   netlify env:set LINKEDIN_ACCESS_TOKEN "your_token"
   netlify env:set LINKEDIN_PERSON_URN "urn:li:person:YOUR_ID"
   ```

## Verification (Claude Code)
```bash
node scripts/test-linkedin-publish.mjs
# Expected: All 4 vars show "configured"
node scripts/test-linkedin-publish.mjs --dry-run
# Expected: "DRY-RUN PASS: Payload valid"
```

## Acceptance Criteria
- [ ] All 4 LinkedIn env vars set in Netlify
- [ ] Healthcheck shows LinkedIn as "configured"
- [ ] `--dry-run` test passes

## Dependencies
None
