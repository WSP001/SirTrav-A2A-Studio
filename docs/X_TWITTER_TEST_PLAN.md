# X/Twitter Test Plan — No Fake Success

> **Owner:** Antigravity (test execution) + Claude Code (backend)
> **Prerequisite:** PR #10 merged or branch deployed to Netlify

---

## Existing Test Harness

| File | Purpose |
|------|---------|
| `scripts/test-x-publish.mjs` | Dry-run + live tweet posting via `publish-x.ts` |
| `scripts/truth-serum.mjs` | Strict honesty verification (no mocks, no fakes) |
| `netlify/functions/publish-x.ts` | X/Twitter publisher (Netlify Function v2) |
| `scripts/test-agentic-twitter-run.mjs` | Full 6-step agentic E2E harness |

### Existing Just Recipes

| Recipe | What It Does |
|--------|-------------|
| `just x-dry-run` | Dry-run test (no tweet posted, auto-detects local/cloud) |
| `just x-live-test` | Posts a REAL tweet (5-second cancel window) |
| `just x-full-test` | Healthcheck → dry-run → prompts for live test |
| `just verify-x-real` | Static scan of `publish-x.ts` for mock patterns |
| `just verify-truth` | Composite: no-fake-success + truth-serum + verify-x-real |
| `just run-truth-serum` | Antigravity's interrogation script (strict mode) |

---

## Required Environment Variables

| Variable | Where | Required For |
|----------|-------|-------------|
| `TWITTER_API_KEY` | Netlify env | All X tests |
| `TWITTER_API_SECRET` | Netlify env | All X tests |
| `TWITTER_ACCESS_TOKEN` | Netlify env | All X tests |
| `TWITTER_ACCESS_SECRET` | Netlify env | All X tests |

**Local testing:** These must be in Netlify's env (not `.env`) — functions read them at runtime via `Netlify.env.get()`.

---

## Test A — Safe Credential Verification (No Posting)

**Purpose:** Confirm X/Twitter API keys are valid without creating any tweets.

```powershell
# Step 1: Verify publish-x.ts has no mock patterns
just verify-x-real
# Expected: CLEAN: No mock patterns found in publish-x.ts

# Step 2: Dry-run (hits the endpoint, validates response shape, does NOT post)
just x-dry-run
# Expected: DRY-RUN PASS — endpoint responds, contract valid
# Response shape: { success: false, disabled: true } if keys missing
#             or: { success: true, dryRun: true } if keys present

# Step 3: Full truth serum (composite honesty check)
just verify-truth
# Expected: 3/3 steps PASS — code is honest
```

**Pass criteria:** All 3 commands exit 0. No `DIRTY` patterns found. Response contract matches schema.

**Fail action:** If `verify-x-real` finds mock patterns → file bug against Claude Code (CC-014). If `x-dry-run` fails → check Netlify env vars are set.

---

## Test B — Opt-In E2E Publish Test (Posts a Real Tweet)

**Purpose:** Prove end-to-end X publishing works with real credentials.

> **WARNING:** This creates a real tweet on the linked X/Twitter account.

```powershell
# Step 1: Run the safe checks first (Test A above)
just verify-truth
# Must PASS before proceeding

# Step 2: Live tweet test (5-second cancel window)
just x-live-test
# Expected: LIVE TEST — tweet posted
# Response: { success: true, tweetId: "<real-id>", url: "https://twitter.com/..." }

# Step 3: Verify via agentic harness (6-step E2E with real tweet)
node scripts/test-agentic-twitter-run.mjs --publish-x
# Expected: 6/6 PASS, tweetId is real (not mock-id)
# Output: artifacts/public/metrics/agentic-run-*.json + .md
```

**Pass criteria:**
- `tweetId` is a real numeric ID (not `mock-id` or `fake-tweet-123`)
- `noFakeSuccess: true` in the agentic run JSON
- Tweet visible on X/Twitter with the posted URL

**Fail action:** If tweet fails → check `TWITTER_ACCESS_TOKEN` expiry. If `noFakeSuccess: false` → Claude Code must fix `publish-x.ts`.

---

## Regression Protection

After any change to `netlify/functions/publish-x.ts`:

```powershell
just verify-x-real     # Static mock scan
just x-dry-run         # Dry-run contract check
just verify-truth      # Full truth serum
```

All 3 must pass before the change can be merged. The `pre-merge-guard` recipe does NOT include X tests (they require network + keys), so these must be run manually or in CI with secrets configured.

---

## No Fake Success Policy

> "If it mocks, it dies." — Operation Truth Serum

- `{ success: false, disabled: true }` when keys are missing (honest)
- `{ success: true, tweetId: "..." }` when keys work (honest)
- `{ success: true, tweetId: "mock-id" }` is **BANNED** (dishonest)
- HTTP 200 + `disabled: true` is **BANNED** (soft lie — must return 503)
