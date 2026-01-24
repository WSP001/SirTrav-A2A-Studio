# 🧠 Engagement to Memory: The Regenerative Loop
**Spec ID:** MG-X-002
**Status:** DRAFT (Approved by X Agent)
**Date:** 2026-01-23

## 1. Goal
Automatically ingest high-quality replies and mentions from X (Twitter) into the SirTrav-A2A-Studio Memory Vault. These signals will act as "Creative Direction" for future content generations, creating a "Regenerative" feedback loop.

## 2. Signal Types

### A. Direct Feedback (High Priority)
*   **Trigger:** Replies to posts originating from the Studio (verified by `projectId` hashtag).
*   **Action:** Parse sentiment + specific keywords (e.g., "more music", "darker tone").
*   **Storage:** `data/vault/feedback.json` (linked to `projectId`).

### B. General Mentions (Medium Priority)
*   **Trigger:** @mentions of the account (@Sechols002).
*   **Action:** Sentiment analysis only.
*   **Storage:** `data/vault/brand_sentiment.json`.

### C. Engagement Metrics (Low Priority - Aggregate)
*   **Trigger:** High Like/Retweet ratio (> 5%).
*   **Action:** Reinforce the "Style" used in that video.
*   **Storage:** `data/vault/learned_styles.json`.

---

## 3. Data Flow

```mermaid
graph LR
    X[X API /2/users/me/mentions] -->|Fetch| CheckFn[check-x-engagement.ts]
    CheckFn -->|Filter Spam| Valid[Valid Signals]
    Valid -->|Format| SignalObj[Signal Object]
    SignalObj -->|Vault.ingest()| Vault[Memory Vault]
    Vault -->|Read| Director[Director Agent]
```

## 4. Signal Object Schema

```typescript
interface SocialSignal {
  id: string; // Tweet ID
  platform: 'x' | 'youtube' | 'tiktok';
  type: 'reply' | 'mention' | 'quote';
  author: string; // @handle
  text: string; // The content
  sentiment: 'positive' | 'negative' | 'neutral';
  timestamp: string;
  relatedProjectId?: string; // Extracted from hashtags (e.g., #week4)
  actionable: boolean; // True if contains "more", "less", "change"
}
```

## 5. Implementation Plan

### Phase 1: The "Listener" (Current)
*   **Function:** `netlify/functions/check-x-engagement.ts`
*   **Schedule:** Manual trigger (button in UI) or nightly cron.
*   **Logic:**
    1. Authenticate (OAuth 1.0a).
    2. GET `/2/users/me/mentions`.
    3. Filter out tweets older than `last_checked_timestamp`.
    4. Save to `data/vault/inbox.json`.

### Phase 2: The "Learner" (Next Sprint)
*   **Agent:** Director Agent.
*   **Logic:** Read `inbox.json` before prompting Gemini for the next storyboard.

---

## 6. Constraints & Safety
*   **Rate Limits:** Mentions endpoint is 180 requests/15 mins. We check once per hour max.
*   **Spam Filter:** Ignore accounts created < 30 days ago (if possible) or specific keywords ("crypto", "nft", "dm").
*   **No Echo Chamber:** Do not ingest our own replies to users.

---

## 7. Verification (Test Plan)
*   **Script:** `scripts/test-x-engagement.mjs`
*   **Method:**
    1. Mock a response from X API containing 1 positive reply and 1 spam reply.
    2. Run `check-x-engagement.ts`.
    3. Assert `inbox.json` contains only the positive reply.
