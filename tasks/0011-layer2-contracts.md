# 0011 -- Layer 2: Contracts (CC-005)

## Priority: P1
## Status: DONE
## Assigned To: Claude Code (Backend)
## Completed: 2026-01-31

## Goal
Establish formal JSON Schema contracts for the social publishing pipeline and job costing system.

## What Was Done

### Task 1: Job Costing Schema
Created `artifacts/data/job-costing.schema.json` with:
- **rateCard**: Per-agent cost rates (agent, service, unitCost, unit)
- **projectPhases**: Pipeline phase tracking with per-phase cost rollup
- **timeTracking**: Wall-clock duration tracking (total + per-phase)
- **costPlusMarkup**: The Commons Good 20% markup model (aligns with `ManifestGenerator`)
- **lineItems**: Flat list matching the `AgentCost` interface from `cost-manifest.ts`

### Task 2: Social Post Schema
Created `artifacts/contracts/social-post.schema.json` with:
- Common fields: `platform`, `projectId`, `runId`, `content`, `title`, `media[]`, `hashtags[]`, `scheduledTime`
- Platform-specific conditional validation via `allOf`/`if`/`then`:
  - X: 280 char limit on content
  - YouTube: requires title + media, privacy enum (private/unlisted/public)
  - Instagram: requires media, optional coverUrl + shareToFeed
  - TikTok: requires media, TikTok-specific privacy enum + disable toggles
  - LinkedIn: requires title + media, visibility enum + postType

### Task 3: Schema Validation in publish-x.ts
Updated `netlify/functions/publish-x.ts`:
- Added `validateXPayload()` function that checks against the social post contract
- Validates: text required (non-empty string, max 280 chars), mediaUrls (string array), userId (string)
- Returns `{ success: false, error: 'Invalid payload', details: [...] }` on validation failure
- Runs before credential check (fail fast on bad input)

## Files Created/Modified
| File | Action |
|------|--------|
| `artifacts/contracts/social-post.schema.json` | Created |
| `artifacts/data/job-costing.schema.json` | Created |
| `netlify/functions/publish-x.ts` | Modified (added validation) |

## Verification
```bash
# Verify schemas are valid JSON
node -e "JSON.parse(require('fs').readFileSync('artifacts/contracts/social-post.schema.json'))"
node -e "JSON.parse(require('fs').readFileSync('artifacts/data/job-costing.schema.json'))"

# Verify publish-x validation rejects bad payload
curl -X POST http://localhost:8888/.netlify/functions/publish-x \
  -H 'Content-Type: application/json' \
  -d '{"text": ""}'
# Expected: 400 with { success: false, error: 'Invalid payload' }
```

## Acceptance Criteria
- [x] `artifacts/data/job-costing.schema.json` exists with rateCard, projectPhases, timeTracking, costPlusMarkup
- [x] `artifacts/contracts/social-post.schema.json` exists with platform, content, media[], scheduledTime, hashtags[]
- [x] `publish-x.ts` validates POST body and returns error on invalid payload
- [x] No Fake Success pattern preserved in all publishers
