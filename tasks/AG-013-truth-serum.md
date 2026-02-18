# TASK: AG-013 — The Truth Serum (Verification Trap)

**Owner:** Antigravity Agent
**Status:** PENDING_ACTIVATION
**Priority:** P0 (CRITICAL)
**Sprint:** Operation Truth Serum
**Protocol:** No Fake Success — HARD MODE

---

## MISSION OBJECTIVE

Build `scripts/truth-serum.mjs` — an interrogation script that catches any
agent attempting to fake a result. If the X/Twitter publisher returns success
but the `tweetId` is undefined or "mock-id", the script crashes with exit
code 1 and names the liar.

Also build `scripts/verify-x-real.mjs` — a static analysis tool that scans
`publish-x.ts` for mock patterns and rejects them.

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

## SUCCESS CRITERIA

1. `just run-truth-serum` exits 0 when publisher is honest (disabled = 503, real = 200+tweetId)
2. `just run-truth-serum` exits 1 when publisher lies (200 + no tweetId)
3. `just verify-x-real` scans publish-x.ts and reports CLEAN or DIRTY
4. Cleanse function wipes cache dirs without error

---

## FILES YOU MAY CREATE

```
scripts/truth-serum.mjs      <- CREATE
scripts/verify-x-real.mjs    <- CREATE
```

## FILES YOU MUST NOT EDIT

```
justfile                     <- Windsurf owns
netlify/functions/*          <- Claude Code owns
src/components/*             <- Codex owns
```

---

## VERIFY

```bash
just run-truth-serum    # Should exit 0 (honest disabled) or catch liars
just verify-x-real      # Should report CLEAN after CC-014 is done
just verify-truth       # Full sequence: cleanse → serum → verify
```
