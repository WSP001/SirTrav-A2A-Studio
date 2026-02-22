# LinkedIn Setup - SirTrav / WSP2A

Single source of truth for LinkedIn wiring in SirTrav-A2A-Studio and WSP2A.

## 1) Naming (do not mix)

SirTrav (Netlify publisher):
- `LINKEDIN_CLIENT_ID`
- `LINKEDIN_CLIENT_SECRET`
- `LINKEDIN_ACCESS_TOKEN`
- `LINKEDIN_PERSON_URN`

WSP2A (Python backend):
- `WSP2A_OAUTH_CLIENT_ID`
- `WSP2A_OAUTH_CLIENT_SECRET`
- `WSP2A_OAUTH_ACCESS_TOKEN`
- `WSP2A_PRIVACY_POLICY_URL`
- `WSP2A_API_TOKEN`

Rule: one app uses one prefix set.

## 2) Redirect setup

LinkedIn Developer Portal -> Auth -> Authorized redirect URLs:
- WSP2A: `https://wsp2agent.netlify.app/auth/linkedin/callback`
- SirTrav: `https://sirtrav-a2a-studio.netlify.app/auth/linkedin/callback`

Keep localhost redirects only for local dev.

## 3) Fresh authorization code

Open:

```text
https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_ENCODED_REDIRECT&scope=openid%20profile%20w_member_social
```

After Allow, copy only the value after `code=` from callback URL.

## 4) Exchange code for access token (PowerShell)

```powershell
$clientId = "YOUR_CLIENT_ID"
$clientSecret = "YOUR_FULL_CLIENT_SECRET"
$redirect = "https://sirtrav-a2a-studio.netlify.app/auth/linkedin/callback"
$code = "PASTE_FRESH_CODE"

$body = @{
  grant_type    = "authorization_code"
  code          = $code
  redirect_uri  = $redirect
  client_id     = $clientId
  client_secret = $clientSecret
}

Invoke-RestMethod -Method Post `
  -Uri "https://www.linkedin.com/oauth/v2/accessToken" `
  -ContentType "application/x-www-form-urlencoded" `
  -Body $body
```

## 5) Build `LINKEDIN_PERSON_URN`

Preferred (requires `openid` scope):

```powershell
$token = "PASTE_ACCESS_TOKEN"
Invoke-RestMethod -Method Get -Uri "https://api.linkedin.com/v2/userinfo" -Headers @{ Authorization = "Bearer $token" }
```

If `sub` is returned, set `LINKEDIN_PERSON_URN=urn:li:person:<sub>`.

Fallback (if `/v2/userinfo` returns 401):

```powershell
Invoke-RestMethod -Method Get -Uri "https://api.linkedin.com/v2/me" -Headers @{ Authorization = "Bearer $token" }
```

If `id` is returned, set `LINKEDIN_PERSON_URN=urn:li:person:<id>`.

Or use the helper script (tries both automatically):

```bash
node scripts/linkedin-setup-helper.mjs test-token
```

## 6) Netlify env vars (sirtrav-a2a-studio)

Set in Site configuration -> Environment variables:

```text
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
LINKEDIN_ACCESS_TOKEN=...
LINKEDIN_PERSON_URN=urn:li:person:...
```

Save and redeploy.

## 7) Validate

```bash
just linkedin-dry
just linkedin-live
just council-flash-linkedin
```

Expected:
- Missing envs => disabled truth state.
- Valid envs/token => success with URL field.

## Quick setup (all-in-one)

```bash
node scripts/linkedin-setup-helper.mjs auth-url       # Step 1: get auth URL
node scripts/linkedin-setup-helper.mjs full-setup CODE # Step 2: exchange + fetch URN
just council-flash-linkedin                            # Step 3: prove it works
```
