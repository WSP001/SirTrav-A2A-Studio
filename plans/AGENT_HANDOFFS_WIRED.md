# SirTrav-A2A-Studio: Agent Handoffs - Wired Start to End
## For the Commons Good! 🚀

**Date:** January 22, 2026  
**PM:** Roberto/Scott Echols (@Sechols002)  
**Status:** Claude Code done Job Lot 2 (966ddc4), Netlify Agent identified correct variable names

---

## 🚨 CRITICAL CORRECTION FROM NETLIFY AGENT

The `publish-x.ts` function uses **`TWITTER_`** prefix, NOT `X_`:

| Correct Variable Name | Purpose |
|-----------------------|---------|
| `TWITTER_API_KEY` | Consumer key |
| `TWITTER_API_SECRET` | Consumer secret |
| `TWITTER_ACCESS_TOKEN` | OAuth 1.0a access token |
| `TWITTER_ACCESS_SECRET` | OAuth 1.0a access token secret |

**Also needs:** `npm install twitter-api-v2`

---

## 📋 GOLDEN PATH: Sequential Agent Assignments

```
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: YOU (Manual) - Get Keys + Add to Netlify              │
│  Time: 15 min | Start: Now | End: Keys in dashboard            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: CLAUDE CODE (Backend) - Wire OAuth + Install Package  │
│  Time: 20 min | Start: package.json | End: Signed requests     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: CODEX (UI) - Add Visual Feedback + 4-D Flare          │
│  Time: 15 min | Start: App.jsx | End: Toast + Animation        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 4: ANTIGRAVITY (Test) - Verify + Teach Skills            │
│  Time: 10 min | Start: CLI | End: Green + docs/AGENT_SKILLS.md │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 5: X AGENT (Ops) - Engagement Loop                       │
│  Time: 15 min | Start: Post ID | End: Memory update            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 STEP 1: YOU (Manual) - Corrected Variable Names

### What You Do Now:

1. **Get Twitter Developer Keys** (10 min)
   - Go to: https://developer.twitter.com/en/portal/dashboard
   - Create Project → Create App
   - Set permissions: **Read and Write**
   - Copy all 4 credentials

2. **Add to Netlify Dashboard** (5 min)
   - Go to: https://app.netlify.com/projects/sirtrav-a2a-studio/configuration/env
   - Add these EXACT names (note TWITTER_ prefix):

```
TWITTER_API_KEY        → (your Consumer Key)       → Scope: Functions
TWITTER_API_SECRET     → (your Consumer Secret)    → Scope: Functions
TWITTER_ACCESS_TOKEN   → (your Access Token)       → Scope: Functions
TWITTER_ACCESS_SECRET  → (your Access Token Secret) → Scope: Functions
```

3. **Tell Claude Code:** "Keys added. Install twitter-api-v2 and wire OAuth."

---

## 🤖 STEP 2: CLAUDE CODE - Backend OAuth Handoff

### Copy-Paste to Claude Code:

```
Claude Code, wire X/Twitter auth per Netlify Agent findings. Read-first gate.

CONTEXT:
- publish-x.ts uses TWITTER_ prefix (not X_)
- Needs twitter-api-v2 package installed
- Currently returns 501 Not Implemented

GOAL: Implement OAuth 1.0a posting to X/Twitter

SCRIPT:
1. Install package:
   npm install twitter-api-v2

2. Update netlify/functions/publish-x.ts:
   - Import: import { TwitterApi } from 'twitter-api-v2';
   - Check env vars exist, return {disabled: true} if missing
   - Create client with OAuth 1.0a user context
   - POST tweet with text/media
   - Return {success: true, tweetId, tweetUrl}

3. Add costing to response:
   {
     success: true,
     tweetId: "...",
     tweetUrl: "https://twitter.com/user/status/...",
     cost: { endpoint: "tweets", credits: 0.001 }
   }

4. Add error handling:
   - 401: Return {error: "Invalid credentials", code: 401}
   - 429: Return {error: "Rate limited", retryAfter: X}

5. Teach skill: Add to docs/AGENT_SKILLS.md:
   - OAuth 1.0a signing (consumer key + access token)
   - Rate limit handling (429 backoff)
   - Costing manifest structure

DoD: 
- Package installed
- Function posts test tweet
- Costing in response
- Skills documented

