# ENV_SETUP.md
> Environment Variables & Healthcheck Contract

## Overview

This document defines the environment variables required for SirTrav-A2A-Studio and how they map to the healthcheck endpoint.

---

## Healthcheck Endpoint

```
GET /.netlify/functions/healthcheck
```

### Response Schema

```json
{
  "status": "healthy" | "degraded" | "unhealthy",
  "version": "2.0.0",
  "environment": "production" | "development",
  "timestamp": "2025-01-20T12:00:00.000Z",
  "uptime_seconds": 3600,
  "services": [
    { "name": "storage", "status": "ok", "latency_ms": 45 },
    { "name": "ai_services", "status": "ok" },
    { "name": "social_publishing", "status": "disabled" }
  ],
  "checks": {
    "storage": true,
    "ai_keys": true,
    "social_keys": false
  },
  "env_snapshot": {
    "openai": true,
    "elevenlabs": true,
    "suno": false,
    "vault_path": "/path/to/vault",
    "url": "https://sirtrav-a2a-studio.netlify.app"
  }
}
```

---

## What "Green" Means

| Condition | Status | Description |
|-----------|--------|-------------|
| All services OK | `healthy` | Storage, AI keys, social keys all configured |
| Some services missing | `degraded` | Core works, some features limited |
| Storage down | `unhealthy` | Cannot persist data - critical failure |

### Minimum for Golden Path (Dev)
```
env_snapshot.openai = true
env_snapshot.elevenlabs = true (or placeholder mode)
checks.storage = true
```

### Production Ready
```
status = "healthy"
checks.ai_keys = true
checks.storage = true
```

---

## Environment Variables

### Required (Core Pipeline)

| Variable | Description | Healthcheck Field |
|----------|-------------|-------------------|
| `OPENAI_API_KEY` | GPT-4 + Vision for Director & Writer | `env_snapshot.openai` |
| `ELEVENLABS_API_KEY` | Voice synthesis (has placeholder mode) | `env_snapshot.elevenlabs` |

### Optional (Enhanced Features)

| Variable | Description | Healthcheck Field |
|----------|-------------|-------------------|
| `SUNO_API_KEY` | Music generation (manual mode fallback) | `env_snapshot.suno` |
| `VAULT_PATH` | Path to credentials vault | `env_snapshot.vault_path` |
| `API_SECRET` | Token for secure handshake (P7) | N/A (security) |
| `URL` | Base URL for function invocation | `env_snapshot.url` |

### Social Publishing (Optional)

| Platform | Variables Required |
|----------|-------------------|
| YouTube | `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET` |
| TikTok | `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` |
| Instagram | `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_BUSINESS_ID` |
| LinkedIn | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_ACCESS_TOKEN` |

---

## Placeholder Mode

When API keys are missing, agents fall back to placeholder mode:

| Agent | Placeholder Behavior |
|-------|---------------------|
| Voice | Returns mock audio URL, sets `placeholder: true` |
| Composer | Returns mock music URL, beat grid with defaults |
| Director | Uses text-only analysis (no Vision AI) |

---

## Verifying Setup

### Quick Check
```bash
curl -s https://your-site/.netlify/functions/healthcheck | jq '.env_snapshot'
```

### Expected Output (Configured)
```json
{
  "openai": true,
  "elevenlabs": true,
  "suno": false,
  "vault_path": null,
  "url": "https://sirtrav-a2a-studio.netlify.app"
}
```

### Expected Output (Dev Mode)
```json
{
  "openai": false,
  "elevenlabs": false,
  "suno": false,
  "vault_path": null,
  "url": "http://localhost:8888"
}
```

---

## Netlify Environment Setup

1. Go to Netlify Dashboard > Site Settings > Environment Variables
2. Add required variables:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `ELEVENLABS_API_KEY`: Your ElevenLabs API key
3. Deploy and verify with healthcheck endpoint

---

## Local Development

Create `.env.local` in project root:
```bash
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=...
# Optional
SUNO_API_KEY=...
API_SECRET=demo
```

Then run:
```bash
netlify dev
```

---

## Related Documentation
- [DEPLOYMENT_READINESS.md](DEPLOYMENT_READINESS.md) - Pre-deploy checklist
- [RC1_CHECKLIST.md](RC1_CHECKLIST.md) - Release candidate checklist
- [MCP_CONFIG.md](MCP_CONFIG.md) - MCP server configuration
