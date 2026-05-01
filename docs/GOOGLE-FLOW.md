# Gemini + YouTube Credential Flow

Purpose: keep Gemini rendering and YouTube publishing in one understandable Google setup without leaking secrets into the browser.

## One Project Rule

Use the same Google Cloud project for:

- `GEMINI_API_KEY`
- `YOUTUBE_CLIENT_ID`
- `YOUTUBE_CLIENT_SECRET`
- `YOUTUBE_REFRESH_TOKEN`

Gemini uses an API key for server-side model calls. YouTube uses OAuth user consent because uploads happen as the channel owner. They are different trust models, but keeping them in one Google Cloud project prevents drift between enabled APIs, quotas, and diagnostics.

## Server-Only Rules

- Put `GEMINI_API_KEY` in Netlify environment variables.
- Do not expose Google keys with `VITE_*` names.
- Put YouTube OAuth values in Netlify environment variables.
- Never commit refresh tokens.

## YouTube Scopes

The upload flow needs:

- `https://www.googleapis.com/auth/youtube.upload`
- `https://www.googleapis.com/auth/youtube`

## First-Run Refresh Token

Set `YOUTUBE_CLIENT_ID` and `YOUTUBE_CLIENT_SECRET` in your local shell, then run:

```bash
node scripts/get-youtube-refresh-token.mjs
```

Approve the browser consent screen. Paste the printed `YOUTUBE_REFRESH_TOKEN` into Netlify Dashboard.

Validate without spending upload quota:

```bash
curl -s -X POST "$SITE/.netlify/functions/publish-youtube" \
  -H "Content-Type: application/json" \
  -d '{"projectId":"probe","videoUrl":"https://example.com/video.mp4","title":"dry-run","description":"dry-run","dryRun":true}'
```

## Rotation

- Rotate the OAuth client secret on incident or policy cycle.
- Reissue the refresh token after client rotation.
- Remove old OAuth grants from the Google account security page.

## Related Files

- `.env.example`
- `netlify/functions/gemini-generate.ts`
- `netlify/functions/compile-video.ts`
- `netlify/functions/publish-youtube.ts`
- `netlify/functions/control-plane.ts`