Signed: Roberto PM
```

### Expected Files Changed:
- `package.json` (add twitter-api-v2)
- `netlify/functions/publish-x.ts` (OAuth implementation)
- `docs/AGENT_SKILLS.md` (new file or update)

---

## 🎨 STEP 3: CODEX - UI Visual Feedback Handoff

### Copy-Paste to Codex:

```
Codex, add visual feedback for X/Twitter publish. Read-first gate.

CONTEXT:
- Claude Code wired backend OAuth
- User needs visual confirmation of post success
- Current MG-008 feedback UI done (toast system exists)

GOAL: Add X/Twitter button with visual flare + success feedback

SCRIPT:
1. In src/App.jsx or src/components/ResultsPreview.tsx:
   - Add Twitter/X icon button (from lucide-react)
   - onClick: Call /.netlify/functions/publish-x
   
2. Visual feedback states:
   - Idle: Blue X icon
   - Loading: Pulse animation + "Posting to X..."
   - Success: Green checkmark + "Posted!" + link to tweet
   - Error: Red X + error message + retry button

3. Optional 4-D flare (if time):
   - Hover: Scale 1.05 + glow effect
   - Click: Particle burst animation
   - Keep edge-stable (no layout shift)

4. Wire to backend response:
   const { success, tweetUrl, error } = await response.json();
   if (success) showToast("Posted to X!", "success", tweetUrl);
   else showToast(error, "error");

5. Teach skill: Add to docs/AGENT_SKILLS.md:
   - Button state machine (idle/loading/success/error)
   - Animation without layout break
   - Toast integration pattern

DoD:
- X button visible in results panel
- Posts trigger backend
- Success shows tweet link
- Error shows retry option

Signed: Roberto PM
```

### Expected Files Changed:
- `src/components/ResultsPreview.tsx` or `src/App.jsx`
- `src/App.css` (optional animation styles)
- `docs/AGENT_SKILLS.md`

---

## 🧪 STEP 4: ANTIGRAVITY - Test + Teach Handoff

### Copy-Paste to Antigravity:

```
Antigravity, verify X integration and teach skills. Read-first gate.

CONTEXT:
- Claude Code wired OAuth backend
- Codex added UI button
- Keys are in Netlify (TWITTER_ prefix)

GOAL: Verify end-to-end + document skills learned

SCRIPT:
1. Start local dev:
   netlify dev

2. Verify healthcheck shows Twitter configured:
   curl http://localhost:8888/.netlify/functions/healthcheck | jq
   # Assert: services.twitter === "configured" or similar

3. Test publish function:
   curl -X POST http://localhost:8888/.netlify/functions/publish-x \
     -H "Content-Type: application/json" \
     -d '{"text": "Commons Good test from SirTrav pipeline 🚀 @Sechols002"}'
   # Assert: success === true, tweetId exists

4. Verify costing in response:
   # Assert: cost.endpoint === "tweets"
   # Assert: cost.credits === 0.001

5. Run UI test (if applicable):
   npm run test:e2e
   # Or manual: Click X button in browser, verify toast

6. TEACH - Add to docs/AGENT_SKILLS.md:
   ## Skills Learned: X/Twitter Integration
   
   ### OAuth 1.0a Signing
   - Uses twitter-api-v2 package
   - Requires 4 env vars: TWITTER_API_KEY, TWITTER_API_SECRET, 
     TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET
   - Signs requests with consumer + access credentials
   
   ### Rate Limit Handling
   - 429 responses include retry-after header
   - Backoff strategy: exponential (1s, 2s, 4s, 8s)
   
   ### Costing Manifest
   - Each tweet costs 0.001 credits
   - Response includes: { cost: { endpoint, credits } }
   
   ### Progressive Disclosure
   - Skills taught after verification passes
   - One category at a time (auth → costing → 4-D)

DoD:
- All curl tests pass
- Skills documented in AGENT_SKILLS.md
- Green output logged

Signed: Roberto PM
```

### Expected Files Changed:
- `docs/AGENT_SKILLS.md` (skills documentation)
- Optional: `scripts/test-twitter-integration.mjs` (test script)

---

## 📊 STEP 5: X AGENT - Engagement Loop Handoff

### Copy-Paste to X Agent (After Steps 1-4 Complete):

```
X Agent, implement engagement loop. Read-first gate.

