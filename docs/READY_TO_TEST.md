# Ready to Test - SirTrav A2A Studio

This guide outlines the verification steps to ensure the SirTrav A2A Studio is production-ready.

## 🚀 Fast Checks (Pre-Commit)
Run these commands locally to catch issues early.

- **Preflight Check**: `npm run preflight`
  - Validates environment variables and required files.
- **Build**: `npm run build`
  - compiles TypeScript and verifies project structure.

## 🔒 Security Verification
Ensure the security handshake and authentication logic are intact.

- **Verify Handshake**: `npm run verify:security`
  - **Usage**:
    - **Local Dev**: Runs against `http://localhost:8888` (requires `npx netlify dev`).
    - **Deployed URL**: Can be run against a live site by setting `URL`:
      ```bash
      URL=https://my-site.netlify.app npm run verify:security
      ```
  - **Expectation**:
    - Valid tokens (API_SECRET) -> 202 Accepted
    - Invalid/Missing tokens -> 401 Unauthorized

## ✨ Golden Path (Integration)
Verify the full end-to-end "Click-to-Kick" pipeline.

- **Run Full Suite**: `npm run practice:test`
  - Simulates a 7-agent pipeline run.
  - Verifies SSE (Server-Sent Events) progress streaming.
  - Checks for "Commons Good" attribution generation.
  - **Output**: `tmp/<project-id>/FINAL_RECAP.mp4`

## 🧪 Advanced Testing
- **Stress Test**: `npm run stress:sse` (Concurrent load)
- **Idempotency**: `npm run verify:idempotency` (Duplicate run protection)
- **Full CI/CD**: `npm run test:full` (Combines all above)
