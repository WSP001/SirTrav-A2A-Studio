# 🤖 AGENT HANDOFF: NETLIFY/CLAUDE
> **From:** Antigravity (Test Ops)
> **To:** Claude // Netlify Agent
> **Date:** 2026-01-23

## 🚨 IMMEDIATE ACTION REQUIRED
The user is initializing the local `netlify dev` server. Once live, you must support the **X API Verification**.

### 1. Verification Context
We are using **OAuth 1.0a** (User Context) to post Tweets.
- **File:** `netlify/functions/publish-x.ts`
- **Lib:** `oauth-1.0a` + `crypto`
- **Endpoint:** `https://api.twitter.com/2/tweets` (V2 endpoint, signed with 1.0a)
- **Status:** Implemented but untested against live keys.

### 2. Your Assignment (MG-X-LIVE Support)
Once `netlify dev` is running (port 8888):
1.  **Monitor Logs:** Watch for `🐦 [X-AGENT]` logs.
2.  **Validate Error Handling:** Ensure 401/403 errors are returned as JSON, not HTML (Netlify default).
3.  **Confirm Costing:** Verify the `invoice` object appears in the response.

### 3. Future Alignment (MG-X-002)
The user provided X API V2 repo samples.
- **Task:** Review `plans/AGENT_ASSIGNMENTS.md`.
- **Action:** If our 1.0a implementation fails or needs features (e.g. Media Upload), we may need to pivot to the V2 flows described in the user's provided samples.
- **Current Stance:** Stick to 1.0a for "Text Post" minimal viable feature.

### 📝 Command for User
Please run this in your terminal to bring the backend online:
```bash
netlify dev
```
Then, Antigravity will run:
```bash
node scripts/test-x-publish.mjs --live
```
