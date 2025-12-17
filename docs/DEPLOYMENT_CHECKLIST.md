# Deployment Checklist

## Pre-Deployment Verification
- [ ] **Build Check**: Run `npm run build` locally. Ensure `dist/` is generated without errors.
- [ ] **Environment Variables**: Verify all secrets in `MASTER.md` are set in Netlify.
    - `ELEVENLABS_API_KEY`
    - `SUNO_API_KEY`
    - `GEMINI_API_KEY`
    - `AWS_ACCESS_KEY_ID`
    - `AWS_SECRET_ACCESS_KEY`
    - `S3_BUCKET`
- [ ] **Netlify Functions**: Ensure `netlify/functions` contains all required endpoints.

## Deployment Steps
1. **Commit Changes**: Ensure all changes are committed to the `main` branch.
2. **Push to GitHub**: `git push origin main`.
3. **Trigger Netlify**: Netlify should auto-deploy. Check Netlify dashboard for build status.
4. **Verify Live Site**: Visit the production URL and test the "Click2Kick" flow.

## Post-Deployment
- [ ] **Monitor Logs**: Check Netlify Function logs for any runtime errors.
- [ ] **Verify Artifacts**: Check S3 bucket for generated video artifacts.
