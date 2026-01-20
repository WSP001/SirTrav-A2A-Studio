# Security Checklist - SirTrav A2A Studio

## 🛡️ Authentication & Handshake (P7)
- [ ] **Verify Handshake**: `npm run verify:security`
  - Must return `401 Unauthorized` for missing/invalid tokens.
  - Must return `202 Accepted` for valid `API_SECRET` or `demo` tokens.
- [ ] **Environment Variables**:
  - `API_SECRET` must be set in production (Netlify Env).
  - `NETLIFY_AUTH_TOKEN` must be available for Blob storage operations.

## 🔄 Idempotency & Reliability
- [ ] **Duplicate Run Protection**: `start-pipeline` must lock `projectId` + `runId`.
  - Verify with: `npm run verify:idempotency`.
  - Expect `409 Conflict` (Strict) or `202 Accepted` (Safe Retry).

## 🔒 Asset Protection
- [ ] **Signed URLs**: All published artifacts must use expiring signed URLs (default 24h).
- [ ] **Blob Storage**: Verify `NETLIFY_SITE_ID` binding prevents cross-site access.

## 🧹 Data Hygiene
- [ ] **Exchange & Wipe**: Temporary files in `/tmp` should be cleaned up after publishing (handled by ephemeral runtime or explicit cleanup steps).
