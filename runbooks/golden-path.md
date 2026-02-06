# runbooks/golden-path.md

## Overview
The Golden Path is the end-to-end verification of the SirTrav pipeline:
Photo > Video > Invoice > Publish

## Prerequisites
- `netlify dev` running on port 8888
- At least OpenAI + ElevenLabs keys configured

## Commands

### Quick Check (FREE)
```bash
just golden-path-quick
# Runs: contract validation + healthcheck
```

### Full Pipeline Test (~$0.50)
```bash
just golden-path-full
# Runs: contracts + social dry-runs + motion test
```

### Manual Full Path
```bash
node scripts/verify-golden-path.mjs
# Starts pipeline, monitors SSE, fetches results, verifies invoice
```

### Smoke Mode (Fast)
```bash
node scripts/verify-golden-path.mjs --smoke
# Uses fast execution path
```

## Expected Output
```
[0] Preflight: Backend Online (v2.1.0)
[1] Starting Pipeline: queued
[2] SSE Stream: progress events
[3] Results: status=completed, videoUrl present
[4] Contract: Cost Plus markup verified
    Base: $0.38, Markup: $0.076, Total: $0.456
GOLDEN PATH VERIFIED!
```

## What Gets Verified
1. Backend health (healthcheck.ts responds)
2. Pipeline starts (start-pipeline.ts queues job)
3. SSE streaming (progress.ts sends events)
4. Results available (results.ts returns artifacts)
5. Cost Plus markup (20% Commons Good applied)
6. Video URL generated (compile-video.ts or test asset)

## Troubleshooting

### "BACKEND OFFLINE"
```bash
netlify dev  # Start dev server first
```

### "Status is 'failed'"
Check function logs: `netlify dev` terminal output

### "Missing videoUrl"
compile-video.ts may have storage errors. Check Netlify Blobs config.

### "Cost Plus Logic Failed"
Invoice generation not applying 20% markup. Check run-pipeline-background.ts.

## Related
- `scripts/verify-golden-path.mjs`
- `netlify/functions/start-pipeline.ts`
- `netlify/functions/progress.ts`
- `netlify/functions/results.ts`
