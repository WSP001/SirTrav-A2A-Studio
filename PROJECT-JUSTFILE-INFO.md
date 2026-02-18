# PROJECT-JUSTFILE-INFO.md

## Tech Stack
- **Runtime**: Node.js 22
- **Framework**: React 18 + Vite + TailwindCSS
- **Backend**: Netlify Functions (TypeScript)
- **Video**: Remotion Lambda (AWS)
- **Validation**: Zod schemas
- **Testing**: Antigravity Suite (`scripts/`)
- **Command Runner**: just (justfile)

## Key Commands
```bash
just dev              # Start Netlify dev server (port 8888)
just build            # Production build
just test             # Run all tests
just golden-path      # Golden Path smoke test
just golden-path-full # Full integration test
just healthcheck      # Check service status (JSON)
just preflight        # Environment validation
just deploy           # Deploy to Netlify production
```

## Social Media Commands
```bash
just x-dry            # X/Twitter dry-run test
just linkedin-dry     # LinkedIn dry-run test
just youtube-dry      # YouTube dry-run test
just validate-contracts  # Validate all social contracts
just antigravity-suite   # Full Antigravity test suite
```

## Agent Commands
```bash
just claude-init      # Claude Code init mode
just codex            # Start Codex agent
just antigravity-status  # Antigravity agent status
```

## Environment Variables
See `.env.example` for full list. Critical ones:
- `OPENAI_API_KEY` -- Director & Writer agents
- `ELEVENLABS_API_KEY` -- Voice agent
- `TWITTER_API_KEY` + 3 more -- X/Twitter publishing
- `LINKEDIN_CLIENT_ID` + 3 more -- LinkedIn publishing

## Directory Structure
```
netlify/functions/     # 33 serverless functions
src/components/        # React UI components
src/remotion/          # Remotion compositions + branding
scripts/               # Test & verification scripts
tasks/                 # Orchestration tickets
runbooks/              # Process documentation
agents/                # Agent role definitions
artifacts/             # Agent output artifacts
plans/                 # Sprint planning
docs/                  # Technical documentation
```

## Deployment
- **Production**: https://sirtrav-a2a-studio.netlify.app
- **Functions**: `/.netlify/functions/<name>`
- **CI/CD**: Netlify auto-deploy from `main`

## Core Principles
1. Cost Plus 20% Transparency
2. No Fake Success
3. Hold Record Store Exchange
4. Dry-Run First
5. Progressive Disclosure
6. Non-Overlapping Agent Zones
