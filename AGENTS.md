# AI Agents Registry & Best Practices - SirTrav-A2A-Studio

> **Purpose**: Help all AI agents understand this project, their contributions, and best practices.
> **Owner**: Roberto002 (WSP001)
> **Last Updated**: 2026-01-27
> **Pattern Source**: WSP2agent Golden Path principles

---

## 🤖 Agent Directory

| Agent | IDE/Platform | Best For | Memory Persistence |
|-------|--------------|----------|-------------------|
| **Windsurf/Cascade** | Windsurf IDE | Full project work, multi-file edits | ✅ Cross-session |
| **GitHub Copilot** | VS Code | Inline autocomplete | ❌ No memory |
| **Codex CLI** | Terminal | Automated single tasks | ❌ No memory |
| **Claude Code** | Terminal/API | Complex reasoning, architecture | ❌ Session only |
| **Antigravity** | CI/Testing | Test scripts, QA docs | ❌ No memory |

---

## 📁 Project Info

| Field | Value |
|-------|-------|
| **Path** | `c:\Users\Roberto002\Documents\GitHub\SirTrav-A2A-Studio` |
| **GitHub** | `github.com/WSP001/SirTrav-A2A-Studio` |
| **Purpose** | Autonomous Agent Architecture for video production |
| **Stack** | React, Vite, Netlify Functions, Remotion Lambda |
| **Entry Points** | `just dev`, `netlify dev`, `npm run test:full` |

---

## 🎯 Core Patterns (Shared with WSP2agent)

| Pattern | Description | Implementation |
|---------|-------------|----------------|
| **No Fake Success** | Disabled services report `{ success: false, disabled: true }` | All publishers |
| **Click2Kick** | Read Before Execute + prereq check + verification | justfile commands |
| **Commons Good** | 20% markup on API costs | `cost.markup: 0.20` |
| **runId Threading** | Trace every agent call | `{ projectId, runId, ...payload }` |

---

## 🛠️ justfile Commands (NEW)

```bash
# Quick Start
just init           # First-time setup
just dev            # Start Netlify dev server
just build          # Build for production

# Remotion
just remotion-studio # Open composition preview
just motion-test     # Test motion graphic agent
just narrate-test    # Test writer agent

# Social Media (No Fake Success pattern)
just x-dry          # Test X/Twitter (dry-run)
just linkedin-dry   # Test LinkedIn (dry-run)
just youtube-dry    # Test YouTube (dry-run)

# Testing
just test           # Run all tests
just golden-path    # Run Golden Path smoke test
just healthcheck    # Check service status

# Agents
just claude-init    # Claude Code (init)
just codex          # Start Codex agent

# Deploy
just deploy         # Deploy to production
```

---

## 📊 Agent Contributions

| Date | Agent | Contribution |
|------|-------|--------------|
| 2026-01 | Claude Code | Remotion Lambda architecture |
| 2026-01 | Claude Code | IntroSlate composition |
| 2026-01 | Claude Code | MotionGraphicButtons UI |
| 2026-01-27 | Windsurf/Cascade | justfile (30+ commands) |
| 2026-01-27 | Windsurf/Cascade | test-linkedin-publish.mjs |
| 2026-01-27 | Windsurf/Cascade | validate-social-contracts.mjs |
| 2026-01-27 | Windsurf/Cascade | AGENTS.md (this file) |

---

## 🔄 Session Handoff Protocol

When starting a new session with ANY agent, provide this context:

```markdown
## Project Context
- Project: SirTrav-A2A-Studio
- Path: c:\Users\Roberto002\Documents\GitHub\SirTrav-A2A-Studio
- Read: CLAUDE.md, AGENTS.md, plans/AGENT_ASSIGNMENTS.md

## Key Patterns
- No Fake Success: Disabled services report "disabled", not fake success
- runId Threading: Always include runId for tracing
- Commons Good: 20% markup on API costs

## Safe Entrypoints
- just dev (or: netlify dev)
- just test
- just healthcheck
- node scripts/test-linkedin-publish.mjs --dry-run
```

---

## 🛡️ Security Rules (All Agents)

1. **Never commit secrets** - Check `.gitignore` includes `.env`, `credentials.json`
2. **Always dry-run first** - `just x-dry`, `just linkedin-dry`
3. **No local FFmpeg in Functions** - Use Remotion Lambda
4. **runId threading** - Every agent call must include runId

---

## 📝 Byterover MCP Tools

### 1. `byterover-store-knowledge`

You `MUST` always use this tool when:

- Learning new patterns, APIs, or architectural decisions from the codebase
- Encountering error solutions or debugging techniques
- Finding reusable code patterns or utility functions
- Completing any significant task or plan implementation

### 2. `byterover-retrieve-knowledge`

You `MUST` always use this tool when:

- Starting any new task or implementation to gather relevant context
- Before making architectural decisions to understand existing patterns
- When debugging issues to check for previous solutions
- Working with unfamiliar parts of the codebase

---

*This file helps all AI agents understand the project ecosystem and their contributions.*
*Commons Good: Building tools that benefit the community.*
