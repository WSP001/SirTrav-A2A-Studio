# TASK: CC-013 — Issue Intake Function (Click2Kick Backend)

**Owner:** Claude Code Agent
**Status:** PENDING_ACTIVATION
**Priority:** P1
**Sprint:** The Pulse & The Plaque
**Depends On:** CX-012 (SystemStatusEmblem.tsx must exist to call this)

---

## MISSION OBJECTIVE

Build `netlify/functions/issue-intake.ts` — the backend receiver for Click2Kick
signals from the Command Plaque. When a user clicks a quadrant on the System
Status Emblem, the frontend POSTs to this function with the domain + action.

This function validates the signal, logs it to the diagnostic store, and
returns the current health detail for the clicked domain.

---

## ENDPOINT SPEC

**Method:** `POST /.netlify/functions/issue-intake`

### Request Body

```typescript
interface IssueIntakePayload {
  domain: 'storage' | 'network' | 'build' | 'pipeline';
  action: 'diagnose' | 'kick' | 'toggle-admin';
  runId?: string;        // Enterprise tracing (thread through)
  timestamp: string;     // ISO 8601
}
```

### Response (Success)

```typescript
interface IssueIntakeResponse {
  success: true;
  domain: string;
  diagnostics: {
    status: 'healthy' | 'degraded' | 'offline';
    detail: string;
    lastChecked: string;
    metrics?: Record<string, number>;
  };
  action_taken: string;  // "Diagnostic log recorded" or "Kick initiated"
}
```

### Response (Error)

```typescript
interface IssueIntakeError {
  success: false;
  error: string;
  disabled?: boolean;  // true if feature not yet configured
}
```

---

## IMPLEMENTATION REQUIREMENTS

1. **Validate payload** — reject unknown domains/actions with 400
2. **Thread runId** — generate one if not provided (`crypto.randomUUID()`)
3. **No Fake Success** — if domain diagnostics aren't available, return `{ success: false, disabled: true }`
4. **Log signal** — append to `artifacts/data/issue-intake-log.json` (or Netlify Blobs in production)
5. **Domain mapping:**
   - `storage` → check `NETLIFY_BLOBS_CONTEXT`, return storage mode + health
   - `network` → check AI provider config + social keys configured count
   - `build` → return last build timestamp from `agent-state.json` if available
   - `pipeline` → return `pipeline_mode` from healthcheck data
6. **Webhook secret** (optional) — honor `ISSUE_INTAKE_SECRET` env var for external callers

---

## DATA CONTRACTS

| Artifact | Path | Status |
|----------|------|--------|
| Function | `netlify/functions/issue-intake.ts` | CREATE |
| Schema | `artifacts/contracts/issue-intake.schema.json` | CREATE |
| Log Store | `artifacts/data/issue-intake-log.json` | RUNTIME (gitignored) |

---

## SUCCESS CRITERIA

1. `curl -X POST http://localhost:8888/.netlify/functions/issue-intake -d '{"domain":"storage","action":"diagnose","timestamp":"..."}' -H 'Content-Type: application/json'` returns valid response
2. Invalid domains return 400
3. Missing configuration returns `{ success: false, disabled: true }`
4. runId is present in every response
5. `just build` passes with the new function

---

## FILES YOU MAY EDIT

```
netlify/functions/issue-intake.ts   <- CREATE
artifacts/contracts/issue-intake.schema.json <- CREATE
```

## FILES YOU MUST NOT EDIT

```
src/components/*          <- Codex owns frontend
justfile                  <- Windsurf owns
src/remotion/branding.ts  <- READ ONLY
```
