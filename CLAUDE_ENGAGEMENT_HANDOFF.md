# 🤖 AGENT HANDOFF: Engagement Loop (MG-X-002)

**From:** Antigravity (Test Ops)
**To:** X Agent (Ops) & Claude (Backend)
**Date:** 2026-01-23

## 🏁 Context
The **X Publishing Pipeline (MG-X-LIVE)** is wired. We have a UI button that hits the backend, which attempts to sign requests with OAuth 1.0a. (Currently returns 401 until user rotates keys, but the pipe is clean).

Now we must implement the **Reverse Loop**: Reading comments/replies from X and storing them in the Memory Vault to influence *future* content generations.

## 📋 Task: MG-X-002 (Engagement Loop)
**Goal:** Create a scheduled function or manual trigger that reads mentions/replies from the X Account and stores them as "User Feedback" in `data/vault/feedback.json`.

### 1. Design Spec (X Agent)
Critique and finalize `docs/ENGAGEMENT_TO_MEMORY.md`. The core flow is:
`X API (Mentions)` -> `check-x-engagement.ts` -> `Memory Vault` -> `Director Agent (Next Run)`

### 2. Backend Implementation (Claude)
Create `netlify/functions/check-x-engagement.ts`:
```typescript
// Skeleton Requirement:
import { TwitterApi } from 'twitter-api-v2';

export const handler = async () => {
  // 1. Fetch recent mentions (since_id)
  // 2. Filter for quality (exclude spam)
  // 3. Convert to "Feedback Objects"
  // 4. Append to Vault
  // 5. Update "Last Checked" cursor
}
```

### 3. Memory Integration (Claude)
Update `netlify/functions/lib/vault.ts` to include a method `ingestSocialSignals(signals: Signal[])`.

---

## 🛠️ Instructions for Next Agent
1.  **Read** `docs/reports/SPRINT_MOTION_COMPLETION.md` to see the big picture.
2.  **Create** `docs/ENGAGEMENT_TO_MEMORY.md` first (Plan before Code).
3.  **Implement** the function.
4.  **Verify** using `scripts/test-x-engagement.mjs` (You will need to create this test script).

**Go.**
