# SirTrav-A2A-Studio: Programming Team Coding Assignments

**Handoff Date:** January 22, 2026
**Project:** https://sirtrav-a2a-studio.netlify.app
**Repo:** https://github.com/WSP001/SirTrav-A2A-Studio

---

## Before Any Work

```bash
# 1. Clone and setup
git clone https://github.com/WSP001/SirTrav-A2A-Studio.git
cd SirTrav-A2A-Studio

# 2. Install dependencies
npm ci

# 3. Link to Netlify
npm install netlify-cli -g
netlify link  # Select "Use current git remote origin"

# 4. Pull environment variables
netlify env:pull  # Creates .env file

# 5. Start local dev
netlify dev  # Runs at http://localhost:8888
```

---

## Task 1: compile-video Resilience (DONE)

**Status:** Fixed in v2.1.0
**Location:** `netlify/functions/compile-video.ts`

### What Was Fixed:
- Added try/catch around Blobs storage upload (was crashing on storage exceptions)
- Graceful fallback: returns placeholder video URL instead of 500 on storage failure
- Version bumped to v2.1.0-DUCKING

### Verify After Deploy:
```bash
curl -X POST https://sirtrav-a2a-studio.netlify.app/.netlify/functions/compile-video \
  -H "Content-Type: application/json" \
  -d '{"projectId": "test-123"}'
# Should return { success: true, placeholder: true, ... }
```

---

## Task 2: Adaptive Polling (ALREADY IMPLEMENTED)

**Status:** Already exists in `src/components/PipelineProgress.tsx`
**No action needed.**

### Current Implementation:
- SSE-first strategy with polling fallback
- Adaptive intervals: 2s (active) -> 5s (idle) -> 10s (stale)
- Smart activity detection via `consecutiveNoChange` counter
- Stops polling on pipeline completion
- 7-agent visualization with status cards

---

## Task 3: Security Headers (DONE)

**Status:** Implemented in `public/_headers`
**Location:** `public/_headers`

### Headers Added:
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `X-XSS-Protection: 1; mode=block` - XSS filter
- `Referrer-Policy: strict-origin-when-cross-origin` - Privacy
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` - Restricts APIs

### Cache Strategy:
- `/assets/*` - 1 year (immutable, Vite hashed filenames)
- `/music/*` - 1 year (immutable audio assets)
- `/index.html` - no-cache (always fresh SPA)
- `/.netlify/functions/*` - no-store (API responses)

### Verify After Deploy:
```bash
curl -I https://sirtrav-a2a-studio.netlify.app/
# Should see X-Frame-Options, X-Content-Type-Options, etc.
```

---

## Task 4: Enhanced Healthcheck (DONE)

**Status:** Implemented in v2.1.0
**Location:** `netlify/functions/healthcheck.ts`

### What Was Added:
- `build.commit` - Git SHA from `COMMIT_REF` (7 chars)
- `build.id` - Netlify Build ID from `BUILD_ID`
- `build.context` - Deploy context (production/deploy-preview/branch-deploy)
- `build.branch` - Git branch name from `BRANCH`
- Version bumped to 2.1.0

### Verify:
```bash
curl https://sirtrav-a2a-studio.netlify.app/.netlify/functions/healthcheck | jq '.build'
# Should return { commit: "abc1234", id: "...", context: "production", branch: "main" }
```

---

## Task 5: Optimized netlify.toml (DONE)

**Status:** Updated
**Location:** `netlify.toml`

### Changes:
- `npm run build` -> `npm ci && npm run build` (deterministic installs)
- Added `NODE_VERSION = "22"` (pinned runtime)
- Added `functions = "netlify/functions"` (explicit directory)
- Added production/deploy-preview context environments
- Added `compile-video` timeout: 26s
- Added `run-pipeline-background` timeout: 900s (15min)

---

## Future Assignments (Not Yet Started)

### P1: Error Handler Wrapper (Optional)

If consistent logging is needed across all 30 functions, create a shared wrapper:

```typescript
// netlify/functions/lib/errorHandler.ts
export function withErrorHandler(name: string, handler: Function) {
  return async (event: any, context: any) => {
    const start = Date.now();
    console.log(`[${name}] START ${event.httpMethod} ${event.path}`);
    try {
      const result = await handler(event, context);
      console.log(`[${name}] OK ${Date.now() - start}ms`);
      return result;
    } catch (error: any) {
      console.error(`[${name}] ERROR ${Date.now() - start}ms:`, error.message);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: error.message, function: name })
      };
    }
  };
}
```

### P2: Log Drains (Manual - Netlify Dashboard)

For Pro accounts, set up log drains to external monitoring:
1. Go to: Site Settings -> Build & Deploy -> Log drains
2. Add endpoint for your monitoring service

### P3: npm audit fix (Manual)

```bash
npm audit
npm audit fix
# If needed: npm audit fix --force (check for breaking changes)
```

---

## Completion Checklist

| Task | Status | Verified By |
|------|--------|-------------|
| Task 1: compile-video resilience | Done | Storage fallback + placeholder mode |
| Task 2: Adaptive polling | Exists | SSE + 2s/5s/10s intervals in PipelineProgress.tsx |
| Task 3: Security headers | Done | `curl -I` shows security headers |
| Task 4: Healthcheck with build info | Done | Returns git SHA and context |
| Task 5: netlify.toml optimization | Done | npm ci + NODE_VERSION + timeouts |

---

## Verification Commands

```bash
# Full preflight check
npm run preflight

# Build verification
npm ci && npm run build

# Local function testing
netlify dev
curl http://localhost:8888/.netlify/functions/healthcheck | jq

# Security check
npm run verify:security

# Full test suite
npm run test:full
```

---

**Document Version:** 1.0.0
**Created:** January 22, 2026
