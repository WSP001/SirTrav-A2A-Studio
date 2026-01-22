# SirTrav-A2A-Studio: Netlify Pro Expert Guide

**Project ID:** 53ebb517-cfb7-468c-b253-4e7a30f3a85a
**Site:** https://sirtrav-a2a-studio.netlify.app
**Created:** Nov 4, 2025 | **Last Deploy:** Jan 21, 2026
**Status Badge:** [![Netlify Status](https://api.netlify.com/api/v1/badges/53ebb517-cfb7-468c-b253-4e7a30f3a85a/deploy-status)](https://app.netlify.com/projects/sirtrav-a2a-studio/deploys)

---

## Part 1: Reading Your Observability Data

### Current Metrics (Jan 15-22, 2026)

| Metric | Value | Assessment |
|--------|-------|------------|
| **Total Requests** | 11,785 | Healthy traffic |
| **Error Rate** | 0.37% (44 errors) | Excellent (<1% target) |
| **Primary Function** | `progress` | 11.6K calls (98.5% of traffic) |
| **p50 Duration** | 191ms | Good (under 200ms target) |
| **Bandwidth** | ~6.86 MB total | Efficient |

### The `progress` Function Polling Pattern

Your logs show `/.netlify/functions/progress?projectId=week4_recap` being called every minute:
```
08:47:19 -> 08:46:19 -> 08:45:20 -> 08:44:19... (1-minute intervals)
```

This is your pipeline monitoring heartbeat. The 7-agent pipeline checks progress status every 60 seconds. Response times are consistent (171-360ms), indicating healthy function performance.

### Nomenclature Decoder

| Term | Meaning |
|------|---------|
| **p50 duration** | Median response time (50% of requests are faster) |
| **p95/p99** | 95th/99th percentile (slowest requests) |
| **Function** | Serverless code in `netlify/functions/` |
| **Edge Function** | Code running at CDN edge (faster, closer to users) |
| **Cache Status: Miss** | Not served from cache, hit origin/function |
| **Cache Status: Hit** | Served from CDN cache (faster) |
| **Content-Type** | Response format (application/json, text/html, etc.) |
| **User Agent Category** | Browser, Bot, Crawler, etc. |

---

## Part 2: Understanding Your 30 Deployed Functions

### Core Pipeline Functions (A2A Agents)

| Function | Purpose | Status | Invocations |
|----------|---------|--------|-------------|
| **intake-upload** | Photo upload entry point | Active | 7 |
| **curate-media** | Director Agent - scene selection | Active | 2 |
| **narrate-project** | Writer Agent - storytelling | Active | 2 |
| **text-to-speech** | Voice Agent - ElevenLabs TTS | Active | 2 |
| **generate-music** | Composer Agent - Suno music | Active | 2 |
| **compile-video** | Editor Agent - video assembly | Fixed (v2.1.0) | 2 |
| **generate-attribution** | Attribution Agent - Commons Good credits | Active | 2 |

### Pipeline Orchestration Functions

| Function | Purpose |
|----------|---------|
| **start-pipeline** | Initiates A2A workflow |
| **run-pipeline-background** | Background job orchestrator |
| **progress** | Pipeline status polling (SSE + JSON) |
| **results** | Final video retrieval |
| **render-dispatcher** | Remotion Lambda kickoff |
| **render-progress** | Remotion Lambda status polling |

### Publishing Functions (D2A Output)

| Function | Platform Target |
|----------|-----------------|
| **publish** | Generic publish handler |
| **publish-tiktok** | TikTok Reels |
| **publish-instagram** | Instagram Reels |
| **publish-youtube** | YouTube Shorts |
| **publish-linkedin** | LinkedIn Video |
| **publish-x** | X (Twitter) Video |

### Support Functions

| Function | Purpose |
|----------|---------|
| **blob-get** | Netlify Blobs storage retrieval |
| **health** / **healthcheck** | System health verification (v2.1.0) |
| **submit-evaluation** | Feedback loop (learning) |
| **evals** | Evaluation storage |
| **correlate** | Run correlation |
| **mcp** | Model Context Protocol gateway |
| **memory-agent** | Persistent learning |
| **share-link** | Shareable URL generation |
| **register-music** | Music asset registration |

---

## Part 3: Failed Deploys Analysis & Prevention

### Why "Exit Code 2" Happens

Exit code 2 typically means:
1. **npm install failed** - Missing dependency or version conflict
2. **Build command failed** - Vite compilation error
3. **TypeScript errors** - Type checking failed
4. **ESLint errors** - Linting with `--max-warnings 0`

### Prevention: Run Before Every Push

```bash
npm ci && npm run build
```

The updated `netlify.toml` now uses `npm ci` for deterministic installs and pins `NODE_VERSION = "22"`.

---

## Part 4: Maximizing Netlify Pro Limits

### Your Pro Plan Capabilities

| Feature | Pro Limit | Current Usage |
|---------|-----------|---------------|
| **Bandwidth** | 1TB/month | ~7MB (plenty of room) |
| **Build Minutes** | 25,000/month | 32s builds = ~47K deploys possible |
| **Concurrent Builds** | 3 | Enable branch deploys for parallel testing |
| **Functions Invocations** | 125K/month | ~50K/month (progress polling) |
| **Functions Runtime** | 100 hrs/month | Well within limits |
| **Observability Retention** | 30 days | Use for trend analysis |

### Implemented Optimizations

1. **Adaptive Polling** (already in `PipelineProgress.tsx`):
   - 2s when active (0-10 no-change polls)
   - 5s in idle phase (10-20 polls)
   - 10s in stale phase (20+ polls)
   - SSE-first strategy with polling fallback

2. **Security Headers** (`public/_headers`):
   - X-Frame-Options: DENY
   - X-Content-Type-Options: nosniff
   - Referrer-Policy: strict-origin-when-cross-origin
   - Permissions-Policy for camera/mic/geo

3. **Cache Strategy**:
   - Static assets: 1 year (immutable)
   - Music/audio: 1 year (immutable)
   - HTML: no-cache (always fresh)
   - API functions: no-store

4. **Extended Timeouts** (`netlify.toml`):
   - compile-video: 26s (background limit)
   - run-pipeline-background: 900s (15min)

---

## Part 5: Local Development Setup

### For Programming Team

```bash
# One-time setup
npm install netlify-cli -g
cd SirTrav-A2A-Studio
netlify link  # Select "Use current git remote origin"

# Every coding session
netlify dev  # Starts at http://localhost:8888

# Test any function
curl http://localhost:8888/.netlify/functions/healthcheck | jq
curl http://localhost:8888/.netlify/functions/progress?projectId=test

# Pull env vars from Netlify dashboard
netlify env:pull  # Creates .env file
```

**NEVER** rely on just `vite` or `npm run dev` for backend functions. Always use `netlify dev`.

---

## Part 6: Observability Best Practices

### Daily Monitoring Checklist

1. Check Error Rate - should stay below 1%
2. Review p50/p95 Latency - flag anything over 500ms
3. Monitor Function Invocations - watch for unexpected spikes
4. Review 404s - fix broken links/routes
5. Check Bot Traffic - use "Browser traffic only" filter

### Weekly Review Queries

| Review | Filters |
|--------|---------|
| **Function Performance** | Function name -> Sort by Duration |
| **Error Hotspots** | Status group: Server Error -> Group by URL |
| **Bandwidth** | Sort by Bandwidth -> Content-Type filter |
| **Bot vs Human** | User agent category -> Compare Browser vs Bot |

---

## Part 7: Recommended netlify.toml

The project now uses an optimized configuration:

```toml
[build]
  command = "npm ci && npm run build"  # Deterministic installs
  publish = "dist"
  functions = "netlify/functions"

[build.environment]
  NODE_VERSION = "22"

[functions]
  node_bundler = "esbuild"

[functions."compile-video"]
  timeout = 26  # Extended for video processing

[functions."run-pipeline-background"]
  timeout = 900  # 15min for pipeline orchestration
```

---

## Part 8: Connection to Commons Good Valuation

| Achievement | Valuation Impact |
|-------------|------------------|
| Working Auth + Metrics | +0.3x ARR multiple |
| Live Demo (no 403) | +0.2x |
| Security Pipeline | +0.15x |
| **Total Potential** | **+0.65x** |

Current observability showing 0.37% error rate and consistent ~191ms p50 latency is investor-ready evidence of system reliability.

---

**Document Version:** 1.0.0
**Created:** January 22, 2026
