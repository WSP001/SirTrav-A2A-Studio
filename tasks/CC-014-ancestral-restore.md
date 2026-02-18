# TASK: CC-014 — The Ancestral Restore (Publish-X Truth Enforcement)

**Owner:** Claude Code Agent
**Status:** PENDING_ACTIVATION
**Priority:** P0 (CRITICAL)
**Sprint:** Operation Truth Serum
**North Star:** Parent Commit `098f384`

---

## MISSION OBJECTIVE

Harden `netlify/functions/publish-x.ts` so it **cannot** return fake success.
The current code returns `statusCode: 200` with `success: false` when keys are
missing (line 101). This is a "soft lie" — the HTTP status says OK but the body
says disabled. Downstream agents and UI may not check the body.

**The Hard Rule:** If it can't post for real, it MUST fail loudly.

---

## THE PACKET SWITCH

### Step 1: Extract the North Star

```bash
just restore-north-star
# Creates netlify/functions/publish-x.honest.ts from commit 098f384
```

### Step 2: Compare & Harden

The current `publish-x.ts` and the North Star are nearly identical (same commit
lineage). The real fix is **hardening the disabled state**:

**BEFORE (Soft Lie — line 98-111):**
```typescript
if (!appKey || !appSecret || !accessToken || !accessSecret) {
    return {
        statusCode: 200,  // <-- THE LIE: HTTP says "OK"
        headers,
        body: JSON.stringify({
            success: false,
            disabled: true,
            // ...
        })
    };
}
```

**AFTER (Hard Truth):**
```typescript
if (!appKey || !appSecret || !accessToken || !accessSecret) {
    console.error("⛔ [X-AGENT] PACKET REJECTED: Missing API keys. No mocks allowed.");
    return {
        statusCode: 503,  // Service Unavailable — HONEST status code
        headers,
        body: JSON.stringify({
            success: false,
            disabled: true,
            platform: 'x',
            error: "⛔ PACKET REJECTED: X/Twitter keys not configured. No mocks allowed.",
            required_keys: [
                "TWITTER_API_KEY",
                "TWITTER_API_SECRET",
                "TWITTER_ACCESS_TOKEN",
                "TWITTER_ACCESS_SECRET"
            ]
        })
    };
}
```

### Step 3: Remove Mock Catch-All

Remove ANY `try/catch` that returns `statusCode: 200` with fake data.
The existing catch block (line 173-210) is already honest — it returns real
error codes (429, 401, 500). **Keep it.**

### Step 4: Add tweetId Assertion

After line 148, add a hard assertion:

```typescript
const tweetId = result.data.id;
if (!tweetId || tweetId === 'mock-id') {
    throw new Error("⛔ PACKET REJECTED: Real API returned no tweetId. No mocks allowed.");
}
```

---

## SUCCESS CRITERIA

1. `just verify-x-real` — script confirms no mock patterns exist in publish-x.ts
2. Missing keys → HTTP 503 (not 200)
3. No `try/catch` returns fake 200 with mock data
4. `tweetId` assertion rejects undefined/mock values
5. `just build` passes

---

## FILES YOU MAY EDIT

```
netlify/functions/publish-x.ts     <- HARDEN (do not rewrite from scratch)
```

## FILES YOU MUST NOT EDIT

```
justfile                           <- Windsurf owns
src/components/*                   <- Codex owns
scripts/truth-serum.mjs            <- Antigravity owns
```

---

## VERIFY

```bash
just restore-north-star     # Extract honest baseline
just verify-x-real          # Confirm no mock patterns
just build                  # Build must still pass
```
