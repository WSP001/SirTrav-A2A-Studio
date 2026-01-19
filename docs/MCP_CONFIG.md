# MCP_CONFIG.md
> Model Context Protocol Server Configuration

## Overview

MCP (Model Context Protocol) enables Claude Code to interact with external services through standardized tool interfaces. This project uses MCP for:

1. **Vault Access** - Secure credential retrieval
2. **ElevenLabs Integration** - Voice synthesis
3. **YouTube Integration** - Video publishing (future)

---

## MCP Server Directory

```
mcp-servers/
├── vault-server/       # Credentials vault
├── elevenlabs-server/  # Voice synthesis
└── youtube-server/     # Video publishing (planned)
```

---

## Configuration File

### Location
```
.claude/mcp.json
```

### Schema
```json
{
  "mcpServers": {
    "vault": {
      "command": "node",
      "args": ["mcp-servers/vault-server/index.js"],
      "env": {
        "VAULT_PATH": ".env.local"
      }
    },
    "elevenlabs": {
      "command": "node",
      "args": ["mcp-servers/elevenlabs-server/index.js"],
      "env": {
        "ELEVENLABS_API_KEY": "${ELEVENLABS_API_KEY}"
      }
    },
    "youtube": {
      "command": "node",
      "args": ["mcp-servers/youtube-server/index.js"],
      "env": {
        "YOUTUBE_CLIENT_ID": "${YOUTUBE_CLIENT_ID}",
        "YOUTUBE_CLIENT_SECRET": "${YOUTUBE_CLIENT_SECRET}"
      },
      "disabled": true
    }
  }
}
```

---

## Server Specifications

### 1. Vault Server

**Purpose**: Secure credential retrieval without exposing keys in code.

**Tools Provided**:
| Tool | Description |
|------|-------------|
| `vault_get` | Retrieve a credential by key |
| `vault_list` | List available credential keys |
| `vault_set` | Store a credential (privileged) |

**Example Usage**:
```typescript
// Claude Code can call:
const apiKey = await mcp.call('vault', 'vault_get', { key: 'OPENAI_API_KEY' });
```

**Security Notes**:
- Never log or expose returned values
- Keys are wiped from memory after pipeline via `flushCredentials()`
- Use environment variable references, not hardcoded values

---

### 2. ElevenLabs Server

**Purpose**: Voice synthesis for narration generation.

**Tools Provided**:
| Tool | Description |
|------|-------------|
| `tts_synthesize` | Convert text to speech |
| `tts_voices` | List available voices |
| `tts_models` | List available models |

**Example Usage**:
```typescript
const audio = await mcp.call('elevenlabs', 'tts_synthesize', {
  text: 'Welcome to SirTrav weekly adventures!',
  voiceId: 'rachel',
  modelId: 'eleven_multilingual_v2'
});
// Returns: { audioUrl: string, duration: number, characters: number }
```

**Voice Options**:
| Voice ID | Name | Style |
|----------|------|-------|
| `rachel` | Rachel | Calm, professional |
| `adam` | Adam | Energetic, young |
| `antoni` | Antoni | Deep, authoritative |

---

### 3. YouTube Server (Planned)

**Purpose**: Automated video publishing and metadata management.

**Tools Provided** (Future):
| Tool | Description |
|------|-------------|
| `youtube_upload` | Upload video to channel |
| `youtube_metadata` | Set title, description, tags |
| `youtube_thumbnail` | Set custom thumbnail |
| `youtube_schedule` | Schedule publish time |

**OAuth Flow**:
1. User authorizes via OAuth consent screen
2. Refresh token stored in vault
3. MCP server handles token refresh automatically

---

## Environment Variables

### Required for Production
```bash
# Vault
VAULT_ENCRYPTION_KEY=<32-byte-key>

# ElevenLabs
ELEVENLABS_API_KEY=sk_...

# YouTube (when enabled)
YOUTUBE_CLIENT_ID=...
YOUTUBE_CLIENT_SECRET=...
YOUTUBE_REFRESH_TOKEN=...
```

### Development Mode
```bash
# Use placeholder mode
MCP_MODE=placeholder

# Skip actual API calls
ELEVENLABS_API_KEY=demo
```

---

## Hook Integration

MCP servers are started by the init hook:

```bash
# .claude/hooks/init_hook.sh
for SERVER in mcp-servers/*/; do
  if [ -f "$SERVER/index.js" ]; then
    node "$SERVER/index.js" &
    echo "[INIT] Started MCP server: $SERVER"
  fi
done
```

---

## Implementing a New MCP Server

### 1. Create Server Directory
```bash
mkdir -p mcp-servers/my-server
```

### 2. Implement Server
```javascript
// mcp-servers/my-server/index.js
const { McpServer } = require('@modelcontextprotocol/sdk');

const server = new McpServer({
  name: 'my-server',
  version: '1.0.0'
});

server.tool('my_tool', {
  description: 'Does something useful',
  parameters: {
    type: 'object',
    properties: {
      input: { type: 'string' }
    }
  }
}, async ({ input }) => {
  // Implementation
  return { result: `Processed: ${input}` };
});

server.start();
```

### 3. Register in Config
```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["mcp-servers/my-server/index.js"]
    }
  }
}
```

---

## Troubleshooting

### Server Won't Start
```bash
# Check logs
cat .claude/logs/mcp.log

# Test manually
node mcp-servers/vault-server/index.js
```

### Tool Not Found
- Verify server is registered in `.claude/mcp.json`
- Check server exports the tool correctly
- Restart Claude Code session

### Credential Not Found
- Check vault has the key: `vault_list`
- Verify environment variable is set
- Check `.env.local` file exists

---

## Security Checklist

- [ ] MCP servers run locally, not exposed to network
- [ ] Credentials passed via environment, not arguments
- [ ] Vault uses encryption at rest
- [ ] Sensitive keys wiped after pipeline (`flushCredentials()`)
- [ ] OAuth tokens stored encrypted in vault
- [ ] MCP server logs don't contain credentials

---

## Related Documentation
- [STATUS_RUN_INDEX.md](STATUS_RUN_INDEX.md) - Pipeline state management
- [SKILL_TEMPLATE.md](skills/SKILL_TEMPLATE.md) - Agent contract template
- [RC1_CHECKLIST.md](RC1_CHECKLIST.md) - Release readiness