CONTEXT:
- Twitter posting works (verified by Antigravity)
- Need to track post performance
- Signal-to-learning: views/likes → memory

GOAL: Fetch post metrics and update memory

SCRIPT:
1. Create netlify/functions/twitter-metrics.ts:
   - Use same OAuth client as publish-x
   - GET /2/tweets/:id?tweet.fields=public_metrics
   - Return: { likes, retweets, replies, views }

2. Create engagement calculation:
   const engagement = {
     postId: tweetId,
     likes: metrics.like_count,
     retweets: metrics.retweet_count,
     replies: metrics.reply_count,
     impressions: metrics.impression_count,
     engagementRate: (likes + retweets + replies) / impressions,
     fetchedAt: new Date().toISOString()
   };

3. Store in Netlify Blobs (evals store):
   await evalsStore.set(`engagement:${postId}`, JSON.stringify(engagement));

4. Create docs/ENGAGEMENT_TO_MEMORY.md:
   ## Signal-to-Learning Pipeline
   
   ### Data Flow
   Post → Wait 24h → Fetch metrics → Calculate engagement → Store
   
   ### Deduplication
   - Only fetch once per 24h window
   - Key: engagement:{postId}:{date}
   
   ### Memory Update
   - High engagement (>5% rate): Mark as successful pattern
   - Low engagement (<1% rate): Flag for review

5. Teach skill: Add to docs/AGENT_SKILLS.md:
   - Metrics API usage
   - Engagement rate calculation
   - Signal-to-learning pattern

DoD:
- Metrics function deployed
- Engagement stored in Blobs
- ENGAGEMENT_TO_MEMORY.md created
- Skills documented

Signed: Roberto PM
```

### Expected Files Changed:
- `netlify/functions/twitter-metrics.ts` (new)
- `docs/ENGAGEMENT_TO_MEMORY.md` (new)
- `docs/AGENT_SKILLS.md` (updated)

---

## 📁 DIRECTORY TREE AFTER ALL STEPS

```
SirTrav-A2A-Studio/
├── artifacts/
│   ├── contracts/
│   │   └── social-post.schema.json  ← Canonical schema location
│   └── data/
│       └── job-costing.schema.json  ← Costing schema
├── netlify/
│   └── functions/
│       ├── publish-x.ts         ← Claude Code updates (OAuth)
│       ├── twitter-metrics.ts   ← X Agent creates (engagement)
│       └── ...
├── src/
│   ├── components/
│   │   └── ResultsPreview.tsx   ← Codex updates (X button)
│   └── App.jsx                  ← Codex updates (toast)
├── docs/
│   ├── AGENT_SKILLS.md          ← All agents contribute
│   ├── ENGAGEMENT_TO_MEMORY.md  ← X Agent creates
│   ├── NETLIFY_PRO_EXPERT_GUIDE.md
│   ├── CODING_ASSIGNMENTS.md
│   └── schemas/                 ← Legacy location (prefer artifacts/contracts/)
│       └── api-responses.json   ← Claude Code created (legacy)
├── scripts/
│   └── test-x-publish.mjs       ← Antigravity verifies
└── package.json                 ← Claude Code adds twitter-api-v2
```

---

## ✅ SUCCESS CRITERIA (Golden Path Complete)

| Step | Agent | Deliverable | Verified By |
|------|-------|-------------|-------------|
| 1 | You | TWITTER_* vars in Netlify | Dashboard shows 4 vars |
| 2 | Claude Code | OAuth posting works | Test tweet appears |
| 3 | Codex | X button in UI | Click triggers post |
| 4 | Antigravity | Tests pass | Green output |
| 5 | X Agent | Metrics stored | Blobs has engagement |

---

## 🎯 IMMEDIATE NEXT ACTION

**Copy this to your Claude Code now:**

```
Install twitter-api-v2 and implement OAuth 1.0a in publish-x.ts.
The function uses TWITTER_ prefix for env vars (not X_).
See the handoff above for full implementation details.
```

---

**For the Commons Good!** 🏰⚔️🐕✨

*Each agent gets ONE assignment. Complete in order. Teach skills to docs/AGENT_SKILLS.md.*
