# TASK: AG-013 — Truth Serum + Receipts

**Owner:** Antigravity Agent
**Status:** IN_PROGRESS (scripts exist from origin/main merge)
**Priority:** P0 (CRITICAL)
**Sprint:** Council Flash v1.5.0
**Protocol:** No Fake Success — HARD MODE

---

## MISSION OBJECTIVE

Build and enforce Truth Serum verification and keep the receipts for
The Commons Good. If any part of the system pretends to have posted when
it didn't, you pull the fire alarm and mark the round as failed.

**Scripts already exist** from origin/main merge. Your job is to ensure they
match the v1.5.0 contract below and pass `just verify-truth`.

---

## DELIVERABLE 1: scripts/truth-serum.mjs

### The Trap Logic

```javascript
// 1. Force MOCK_MODE off
process.env.MOCK_MODE = "false";

// 2. Call the publisher endpoint
// 3. IF response.statusCode === 200 AND response.body.tweetId is:
//    - undefined
//    - null
//    - "mock-id"
//    - starts with "mock-"
//    THEN: exit(1) + print "🚨 LIAR DETECTED: Agent attempted to fake a result."

// 4. IF response.statusCode === 503 AND response.body.disabled === true:
//    THEN: exit(0) + print "✅ HONEST: Publisher correctly reports disabled state."

// 5. IF response.statusCode === 200 AND tweetId is a real Twitter snowflake ID:
//    THEN: exit(0) + print "✅ REAL: Tweet posted. ID: {tweetId}"
```

### The Cleanse Function

```javascript
// Wipe cached function builds to prevent ghost mocks
function cleanse() {
    const dirs = ['.cache', '.netlify/functions', 'netlify/functions/dist'];
    dirs.forEach(d => {
        if (fs.existsSync(d)) {
            fs.rmSync(d, { recursive: true, force: true });
            console.log(`🧹 Cleansed: ${d}`);
        }
    });
}
```

---

## DELIVERABLE 2: scripts/verify-x-real.mjs

### Static Analysis — Mock Pattern Scanner

Scan `netlify/functions/publish-x.ts` for these banned patterns:

| Pattern | Why It's Banned |
|---------|----------------|
| `"mock-id"` | Fake tweet ID |
| `"Mock Success"` | Fake success message |
| `statusCode: 200` + `disabled: true` | HTTP lies about disabled state |
| `MOCK_MODE` usage that returns 200 | Bypasses real API |
| `success: true` without real `tweetId` | Phantom success |

Exit code 0 if clean. Exit code 1 if any pattern found.

---

## ADDITIONAL: Golden Path + SOCIAL_ENABLED Adaptation

Update Golden Path and contract tests to:
- Respect `SOCIAL_ENABLED` / per-platform flags
- Treat disabled platforms as SKIPPED, not BROKEN
- Ensure `just council-flash` includes at least one Truth Serum run

---

## ADDITIONAL: Truth Report JSON Schema

Define a tiny "truth report" schema. Write to `artifacts/public/metrics/truth-serum-*.json`:

```json
{
  "round_id": "string",
  "branch": "string",
  "commit": "string",
  "commands_run": ["string"],
  "pass_fail": { "command": "PASS|FAIL" },
  "artifacts": ["string"],
  "owner": "antigravity",
  "timestamp": "ISO8601"
}
```

Optionally generate a Markdown summary per round for human digestion.

---

## SUCCESS CRITERIA

1. `just run-truth-serum` exits 0 when publisher is honest (disabled = 503, real = 200+tweetId)
2. `just run-truth-serum` exits 1 when publisher lies (200 + no tweetId)
3. `just run-truth-serum local` forces localhost:8888 target
4. `just run-truth-serum cloud` forces cloud URL target
5. `just verify-x-real` scans publish-x.ts and reports CLEAN or DIRTY
6. Truth report JSON written to `artifacts/public/metrics/`
7. Disabled platforms treated as SKIPPED (not BROKEN) in Golden Path

---

## FILES YOU MAY EDIT / CREATE

```
scripts/truth-serum.mjs      <- UPDATE (ensure --local/--cloud/--strict contract)
scripts/verify-x-real.mjs    <- UPDATE (ensure banned pattern list matches)
```

## FILES YOU MUST NOT EDIT

```
justfile                     <- Windsurf owns
netlify/functions/*          <- Claude Code owns
src/components/*             <- Codex owns
scripts/vault-init.mjs       <- Windsurf owns
```

---

## VERIFY

```bash
just run-truth-serum          # Auto-detect: exit 0 (honest) or exit 1 (liar)
just run-truth-serum local    # Force local target
just run-truth-serum cloud    # Force cloud target
just verify-x-real            # CLEAN after CC-014 is done
just verify-truth             # Composite: no-fake + serum + verify-x
just council-flash            # Full 8-gate pipeline (Truth Serum is gate 8)
```
