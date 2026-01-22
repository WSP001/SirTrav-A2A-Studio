# CLAUDE.md - Project Context & Rules

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

## 🛠️ Tech Stack
*   **Frontend:** React, Vite, TailwindCSS
*   **Backend:** Netlify Functions (TypeScript)
*   **Video:** Remotion Lambda
*   **Testing:** Antigravity Suite (`scripts/`)

## 🧪 Testing Commands
*   `npm run test:full` - Full suite (Preflight, Security, Idempotency, SSE)
*   `npm run test:skill:narrate` - Smoke test for Writer Agent
*   `./scripts/preflight.sh` - Environment check

## 🔐 Additional Constraints

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
