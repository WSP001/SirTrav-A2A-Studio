# M9 Claude Code Brief — Remotion E2E Dry-Run

**Ticket:** CC-M9-E2E  
**Owner:** Claude Code  
**Gate:** Windsurf Master  
**Created:** 2026-03-04  
**Status:** READY TO START (blocked on HO-007 for real render, but fallback mode works now)

---

## Context

M8 is FROZEN at `0d220f72`. All new work is M9.

The Remotion render pipeline is fully architected:

```
compile-video.ts → render-dispatcher.ts → lib/remotion-client.ts → @remotion/lambda/client
```

4 compositions registered in `src/remotion/Root.tsx`:
- `SirTrav-Main` (1920×1080, 300 frames)
- `IntroSlate` (1920×1080, dynamic duration)
- `EmblemComposition` (1080×1080, 150 frames)
- `EmblemThumbnail` (1280×720, 90 frames)

When Remotion AWS keys are missing, `remotion-client.ts` returns fallback mode (fake renderId, simulated 30s progress). This is NOT fake success — it's honest degradation.

---

## Read-Before-Write

```bash
git pull origin main
just cockpit
cat MASTER.md                         # Focus on M9 section
cat AGENT-OPS.md                      # Your section under "Claude Code"
cat docs/ENV-REMOTION.md              # What keys are needed
node scripts/m9-readiness-check.mjs   # Pre-flight check
```

---

## Task: Build `scripts/test-remotion-e2e.mjs`

Create an E2E dry-run script that exercises the full Remotion path.

### Requirements

1. **Call render-dispatcher** through `lib/remotion-client.ts` (not HTTP — direct import)
2. **Use IntroSlate composition** with safe default props:
   ```json
   {
     "projectId": "e2e-test-{timestamp}",
     "title": "E2E Test Run",
     "subtitle": "Automated Pipeline Verification",
     "showDate": true,
     "theme": "default"
   }
   ```
3. **Poll progress** using `getProgress()` from `remotion-client.ts`
4. **Report honestly:**
   - If Remotion keys present → real render → report renderId, progress, output URL
   - If fallback mode → report `fallback: true`, don't claim real render
   - Never `success: true` without a real output file
5. **Clean exit codes:**
   - Exit 0: render completed (real or fallback acknowledged)
   - Exit 1: error (timeout, fatal error, missing deps)
6. **No social publish** — this is render-only verification
7. **Timeout:** 5 minutes max for real render, 45s for fallback

### Key files to import from

```
netlify/functions/lib/remotion-client.ts
  → kickoffRender(params)
  → getProgress(renderId, bucketName)
  → isRemotionConfigured()
  → waitForRender(renderId, bucketName, { pollIntervalMs, timeoutMs })
```

### Output format

```
╔══════════════════════════════════════════╗
║      M9 E2E Remotion Render Test        ║
╚══════════════════════════════════════════╝
  Mode:        real | fallback
  Composition: IntroSlate
  Render ID:   abc123 | fallback-1709...
  Progress:    100% (done)
  Output:      https://s3.../final.mp4 | /test-assets/test-video.mp4
  Duration:    12.3s
  Result:      ✅ PASS (real render) | 🟡 PASS (fallback — set HO-007 keys for real)
```

---

## Wire into justfile

Already done — `just m9-e2e` runs:
1. `node scripts/m9-readiness-check.mjs`
2. `node scripts/test-remotion-e2e.mjs`

---

## Gate Before Merge

```bash
npm run build
just sanity-test-local
just control-plane-gate
just m9-e2e
```

All must pass. Commit:

```bash
git commit -m "feat(m9): Remotion E2E dry-run test + readiness integration"
```

---

## What NOT to do

- ⛔ Do NOT touch `PlatformToggle.tsx` or `ResultsPreview.tsx` (M8 frozen)
- ⛔ Do NOT install `@remotion/lambda` yet (dynamic import handles fallback)
- ⛔ Do NOT call any social publish endpoints
- ⛔ Do NOT hardcode AWS keys anywhere

---

## Success Criteria

1. `node scripts/test-remotion-e2e.mjs` exits 0 in fallback mode
2. Script reports `fallback: true` honestly (No Fake Success)
3. When HO-007 keys are set later, same script renders for real without code changes
4. `just m9-e2e` runs both readiness + E2E as a single gate
5. Build still passes after changes

---

*Drop this brief into your Claude Code session. Read the files listed above, then build the script.*

**For the Commons Good** 🎬
