# CLAUDE.md - Project Context & Rules

## 🎯 Project: SirTrav A2A Studio

Autonomous Agent Architecture for video production. The system orchestrates AI agents to generate narration, motion graphics, and publish to social platforms.

---

## ⚙️ Critical Constraints

> [!IMPORTANT]
> **1. NO Local FFmpeg in Functions**
> Never run local `ffmpeg` or `remotion render` inside a Netlify Function.
> *Reason:* Timeouts and bundle size limits.
> *Solution:* Use `renderMediaOnLambda` + `getRenderProgress`.

> [!IMPORTANT]
> **2. Remotion Lambda Pattern**
> Always use the asynchronous Dispatcher pattern:
> 1. Trigger render → Return `renderId` immediately.
> 2. Client polls status → Show progress bar.

> [!IMPORTANT]
> **3. No Fake Success Responses**
> Social publishers must return `{ success: false, disabled: true }` when keys are missing.
> Never return `success: true` for placeholder/mock behavior.
> *Reason:* UI and tests must know the real state.

> [!IMPORTANT]
> **4. Local Dev Runtime**
> Always run `netlify dev` (not just `vite dev`) for function testing.
> Functions are served at `http://localhost:8888/.netlify/functions/`.
> *Verify:* `curl http://localhost:8888/.netlify/functions/healthcheck`

> [!IMPORTANT]
> **5. runId Threading**
> Always thread `runId` through every agent call for enterprise tracing.
> *Pattern:* `{ projectId, runId, ...payload }`

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, Vite, TailwindCSS |
| Backend | Netlify Functions (TypeScript) |
| Video | Remotion Lambda |
| Testing | Antigravity Suite (`scripts/`) |
| Memory | Netlify Blobs, JSON index |

---

## 🎬 Remotion Architecture (The "Magic Manual")

### File Structure
```
src/remotion/
├── index.ts              # Entry point (registerRoot)
├── Root.tsx              # Composition Registry ⚠️ CRITICAL
├── branding.ts           # Centralized tokens (colors, fonts)
├── types.ts              # Zod schemas for props validation
├── components/
│   └── AutoScalingText.tsx  # Prevents text overflow
└── compositions/
    ├── MainComposition.tsx  # Legacy main video
    └── IntroSlate/
        └── index.tsx        # Bold title card
```

### Adding a New Composition (Checklist)
1. Create folder: `src/remotion/compositions/NewTemplate/index.tsx`
2. Add Zod schema to `types.ts`
3. **Register in Root.tsx** ← AI agents frequently forget this!
4. Add to `TEMPLATES` in `branding.ts`
5. Update `MotionConfigSchema` in backend

### Branding Tokens
All visual identity flows from `branding.ts`:
```typescript
import { THEME, ASSETS, TEMPLATES, PLATFORMS } from './branding';
```
Never hardcode colors/fonts in compositions.

---

## 🧪 Testing Commands

| Command | Purpose |
|---------|---------|
| `npm run test:full` | Full suite (Preflight, Security, Idempotency, SSE) |
| `npm run test:skill:narrate` | Writer Agent smoke test |
| `node scripts/test_remotion_motion.mjs` | Motion Graphic smoke test |
| `node scripts/test-x-publish.mjs --live` | X API live post test |
| `./scripts/preflight.sh` | Environment check |

---

## 🤖 Agent Skills

### 1. Motion Graphic Agent
**Endpoint:** `/.netlify/functions/generate-motion-graphic`
**Input:** `MotionConfig` (templateId, projectId, platform, props)
**Output:** `renderId` for polling
**UI Component:** `MotionGraphicButtons.tsx`

### 2. Writer Agent (Narration)
**Endpoint:** `/.netlify/functions/skill-narrate`
**Input:** Memory context, project vision
**Output:** Narration script

### 3. Publisher Agents
| Platform | Endpoint | Status |
|----------|----------|--------|
| YouTube | `/.netlify/functions/publish-youtube` | ✅ Ready |
| X/Twitter | `/.netlify/functions/publish-x` | 🟡 Keys need verification |
| Instagram | `/.netlify/functions/publish-instagram` | 🔴 Needs keys |
| TikTok | `/.netlify/functions/publish-tiktok` | 🔴 Needs keys |
| LinkedIn | `/.netlify/functions/publish-linkedin` | 🔴 Needs keys |

---

## 🔄 Regenerative Loop

The system learns from user feedback:
1. **Rendering** → Save config to memory
2. **User Feedback** → Thumbs up/down stored
3. **Next Generation** → `getRegenerativeContext()` reads preferences
4. **Mutation** → Avoid templates/themes with negative feedback

Memory location: `memory-index.json` or Netlify Blobs

---

## 📦 Environment Variables (Required)

### Core
```
OPENROUTER_API_KEY=     # AI generation
NETLIFY_AUTH_TOKEN=     # Blobs access
```

### Remotion Lambda (Optional)
```
REMOTION_LAMBDA_FUNCTION=  # Lambda function name
REMOTION_BUCKET=           # S3 bucket for outputs
REMOTION_SERVE_URL=        # URL of deployed Remotion bundle
AWS_REGION=us-east-1
```

### Social Media
```
TWITTER_API_KEY=
TWITTER_API_SECRET=
TWITTER_ACCESS_TOKEN=
TWITTER_ACCESS_TOKEN_SECRET=
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
YOUTUBE_REFRESH_TOKEN=
```

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start dev server (includes functions)
netlify dev

# 3. Run smoke test
node scripts/test_remotion_motion.mjs

# 4. Open in browser
# http://localhost:8888
```

---

## 📋 Agent Handoff Protocol

When handing off to another agent (Codex, Claude, Antigravity):
1. Update `plans/AGENT_ASSIGNMENTS.md`
2. Set ticket status: `IN_PROGRESS` or `WAITING`
3. One ticket per agent (no parallel work)
4. Create handoff doc if needed: `*_HANDOFF.md`
