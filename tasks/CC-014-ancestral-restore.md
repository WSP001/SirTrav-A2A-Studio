# TASK: CC-014 — Backend Truth Hardening (X + Integrations + Vault)

**Owner:** Claude Code Agent
**Status:** PENDING_ACTIVATION
**Priority:** P0 (CRITICAL)
**Sprint:** Council Flash v1.5.0
**North Star:** Parent Commit `098f384`

---

## MISSION OBJECTIVE

Make the backend un-fakeable: X publisher invariants, integration checks, and
backend hooks into the Memory Vault.

The current `publish-x.ts` returns `statusCode: 200` with `success: false` when
keys are missing (line 101). This is a "soft lie" — HTTP says OK but the body
says disabled. Downstream agents and UI may not check the body.

**The Hard Rule:** If `success: true`, you guarantee a real external artifact exists.

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

## ADDITIONAL: Memory Vault Backend Hooks

From your pipeline runner / packet handler, write core events into the Vault:

```typescript
// Helper functions (only active when Vault is initialized — fail fast if not)
recordJobPacket(runId, persona, action, metric_weight, cost_plus_markup, status)
recordCouncilEvent(kind, payload)  // Council Flash passes, Truth Serum results, etc.
```

Place helpers in `netlify/functions/lib/vault-helpers.ts`.
They write to `job_packets` and `council_events` tables in `artifacts/memory_vault.sqlite`.
If Vault is not initialized, the helpers must throw (not silently skip).

---

## ADDITIONAL: Integration Verifier Contract

Ensure `scripts/verify-integrations.mjs` has:
- `--youtube` and `--remotion` flags
- Missing envs → SKIP with explicit fix hints (not FAIL)
- Fails only on real contract violations or liar states
- Hooked via `npm run verify:integrations:*` scripts

---

## SUCCESS CRITERIA

1. `just verify-x-real` — confirms no mock patterns in publish-x.ts
2. Missing keys → HTTP 503 (not 200)
3. No `try/catch` returns fake 200 with mock data
4. `tweetId` assertion rejects undefined/mock values
5. `recordJobPacket` / `recordCouncilEvent` helpers exist and write to Vault
6. `just build` passes

---

## FILES YOU MAY EDIT / CREATE

```
netlify/functions/publish-x.ts           <- HARDEN (do not rewrite from scratch)
netlify/functions/lib/vault-helpers.ts   <- CREATE (Vault write helpers)
scripts/verify-integrations.mjs          <- CREATE/UPDATE (integration checks)
```

## FILES YOU MUST NOT EDIT

```
justfile                           <- Windsurf owns
src/components/*                   <- Codex owns
scripts/truth-serum.mjs            <- Antigravity owns
scripts/vault-init.mjs             <- Windsurf owns
```

---

## VERIFY

```bash
just restore-north-star     # Extract honest baseline
just verify-x-real          # Confirm no mock patterns
just verify-truth           # Composite: no-fake + serum + verify-x
just build                  # Build must still pass
```
