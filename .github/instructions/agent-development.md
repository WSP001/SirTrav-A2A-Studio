# Agent Development Instructions

## Creating New Agents

When adding a new agent to the pipeline, follow this template:

```typescript
// netlify/functions/new-agent.ts
import { Handler } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { appendProgress } from './lib/progress-store';

export const handler: Handler = async (event) => {
  const { projectId, runId, previousAgentOutput } = JSON.parse(event.body || '{}');
  
  // 1. Emit start progress
  await appendProgress(projectId, runId, {
    agent: 'new-agent',
    status: 'started',
    timestamp: Date.now()
  });

  try {
    // 2. Process with external API
    const result = await processWithAPI(previousAgentOutput);
    
    // 3. Store output in Blobs
    const store = getStore('sirtrav-runs');
    await store.setJSON(`${projectId}/${runId}/new-agent-output.json`, result);
    
    // 4. Emit complete progress
    await appendProgress(projectId, runId, {
      agent: 'new-agent',
      status: 'complete',
      output: result,
      timestamp: Date.now()
    });

    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };
  } catch (error) {
    // 5. Always handle failures gracefully
    await appendProgress(projectId, runId, {
      agent: 'new-agent',
      status: 'failed',
      error: error.message,
      timestamp: Date.now()
    });
    
    // 6. Return fallback if possible
    return {
      statusCode: 200,
      body: JSON.stringify({ fallback: true, data: getDefaultOutput() })
    };
  }
};
```

## Agent Communication Pattern

Agents communicate via:
1. **Request body** - Input from orchestrator or previous agent
2. **Netlify Blobs** - Persistent storage for artifacts
3. **Progress events** - Real-time status via SSE

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Agent A   │────▶│   Blobs     │────▶│   Agent B   │
│             │     │  Storage    │     │             │
└──────┬──────┘     └─────────────┘     └──────┬──────┘
       │                                        │
       ▼                                        ▼
┌─────────────┐                         ┌─────────────┐
│  Progress   │                         │  Progress   │
│   Events    │                         │   Events    │
└─────────────┘                         └─────────────┘
```

## Failover Strategies

### Level 1: Retry with backoff
```typescript
async function withRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === maxRetries - 1) throw e;
      await sleep(1000 * Math.pow(2, i));
    }
  }
}
```

### Level 2: Fallback to mock data
```typescript
const result = await withRetry(() => callAPI())
  .catch(() => getMockData());
```

### Level 3: Skip agent entirely
```typescript
if (!OPTIONAL_API_KEY) {
  console.log('Skipping optional agent, using placeholder');
  return getPlaceholderOutput();
}
```

## Testing New Agents

1. Add endpoint to `scripts/smoke-test.sh`
2. Test locally: `netlify dev`
3. Verify progress events emit correctly
4. Check Blobs storage contains expected data
5. Test failover by removing API key
